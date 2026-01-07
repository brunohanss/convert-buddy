# Convert Buddy - Implementation Details

This document describes the implementation of the high-performance streaming converter following the best-in-class roadmap.

## Architecture Overview

### Core Components

1. **JSON Parser** (`json_parser.rs`)
   - **Mode A (Portable)**: Uses `serde_json` for broad compatibility
   - **Mode B (High-Performance)**: Uses `simd-json` when `simd` feature is enabled
   - Zero-copy approach where possible
   - Fast validation and minification

2. **NDJSON Parser** (`ndjson_parser.rs`)
   - Fast line splitting using `memchr` for O(n) performance
   - Rolling buffer for partial lines across chunks
   - Minimal allocations
   - Supports NDJSON → JSON array conversion

3. **CSV Parser** (`csv_parser.rs`)
   - **Two-tier approach**:
     - Fast path: Unquoted fields with simple delimiter scanning
     - Quoted path: Full state machine for RFC 4180 compliance
   - Handles quoted fields, escaped quotes, newlines in quotes
   - Configurable delimiter, quote character, headers
   - Converts to NDJSON with proper JSON escaping

4. **XML Parser** (`xml_parser.rs`)
   - Streaming SAX-like event model using `quick-xml`
   - Record extraction mode (user specifies record element)
   - Avoids DOM building for memory efficiency
   - Supports attributes and nested elements
   - Converts to NDJSON

5. **Statistics & Instrumentation** (`stats.rs`)
   - Tracks bytes in/out, chunks, records processed
   - Phase timing (parse, transform, write)
   - Buffer size monitoring
   - Throughput calculation
   - Zero overhead when disabled

6. **Format Configuration** (`format.rs`)
   - Format enum (CSV, NDJSON, JSON, XML)
   - Converter configuration with sensible defaults
   - Per-format configuration options

## Performance Optimizations

### Memory Management

1. **Buffer Reuse**
   - Reusable `Vec<u8>` buffers to avoid allocations
   - Configurable chunk target size (default 1MB)
   - Partial line buffers cleared after processing

2. **Zero-Copy Operations**
   - Work with `&[u8]` slices instead of String
   - Avoid intermediate String creation
   - Direct byte-to-byte transformations

3. **Batch Processing**
   - Return large chunks (256KB-4MB) instead of per-record callbacks
   - Reduces WASM ↔ JS boundary crossings
   - Configurable chunk size for latency vs throughput tuning

### Parsing Optimizations

1. **Fast Path Detection**
   - CSV: Check for quotes using `memchr`, use fast path if none
   - NDJSON: Fast line splitting with `memchr`
   - JSON: Quick validation before full parse

2. **SIMD Acceleration**
   - Optional `simd-json` for JSON parsing
   - Structural scanning optimizations
   - Falls back to `serde_json` when SIMD unavailable

3. **Minimal Allocations**
   - Avoid building intermediate trees (no DOM for XML)
   - Avoid full JSON object creation
   - Stream-oriented processing

## API Design

### Rust Core (WASM)

```rust
// Simple streaming API
let mut converter = Converter::new(debug);
let output = converter.push(chunk);  // Returns Vec<u8>
let final_output = converter.finish();

// With configuration
let converter = Converter::with_config(
    debug,
    "csv",
    "ndjson",
    1024 * 1024,  // chunk size
    true          // enable stats
)?;

// Get statistics
let stats = converter.get_stats();
```

### TypeScript Wrapper

```typescript
// Simple conversion
const result = await convert(input, {
  inputFormat: "csv",
  outputFormat: "ndjson",
  profile: true
});

// Streaming API
const buddy = await ConvertBuddy.create({
  inputFormat: "csv",
  outputFormat: "ndjson"
});
const output1 = buddy.push(chunk1);
const output2 = buddy.push(chunk2);
const final = buddy.finish();

// Node.js Transform Stream
const transform = await createNodeTransform({
  inputFormat: "csv",
  outputFormat: "ndjson"
});
inputStream.pipe(transform).pipe(outputStream);

// Web Streams
const transformStream = new ConvertBuddyTransformStream({
  inputFormat: "csv",
  outputFormat: "ndjson"
});
```

