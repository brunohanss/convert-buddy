# Benchmarks

This directory contains the benchmarking infrastructure for convert-buddy-js.

## Files

### Core Benchmarks
- [`runner.ts`](./runner.ts) - Main benchmark suite runner
- [`ci-runner.ts`](./ci-runner.ts) - CI-optimized runner
- [`datasets.ts`](./datasets.ts) - Test data generation
- [`single-thread.ts`](./single-thread.ts) - Single-threaded benchmarks
- [`multi-thread.ts`](./multi-thread.ts) - Multi-threaded benchmarks
- [`compare-threads.ts`](./compare-threads.ts) - Thread comparison benchmarks

### Competitor Comparisons
- [`runner-with-competitors.ts`](./runner-with-competitors.ts) - Compare with other libraries
- [`runner-competitors-comprehensive.ts`](./runner-competitors-comprehensive.ts) - Comprehensive comparison suite
- [`large-file-competitors.ts`](./large-file-competitors.ts) - 100MB cross-format competitor benchmark

### Use Cases
- [`use-cases/`](./use-cases/) - Real-world usage scenario benchmarks

### Performance Guardrails
- [`performance-baselines.json`](./performance-baselines.json) - Performance targets and thresholds
- [`compare-benchmarks.ts`](./compare-benchmarks.ts) - Benchmark comparison and regression detection
- [`PERFORMANCE.md`](./PERFORMANCE.md) - Performance monitoring documentation

## Quick Start

### Run all benchmarks
```bash
npm run bench
```

### Check against performance targets
```bash
# Bash/Linux/macOS
npm run bench && npm run bench:check

# PowerShell/Windows
npm run bench; npm run bench:check
```

### Compare with baseline
```bash
npm run bench:compare-baseline path/to/baseline.json
```

### Run competitor comparisons
```bash
npm run bench:competitors
```

### Run 100MB competitor benchmark
```bash
npm run bench:competitors-100mb
```

## Performance Targets

We maintain minimum performance thresholds for key workloads:

| Workload | Min Throughput | Max Latency |
|----------|----------------|-------------|
| CSV→JSON (small) | 20 MB/s | 10 ms |
| CSV→JSON (medium) | 50 MB/s | 300 ms |
| CSV→JSON (large) | 80 MB/s | 2000 ms |

See [`performance-baselines.json`](./performance-baselines.json) for complete targets.

## CI Integration

Benchmarks run automatically on:
- Every push to `main` (creates baseline)
- Every pull request (compares against baseline)

See [`PERFORMANCE.md`](./PERFORMANCE.md) for details.

## Output Format

Benchmark results are saved as JSON:

```json
{
  "timestamp": "2026-01-12T10:30:00.000Z",
  "platform": "linux",
  "arch": "x64",
  "nodeVersion": "v20.0.0",
  "results": [
    {
      "name": "CSV->JSON (small)",
      "dataset": "0.12 MB",
      "throughputMbps": 25.5,
      "latencyMs": 4.5,
      "memoryMb": 2.1,
      "recordsPerSec": 45000
    }
  ]
}
```

## Adding New Benchmarks

1. Add benchmark function to appropriate runner
2. Update `performance-baselines.json` with targets
3. Run locally to validate
4. Submit PR (CI will validate)

Example:

```typescript
const result = await benchmarkConversion(
  "My New Test",
  testData,
  { inputFormat: "csv", outputFormat: "json" }
);
results.push(result);
```

## Troubleshooting

### High variability
- Ensure system is idle during benchmark
- Use `--expose-gc` flag
- Set `UV_THREADPOOL_SIZE=4`
- Close other applications

### Memory measurements
- Memory measurements include V8 heap overhead
- Use `global.gc()` between tests for consistency
- Measurements are relative, not absolute

### Comparison with other tools
- Different parsing strategies affect performance
- WASM initialization has fixed overhead
- Streaming vs buffered approaches differ
- Consider both throughput and memory usage
