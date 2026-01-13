/* tslint:disable */
/* eslint-disable */
export function init(debug_enabled: boolean): void;
/**
 * Detect CSV fields and delimiter from a sample of bytes.
 */
export function detectCsvFields(sample: Uint8Array): any;
export function get_threading_support_info(): any;
/**
 * Detect XML elements from a sample of bytes.
 */
export function detectXmlElements(sample: Uint8Array): any;
/**
 * Detect the input format from a sample of bytes.
 */
export function detectFormat(sample: Uint8Array): string | undefined;
/**
 * Check if SIMD is enabled in this build.
 */
export function getSimdEnabled(): boolean;
/**
 * Check if threading is enabled in this build.
 */
export function getThreadingEnabled(): boolean;
/**
 * A streaming converter state machine.
 * Converts between CSV, NDJSON, JSON, and XML formats with high performance.
 */
export class Converter {
  free(): void;
  /**
   * Create a new converter with specific configuration
   */
  static withConfig(debug: boolean, input_format: string, output_format: string, chunk_target_bytes: number, enable_stats: boolean, csv_config: any, xml_config: any): Converter;
  constructor(debug: boolean);
  /**
   * Push a chunk of bytes. Returns converted output bytes for that chunk.
   */
  push(chunk: Uint8Array): Uint8Array;
  /**
   * Finish the stream and return any remaining buffered output.
   */
  finish(): Uint8Array;
  /**
   * Get performance statistics
   */
  getStats(): Stats;
}
/**
 * Performance statistics for the converter
 */
export class Stats {
  private constructor();
  free(): void;
  readonly parse_time_ms: number;
  readonly write_time_ms: number;
  readonly max_buffer_size: number;
  readonly records_processed: number;
  readonly transform_time_ms: number;
  readonly current_partial_size: number;
  readonly throughput_mb_per_sec: number;
  readonly bytes_in: number;
  readonly bytes_out: number;
  readonly chunks_in: number;
}

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
  readonly memory: WebAssembly.Memory;
  readonly __wbg_converter_free: (a: number, b: number) => void;
  readonly __wbg_stats_free: (a: number, b: number) => void;
  readonly converter_finish: (a: number) => [number, number, number, number];
  readonly converter_getStats: (a: number) => number;
  readonly converter_new: (a: number) => number;
  readonly converter_push: (a: number, b: number, c: number) => [number, number, number, number];
  readonly converter_withConfig: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: any, i: any) => [number, number, number];
  readonly detectCsvFields: (a: number, b: number) => any;
  readonly detectFormat: (a: number, b: number) => [number, number];
  readonly detectXmlElements: (a: number, b: number) => any;
  readonly getSimdEnabled: () => number;
  readonly getThreadingEnabled: () => number;
  readonly get_threading_support_info: () => any;
  readonly init: (a: number) => void;
  readonly stats_bytes_in: (a: number) => number;
  readonly stats_bytes_out: (a: number) => number;
  readonly stats_chunks_in: (a: number) => number;
  readonly stats_current_partial_size: (a: number) => number;
  readonly stats_max_buffer_size: (a: number) => number;
  readonly stats_parse_time_ms: (a: number) => number;
  readonly stats_records_processed: (a: number) => number;
  readonly stats_throughput_mb_per_sec: (a: number) => number;
  readonly stats_transform_time_ms: (a: number) => number;
  readonly stats_write_time_ms: (a: number) => number;
  readonly __wbindgen_free: (a: number, b: number, c: number) => void;
  readonly __wbindgen_exn_store: (a: number) => void;
  readonly __externref_table_alloc: () => number;
  readonly __wbindgen_export_3: WebAssembly.Table;
  readonly __wbindgen_malloc: (a: number, b: number) => number;
  readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
  readonly __externref_table_dealloc: (a: number) => void;
  readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;
/**
* Instantiates the given `module`, which can either be bytes or
* a precompiled `WebAssembly.Module`.
*
* @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
*
* @returns {InitOutput}
*/
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
* If `module_or_path` is {RequestInfo} or {URL}, makes a request and
* for everything else, calls `WebAssembly.instantiate` directly.
*
* @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
*
* @returns {Promise<InitOutput>}
*/
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
