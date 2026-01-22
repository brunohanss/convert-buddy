export type Format = "csv" | "ndjson" | "json" | "xml";
export type DetectInput =
  | Uint8Array
  | ArrayBuffer
  | string
  | ReadableStream<Uint8Array>
  | AsyncIterable<Uint8Array>;

export type CsvDetection = {
  delimiter: string;
  fields: string[];
};

export type XmlDetection = {
  elements: string[];
  recordElement?: string;
};

export type JsonDetection = {
  fields: string[];
};

export type NdjsonDetection = {
  fields: string[];
};

export type StructureDetection = {
  format: Format;
  fields: string[];
  delimiter?: string;      // For CSV
  recordElement?: string;  // For XML
};

export type DetectOptions = {
  maxBytes?: number;
  debug?: boolean;
};

export type ProgressCallback = (stats: Stats) => void;

export type ConvertBuddyOptions = {
  debug?: boolean;
  profile?: boolean;
  inputFormat?: Format | "auto";
  outputFormat?: Format;
  chunkTargetBytes?: number;
  parallelism?: number; // Node only - number of worker threads
  maxMemoryMB?: number; // Memory limit for conversions (future use)
  csvConfig?: CsvConfig;
  xmlConfig?: XmlConfig;
  transform?: TransformConfig;
  onProgress?: ProgressCallback;
  progressIntervalBytes?: number; // Trigger progress callback every N bytes (default: 1MB)
};

export type ConvertOptions = {
  inputFormat?: Format | "auto";
  outputFormat: Format;
  csvConfig?: CsvConfig;
  xmlConfig?: XmlConfig;
  transform?: TransformConfig;
  onProgress?: ProgressCallback;
};

export type CsvConfig = {
  delimiter?: string;
  quote?: string;
  hasHeaders?: boolean;
  trimWhitespace?: boolean;
};

export type XmlConfig = {
  recordElement?: string;
  trimText?: boolean;
  includeAttributes?: boolean;
  expandEntities?: boolean;
};

export type TransformMode = "replace" | "augment";

export type Coerce =
  | { type: "string" }
  | { type: "i64" }
  | { type: "f64" }
  | { type: "bool" }
  | { type: "timestamp_ms"; format?: "iso8601" | "unix_ms" | "unix_s" };

export type FieldMap = {
  targetFieldName: string;
  originFieldName?: string;
  required?: boolean;
  defaultValue?: string | number | boolean | null;
  coerce?: Coerce;
  compute?: string;
};

export type TransformConfig = {
  mode?: TransformMode;
  fields: FieldMap[];
  onMissingField?: "error" | "null" | "drop";
  onMissingRequired?: "error" | "abort";
  onCoerceError?: "error" | "null" | "dropRecord";
};

export type Stats = {
  bytesIn: number;
  bytesOut: number;
  chunksIn: number;
  recordsProcessed: number;
  parseTimeMs: number;
  transformTimeMs: number;
  writeTimeMs: number;
  maxBufferSize: number;
  currentPartialSize: number;
  throughputMbPerSec: number;
};

type WasmModule = {
  default?: unknown;
  init: (debugEnabled: boolean) => void;
  Converter: new (debug: boolean) => {
    push: (chunk: Uint8Array) => Uint8Array;
    finish: () => Uint8Array;
    getStats: () => Stats;
  };
  detectFormat?: (sample: Uint8Array) => string | null | undefined;
  detectCsvFields?: (sample: Uint8Array) => CsvDetection | null | undefined;
  detectXmlElements?: (sample: Uint8Array) => XmlDetection | null | undefined;
  detectJsonFields?: (sample: Uint8Array) => JsonDetection | null | undefined;
  detectNdjsonFields?: (sample: Uint8Array) => NdjsonDetection | null | undefined;
  detectStructure?: (sample: Uint8Array, formatHint?: string) => StructureDetection | null | undefined;
  getSimdEnabled?: () => boolean;
  __wbg_set_wasm?: (wasm: unknown) => void;
};

let wasmModuleInstance: WasmModule | null = null;
let wasmModuleLoadPromise: Promise<WasmModule> | null = null;
let wasmThreadingSupported = false;
let threadPool: any = null; // Custom WASM thread pool (browser)
let nodejsThreadPool: any = null; // Node.js specific thread pool
const utf8Decoder = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true });

function decodeUtf8(bytes: Uint8Array): string {
  return utf8Decoder.decode(bytes);
}

// Detect SharedArrayBuffer support for WASM threading
function detectWasmThreadingSupport(): boolean {
  if (typeof SharedArrayBuffer === 'undefined') {
    return false;
  }
  
  // Test if we can actually create a SharedArrayBuffer
  try {
    new SharedArrayBuffer(1);
    return true;
  } catch (e) {
    return false;
  }
}

