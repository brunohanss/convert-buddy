
let imports = {};
imports['__wbindgen_placeholder__'] = module.exports;
let wasm;
const { TextDecoder, TextEncoder } = require(`util`);

let cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true });

cachedTextDecoder.decode();

let cachedUint8ArrayMemory0 = null;

function getUint8ArrayMemory0() {
    if (cachedUint8ArrayMemory0 === null || cachedUint8ArrayMemory0.byteLength === 0) {
        cachedUint8ArrayMemory0 = new Uint8Array(wasm.memory.buffer);
    }
    return cachedUint8ArrayMemory0;
}

function getStringFromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return cachedTextDecoder.decode(getUint8ArrayMemory0().subarray(ptr, ptr + len));
}

let WASM_VECTOR_LEN = 0;

let cachedTextEncoder = new TextEncoder('utf-8');

const encodeString = (typeof cachedTextEncoder.encodeInto === 'function'
    ? function (arg, view) {
    return cachedTextEncoder.encodeInto(arg, view);
}
    : function (arg, view) {
    const buf = cachedTextEncoder.encode(arg);
    view.set(buf);
    return {
        read: arg.length,
        written: buf.length
    };
});

function passStringToWasm0(arg, malloc, realloc) {

    if (realloc === undefined) {
        const buf = cachedTextEncoder.encode(arg);
        const ptr = malloc(buf.length, 1) >>> 0;
        getUint8ArrayMemory0().subarray(ptr, ptr + buf.length).set(buf);
        WASM_VECTOR_LEN = buf.length;
        return ptr;
    }

    let len = arg.length;
    let ptr = malloc(len, 1) >>> 0;

    const mem = getUint8ArrayMemory0();

    let offset = 0;

    for (; offset < len; offset++) {
        const code = arg.charCodeAt(offset);
        if (code > 0x7F) break;
        mem[ptr + offset] = code;
    }

    if (offset !== len) {
        if (offset !== 0) {
            arg = arg.slice(offset);
        }
        ptr = realloc(ptr, len, len = offset + arg.length * 3, 1) >>> 0;
        const view = getUint8ArrayMemory0().subarray(ptr + offset, ptr + len);
        const ret = encodeString(arg, view);

        offset += ret.written;
        ptr = realloc(ptr, len, offset, 1) >>> 0;
    }

    WASM_VECTOR_LEN = offset;
    return ptr;
}

let cachedDataViewMemory0 = null;

function getDataViewMemory0() {
    if (cachedDataViewMemory0 === null || cachedDataViewMemory0.buffer.detached === true || (cachedDataViewMemory0.buffer.detached === undefined && cachedDataViewMemory0.buffer !== wasm.memory.buffer)) {
        cachedDataViewMemory0 = new DataView(wasm.memory.buffer);
    }
    return cachedDataViewMemory0;
}
/**
 * @param {boolean} debug_enabled
 */
module.exports.init = function(debug_enabled) {
    wasm.init(debug_enabled);
};

function takeFromExternrefTable0(idx) {
    const value = wasm.__wbindgen_export_3.get(idx);
    wasm.__externref_table_dealloc(idx);
    return value;
}

function passArray8ToWasm0(arg, malloc) {
    const ptr = malloc(arg.length * 1, 1) >>> 0;
    getUint8ArrayMemory0().set(arg, ptr / 1);
    WASM_VECTOR_LEN = arg.length;
    return ptr;
}

function getArrayU8FromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return getUint8ArrayMemory0().subarray(ptr / 1, ptr / 1 + len);
}

const ConverterFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_converter_free(ptr >>> 0, 1));
/**
 * A streaming converter state machine.
 * Converts between CSV, NDJSON, JSON, and XML formats with high performance.
 */
