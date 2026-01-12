/* tslint:disable */
/* eslint-disable */
/**
 * Detect XML elements from a sample of bytes.
 */
export function detectXmlElements(sample: Uint8Array): any;
/**
 * Detect the input format from a sample of bytes.
 */
export function detectFormat(sample: Uint8Array): string | undefined;
/**
 * Check if threading is enabled in this build.
 */
export function getThreadingEnabled(): boolean;
export function get_threading_support_info(): any;
export function init(debug_enabled: boolean): void;
/**
 * Detect CSV fields and delimiter from a sample of bytes.
 */
export function detectCsvFields(sample: Uint8Array): any;
/**
 * Check if SIMD is enabled in this build.
 */
export function getSimdEnabled(): boolean;
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