async function loadWasmModule(): Promise<WasmModule> {
  // Return cached instance if already loaded
  if (wasmModuleInstance) {
    return wasmModuleInstance;
  }

  // If load is in progress, wait for it
  if (wasmModuleLoadPromise) {
    return wasmModuleLoadPromise;
  }

  // Start loading
  wasmModuleLoadPromise = (async () => {
    const isNode =
      typeof process !== "undefined" &&
      !!(process as any).versions?.node;

    // Detect threading support
    wasmThreadingSupported = detectWasmThreadingSupport();
    
    if (isNode) {
      const nodeModule: any = await import(/* webpackIgnore: true */ "node:module");
      const createRequire = nodeModule.createRequire as any;
      const requireFn = createRequire ? createRequire(import.meta.url) : (module as any).createRequire?.(import.meta.url);
      const require = requireFn ?? (globalThis as any).require;
      const mod = require("../wasm-node.cjs");
      return mod as WasmModule;
    }

    const mod = (await import("../wasm/web/convert_buddy.js")) as unknown as WasmModule;
    
    // Initialize threading if supported
    if (wasmThreadingSupported && (mod as any).initThreadPool) {
      try {
        const numThreads = Math.min(navigator.hardwareConcurrency || 4, 8);
        await (mod as any).initThreadPool(numThreads);
        console.log(`[convert-buddy] WASM threading initialized with ${numThreads} threads`);
      } catch (e) {
        console.warn('[convert-buddy] WASM threading initialization failed, using single-thread:', e);
        wasmThreadingSupported = false;
      }
    }
    
    return mod;
  })();

  try {
    wasmModuleInstance = await wasmModuleLoadPromise;
    return wasmModuleInstance;
  } finally {
    wasmModuleLoadPromise = null;
  }
}

let wasmInitialized = false;
let wasmInitPromise: Promise<void> | null = null;

async function initWasm(debug: boolean): Promise<void> {
  // If already initialized, return immediately
  if (wasmInitialized) {
    return;
  }

  // If initialization is in progress, wait for it
  if (wasmInitPromise) {
    return wasmInitPromise;
  }

  // Start initialization
  wasmInitPromise = (async () => {
    const wasmModule = await loadWasmModule();

    if (typeof wasmModule.default === "function") {
      await (wasmModule.default as () => Promise<void>)();
    }

    wasmModule.init(debug);
    
    // Note: Node.js enhanced threading is handled at the JavaScript level
    // No WASM thread pool initialization needed
    
    wasmInitialized = true;
  })();

  try {
    await wasmInitPromise;
  } finally {
    wasmInitPromise = null;
  }
}

export class ConvertBuddy {
  private converter: any;
  private debug: boolean;
  private profile: boolean;
  private aborted: boolean = false;
  private paused: boolean = false;
  private onProgress?: ProgressCallback;
  private progressIntervalBytes: number;
  private lastProgressBytes: number = 0;
  private globalConfig: ConvertBuddyOptions;
  private initialized: boolean = false;
  public simd: boolean;

  /**
   * Create a new ConvertBuddy instance with global configuration.
   * This is useful when you want to set memory limits, debug mode, or other global settings.
   * 
   * @example
   * const buddy = new ConvertBuddy({ maxMemoryMB: 512, debug: true });
   * const result = await buddy.convert(input, { outputFormat: "json" });
   */
  constructor(opts: ConvertBuddyOptions = {}) {
    // Initialize basic properties
    this.debug = !!opts.debug;
    this.profile = !!opts.profile;
    this.simd = false; // Will be set on first convert
    this.globalConfig = opts;
    this.progressIntervalBytes = opts.progressIntervalBytes || 1024 * 1024;
    this.onProgress = opts.onProgress;
    this.converter = null; // Will be initialized lazily
    this.initialized = false;
  }

  /**
   * Convert input (string, Buffer, File, URL, etc.) to the desired output format.
   * This is the main method for the new simplified API.
   * 
   * @example
   * // Auto-detect everything
   * const buddy = new ConvertBuddy();
   * const result = await buddy.convert("https://example.com/data.csv", { outputFormat: "json" });
   * 
   * @example
   * // With configuration
   * const buddy = new ConvertBuddy({ maxMemoryMB: 512 });
   * const result = await buddy.convert(file, { inputFormat: "csv", outputFormat: "json" });
   */
  async convert(
    input: string | Uint8Array | File | Blob | ReadableStream<Uint8Array>,
    opts: ConvertOptions
  ): Promise<Uint8Array> {
    // Merge global and local options
    const mergedOpts: ConvertBuddyOptions = {
      ...this.globalConfig,
      ...opts,
      inputFormat: opts.inputFormat || this.globalConfig.inputFormat || "auto",
    };

    // Detect input type and convert accordingly
    if (typeof input === "string") {
      // Could be URL or raw data
      if (input.startsWith("http://") || input.startsWith("https://")) {
        // Fetch from URL
        return this.convertFromUrl(input, mergedOpts);
      } else {
        // Treat as raw data
        return this.convertFromString(input, mergedOpts);
      }
    } else if (input instanceof Uint8Array) {
      return this.convertFromBuffer(input, mergedOpts);
    } else if (typeof File !== "undefined" && input instanceof File) {
      return this.convertFromFile(input as File, mergedOpts);
    } else if (typeof Blob !== "undefined" && input instanceof Blob) {
      return this.convertFromBlob(input as Blob, mergedOpts);
    } else if (typeof ReadableStream !== "undefined" && input instanceof ReadableStream) {
      return this.convertFromStream(input, mergedOpts);
    } else {
      throw new Error("Unsupported input type");
    }
  }

