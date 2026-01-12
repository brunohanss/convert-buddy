# Performance Guardrails Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     Performance Guardrails                       │
│                                                                   │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │   Absolute   │    │   Baseline   │    │      CI      │      │
│  │   Targets    │    │  Comparison  │    │  Integration │      │
│  └──────────────┘    └──────────────┘    └──────────────┘      │
└─────────────────────────────────────────────────────────────────┘
```

## Component Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Benchmark System                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌────────────────┐                                              │
│  │  runner.ts     │  Generate benchmark results                 │
│  └────────┬───────┘                                              │
│           │                                                       │
│           ▼                                                       │
│  ┌─────────────────────────────────┐                            │
│  │   bench-results.json            │  Benchmark output          │
│  └────────┬────────────────────────┘                            │
│           │                                                       │
│           ▼                                                       │
│  ┌─────────────────────────────────┐                            │
│  │  compare-benchmarks.ts          │  Analysis & comparison     │
│  └────────┬────────────────────────┘                            │
│           │                                                       │
│      ┌────┴────┐                                                 │
│      ▼         ▼                                                 │
│  ┌──────┐  ┌──────────────────────┐                            │
│  │ PASS │  │  benchmark-comment.md │  GitHub PR comment         │
│  │ FAIL │  └──────────────────────┘                            │
│  └──────┘                                                        │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

## CI Workflow

### Main Branch (Baseline Producer)

```
┌─────────────┐
│ Push to     │
│ main        │
└──────┬──────┘
       │
       ▼
┌─────────────────────┐
│ GitHub Actions      │
│ - Setup Rust/Node   │
│ - Build WASM        │
│ - Run benchmarks    │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│ Upload Artifacts    │
│ - bench-results.json│
│ - baselines.json    │
│ (90 days retention) │
└─────────────────────┘
       │
       ▼
   [BASELINE]
    Stored for
     PR comparison
```

### Pull Request (Regression Detector)

```
┌─────────────┐
│ Open PR     │
│ or update   │
└──────┬──────┘
       │
       ▼
┌──────────────────────────┐
│ GitHub Actions           │
│ - Setup Rust/Node        │
│ - Build WASM             │
│ - Run benchmarks         │
└──────┬───────────────────┘
       │
       ▼
┌──────────────────────────┐
│ Download Baseline        │
│ from main branch         │
└──────┬───────────────────┘
       │
       ▼
┌──────────────────────────┐
│ Compare Results          │
│ compare-benchmarks.ts    │
│                          │
│ PR vs Baseline           │
└──────┬───────────────────┘
       │
   ┌───┴────┐
   ▼        ▼
┌─────┐  ┌──────────┐
│PASS │  │ FAIL     │
│     │  │ (regress)│
└──┬──┘  └────┬─────┘
   │          │
   ▼          ▼
┌──────────────────────────┐
│ Post PR Comment          │
│ - Summary                │
│ - Detailed results       │
│ - Change percentages     │
└──────┬───────────────────┘
       │
   ┌───┴────┐
   ▼        ▼
┌─────┐  ┌──────┐
│ ✅  │  │  ❌  │
│Build│  │Build │
│Pass │  │Fail  │
└─────┘  └──────┘
```

## Comparison Logic

```
┌─────────────────────────────────────────────────────────────────┐
│                    Regression Detection                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Current Result                  Baseline Result                 │
│  ┌────────────────┐              ┌────────────────┐             │
│  │ Throughput:    │              │ Throughput:    │             │
│  │ 70 MB/s        │  ──────────▶ │ 85 MB/s        │             │
│  └────────────────┘              └────────────────┘             │
│         │                                                         │
│         ▼                                                         │
│  ┌─────────────────────────────────────┐                        │
│  │ Calculate Ratio: 70 / 85 = 0.82    │                        │
│  └─────────────────┬───────────────────┘                        │
│                    │                                              │
│                    ▼                                              │
│  ┌─────────────────────────────────────┐                        │
│  │ Check Threshold:                    │                        │
│  │ 0.82 < 0.85? ──▶ YES                │                        │
│  │                                      │                        │
│  │ ❌ REGRESSION DETECTED               │                        │
│  └─────────────────────────────────────┘                        │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow

