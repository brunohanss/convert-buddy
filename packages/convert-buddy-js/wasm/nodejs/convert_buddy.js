
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

function addToExternrefTable0(obj) {
    const idx = wasm.__externref_table_alloc();
    wasm.__wbindgen_export_3.set(idx, obj);
    return idx;
}

function handleError(f, args) {
    try {
        return f.apply(this, args);
    } catch (e) {
        const idx = addToExternrefTable0(e);
        wasm.__wbindgen_exn_store(idx);
    }
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

function debugString(val) {
    // primitive types
    const type = typeof val;
    if (type == 'number' || type == 'boolean' || val == null) {
        return  `${val}`;
    }
    if (type == 'string') {
        return `"${val}"`;
    }
    if (type == 'symbol') {
        const description = val.description;
        if (description == null) {
            return 'Symbol';
        } else {
            return `Symbol(${description})`;
        }
    }
    if (type == 'function') {
        const name = val.name;
        if (typeof name == 'string' && name.length > 0) {
            return `Function(${name})`;
        } else {
            return 'Function';
        }
    }
    // objects
    if (Array.isArray(val)) {
        const length = val.length;
        let debug = '[';
        if (length > 0) {
            debug += debugString(val[0]);
        }
        for(let i = 1; i < length; i++) {
            debug += ', ' + debugString(val[i]);
        }
        debug += ']';
        return debug;
    }
    // Test for built-in
    const builtInMatches = /\[object ([^\]]+)\]/.exec(toString.call(val));
    let className;
    if (builtInMatches && builtInMatches.length > 1) {
        className = builtInMatches[1];
    } else {
        // Failed to match the standard '[object ClassName]'
        return toString.call(val);
    }
    if (className == 'Object') {
        // we're a user defined class or Object
        // JSON.stringify avoids problems with cycles, and is generally much
        // easier than looping through ownProperties of `val`.
        try {
            return 'Object(' + JSON.stringify(val) + ')';
        } catch (_) {
            return 'Object';
        }
    }
    // errors
    if (val instanceof Error) {
        return `${val.name}: ${val.message}\n${val.stack}`;
    }
    // TODO we could test for more things here, like `Set`s and `Map`s.
    return className;
}

function isLikeNone(x) {
    return x === undefined || x === null;
}

function passArray8ToWasm0(arg, malloc) {
    const ptr = malloc(arg.length * 1, 1) >>> 0;
    getUint8ArrayMemory0().set(arg, ptr / 1);
    WASM_VECTOR_LEN = arg.length;
    return ptr;
}
/**
 * Detect XML elements from a sample of bytes.
 * @param {Uint8Array} sample
 * @returns {any}
 */