  private async convertFromUrl(url: string, opts: ConvertBuddyOptions): Promise<Uint8Array> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
    }
    
    const stream = response.body;
    if (!stream) {
      throw new Error("Response body is null");
    }

    return this.convertFromStream(stream, opts);
  }

  private async convertFromString(input: string, opts: ConvertBuddyOptions): Promise<Uint8Array> {
    const inputBytes = new TextEncoder().encode(input);
    return this.convertFromBuffer(inputBytes, opts);
  }

  private async convertFromBuffer(input: Uint8Array, opts: ConvertBuddyOptions): Promise<Uint8Array> {
    // Use WASM threading for large inputs when available
    const useWasmThreading = wasmThreadingSupported && input.length > 256 * 1024; // 256KB threshold
    
    if (useWasmThreading && opts.debug) {
      console.log('[convert-buddy] Using WASM threading for parallel processing');
    }
    
    // Check if we should use JavaScript-level parallelism as fallback
    if (!useWasmThreading && opts.parallelism && opts.parallelism > 1 && input.length > 512 * 1024) {
      if (opts.debug) {
        console.log('[convert-buddy] WASM threading not available, using JavaScript parallelism');
      }
      return this.convertFromBufferParallel(input, opts);
    }

    // Handle auto-detection
    let actualOpts = { ...opts };
    
    if (opts.inputFormat === "auto") {
      const detected = await autoDetectConfig(input, { debug: opts.debug });
      
      if (detected.format !== "unknown") {
        actualOpts.inputFormat = detected.format as Format;
        
        if (detected.csvConfig) {
          actualOpts.csvConfig = opts.csvConfig ? { ...detected.csvConfig, ...opts.csvConfig } : detected.csvConfig;
        }
        
        if (detected.xmlConfig) {
          actualOpts.xmlConfig = opts.xmlConfig ? { ...detected.xmlConfig, ...opts.xmlConfig } : detected.xmlConfig;
        }
        
        if (opts.debug) {
          console.log("[convert-buddy] Auto-detected format:", detected.format);
        }
      } else {
        throw new Error("Could not auto-detect input format. Please specify inputFormat explicitly.");
      }
    }

    const buddy = await ConvertBuddy.create(actualOpts);
    const output = buddy.push(input);
    const final = buddy.finish();

    // Combine outputs
    const result = new Uint8Array(output.length + final.length);
    result.set(output, 0);
    result.set(final, output.length);

    if (opts.profile) {
      const stats = buddy.stats();
      console.log("[convert-buddy] Performance Stats:", stats);
    }

    return result;
  }

  private async convertFromBufferParallel(input: Uint8Array, opts: ConvertBuddyOptions): Promise<Uint8Array> {
    // Only use parallel processing for large inputs and supported conversions
    const parallelThreshold = 512 * 1024; // 512KB (lowered threshold for better parallelism)
    const maxConcurrency = Math.min(
      typeof navigator !== "undefined" && navigator.hardwareConcurrency
        ? navigator.hardwareConcurrency
        : 4,
      8
    );
    
    if (input.length < parallelThreshold || !opts.parallelism || opts.parallelism < 2) {
      return this.convertFromBuffer(input, { ...opts, parallelism: 1 });
    }

    // Extended support for parallel processing
    const supportedConversions = [
      { input: "csv", output: "ndjson" },
      { input: "csv", output: "json" },
      { input: "ndjson", output: "json" },
      { input: "ndjson", output: "csv" },
      { input: "ndjson", output: "ndjson" }, // passthrough optimization
      { input: "json", output: "ndjson" },
      { input: "json", output: "csv" },
    ];

    const isSupported = supportedConversions.some(
      conv => conv.input === opts.inputFormat && conv.output === opts.outputFormat
    );

    if (!isSupported) {
      if (opts.debug) {
        console.log(`[convert-buddy] Parallel processing not supported for ${opts.inputFormat} → ${opts.outputFormat}, using sequential`);
      }
      return this.convertFromBuffer(input, { ...opts, parallelism: 1 });
    }

    try {
      const actualThreads = Math.min(maxConcurrency, opts.parallelism || maxConcurrency);
      const isNodejs = typeof window === "undefined" && typeof process !== "undefined";
      
      if (opts.debug) {
        const threadingType = isNodejs ? 'Node.js WASM threading' : 'Browser custom threading';
        console.log(`[convert-buddy] Using ${threadingType} with ${actualThreads} threads`);
      }

      if (isNodejs) {
        // Try enhanced Node.js threading first
        if (!nodejsThreadPool) {
          try {
            const { NodejsThreadPool } = await import('./nodejs-thread-pool');
            nodejsThreadPool = new NodejsThreadPool({
              maxWorkers: actualThreads,
              wasmPath: '../wasm-node.cjs'
            });
            await nodejsThreadPool.initialize();
          } catch (error) {
            if (opts.debug) {
              console.log('[convert-buddy] Node.js thread pool creation failed, using JS parallelism:', error);
            }
          }
        }

        if (nodejsThreadPool) {
          return this.convertUsingNodejsThreadPool(input, opts, actualThreads);
        } else {
          return this.convertUsingJsParallelism(input, opts, actualThreads);
        }
      } else {
        // Browser: Create custom thread pool for WASM-level parallelism
        if (!threadPool) {
          const { WasmThreadPool } = await import('./thread-pool');
          threadPool = new WasmThreadPool({
            maxWorkers: actualThreads,
            wasmPath: '../wasm/web/convert_buddy.js'
          });
          await threadPool.initialize();
        }

        return this.convertUsingWasmThreadPool(input, opts, actualThreads);
      }
      
    } catch (error) {
      if (opts.debug) {
        console.warn(`[convert-buddy] Parallel processing failed, falling back to sequential:`, error);
      }
      return this.convertFromBuffer(input, { ...opts, parallelism: 1 });
    }
  }

  private async convertUsingNodejsThreadPool(input: Uint8Array, opts: ConvertBuddyOptions, numThreads: number): Promise<Uint8Array> {
    const { chunkDataNodejs, mergeResultsNodejs } = await import('./nodejs-thread-pool');
    
    if (opts.debug) {
      console.log(`[convert-buddy] Processing with enhanced Node.js threading (${numThreads} workers)`);
    }

    // Use optimized chunking for Node.js
    const chunks = chunkDataNodejs(input, numThreads);
    
    // Process chunks using Node.js worker threads
    const results = await nodejsThreadPool!.processChunks('convert', chunks, {
      outputFormat: opts.outputFormat,
      inputFormat: opts.inputFormat,
      csvConfig: opts.csvConfig,
      xmlConfig: opts.xmlConfig,
      debug: false // Disable debug in workers to reduce noise
    });

    // Merge results intelligently based on output format
    const merged = mergeResultsNodejs(results, opts.outputFormat!);
    
    if (opts.debug) {
      console.log(`[convert-buddy] Node.js threading completed: ${chunks.length} chunks, ${merged.length} bytes`);
    }

    return merged;
  }

  private async convertUsingWasmThreadPool(input: Uint8Array, opts: ConvertBuddyOptions, numThreads: number): Promise<Uint8Array> {
    const inputStr = decodeUtf8(input);
    
    // Import chunking utilities
    const { chunkData, mergeResults } = await import('./thread-pool');
    const chunks = chunkData(inputStr, numThreads);
    
    if (opts.debug) {
      console.log(`[convert-buddy] Processing ${chunks.length} chunks with WASM thread pool`);
    }

    // Determine method based on conversion type
    let method: string;
    const conversion = `${opts.inputFormat}_to_${opts.outputFormat}`;
    switch (conversion) {
      case 'csv_to_ndjson':
      case 'csv_to_json':
        method = 'parseCSV';
        break;
      case 'ndjson_to_csv':
      case 'ndjson_to_json':
        method = 'parseNDJSON';
        break;
      case 'json_to_csv':
      case 'json_to_ndjson':
        method = 'parseJSON';
        break;
      default:
        throw new Error(`Unsupported conversion: ${conversion}`);
    }

    // Process chunks in parallel using thread pool
    const results = await threadPool!.processChunks(method, chunks, {
      outputFormat: opts.outputFormat,
      csvConfig: opts.csvConfig,
      xmlConfig: opts.xmlConfig,
      debug: opts.debug
    });

    // Merge results intelligently based on output format
    const merged = mergeResults(results, opts.outputFormat!);
    return new TextEncoder().encode(merged);
  }

  private async convertUsingJsParallelism(input: Uint8Array, opts: ConvertBuddyOptions, numThreads: number): Promise<Uint8Array> {
    // Split input into chunks based on line boundaries for CSV/NDJSON
    const chunks = this.splitIntoChunks(input, Math.max(1, Math.floor(input.length / numThreads)));
    
    if (opts.debug) {
      console.log(`[convert-buddy] Processing ${chunks.length} chunks with JS-level parallelism`);
    }
    
    // Process chunks in parallel with improved coordination
    const chunkPromises = chunks.map(async (chunk, index) => {
      const chunkOpts = { ...opts, parallelism: 1 }; // Disable recursion
      
      // For CSV with headers, only the first chunk should process headers
      if (opts.inputFormat === "csv" && index > 0) {
        chunkOpts.csvConfig = { ...chunkOpts.csvConfig, hasHeaders: false };
      }
      
      const chunkBuddy = await ConvertBuddy.create(chunkOpts);
      const output = chunkBuddy.push(chunk);
      const final = chunkBuddy.finish();
      
      // Combine chunk output
      const result = new Uint8Array(output.length + final.length);
      result.set(output, 0);
      result.set(final, output.length);
      
      return result;
    });

    const chunkResults = await Promise.all(chunkPromises);

    // Combine results more efficiently
    const totalLength = chunkResults.reduce((sum, chunk) => sum + chunk.length, 0);
    const result = new Uint8Array(totalLength);
    
    let offset = 0;
    for (const chunk of chunkResults) {
      result.set(chunk, offset);
      offset += chunk.length;
    }

    if (opts.debug) {
      console.log(`[convert-buddy] JS parallel processing completed: ${chunks.length} chunks, ${totalLength} bytes`);
    }

    return result;
  }

  private splitIntoChunks(input: Uint8Array, targetChunkSize: number): Uint8Array[] {
    if (input.length <= targetChunkSize) {
      return [input];
    }

    const chunks: Uint8Array[] = [];
    let start = 0;

    while (start < input.length) {
      let end = Math.min(start + targetChunkSize, input.length);
      
      // Try to find a line boundary within a reasonable range
      if (end < input.length) {
        const searchStart = Math.max(start + targetChunkSize - 1024, start);
        const searchEnd = Math.min(end + 1024, input.length);
        
        // Look for newline
        for (let i = searchEnd - 1; i >= searchStart; i--) {
          if (input[i] === 0x0A) { // '\n'
            end = i + 1;
            break;
          }
        }
      }
      
      chunks.push(input.slice(start, end));
      start = end;
    }

    return chunks;
  }

  private async convertFromFile(file: File, opts: ConvertBuddyOptions): Promise<Uint8Array> {
    return this.convertFromBlob(file, opts);
  }

  private async convertFromBlob(blob: Blob, opts: ConvertBuddyOptions): Promise<Uint8Array> {
    // Handle auto-detection
    let actualOpts = { ...opts };
    
    if (opts.inputFormat === "auto") {
      const sampleSize = 256 * 1024; // 256KB
      const sampleBlob = blob.slice(0, sampleSize);
      const sampleBuffer = await sampleBlob.arrayBuffer();
      const sample = new Uint8Array(sampleBuffer as ArrayBuffer);
      
      const detected = await autoDetectConfig(sample, { debug: opts.debug });
      
      if (detected.format !== "unknown") {
        actualOpts.inputFormat = detected.format as Format;
        
        if (detected.csvConfig) {
          actualOpts.csvConfig = opts.csvConfig ? { ...detected.csvConfig, ...opts.csvConfig } : detected.csvConfig;
        }
        
        if (detected.xmlConfig) {
          actualOpts.xmlConfig = opts.xmlConfig ? { ...detected.xmlConfig, ...opts.xmlConfig } : detected.xmlConfig;
        }
        
        if (opts.debug) {
          console.log("[convert-buddy] Auto-detected format:", detected.format);
        }
      } else {
        throw new Error("Could not auto-detect input format. Please specify inputFormat explicitly.");
      }
    }

    const buddy = await ConvertBuddy.create(actualOpts);
    
    // Read blob as stream and process
    const stream = blob.stream();
    const reader = stream.getReader();
    
    const outputs: Uint8Array[] = [];
    
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const output = buddy.push(value);
        if (output.length > 0) {
          outputs.push(output);
        }
      }
      
      const final = buddy.finish();
      if (final.length > 0) {
        outputs.push(final);
      }
      
      // Combine all outputs
      const totalLength = outputs.reduce((sum, arr) => sum + arr.length, 0);
      const result = new Uint8Array(totalLength);
      let offset = 0;
      for (const output of outputs) {
        result.set(output, offset);
        offset += output.length;
      }
      
      if (opts.profile) {
        const stats = buddy.stats();
        console.log("[convert-buddy] Performance Stats:", stats);
      }
      
      return result;
    } finally {
      reader.releaseLock();
    }
  }

  private async convertFromStream(stream: ReadableStream<Uint8Array>, opts: ConvertBuddyOptions): Promise<Uint8Array> {
    // Handle auto-detection by reading a sample first
    let actualOpts = { ...opts };
    let firstChunks: Uint8Array[] = [];
    let totalSampleBytes = 0;
    const maxSampleSize = 256 * 1024; // 256KB
    
    if (opts.inputFormat === "auto") {
      const reader = stream.getReader();
      
      try {
        while (totalSampleBytes < maxSampleSize) {
          const { done, value } = await reader.read();
          if (done || !value) break;
          
          firstChunks.push(value);
          totalSampleBytes += value.length;
        }
        
        // Concatenate sample
        const sample = new Uint8Array(totalSampleBytes);
        let offset = 0;
        for (const chunk of firstChunks) {
          sample.set(chunk, offset);
          offset += chunk.length;
        }
        
        const detected = await autoDetectConfig(sample, { debug: opts.debug });
        
        if (detected.format !== "unknown") {
          actualOpts.inputFormat = detected.format as Format;
          
          if (detected.csvConfig) {
            actualOpts.csvConfig = opts.csvConfig ? { ...detected.csvConfig, ...opts.csvConfig } : detected.csvConfig;
          }
          
          if (detected.xmlConfig) {
            actualOpts.xmlConfig = opts.xmlConfig ? { ...detected.xmlConfig, ...opts.xmlConfig } : detected.xmlConfig;
          }
          
          if (opts.debug) {
            console.log("[convert-buddy] Auto-detected format:", detected.format);
          }
        } else {
          throw new Error("Could not auto-detect input format. Please specify inputFormat explicitly.");
        }
      } finally {
        reader.releaseLock();
      }
    }

    const buddy = await ConvertBuddy.create(actualOpts);
    
    // Process buffered chunks from auto-detection
    const outputs: Uint8Array[] = [];
    for (const chunk of firstChunks) {
      const output = buddy.push(chunk);
      if (output.length > 0) {
        outputs.push(output);
      }
    }
    
    // Continue with the rest of the stream
    const reader = stream.getReader();
    
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const output = buddy.push(value);
        if (output.length > 0) {
          outputs.push(output);
        }
      }
      
      const final = buddy.finish();
      if (final.length > 0) {
        outputs.push(final);
      }
      
      // Combine all outputs
      const totalLength = outputs.reduce((sum, arr) => sum + arr.length, 0);
      const result = new Uint8Array(totalLength);
      let offset = 0;
      for (const output of outputs) {
        result.set(output, offset);
        offset += output.length;
      }
      
      if (opts.profile) {
        const stats = buddy.stats();
        console.log("[convert-buddy] Performance Stats:", stats);
      }
      
      return result;
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * Legacy create method for backward compatibility.
   * Prefer using the constructor: new ConvertBuddy(opts)
   */
  static async create(opts: ConvertBuddyOptions = {}): Promise<ConvertBuddy> {
    const debug = !!opts.debug;
    const profile = !!opts.profile;

    // Initialize WASM once (singleton)
    await initWasm(debug);

    const wasmModule = await loadWasmModule();

    // Handle auto-detection
    let inputFormat = opts.inputFormat;
    let csvConfig = opts.csvConfig;

    // We can't auto-detect without data, so we'll defer this to push()
    // For now, just validate the format if it's not "auto"
    if (inputFormat === "auto") {
      // Auto-detection will be handled on first push()
      inputFormat = undefined;
    }

    // Optimize chunk size for better WASM performance
    // Larger chunks reduce boundary crossing overhead
    // Default: 512KB (was 1MB), but can be customized
    const chunkTargetBytes = opts.chunkTargetBytes || (512 * 1024);

    let converter;
    if (inputFormat && opts.outputFormat) {
      // Use withConfig for custom formats
      const Converter = (wasmModule as any).Converter;
      converter = Converter.withConfig(
        debug,
        inputFormat,
        opts.outputFormat,
        chunkTargetBytes,
        profile,
        csvConfig || null,
        opts.xmlConfig || null,
        opts.transform || null
      );
    } else {
      converter = new wasmModule.Converter(debug);
    }

    // Check if SIMD is enabled
    const simdEnabled = (wasmModule as any).getSimdEnabled?.() ?? false;

    if (debug) console.log("[convert-buddy-js] initialized with chunkTargetBytes:", chunkTargetBytes, "simd:", simdEnabled, opts);
    
    // Create instance using constructor and set internal properties
    const instance = new ConvertBuddy(opts);
    instance.converter = converter;
    instance.simd = simdEnabled;
    instance.initialized = true;
    
    return instance;
  }

  push(chunk: Uint8Array): Uint8Array {
    if (this.aborted) {
      throw new Error("Conversion has been aborted");
    }

    if (this.paused) {
      throw new Error("Conversion is paused. Call resume() before pushing more data.");
    }

    if (this.debug) console.log("[convert-buddy-js] push", chunk.byteLength);
    const output = this.converter.push(chunk);

    // Check if we should trigger progress callback
    if (this.onProgress) {
      const stats = this.stats();
      if (stats.bytesIn - this.lastProgressBytes >= this.progressIntervalBytes) {
        this.onProgress(stats);
        this.lastProgressBytes = stats.bytesIn;
      }
    }

    return output;
  }

  finish(): Uint8Array {
    if (this.aborted) {
      throw new Error("Conversion has been aborted");
    }

    if (this.debug) console.log("[convert-buddy-js] finish");
    const output = this.converter.finish();

    // Final progress callback
    if (this.onProgress) {
      this.onProgress(this.stats());
    }

    return output;
  }

  stats(): Stats {
    return this.converter.getStats();
  }

  abort(): void {
    this.aborted = true;
    if (this.debug) console.log("[convert-buddy-js] aborted");
  }

  pause(): void {
    this.paused = true;
    if (this.debug) console.log("[convert-buddy-js] paused");
  }

  resume(): void {
    this.paused = false;
    if (this.debug) console.log("[convert-buddy-js] resumed");
  }

  isAborted(): boolean {
    return this.aborted;
  }

  isPaused(): boolean {
    return this.paused;
  }
}

