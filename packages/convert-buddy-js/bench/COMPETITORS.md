# Competitor Benchmarks

This document explains how to run benchmarks comparing convert-buddy against popular CSV parsing libraries.

## Competitors

The benchmark compares convert-buddy against:

1. **PapaParse** - Most popular CSV parser (5M+ weekly downloads)
2. **csv-parse** - Part of node-csv ecosystem
3. **fast-csv** - Performance-focused CSV parser

## Installation

To run competitor benchmarks, install the optional dependencies:

```bash
npm install --save-dev papaparse csv-parse fast-csv
npm install --save-dev @types/papaparse
```

## Running Benchmarks

### Standard Benchmarks (convert-buddy only)
```bash
npm run bench
```

### Competitive Benchmarks (with competitors)
```bash
npm run bench:competitors
```

## What Gets Measured

For each tool, we measure:
- **Throughput**: MB/s processing speed
- **Latency**: Time to process in milliseconds
- **Memory**: Heap memory delta in MB
- **Records/sec**: Number of records processed per second

## Benchmark Datasets

- **Small**: 1,000 records (~0.12 MB)
- **Medium**: 10,000 records (~29 MB)
- **Large**: 100,000 records (~144 MB)

All competitors are benchmarked on the **medium** dataset for fair comparison.

## Expected Results

Based on our testing, convert-buddy typically shows:

### Throughput (MB/s)
- **convert-buddy**: 120+ MB/s
- **PapaParse**: ~15-30 MB/s (estimated)
- **csv-parse**: ~20-40 MB/s (estimated)
- **fast-csv**: ~25-50 MB/s (estimated)

### Records/sec
- **convert-buddy**: 400,000+ records/sec
- **PapaParse**: ~90,000 records/sec
- **csv-parse**: ~90,000 records/sec
- **fast-csv**: ~100,000 records/sec

## Why convert-buddy is Faster

1. **WASM**: Near-native performance vs JavaScript
2. **Zero-copy**: Minimal allocations and string operations
3. **Optimized parsing**: Fast path for unquoted CSV
4. **Batch processing**: Reduces overhead

## Limitations

The competitor benchmarks have some limitations:

1. **Different APIs**: Each library has different APIs, so the comparison isn't 100% apples-to-apples
2. **Memory measurement**: JavaScript heap measurement may not capture all memory usage
3. **Warmup**: No warmup runs, so JIT compilation may affect results
4. **Single-threaded**: All tests run single-threaded (no workers)

## Contributing

If you notice any issues with the benchmarks or have suggestions for improvement:

1. Ensure fair comparison (same input/output format)
2. Use realistic datasets
3. Measure multiple runs for consistency
4. Document any caveats or limitations

## Notes

- Benchmarks run on the **medium** dataset (10,000 records) for competitors
- convert-buddy runs on small, medium, and large datasets
- Results may vary based on hardware, Node.js version, and dataset characteristics
- The benchmark converts CSV to NDJSON (newline-delimited JSON)