```
┌──────────────┐
│ Benchmark    │
│ Execution    │
└──────┬───────┘
       │
       ▼
┌──────────────────────┐
│ Raw Results          │
│ {                    │
│   name: "Test",      │
│   throughput: 70,    │
│   latency: 50,       │
│   memory: 10         │
│ }                    │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│ Normalize            │
│ test_name →          │
│ csv_to_json_medium   │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│ Lookup Baseline      │
│ or Target            │
└──────┬───────────────┘
       │
   ┌───┴────┐
   ▼        ▼
┌────────┐ ┌────────┐
│Baseline│ │Target  │
│Found   │ │Found   │
└───┬────┘ └───┬────┘
    │          │
    ▼          ▼
┌────────────────────┐
│ Calculate Changes  │
│ - Throughput ratio │
│ - Latency ratio    │
│ - Memory ratio     │
└────────┬───────────┘
         │
         ▼
┌────────────────────┐
│ Check Thresholds   │
│ - Throughput < 85% │
│ - Latency > 120%   │
│ - Memory > 150%    │
└────────┬───────────┘
         │
     ┌───┴───┐
     ▼       ▼
┌────────┐ ┌────────┐
│ PASS   │ │ FAIL   │
│ ✅     │ │ ❌     │
└────────┘ └────────┘
```

## File Structure

```
convert-buddy/
├── .github/
│   └── workflows/
│       └── benchmark.yml          # CI workflow definition
│
├── packages/
│   └── convert-buddy-js/
│       ├── bench/
│       │   ├── performance-baselines.json  # Performance targets
│       │   ├── compare-benchmarks.ts       # Comparison logic
│       │   ├── runner.ts                   # Benchmark runner
│       │   ├── PERFORMANCE.md              # Documentation
│       │   └── README.md                   # Overview
│       │
│       ├── scripts/
│       │   └── update-baselines.mjs        # Helper to update targets
│       │
│       ├── bench-results.json              # Latest results (generated)
│       └── benchmark-comment.md            # PR comment (generated)
│
└── PERFORMANCE_GUARDRAILS_SUMMARY.md       # This document
```

## Integration Points

```
┌─────────────────────────────────────────────────────────────────┐
│                    Developer Workflow                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Local Development          CI Pipeline          PR Review       │
│  ┌────────────┐            ┌────────────┐      ┌─────────────┐ │
│  │            │            │            │      │             │ │
│  │ npm run    │            │ GitHub     │      │ Reviewer    │ │
│  │ bench      │────────────│ Actions    │──────│ sees        │ │
│  │            │   push     │            │  PR  │ benchmark   │ │
│  │ npm run    │            │ Auto run   │comment│ results     │ │
│  │ bench:check│            │            │      │             │ │
│  │            │            │            │      │             │ │
│  └────────────┘            └────────────┘      └─────────────┘ │
│       │                         │                     │         │
│       ▼                         ▼                     ▼         │
│  Immediate                 Automated              Informed      │
│  feedback                  validation            decision       │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

## Threshold Configuration

```
performance-baselines.json
├── thresholds
│   ├── regression
│   │   ├── throughput: 0.85    (must be ≥ 85% of baseline)
│   │   ├── latency: 1.20       (must be ≤ 120% of baseline)
│   │   └── memory: 1.50        (warn if > 150% of baseline)
│   │
│   └── targets
│       ├── csv_to_json_small
│       │   ├── minThroughputMbps: 20
│       │   ├── maxLatencyMs: 10
│       │   ├── maxMemoryMb: 5
│       │   └── minRecordsPerSec: 50000
│       │
│       └── csv_to_json_medium
│           ├── minThroughputMbps: 50
│           ├── maxLatencyMs: 300
│           └── ...
│
└── metadata
    ├── lastUpdated: "2026-01-12"
    └── benchmarkEnvironment
```

## Decision Tree

```
                    Run Benchmark
                         │
                         ▼
                 Have Baseline?
                    ╱    ╲
                  ╱        ╲
               Yes          No
              ╱              ╲
             ▼                ▼
    Compare with         Check against
     Baseline            Absolute Targets
         │                    │
         ▼                    ▼
    Calculate              Check each
     Ratios                metric
         │                    │
         ▼                    ▼
   Check thresholds      Pass/Fail
         │
    ╱    │    ╲
   ╱     │     ╲
Pass    Warn   Fail
  │      │      │
  ▼      ▼      ▼
  ✅     ⚠️     ❌
Build  Comment Build
Pass   Posted  Fails
```