async function readSample(
  input: DetectInput,
  maxBytes = 256 * 1024
): Promise<Uint8Array> {
  if (typeof input === "string") {
    const encoded = new TextEncoder().encode(input);
    return encoded.length > maxBytes ? encoded.slice(0, maxBytes) : encoded;
  }

  if (input instanceof Uint8Array) {
    return input.length > maxBytes ? input.slice(0, maxBytes) : input;
  }

  if (input instanceof ArrayBuffer) {
    const bytes = new Uint8Array(input as ArrayBuffer);
    return bytes.length > maxBytes ? bytes.slice(0, maxBytes) : bytes;
  }

  if (isReadableStream(input)) {
    const reader = input.getReader();
    const chunks: Uint8Array[] = [];
    let total = 0;

    while (total < maxBytes) {
      const { value, done } = await reader.read();
      if (done || !value) break;
      const slice = total + value.length > maxBytes
        ? value.slice(0, maxBytes - total)
        : value;
      chunks.push(slice);
      total += slice.length;
    }

    if (total >= maxBytes) {
      await reader.cancel();
    }

    return concatChunks(chunks, total);
  }

  const chunks: Uint8Array[] = [];
  let total = 0;

  for await (const chunk of input as AsyncIterable<Uint8Array>) {
    if (total >= maxBytes) {
      break;
    }
    const data = chunk instanceof Uint8Array ? chunk : new Uint8Array(chunk);
    const slice = total + data.length > maxBytes
      ? data.slice(0, maxBytes - total)
      : data;
    chunks.push(slice);
    total += slice.length;
  }

  return concatChunks(chunks, total);
}