class Converter {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(Converter.prototype);
        obj.__wbg_ptr = ptr;
        ConverterFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        ConverterFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_converter_free(ptr, 0);
    }
    /**
     * Create a new converter with specific configuration
     * @param {boolean} debug
     * @param {string} input_format
     * @param {string} output_format
     * @param {number} chunk_target_bytes
     * @param {boolean} enable_stats
     * @returns {Converter}
     */
    static withConfig(debug, input_format, output_format, chunk_target_bytes, enable_stats) {
        const ptr0 = passStringToWasm0(input_format, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(output_format, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        const ret = wasm.converter_withConfig(debug, ptr0, len0, ptr1, len1, chunk_target_bytes, enable_stats);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return Converter.__wrap(ret[0]);
    }
    /**
     * @param {boolean} debug
     */
    constructor(debug) {
        const ret = wasm.converter_new(debug);
        this.__wbg_ptr = ret >>> 0;
        ConverterFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * Push a chunk of bytes. Returns converted output bytes for that chunk.
     * @param {Uint8Array} chunk
     * @returns {Uint8Array}
     */
    push(chunk) {
        const ptr0 = passArray8ToWasm0(chunk, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.converter_push(this.__wbg_ptr, ptr0, len0);
        if (ret[3]) {
            throw takeFromExternrefTable0(ret[2]);
        }
        var v2 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
        return v2;
    }
    /**
     * Finish the stream and return any remaining buffered output.
     * @returns {Uint8Array}
     */
    finish() {
        const ret = wasm.converter_finish(this.__wbg_ptr);
        if (ret[3]) {
            throw takeFromExternrefTable0(ret[2]);
        }
        var v1 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
        return v1;
    }
    /**
     * Get performance statistics
     * @returns {Stats}
     */
    getStats() {
        const ret = wasm.converter_getStats(this.__wbg_ptr);
        return Stats.__wrap(ret);
    }
}
module.exports.Converter = Converter;

const StatsFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_stats_free(ptr >>> 0, 1));
/**
 * Performance statistics for the converter
 */
class Stats {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(Stats.prototype);
        obj.__wbg_ptr = ptr;
        StatsFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        StatsFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_stats_free(ptr, 0);
    }
    /**
     * @returns {number}
     */
    get parse_time_ms() {
        const ret = wasm.stats_parse_time_ms(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {number}
     */
    get write_time_ms() {
        const ret = wasm.stats_write_time_ms(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {number}
     */
    get max_buffer_size() {
        const ret = wasm.stats_max_buffer_size(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * @returns {number}
     */
    get records_processed() {
        const ret = wasm.stats_records_processed(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {number}
     */
    get transform_time_ms() {
        const ret = wasm.stats_transform_time_ms(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {number}
     */
    get current_partial_size() {
        const ret = wasm.stats_current_partial_size(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * @returns {number}
     */
    get throughput_mb_per_sec() {
        const ret = wasm.stats_throughput_mb_per_sec(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {number}
     */
    get bytes_in() {
        const ret = wasm.stats_bytes_in(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {number}
     */
    get bytes_out() {
        const ret = wasm.stats_bytes_out(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {number}
     */
    get chunks_in() {
        const ret = wasm.stats_chunks_in(this.__wbg_ptr);
        return ret;
    }
}
module.exports.Stats = Stats;

module.exports.__wbg_debug_156ca727dbc3150f = function(arg0) {
    console.debug(arg0);
};

module.exports.__wbg_error_7534b8e9a36f1ab4 = function(arg0, arg1) {
    let deferred0_0;
    let deferred0_1;
    try {
        deferred0_0 = arg0;
        deferred0_1 = arg1;
        console.error(getStringFromWasm0(arg0, arg1));
    } finally {
        wasm.__wbindgen_free(deferred0_0, deferred0_1, 1);
    }
};

module.exports.__wbg_error_fab41a42d22bf2bc = function(arg0) {
    console.error(arg0);
};

module.exports.__wbg_info_c3044c86ae29faab = function(arg0) {
    console.info(arg0);
};

module.exports.__wbg_log_464d1b2190ca1e04 = function(arg0) {
    console.log(arg0);
};

module.exports.__wbg_new_8a6f238a6ece86ea = function() {
    const ret = new Error();
    return ret;
};

module.exports.__wbg_now_64d0bb151e5d3889 = function() {
    const ret = Date.now();
    return ret;
};

module.exports.__wbg_stack_0ed75d68575b0f3c = function(arg0, arg1) {
    const ret = arg1.stack;
    const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len1 = WASM_VECTOR_LEN;
    getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
    getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
};

module.exports.__wbg_warn_123db6aa8948382e = function(arg0) {
    console.warn(arg0);
};

module.exports.__wbindgen_init_externref_table = function() {
    const table = wasm.__wbindgen_export_3;
    const offset = table.grow(4);
    table.set(0, undefined);
    table.set(offset + 0, undefined);
    table.set(offset + 1, null);
    table.set(offset + 2, true);
    table.set(offset + 3, false);
    ;
};

module.exports.__wbindgen_string_new = function(arg0, arg1) {
    const ret = getStringFromWasm0(arg0, arg1);
    return ret;
};

module.exports.__wbindgen_throw = function(arg0, arg1) {
    throw new Error(getStringFromWasm0(arg0, arg1));
};

const path = require('path').join(__dirname, 'convert_buddy_bg.wasm');
const bytes = require('fs').readFileSync(path);

const wasmModule = new WebAssembly.Module(bytes);
const wasmInstance = new WebAssembly.Instance(wasmModule, imports);
wasm = wasmInstance.exports;
module.exports.__wasm = wasm;

wasm.__wbindgen_start();

