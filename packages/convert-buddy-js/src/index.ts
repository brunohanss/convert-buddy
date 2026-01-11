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
  csvConfig?: CsvConfig;
  xmlConfig?: XmlConfig;
  onProgress?: ProgressCallback;
  progressIntervalBytes?: number; // Trigger progress callback every N bytes (default: 1MB)
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
  getSimdEnabled?: () => boolean;
  __wbg_set_wasm?: (wasm: unknown) => void;
};

let wasmModuleInstance: WasmModule | null = null;
let wasmModuleLoadPromise: Promise<WasmModule> | null = null;

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

    if (isNode) {
      const { createRequire } = await import("node:module");
      const require = createRequire(import.meta.url);
      const mod = require("../../wasm-node.cjs");
      return mod as WasmModule;
    }

    const wasmUrl = new URL("../wasm/web/convert_buddy.js", import.meta.url);
    const mod = (await import(wasmUrl.href)) as unknown as WasmModule;
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
  public simd: boolean;

  private constructor(converter: any, debug: boolean, profile: boolean, simd: boolean, opts: ConvertBuddyOptions = {}) {
    this.converter = converter;
    this.debug = debug;
    this.profile = profile;
    this.simd = simd;
    this.onProgress = opts.onProgress;
    this.progressIntervalBytes = opts.progressIntervalBytes || 1024 * 1024; // 1MB default
  }

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
        opts.xmlConfig || null
      );
    } else {
      converter = new wasmModule.Converter(debug);
    }

    // Check if SIMD is enabled
    const simdEnabled = (wasmModule as any).getSimdEnabled?.() ?? false;

    if (debug) console.log("[convert-buddy-js] initialized with chunkTargetBytes:", chunkTargetBytes, "simd:", simdEnabled, opts);
    return new ConvertBuddy(converter, debug, profile, simdEnabled, opts);
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

export async function detectCsvFieldsAndDelimiter(
  input: DetectInput,
  opts: DetectOptions = {}
): Promise<CsvDetection | null> {
  const wasmModule = await loadDetectionWasm(!!opts.debug);
  const sample = await readSample(input, opts.maxBytes);
  const result = wasmModule.detectCsvFields?.(sample);
  return result ?? null;
}

export async function detectXmlElements(
  input: DetectInput,
  opts: DetectOptions = {}
): Promise<XmlDetection | null> {
  const wasmModule = await loadDetectionWasm(!!opts.debug);
  const sample = await readSample(input, opts.maxBytes);
  const result = wasmModule.detectXmlElements?.(sample);
  return result ?? null;
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
}

// Utility: Convert and return as string
export async function convertToString(
  input: Uint8Array | string,
  opts: ConvertBuddyOptions = {}
): Promise<string> {
  const result = await convert(input, opts);
  return new TextDecoder().decode(result);
}