function concatChunks(chunks: Uint8Array[], total: number): Uint8Array {
  const result = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result;
}

function isReadableStream(
  input: DetectInput
): input is ReadableStream<Uint8Array> {
  return typeof (input as ReadableStream<Uint8Array>)?.getReader === "function";
}

async function loadDetectionWasm(debug: boolean): Promise<WasmModule> {
  const wasmModule = await loadWasmModule();
  if (typeof wasmModule.default === "function") {
    await (wasmModule.default as () => Promise<void>)();
  }
  wasmModule.init(debug);
  return wasmModule;
}

export async function detectFormat(
  input: DetectInput,
  opts: DetectOptions = {}
): Promise<Format | "unknown"> {
  const wasmModule = await loadDetectionWasm(!!opts.debug);
  const sample = await readSample(input, opts.maxBytes);
  const format = wasmModule.detectFormat?.(sample);
  return (format as Format) ?? "unknown";
}

export async function detectStructure(
  input: DetectInput,
  formatHint?: Format,
  opts: DetectOptions = {}
): Promise<StructureDetection | null> {
  const wasmModule = await loadDetectionWasm(!!opts.debug);
  const sample = await readSample(input, opts.maxBytes);
  const result = wasmModule.detectStructure?.(sample, formatHint);
  return result ?? null;
}

