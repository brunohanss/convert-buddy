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

export type DetectOptions = {
  maxBytes?: number;
  debug?: boolean;
};

export type ConvertBuddyOptions = {
  debug?: boolean;
  profile?: boolean;
  inputFormat?: Format;
  outputFormat?: Format;
  chunkTargetBytes?: number;
  parallelism?: number; // Node only - number of worker threads
  csvConfig?: CsvConfig;
  xmlConfig?: XmlConfig;
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
  __wbg_set_wasm?: (wasm: unknown) => void;
};

async function loadWasmModule(): Promise<WasmModule> {
  const isNode =
    typeof process !== "undefined" &&
    !!(process as any).versions?.node;

  if (isNode) {
    const { createRequire } = await import("node:module");
    const require = createRequire(import.meta.url);
    const mod = require("../wasm-node.cjs");
    return mod as WasmModule;
  }

  const mod = (await import("../wasm/web/convert_buddy.js")) as unknown as WasmModule;
  return mod;
}

export class ConvertBuddy {
  private converter: any;
  private debug: boolean;
  private profile: boolean;

  private constructor(converter: any, debug: boolean, profile: boolean) {
    this.converter = converter;
    this.debug = debug;
    this.profile = profile;
  }

  static async create(opts: ConvertBuddyOptions = {}): Promise<ConvertBuddy> {
    const debug = !!opts.debug;
    const profile = !!opts.profile;

    const wasmModule = await loadWasmModule();

    if (typeof wasmModule.default === "function") {
      await (wasmModule.default as () => Promise<void>)();
    }

    wasmModule.init(debug);

    let converter;
    if (opts.inputFormat && opts.outputFormat) {
      // Use withConfig for custom formats
      const Converter = (wasmModule as any).Converter;
      converter = Converter.withConfig(
        debug,
        opts.inputFormat,
        opts.outputFormat,
        opts.chunkTargetBytes || 1024 * 1024,
        profile
      );
    } else {
      converter = new wasmModule.Converter(debug);
    }

    if (debug) console.log("[convert-buddy-js] initialized", opts);
    return new ConvertBuddy(converter, debug, profile);
  }

  push(chunk: Uint8Array): Uint8Array {
    if (this.debug) console.log("[convert-buddy-js] push", chunk.byteLength);
    return this.converter.push(chunk);
  }

  finish(): Uint8Array {
    if (this.debug) console.log("[convert-buddy-js] finish");
    return this.converter.finish();
  }

  stats(): Stats {
    return this.converter.getStats();
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
    const bytes = new Uint8Array(input);
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