## Benchmarking

### Benchmark Harness

Located in `packages/convert-buddy-js/bench/`:

- **runner.ts**: Main benchmark runner using `node:perf_hooks`
- **datasets.ts**: Dataset generators for various scenarios

### Metrics Tracked

1. **Throughput** (MB/s)
   - Parse throughput
   - Transform throughput
   - End-to-end throughput

2. **Memory** (MB)
   - Heap usage
   - Peak memory
   - RSS

3. **Latency** (ms)
   - Time to first output
   - Total processing time

4. **Records/sec**
   - Record processing rate

### Running Benchmarks

```bash
cd packages/convert-buddy-js
npm run build
npm run bench
```

Results saved to `bench-results.json`.

## Supported Conversions

| From    | To      | Status | Notes |
|---------|---------|--------|-------|
| CSV     | NDJSON  | ✅     | Full support with fast/quoted paths |
| NDJSON  | NDJSON  | ✅     | Passthrough with validation |
| NDJSON  | JSON    | ✅     | Converts to JSON array |
| XML     | NDJSON  | ✅     | Record extraction mode |
| JSON    | JSON    | ✅     | Passthrough with validation |

Future conversions can be added by implementing the appropriate parser state in `lib.rs`.

## Configuration Options

### CSV Configuration

```typescript
{
  delimiter: ",",        // Field delimiter
  quote: '"',           // Quote character
  hasHeaders: true,     // First row is headers
  trimWhitespace: false // Trim field whitespace
}
```

### XML Configuration

```typescript
{
  recordElement: "row",      // Element name for records
  trimText: true,            // Trim text content
  includeAttributes: true    // Include attributes in output
}
```

### Converter Options

```typescript
{
  debug: false,              // Enable debug logging
  profile: false,            // Enable performance stats
  chunkTargetBytes: 1048576, // 1MB chunk size
  parallelism: 1             // Worker threads (Node only)
}
```

## Testing

### Smoke Tests

Comprehensive test suite in `src/smoke-test.ts`:

- Basic conversions
- Streaming API
- Quoted CSV handling
- Partial line handling
- Large datasets
- Empty lines and whitespace
- Performance stats

Run tests:
```bash
npm run test
```

### Unit Tests

Rust unit tests in each module:
```bash
cd crates/convert-buddy
cargo test
```

## Build Process

### WASM Compilation

Two targets:
1. **Web**: `wasm32-unknown-unknown` for browsers/Workers
2. **Node**: `wasm32-wasi` for Node.js

Build scripts in `packages/convert-buddy-js/scripts/`:
- `build-wasm.mjs`: Compiles Rust to WASM
- `clean.mjs`: Cleans build artifacts

### TypeScript Compilation

Uses `tsup` for bundling:
- ESM output for modern environments
- Type definitions generation
- Source maps

## Performance Targets

Based on the roadmap, we aim for:

### CSV
- **Simple CSV**: 200-500 MB/s parse throughput
- **Quoted CSV**: 100-200 MB/s parse throughput

### NDJSON
- **Small objects**: 300-600 MB/s
- **Large objects**: 150-300 MB/s

### XML
- **Shallow**: 100-200 MB/s
- **Deep**: 50-100 MB/s

### Memory
- **Peak RSS**: < 2x input size
- **Heap**: < 1.5x input size

## Future Enhancements

1. **Parallelism** (Step 3.3 from roadmap)
   - Worker pool for Node.js
   - Chunk-based parallelization for NDJSON
   - Auto-disable in Workers

2. **Additional Formats**
   - Parquet
   - Avro
   - Protocol Buffers

3. **Schema Support**
   - Optional schema for CSV (avoid parsing overhead)
   - Type inference
   - Validation

4. **Advanced Streaming**
   - Backpressure handling
   - Adaptive chunk sizing
   - Memory limits

5. **Compression**
   - Gzip input/output
   - Streaming decompression

## License

MIT