// Backward compatibility functions - these now use the unified detectStructure internally
export async function detectCsvFieldsAndDelimiter(
  input: DetectInput,
  opts: DetectOptions = {}
): Promise<CsvDetection | null> {
  const structure = await detectStructure(input, "csv", opts);
  if (structure && structure.format === "csv" && structure.delimiter) {
    return {
      delimiter: structure.delimiter,
      fields: structure.fields,
    };
  }
  return null;
}

export async function detectXmlElements(
  input: DetectInput,
  opts: DetectOptions = {}
): Promise<XmlDetection | null> {
  const structure = await detectStructure(input, "xml", opts);
  if (structure && structure.format === "xml") {
    return {
      elements: structure.fields,
      recordElement: structure.recordElement,
    };
  }
  return null;
}

// Helper to auto-detect format and CSV configuration from sample data
export async function autoDetectConfig(
  sample: Uint8Array,
  opts: { debug?: boolean } = {}
): Promise<{ 
  format: Format | "unknown"; 
  csvConfig?: CsvConfig;
  xmlConfig?: XmlConfig;
}> {
  const wasmModule = await loadDetectionWasm(!!opts.debug);
  
  const format = (wasmModule.detectFormat?.(sample) as Format) ?? "unknown";
  
  const result: { format: Format | "unknown"; csvConfig?: CsvConfig; xmlConfig?: XmlConfig } = { format };
  
  if (format === "csv") {
    const csvDetection = wasmModule.detectCsvFields?.(sample);
    if (csvDetection) {
      result.csvConfig = {
        delimiter: csvDetection.delimiter,
        hasHeaders: csvDetection.fields.length > 0,
      };
    }
  } else if (format === "xml") {
    const xmlDetection = wasmModule.detectXmlElements?.(sample);
    if (xmlDetection?.recordElement) {
      result.xmlConfig = {
        recordElement: xmlDetection.recordElement,
      };
    }
  }
  
  return result;
}

