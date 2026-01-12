// Custom WASM threading implementation using web workers
// This bypasses wasm-bindgen-rayon issues by implementing parallelism at the JS level

export interface ThreadPoolConfig {
  maxWorkers: number;
  wasmPath: string;
}

export interface WorkerMessage {
  id: string;
  method: string;
  data: string;
  options: any;
}

export interface WorkerResponse {
  id: string;
  result?: string;
  error?: string;
}

export class WasmThreadPool {
  private workers: Worker[] = [];
  private pendingTasks = new Map<string, { resolve: Function; reject: Function }>();
  private nextTaskId = 0;
  private isInitialized = false;

  constructor(private config: ThreadPoolConfig) {}

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    // Create worker code inline to avoid external file dependencies
    const workerCode = `
      let wasmModule = null;
      
      async function initWasm() {
        if (!wasmModule) {
          const wasmImport = await import('${this.config.wasmPath}');
          wasmModule = wasmImport;
        }
        return wasmModule;
      }
      
      self.onmessage = async function(e) {
        try {
          const { id, method, data, options } = e.data;
          
          if (!wasmModule) {
            await initWasm();
          }
          
          let result;
          switch (method) {
            case 'parseCSV':
              result = wasmModule.csv_to_ndjson(data, options);
              break;
            case 'parseJSON':
              result = wasmModule.json_to_csv(data, options);
              break;
            case 'parseNDJSON':
              result = wasmModule.ndjson_to_csv(data, options);
              break;
            case 'parseXML':
              result = wasmModule.xml_to_json(data, options);
              break;
            default:
              throw new Error('Unknown method: ' + method);
          }
          
          self.postMessage({ id, result });
        } catch (error) {
          self.postMessage({ id, error: error.message });
        }
      };
    `;

    const workerBlob = new Blob([workerCode], { type: 'application/javascript' });
    const workerUrl = URL.createObjectURL(workerBlob);

    for (let i = 0; i < this.config.maxWorkers; i++) {
      const worker = new Worker(workerUrl, { type: 'module' });
      worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
        this.handleWorkerMessage(e.data);
      };
      this.workers.push(worker);
    }

    URL.revokeObjectURL(workerUrl);
    this.isInitialized = true;
  }

  private handleWorkerMessage(response: WorkerResponse): void {
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

  async processChunks(method: string, chunks: string[], options: any): Promise<string[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const promises = chunks.map((chunk, index) => {
      const taskId = `${this.nextTaskId++}`;
      const workerIndex = index % this.workers.length;
      
      return new Promise<string>((resolve, reject) => {
        this.pendingTasks.set(taskId, { resolve, reject });
        
        const message: WorkerMessage = {
          id: taskId,
          method,
          data: chunk,
          options
        };
        
        this.workers[workerIndex].postMessage(message);
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

// Utility functions for chunking data intelligently
export function chunkData(data: string, numChunks: number): string[] {
  if (numChunks <= 1 || data.length < 1000) {
    return [data];
  }

  const chunkSize = Math.ceil(data.length / numChunks);
  const chunks: string[] = [];
  
  let start = 0;
  while (start < data.length) {
    let end = Math.min(start + chunkSize, data.length);
    
    // For CSV/NDJSON, align to line boundaries
    if (end < data.length) {
      const nextNewline = data.indexOf('\n', end);
      if (nextNewline !== -1 && nextNewline < end + 500) {
        end = nextNewline + 1;
      }
    }
    
    chunks.push(data.slice(start, end));
    start = end;
  }
  
  return chunks;
}

// Smart chunk merging that preserves data structure
export function mergeResults(results: string[], format: string): string {
  if (results.length === 1) {
    return results[0];
  }

  switch (format) {
    case 'ndjson':
      return results.join('');
    case 'csv':
      // Merge CSV: keep header from first chunk only
      const [first, ...rest] = results;
      const restWithoutHeaders = rest.map(chunk => {
        const lines = chunk.split('\n');
        return lines.slice(1).join('\n');
      });
      return [first, ...restWithoutHeaders].join('');
    case 'json':
      // Merge JSON arrays
      try {
        const arrays = results.map(r => JSON.parse(r));
        return JSON.stringify(arrays.flat());
      } catch {
        return results.join('\n');
      }
    default:
      return results.join('');
  }
}