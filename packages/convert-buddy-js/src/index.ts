export type ConvertBuddyOptions = {
  debug?: boolean;
};

type WasmModule = {
  default?: unknown;
  init: (debugEnabled: boolean) => void;
  Converter: new (debug: boolean) => {
    push: (chunk: Uint8Array) => Uint8Array;
    finish: () => Uint8Array;
  };
};

async function loadWasmModule(): Promise<WasmModule> {
  // Heuristic: Cloudflare Workers and browsers have `WebAssembly` + `fetch` and no `process.versions.node`.
  const isNode =
    typeof process !== "undefined" &&
    !!(process as any).versions?.node;

  if (isNode) {
    // Load the CJS shim from ESM using createRequire
    const { createRequire } = await import("node:module");
    const require = createRequire(import.meta.url);
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require("../wasm-node.cjs");
    return mod as WasmModule;
  }

  // Web/Worker path
  const mod = (await import("../wasm/web/convert_buddy.js")) as unknown as WasmModule;
  return mod;
}

export class ConvertBuddy {
  private converter: any;
  private debug: boolean;

  private constructor(converter: any, debug: boolean) {
    this.converter = converter;
    this.debug = debug;
  }

  static async create(opts: ConvertBuddyOptions = {}): Promise<ConvertBuddy> {
    const debug = !!opts.debug;

    const wasmModule = await loadWasmModule();

    // For web target, default init is usually a function that fetches/instantiates wasm.
    // For nodejs target, it's typically not needed (sync require loads wasm).
    if (typeof wasmModule.default === "function") {
      await (wasmModule.default as () => Promise<void>)();
    }

    wasmModule.init(debug);
    const converter = new wasmModule.Converter(debug);

    if (debug) console.log("[convert-buddy-js] initialized with debug logging");
    return new ConvertBuddy(converter, debug);
  }

  push(chunk: Uint8Array): Uint8Array {
    if (this.debug) console.log("[convert-buddy-js] push", chunk.byteLength);
    return this.converter.push(chunk);
  }

  finish(): Uint8Array {
    if (this.debug) console.log("[convert-buddy-js] finish");
    return this.converter.finish();
  }
}