// Web Streams TransformStream adapter
export class ConvertBuddyTransformStream extends TransformStream<Uint8Array, Uint8Array> {
  constructor(opts: ConvertBuddyOptions = {}) {
    let buddy: ConvertBuddy | null = null;

    super({
      async start(controller) {
        buddy = await ConvertBuddy.create(opts);
      },

      transform(chunk, controller) {
        if (!buddy) {
          throw new Error("ConvertBuddy not initialized");
        }

        const output = buddy.push(chunk);
        if (output.length > 0) {
          controller.enqueue(output);
        }
      },

      flush(controller) {
        if (!buddy) {
          return;
        }

        const output = buddy.finish();
        if (output.length > 0) {
          controller.enqueue(output);
        }

        if (opts.profile) {
          const stats = buddy.stats();
          console.log("[convert-buddy] Performance Stats:", stats);
        }
      },
    });
  }
}

// Utility: Convert entire buffer/string
export async function convert(
  input: Uint8Array | string,
  opts: ConvertBuddyOptions = {}
): Promise<Uint8Array> {
  try {
    const buddy = await ConvertBuddy.create(opts);

    const inputBytes = typeof input === "string" 
      ? new TextEncoder().encode(input)
      : input;

    const output = buddy.push(inputBytes);
    const final = buddy.finish();

    // Combine outputs
    const result = new Uint8Array(output.length + final.length);
    result.set(output, 0);
    result.set(final, output.length);

    if (opts.profile) {
      const stats = buddy.stats();
      console.log("[convert-buddy] Performance Stats:", stats);
    }

    return result;
  } catch (err: any) {
    // Normalize non-Error throws (e.g., wasm JsValue) into Error with message
    if (err instanceof Error) throw err;
    try {
      // Try to stringify common structures
      const msg = typeof err === 'string' ? err : (err && err.message) ? err.message : JSON.stringify(err);
      throw new Error(String(msg));
    } catch (_) {
      throw new Error(String(err));
    }
  }
}

// Utility: Convert and return as string
export async function convertToString(
  input: Uint8Array | string,
  opts: ConvertBuddyOptions = {}
): Promise<string> {
  const result = await convert(input, opts);
  return decodeUtf8(result);
}