module.exports.detectXmlElements = function(sample) {
    const ptr0 = passArray8ToWasm0(sample, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.detectXmlElements(ptr0, len0);
    return ret;
};

/**
 * Detect the input format from a sample of bytes.
 * @param {Uint8Array} sample
 * @returns {string | undefined}
 */
module.exports.detectFormat = function(sample) {
    const ptr0 = passArray8ToWasm0(sample, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.detectFormat(ptr0, len0);
    let v2;
    if (ret[0] !== 0) {
        v2 = getStringFromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
    }
    return v2;
};

/**
 * Check if SIMD is enabled in this build.
 * @returns {boolean}
 */
module.exports.getSimdEnabled = function() {
    const ret = wasm.getSimdEnabled();
    return ret !== 0;
};

/**
 * Detect CSV fields and delimiter from a sample of bytes.
 * @param {Uint8Array} sample
 * @returns {any}
 */
module.exports.detectCsvFields = function(sample) {
    const ptr0 = passArray8ToWasm0(sample, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.detectCsvFields(ptr0, len0);
    return ret;
};

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
     * @param {any} csv_config
     * @param {any} xml_config
     * @returns {Converter}
     */
    static withConfig(debug, input_format, output_format, chunk_target_bytes, enable_stats, csv_config, xml_config) {
        const ptr0 = passStringToWasm0(input_format, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(output_format, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        const ret = wasm.converter_withConfig(debug, ptr0, len0, ptr1, len1, chunk_target_bytes, enable_stats, csv_config, xml_config);
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

module.exports.__wbg_buffer_61b7ce01341d7f88 = function(arg0) {
    const ret = arg0.buffer;
    return ret;
};

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

module.exports.__wbg_getwithrefkey_1dc361bd10053bfe = function(arg0, arg1) {
    const ret = arg0[arg1];
    return ret;
};

module.exports.__wbg_info_c3044c86ae29faab = function(arg0) {
    console.info(arg0);
};

module.exports.__wbg_instanceof_ArrayBuffer_670ddde44cdb2602 = function(arg0) {
    let result;
    try {
        result = arg0 instanceof ArrayBuffer;
    } catch (_) {
        result = false;
    }
    const ret = result;
    return ret;
};

module.exports.__wbg_instanceof_Uint8Array_28af5bc19d6acad8 = function(arg0) {
    let result;
    try {
        result = arg0 instanceof Uint8Array;
    } catch (_) {
        result = false;
    }
    const ret = result;
    return ret;
};

module.exports.__wbg_length_65d1cd11729ced11 = function(arg0) {
    const ret = arg0.length;
    return ret;
};

module.exports.__wbg_log_464d1b2190ca1e04 = function(arg0) {
    console.log(arg0);
};

module.exports.__wbg_new_254fa9eac11932ae = function() {
    const ret = new Array();
    return ret;
};

module.exports.__wbg_new_3ff5b33b1ce712df = function(arg0) {
    const ret = new Uint8Array(arg0);
    return ret;
};

module.exports.__wbg_new_688846f374351c92 = function() {
    const ret = new Object();
    return ret;
};

module.exports.__wbg_new_8a6f238a6ece86ea = function() {
    const ret = new Error();
    return ret;
};

module.exports.__wbg_now_64d0bb151e5d3889 = function() {
    const ret = Date.now();
    return ret;
};

module.exports.__wbg_push_6edad0df4b546b2c = function(arg0, arg1) {
    const ret = arg0.push(arg1);
    return ret;
};

module.exports.__wbg_set_23d69db4e5c66a6e = function(arg0, arg1, arg2) {
    arg0.set(arg1, arg2 >>> 0);
};

module.exports.__wbg_set_4e647025551483bd = function() { return handleError(function (arg0, arg1, arg2) {
    const ret = Reflect.set(arg0, arg1, arg2);
    return ret;
}, arguments) };

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

module.exports.__wbindgen_boolean_get = function(arg0) {
    const v = arg0;
    const ret = typeof(v) === 'boolean' ? (v ? 1 : 0) : 2;
    return ret;
};

module.exports.__wbindgen_debug_string = function(arg0, arg1) {
    const ret = debugString(arg1);
    const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len1 = WASM_VECTOR_LEN;
    getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
    getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
};

module.exports.__wbindgen_error_new = function(arg0, arg1) {
    const ret = new Error(getStringFromWasm0(arg0, arg1));
    return ret;
};

module.exports.__wbindgen_in = function(arg0, arg1) {
    const ret = arg0 in arg1;
    return ret;
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

module.exports.__wbindgen_is_null = function(arg0) {
    const ret = arg0 === null;
    return ret;
};

module.exports.__wbindgen_is_object = function(arg0) {
    const val = arg0;
    const ret = typeof(val) === 'object' && val !== null;
    return ret;
};

module.exports.__wbindgen_is_undefined = function(arg0) {
    const ret = arg0 === undefined;
    return ret;
};

module.exports.__wbindgen_jsval_loose_eq = function(arg0, arg1) {
    const ret = arg0 == arg1;
    return ret;
};

module.exports.__wbindgen_memory = function() {
    const ret = wasm.memory;
    return ret;
};

module.exports.__wbindgen_number_get = function(arg0, arg1) {
    const obj = arg1;
    const ret = typeof(obj) === 'number' ? obj : undefined;
    getDataViewMemory0().setFloat64(arg0 + 8 * 1, isLikeNone(ret) ? 0 : ret, true);
    getDataViewMemory0().setInt32(arg0 + 4 * 0, !isLikeNone(ret), true);
};

module.exports.__wbindgen_string_get = function(arg0, arg1) {
    const obj = arg1;
    const ret = typeof(obj) === 'string' ? obj : undefined;
    var ptr1 = isLikeNone(ret) ? 0 : passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    var len1 = WASM_VECTOR_LEN;
    getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
    getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
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

