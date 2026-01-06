# Convert Buddy Benchmarks

This directory contains benchmark harness and dataset generators for testing convert-buddy performance.

## Files

- **runner.ts** - Main benchmark harness using Node.js `perf_hooks`
- **datasets.ts** - Dataset generators for CSV, NDJSON, JSON, and XML

## Running Benchmarks

```bash
npm run bench
```

This will:
1. Build the WASM module and TypeScript code
2. Run all benchmarks
3. Output results to console and `bench-results.json`

## Benchmark Metrics

- **Throughput**: MB/s processing speed
- **Latency**: Time to process in milliseconds
- **Memory**: Peak memory usage in MB
- **Records/sec**: Number of records processed per second

## Dataset Sizes

- **Small**: 1,000 records
- **Medium**: 10,000 records
- **Large**: 100,000 records

## Conversions Tested

- CSV → NDJSON (simple and quoted)
- NDJSON → JSON
- XML → NDJSON
- Streaming vs batch comparison
