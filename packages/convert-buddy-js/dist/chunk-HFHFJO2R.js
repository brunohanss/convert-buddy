// src/index.ts
async function loadWasmModule() {
  const isNode = typeof process !== "undefined" && !!process.versions?.node;
  if (isNode) {
    const { createRequire } = await import("module");
    const require2 = createRequire(import.meta.url);
    const mod2 = require2("../wasm-node.cjs");
    return mod2;
  }
  const mod = await import("../wasm/web/convert_buddy.js");
  return mod;
}
var ConvertBuddy = class _ConvertBuddy {
  converter;
  debug;
  constructor(converter, debug) {
    this.converter = converter;
    this.debug = debug;
  }
  static async create(opts = {}) {
    const debug = !!opts.debug;
    const wasmModule = await loadWasmModule();
    if (typeof wasmModule.default === "function") {
      await wasmModule.default();
    }
    wasmModule.init(debug);
    const converter = new wasmModule.Converter(debug);
    if (debug) console.log("[convert-buddy-js] initialized with debug logging");
    return new _ConvertBuddy(converter, debug);
  }
  push(chunk) {
    if (this.debug) console.log("[convert-buddy-js] push", chunk.byteLength);
    return this.converter.push(chunk);
  }
  finish() {
    if (this.debug) console.log("[convert-buddy-js] finish");
    return this.converter.finish();
  }
};

export {
  ConvertBuddy
};
//# sourceMappingURL=chunk-HFHFJO2R.js.map