# Quick Reference: Performance Guardrails

## Running Benchmarks (PowerShell)

```powershell
# Standard benchmarks (creates correct format)
npm run bench

# Check against performance targets
npm run bench:check

# Run both sequentially
npm run bench; npm run bench:check
```

## Common Issues

### "No benchmark results found" Error

**Symptom:**
```
Error: No benchmark results found in bench-results.json
The file appears to be from a competitor comparison (array format).
```

**Solution:**
The `bench-results.json` file is from the competitor comparison (`npm run bench:competitors`), which has a different format. Delete it and run standard benchmarks:

```powershell
Remove-Item bench-results.json
npm run bench
npm run bench:check
```

### PowerShell `&&` Error

**Symptom:**
```
The token '&&' is not a valid statement separator
```

**Solution:**
Use semicolon `;` instead of `&&` in PowerShell:

```powershell
# ❌ Don't use (bash syntax)
npm run bench && npm run bench:check

# ✅ Use this (PowerShell syntax)
npm run bench; npm run bench:check
```

## File Formats

### Standard Benchmark Format (runner.ts)
```json
{
  "timestamp": "2026-01-12T10:00:00.000Z",
  "platform": "win32",
  "arch": "x64",
  "nodeVersion": "v22.12.0",
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

### Competitor Comparison Format (runner-with-competitors.ts)
```json
[
  {
    "tool": "convert-buddy",
    "conversion": "CSV→JSON",
    "size": "small",
    "dataset": "0.12 MB",
    "throughputMbps": 6.73,
    "latencyMs": 17.26,
    "memoryMb": 0.28,
    "recordsPerSec": 0
  },
  {
    "tool": "PapaParse",
    ...
  }
]
```

## Scripts Summary

| Script | Purpose | Output File |
|--------|---------|-------------|
| `npm run bench` | Standard benchmarks | `bench-results.json` (object format) |
| `npm run bench:check` | Validate against targets | Console output |
| `npm run bench:competitors` | Compare with other libraries | `bench-results.json` (array format) |
| `npm run bench:update-baselines` | Update performance targets | Modified `bench/performance-baselines.json` |

## Workflow

```
1. Run benchmarks
   npm run bench
   
2. Check performance
   npm run bench:check
   
3. If pass → Commit
   If fail → Investigate & fix
   
4. (Optional) Update baselines if legitimate change
   npm run bench:update-baselines
```
