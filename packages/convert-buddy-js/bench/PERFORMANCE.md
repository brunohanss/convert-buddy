# Performance Guardrails

This document describes the performance monitoring and regression detection system for convert-buddy.

## Overview

We use a multi-layered approach to ensure performance remains stable across releases:

1. **Absolute Performance Targets** - Minimum acceptable performance thresholds
2. **Baseline Comparison** - Track changes relative to the main branch
3. **CI Integration** - Automated benchmark runs and regression detection

## Performance Targets

Performance targets are defined in [`bench/performance-baselines.json`](./performance-baselines.json).

### Key Workloads

| Workload | Min Throughput | Max Latency | Max Memory |
|----------|----------------|-------------|------------|
| CSV→JSON (small, ~0.12MB) | 20 MB/s | 10 ms | 5 MB |
| CSV→JSON (medium, ~12MB) | 50 MB/s | 300 ms | 30 MB |
| CSV→JSON (large, ~120MB) | 80 MB/s | 2000 ms | 100 MB |
| NDJSON→JSON (medium, ~50MB) | 60 MB/s | 1000 ms | 50 MB |

### Regression Thresholds

A performance regression is detected when:

- **Throughput**: Falls below 85% of baseline
- **Latency**: Exceeds 120% of baseline
- **Memory**: Exceeds 150% of baseline (warning only)

## Running Benchmarks Locally

### Run benchmarks and save results

```bash
# Bash/Linux/macOS
cd packages/convert-buddy-js
npm run bench

# PowerShell/Windows
cd packages\convert-buddy-js
npm run bench
```

This creates `bench-results.json` with the latest benchmark data.

### Check against performance targets

```bash
# Bash/Linux/macOS
npm run bench && npm run bench:check

# PowerShell/Windows
npm run bench; npm run bench:check
# Or separately:
npm run bench
npm run bench:check
```

This validates current results against absolute performance targets defined in `performance-baselines.json`.

### Compare against a baseline

```bash
npm run bench:compare-baseline baseline-results.json
```

This compares your current results against a saved baseline file.

## CI Integration

### On Main Branch (Baseline Producer)

When code is merged to `main`:

1. Runs full benchmark suite
2. Uploads results as artifacts (retained for 90 days)
3. These become the baseline for PR comparisons

### On Pull Requests (Regression Detector)

When a PR is opened or updated:

1. Runs full benchmark suite on PR code
2. Downloads latest baseline from `main`
3. Compares PR results against baseline
4. Posts detailed comment with results
5. **Fails the build if regressions detected**

### Workflow File

See [`.github/workflows/benchmark.yml`](../../.github/workflows/benchmark.yml) for the complete workflow.

## Interpreting Results

### Benchmark Output

```
✅ PASS CSV->JSON (small)
  Throughput: 25.50 MB/s (+5.2%)
  Latency:    4.50 ms (-3.1%)
  Memory:     2.10 MB (+8.4%)
```

- **Throughput**: Higher is better (MB/s)
- **Latency**: Lower is better (ms)
- **Memory**: Lower is better (MB)
- **Percentages**: Change relative to baseline

### GitHub PR Comment

The CI workflow posts a comment on PRs with:

- Summary of passed/failed benchmarks
- Detailed table of any regressions
- Expandable section with full results

Example:

```markdown
## 🎯 Benchmark Results

✅ All 7 benchmarks passed!

### Summary

- ✅ Passed: 7
- ❌ Failed: 0
- Comparison: vs Baseline
```

## Updating Performance Targets

If legitimate changes require updating baselines:

1. Review the performance change carefully
2. Update [`bench/performance-baselines.json`](./performance-baselines.json)
3. Document the reason in the PR description
4. Get approval from maintainers

### Example Update

```json
{
  "targets": {
    "csv_to_json_medium": {
      "description": "CSV→JSON conversion, ~12MB (100K rows, 20 cols)",
      "minThroughputMbps": 50,  // Changed from 45
      "maxLatencyMs": 300,
      "maxMemoryMb": 30,
      "minRecordsPerSec": 200000
    }
  }
}
```

## Benchmark Results Archive

- **Latest (main)**: Automatically downloaded in CI
- **Historical**: Artifacts retained for 90 days in GitHub Actions
- **Per-commit**: Each run uploads results with SHA suffix (30 days)

## Troubleshooting

### False Positives

Benchmarks can be noisy. If you see intermittent failures:

1. Check if the regression is consistent across re-runs
2. Review system load during benchmark execution
3. Compare against multiple baseline runs if available

### Benchmark Failures in CI

If benchmarks fail in CI but pass locally:

1. Check Node.js version matches (CI uses Node 20)
2. Ensure `UV_THREADPOOL_SIZE=4` is set locally
3. Use `--expose-gc` flag for consistent memory measurements
4. Different CPU architectures may show different performance

### Skipping Benchmark Checks

For urgent fixes, you can:

1. Add `[skip benchmarks]` to commit message (requires workflow update)
2. Or temporarily remove performance thresholds (not recommended)

## Future Enhancements

- [ ] Trend analysis over multiple commits
- [ ] Performance charts in CI
- [ ] Benchmark dashboard
- [ ] More granular workload categories
- [ ] Cross-platform comparison (Linux/macOS/Windows)
- [ ] Memory profiling integration
