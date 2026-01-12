// Node.js specific threading implementation using Worker Threads
// This provides better performance than the browser web worker approach

import { Worker, isMainThread, parentPort, workerData } from 'worker_threads';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export interface NodejsThreadPoolConfig {
  maxWorkers: number;
  wasmPath: string;
}

export interface WorkerTask {
  id: string;
  method: string;
  data: Uint8Array;
  options: any;
}

export interface WorkerResult {
  id: string;
  result?: Uint8Array;
  error?: string;
}

export class NodejsThreadPool {
  private workers: Worker[] = [];
  private pendingTasks = new Map<string, { resolve: Function; reject: Function }>();
  private nextTaskId = 0;
  private isInitialized = false;
  private roundRobinIndex = 0;

  constructor(private config: NodejsThreadPoolConfig) {}

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    // Create the worker script inline
    const workerScript = `
      import { parentPort, workerData } from 'worker_threads';
      import { createRequire } from 'node:module';
      
      const require = createRequire(import.meta.url);
      
      let wasmModule = null;
      
      async function initWasm() {
        if (!wasmModule) {
          // Import the Node.js WASM module
          wasmModule = require('${this.config.wasmPath}');
          wasmModule.init(false); // Initialize without debug logs in workers
        }
        return wasmModule;
      }
      
      parentPort.on('message', async (task) => {
        try {
          const { id, method, data, options } = task;
          
          if (!wasmModule) {
            await initWasm();
          }
          
          const converter = new wasmModule.Converter(false);
          
          // Configure converter based on options
          if (options.outputFormat) {
            converter.set_output_format(options.outputFormat);
          }
          if (options.inputFormat) {
            converter.set_input_format(options.inputFormat);
          }
          
          // Process the data
          const output = converter.push(data);
          const final = converter.finish();
          
          // Combine outputs
          const result = new Uint8Array(output.length + final.length);
          result.set(output, 0);
          result.set(final, output.length);
          
          parentPort.postMessage({ id, result });
        } catch (error) {
          parentPort.postMessage({ id, error: error.message });
        }
      });
      
      // Initialize WASM when worker starts
      initWasm().catch(console.error);
    `;

    // Write worker script to a temporary file
    const workerPath = join(__dirname, `worker-${Date.now()}.mjs`);
    await import('fs').then(fs => {
      fs.writeFileSync(workerPath, workerScript);
    });

    try {
      for (let i = 0; i < this.config.maxWorkers; i++) {
        const worker = new Worker(workerPath, { type: 'module' });
        
        worker.on('message', (response: WorkerResult) => {
          this.handleWorkerMessage(response);
        });
        
        worker.on('error', (error) => {
          console.error('Worker error:', error);
        });
        
        this.workers.push(worker);
      }
      
      this.isInitialized = true;
    } finally {
      // Clean up the temporary worker file
      setTimeout(() => {
        import('fs').then(fs => {
          try {
            fs.unlinkSync(workerPath);
          } catch {}
        });
      }, 1000);
    }
  }

  private handleWorkerMessage(response: WorkerResult): void {
    const pending = this.pendingTasks.get(response.id);
    if (pending) {
      this.pendingTasks.delete(response.id);
      if (response.error) {
        pending.reject(new Error(response.error));
      } else {
        pending.resolve(response.result);
      }
    }
  }

  async processChunks(method: string, chunks: Uint8Array[], options: any): Promise<Uint8Array[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const promises = chunks.map((chunk, index) => {
      const taskId = `${this.nextTaskId++}`;
      const workerIndex = this.roundRobinIndex++ % this.workers.length;
      
      return new Promise<Uint8Array>((resolve, reject) => {
        this.pendingTasks.set(taskId, { resolve, reject });
        
        const task: WorkerTask = {
          id: taskId,
          method,
          data: chunk,
          options
        };
        
        this.workers[workerIndex].postMessage(task);
      });
    });

    return Promise.all(promises);
  }

  destroy(): void {
    this.workers.forEach(worker => worker.terminate());
    this.workers = [];
    this.pendingTasks.clear();
    this.isInitialized = false;
  }
}

// Utility functions for chunking data at byte boundaries (optimized for Node.js)
export function chunkDataNodejs(data: Uint8Array, numChunks: number): Uint8Array[] {
  if (numChunks <= 1 || data.length < 1024) {
    return [data];
  }

  const chunkSize = Math.ceil(data.length / numChunks);
  const chunks: Uint8Array[] = [];
  
  let start = 0;
  while (start < data.length) {
    let end = Math.min(start + chunkSize, data.length);
    
    // For CSV/NDJSON, align to line boundaries (more aggressive search)
    if (end < data.length) {
      const searchStart = Math.max(start + chunkSize - 2048, start); // Search back up to 2KB
      const searchEnd = Math.min(end + 2048, data.length); // Search forward up to 2KB
      
      // Look for newline
      let foundNewline = false;
      for (let i = searchEnd - 1; i >= searchStart; i--) {
        if (data[i] === 0x0A) { // '\n'
          end = i + 1;
          foundNewline = true;
          break;
        }
      }
      
      // If no newline found, search for comma (CSV field boundary)
      if (!foundNewline) {
        for (let i = end - 1; i >= searchStart; i--) {
          if (data[i] === 0x2C) { // ','
            end = i + 1;
            break;
          }
        }
      }
    }
    
    chunks.push(data.slice(start, end));
    start = end;
  }
  
  return chunks;
}

// Smart result merging optimized for Node.js Buffer operations
export function mergeResultsNodejs(results: Uint8Array[], format: string): Uint8Array {
  if (results.length === 1) {
    return results[0];
  }

  // Calculate total size for efficient allocation
  const totalLength = results.reduce((sum, chunk) => sum + chunk.length, 0);
  const merged = new Uint8Array(totalLength);
  
  let offset = 0;
  
  switch (format) {
    case 'ndjson':
      // Simple concatenation for NDJSON
      for (const chunk of results) {
        merged.set(chunk, offset);
        offset += chunk.length;
      }
      break;
      
    case 'csv':
      // Merge CSV: keep header from first chunk only
      const [first, ...rest] = results;
      merged.set(first, offset);
      offset += first.length;
      
      for (const chunk of rest) {
        // Find first newline (skip header)
        let headerEnd = 0;
        for (let i = 0; i < chunk.length; i++) {
          if (chunk[i] === 0x0A) {
            headerEnd = i + 1;
            break;
          }
        }
        
        const dataWithoutHeader = chunk.slice(headerEnd);
        merged.set(dataWithoutHeader, offset);
        offset += dataWithoutHeader.length;
      }
      break;
      
    case 'json':
    default:
      // Default concatenation
      for (const chunk of results) {
        merged.set(chunk, offset);
        offset += chunk.length;
      }
      break;
  }
  
  return merged.slice(0, offset);
}