/**
 * Ultra-simple standalone convert function with auto-detection.
 * Accepts any input type (URL, File, Buffer, string, stream) and automatically detects format.
 * 
 * @example
 * // From URL
 * import { convertAny } from "convert-buddy-js";
 * const result = await convertAny("https://example.com/data.csv", { outputFormat: "json" });
 * 
 * @example
 * // From File (browser)
 * const file = fileInput.files[0];
 * const result = await convertAny(file, { outputFormat: "ndjson" });
 * 
 * @example
 * // From string data
 * const result = await convertAny('{"name":"Ada"}', { outputFormat: "csv" });
 */
export async function convertAny(
  input: string | Uint8Array | File | Blob | ReadableStream<Uint8Array>,
  opts: ConvertOptions
): Promise<Uint8Array> {
  const buddy = new ConvertBuddy();
  return buddy.convert(input, opts);
}

/**
 * Ultra-simple standalone convert function that returns a string.
 * Same as convertAny but decodes the output to a string.
 * 
 * @example
 * import { convertAnyToString } from "convert-buddy-js";
 * const json = await convertAnyToString("https://example.com/data.csv", { outputFormat: "json" });
 * console.log(JSON.parse(json));
 */
export async function convertAnyToString(
  input: string | Uint8Array | File | Blob | ReadableStream<Uint8Array>,
  opts: ConvertOptions
): Promise<string> {
  const result = await convertAny(input, opts);
  return decodeUtf8(result);
}

// ===== Helper Functions =====
// File format utilities for common use cases

/**
 * Get MIME type for a given format
 * 
 * @example
 * const mimeType = getMimeType("json"); // "application/json"
 */
export function getMimeType(format: Format): string {
  switch (format) {
    case "json":
      return "application/json";
    case "ndjson":
      return "application/x-ndjson";
    case "csv":
      return "text/csv";
    case "xml":
      return "application/xml";
  }
}

/**
 * Get file extension for a given format (without the dot)
 * 
 * @example
 * const ext = getExtension("json"); // "json"
 */
export function getExtension(format: Format): string {
  return format;
}

/**
 * Get suggested filename for a converted file
 * 
 * @param originalName - Original filename
 * @param outputFormat - Target format
 * @param includeTimestamp - Whether to include a timestamp (default: false)
 * 
 * @example
 * const name = getSuggestedFilename("data.csv", "json"); // "data.json"
 * const name = getSuggestedFilename("data.csv", "json", true); // "data_converted_1234567890.json"
 */
export function getSuggestedFilename(
  originalName: string,
  outputFormat: Format,
  includeTimestamp = false
): string {
  const baseName = originalName.replace(/\.[^/.]+$/, "");
  const extension = getExtension(outputFormat);
  
  if (includeTimestamp) {
    return `${baseName}_converted_${Date.now()}.${extension}`;
  }
  
  return `${baseName}.${extension}`;
}

/**
 * Get File System Access API file type configuration for showSaveFilePicker
 * 
 * @example
 * const types = getFileTypeConfig("json");
 * const handle = await showSaveFilePicker({ types });
 */
export function getFileTypeConfig(format: Format): Array<{
  description: string;
  accept: Record<string, string[]>;
}> {
  const mimeType = getMimeType(format);
  const extension = `.${getExtension(format)}`;
  
  return [
    {
      description: `${format.toUpperCase()} Files`,
      accept: { [mimeType]: [extension] },
    },
  ];
}

// WASM Threading Capabilities API
/**
 * Check if WASM threading is supported in the current environment
 * @returns true if SharedArrayBuffer and Atomics are available (required for WASM threads)
 */
export function isWasmThreadingSupported(): boolean {
  return detectWasmThreadingSupport();
}

/**
 * Get the optimal number of worker threads based on CPU cores and WASM capabilities
 * @returns Recommended thread count for optimal performance
 */
export function getOptimalThreadCount(): number {
  const cores = typeof navigator !== 'undefined' 
    ? (navigator.hardwareConcurrency || 4)
    : (process?.env?.UV_THREADPOOL_SIZE ? parseInt(process.env.UV_THREADPOOL_SIZE) : 
       typeof require !== 'undefined' ? require('os').cpus().length : 4);
  
  // For current JavaScript-level parallelism, limit to 4 parallel instances
  // When true WASM threading is enabled, this can be increased
  return Math.min(cores, 4);
}

/**
 * Get current threading capabilities and configuration
 * @returns Object with threading information
 */
export function getThreadingInfo(): {
  wasmThreadingSupported: boolean;
  customThreadPoolAvailable: boolean;
  nodejsWasmThreading: boolean;
  recommendedThreads: number;
  currentThreads: number;
  approach: string;
} {
  const isNodejs = typeof process !== 'undefined';
  
  return {
    wasmThreadingSupported: detectWasmThreadingSupport(),
    customThreadPoolAvailable: typeof window !== 'undefined',
    nodejsWasmThreading: isNodejs && !!nodejsThreadPool,
    recommendedThreads: getOptimalThreadCount(),
    currentThreads: isNodejs ? 
      (nodejsThreadPool ? nodejsThreadPool.workers?.length || 0 : 0) :
      (threadPool ? threadPool.workers?.length || 0 : 0),
    approach: isNodejs ? 'nodejs_enhanced_threading' : 'browser_custom_threading'
  };
}
