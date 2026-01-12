/**
 * Compare benchmark results against baselines and detect regressions
 * 
 * Usage:
 *   node dist/bench/compare-benchmarks.js --current bench-results.json --baseline bench-baseline.json
 *   node dist/bench/compare-benchmarks.js --current bench-results.json --check-targets
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface BenchmarkResult {
  name: string;
  dataset: string;
  throughputMbps: number;
  latencyMs: number;
  memoryMb: number;
  recordsPerSec: number;
  threadMode?: string;
  size?: string;
}

interface BenchmarkFile {
  timestamp: string;
  platform?: string;
  arch?: string;
  nodeVersion?: string;
  threadMode?: string;
  environment?: any;
  results: BenchmarkResult[];
}

interface PerformanceBaselines {
  thresholds: {
    regression: {
      throughput: number;
      latency: number;
      memory: number;
    };
    targets: Record<string, {
      description: string;
      minThroughputMbps: number;
      maxLatencyMs: number;
      maxMemoryMb: number;
      minRecordsPerSec: number;
    }>;
  };
}

interface ComparisonResult {
  name: string;
  current: BenchmarkResult;
  baseline?: BenchmarkResult;
  throughputChange?: number;
  latencyChange?: number;
  memoryChange?: number;
  isRegression: boolean;
  failures: string[];
  warnings: string[];
}

function normalizeTestName(name: string): string {
  // Normalize test names to match baseline keys
  // "CSV->JSON (small)" -> "csv_to_json_small"
  return name
    .toLowerCase()
    .replace(/→/g, "_to_")
    .replace(/->/g, "_to_")
    .replace(/\s*\(([^)]+)\)\s*/g, "_$1")
    .replace(/[^a-z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}

function loadJSON<T>(filePath: string): T {
  const content = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(content) as T;
}

function normalizeBenchmarkFile(data: any): BenchmarkFile {
  // Handle array format (from competitor comparisons)
  if (Array.isArray(data)) {
    return {
      timestamp: new Date().toISOString(),
      results: []
    };
  }
  
  // Handle standard format
  if (data.results && Array.isArray(data.results)) {
    return data as BenchmarkFile;
  }
  
  throw new Error("Invalid benchmark file format. Expected object with 'results' array or array of results.");
}

function compareResults(
  current: BenchmarkFile,
  baseline: BenchmarkFile | null,
  thresholds: PerformanceBaselines["thresholds"]
): ComparisonResult[] {
  const comparisons: ComparisonResult[] = [];

  for (const currentResult of current.results) {
    const baselineResult = baseline?.results.find(
      (r) => normalizeTestName(r.name) === normalizeTestName(currentResult.name)
    );

    const failures: string[] = [];
    const warnings: string[] = [];
    let isRegression = false;

    if (baselineResult) {
      // Compare against baseline
      const throughputRatio = currentResult.throughputMbps / baselineResult.throughputMbps;
      const latencyRatio = currentResult.latencyMs / baselineResult.latencyMs;
      const memoryRatio = currentResult.memoryMb / baselineResult.memoryMb;

      // Check regression thresholds
      if (throughputRatio < thresholds.regression.throughput) {
        failures.push(
          `Throughput regression: ${(throughputRatio * 100).toFixed(1)}% of baseline ` +
          `(${currentResult.throughputMbps.toFixed(2)} vs ${baselineResult.throughputMbps.toFixed(2)} MB/s)`
        );
        isRegression = true;
      }

      if (latencyRatio > thresholds.regression.latency) {
        failures.push(
          `Latency regression: ${(latencyRatio * 100).toFixed(1)}% of baseline ` +
          `(${currentResult.latencyMs.toFixed(2)} vs ${baselineResult.latencyMs.toFixed(2)} ms)`
        );
        isRegression = true;
      }

      if (memoryRatio > thresholds.regression.memory) {
        warnings.push(
          `Memory increase: ${(memoryRatio * 100).toFixed(1)}% of baseline ` +
          `(${currentResult.memoryMb.toFixed(2)} vs ${baselineResult.memoryMb.toFixed(2)} MB)`
        );
      }

      comparisons.push({
        name: currentResult.name,
        current: currentResult,
        baseline: baselineResult,
        throughputChange: throughputRatio,
        latencyChange: latencyRatio,
        memoryChange: memoryRatio,
        isRegression,
        failures,
        warnings,
      });
    } else {
      // New test - no baseline comparison
      comparisons.push({
        name: currentResult.name,
        current: currentResult,
        isRegression: false,
        failures: [],
        warnings: ["No baseline found for this test (new test?)"],
      });
    }
  }

  return comparisons;
}

function checkTargets(
  current: BenchmarkFile,
  targets: PerformanceBaselines["thresholds"]["targets"]
): ComparisonResult[] {
  const comparisons: ComparisonResult[] = [];

  for (const currentResult of current.results) {
    const normalizedName = normalizeTestName(currentResult.name);
    const target = targets[normalizedName];

    const failures: string[] = [];
    const warnings: string[] = [];
    let isRegression = false;

    if (target) {
      // Check against absolute targets
      if (currentResult.throughputMbps < target.minThroughputMbps) {
        failures.push(
          `Throughput below target: ${currentResult.throughputMbps.toFixed(2)} MB/s < ${target.minThroughputMbps} MB/s`
        );
        isRegression = true;
      }

      if (currentResult.latencyMs > target.maxLatencyMs) {
        failures.push(
          `Latency above target: ${currentResult.latencyMs.toFixed(2)} ms > ${target.maxLatencyMs} ms`
        );
        isRegression = true;
      }

      if (currentResult.memoryMb > target.maxMemoryMb) {
        warnings.push(
          `Memory above target: ${currentResult.memoryMb.toFixed(2)} MB > ${target.maxMemoryMb} MB`
        );
      }

      if (currentResult.recordsPerSec < target.minRecordsPerSec) {
        warnings.push(
          `Records/sec below target: ${currentResult.recordsPerSec.toFixed(0)} < ${target.minRecordsPerSec}`
        );
      }

      comparisons.push({
        name: currentResult.name,
        current: currentResult,
        isRegression,
        failures,
        warnings,
      });
    } else {
      comparisons.push({
        name: currentResult.name,
        current: currentResult,
        isRegression: false,
        failures: [],
        warnings: [`No performance target defined for '${normalizedName}'`],
      });
    }
  }

  return comparisons;
}

function printComparisons(comparisons: ComparisonResult[], mode: "baseline" | "targets") {
  console.log(`\n${"=".repeat(80)}`);
  console.log(`Benchmark Comparison (${mode === "baseline" ? "vs Baseline" : "vs Targets"})`);
  console.log("=".repeat(80));

  let hasRegressions = false;
  let hasWarnings = false;

  for (const comp of comparisons) {
    const status = comp.isRegression ? "❌ FAIL" : "✅ PASS";
    console.log(`\n${status} ${comp.name}`);

    if (mode === "baseline" && comp.baseline) {
      console.log(`  Throughput: ${comp.current.throughputMbps.toFixed(2)} MB/s ` +
        `(${comp.throughputChange! >= 1 ? "+" : ""}${((comp.throughputChange! - 1) * 100).toFixed(1)}%)`);
      console.log(`  Latency:    ${comp.current.latencyMs.toFixed(2)} ms ` +
        `(${comp.latencyChange! >= 1 ? "+" : ""}${((comp.latencyChange! - 1) * 100).toFixed(1)}%)`);
      console.log(`  Memory:     ${comp.current.memoryMb.toFixed(2)} MB ` +
        `(${comp.memoryChange! >= 1 ? "+" : ""}${((comp.memoryChange! - 1) * 100).toFixed(1)}%)`);
    } else {
      console.log(`  Throughput: ${comp.current.throughputMbps.toFixed(2)} MB/s`);
      console.log(`  Latency:    ${comp.current.latencyMs.toFixed(2)} ms`);
      console.log(`  Memory:     ${comp.current.memoryMb.toFixed(2)} MB`);
      console.log(`  Records/s:  ${comp.current.recordsPerSec.toFixed(0)}`);
    }

    if (comp.failures.length > 0) {
      hasRegressions = true;
      console.log(`  Failures:`);
      for (const failure of comp.failures) {
        console.log(`    - ${failure}`);
      }
    }

    if (comp.warnings.length > 0) {
      hasWarnings = true;
      console.log(`  Warnings:`);
      for (const warning of comp.warnings) {
        console.log(`    - ${warning}`);
      }
    }
  }

  console.log(`\n${"=".repeat(80)}`);
  
  const regressionCount = comparisons.filter(c => c.isRegression).length;
  const passCount = comparisons.filter(c => !c.isRegression).length;
  
  console.log(`Results: ${passCount} passed, ${regressionCount} failed`);
  
  if (hasRegressions) {
    console.log("\n⚠️  PERFORMANCE REGRESSIONS DETECTED");
  } else {
    console.log("\n✅ All benchmarks passed!");
  }

  return hasRegressions;
}

function generateGitHubComment(comparisons: ComparisonResult[], mode: "baseline" | "targets"): string {
  const regressions = comparisons.filter(c => c.isRegression);
  const passed = comparisons.filter(c => !c.isRegression);

  let comment = `## 🎯 Benchmark Results\n\n`;
  
  if (regressions.length > 0) {
    comment += `❌ **${regressions.length} performance regression(s) detected**\n\n`;
  } else {
    comment += `✅ **All ${passed.length} benchmarks passed!**\n\n`;
  }

  comment += `### Summary\n\n`;
  comment += `- ✅ Passed: ${passed.length}\n`;
  comment += `- ❌ Failed: ${regressions.length}\n`;
  comment += `- Comparison: ${mode === "baseline" ? "vs Baseline" : "vs Performance Targets"}\n\n`;

  if (regressions.length > 0) {
    comment += `### ❌ Regressions\n\n`;
    comment += `| Test | Metric | Current | ${mode === "baseline" ? "Baseline" : "Target"} | Change |\n`;
    comment += `|------|--------|---------|----------|--------|\n`;

    for (const comp of regressions) {
      for (const failure of comp.failures) {
        const metric = failure.split(":")[0];
        comment += `| ${comp.name} | ${metric} | `;
        
        if (mode === "baseline" && comp.baseline) {
          if (metric.includes("Throughput")) {
            comment += `${comp.current.throughputMbps.toFixed(2)} MB/s | ${comp.baseline.throughputMbps.toFixed(2)} MB/s | ${((comp.throughputChange! - 1) * 100).toFixed(1)}% |\n`;
          } else if (metric.includes("Latency")) {
            comment += `${comp.current.latencyMs.toFixed(2)} ms | ${comp.baseline.latencyMs.toFixed(2)} ms | ${((comp.latencyChange! - 1) * 100).toFixed(1)}% |\n`;
          }
        } else {
          comment += `${failure.split(":")[1]} | - | - |\n`;
        }
      }
    }
    comment += `\n`;
  }

  comment += `### ✅ Passed Tests\n\n`;
  comment += `<details><summary>View details (${passed.length} tests)</summary>\n\n`;
  comment += `| Test | Throughput | Latency | Memory | Records/s |\n`;
  comment += `|------|------------|---------|--------|----------|\n`;

  for (const comp of passed) {
    comment += `| ${comp.name} `;
    comment += `| ${comp.current.throughputMbps.toFixed(2)} MB/s `;
    comment += `| ${comp.current.latencyMs.toFixed(2)} ms `;
    comment += `| ${comp.current.memoryMb.toFixed(2)} MB `;
    comment += `| ${comp.current.recordsPerSec.toFixed(0)} |\n`;
  }

  comment += `\n</details>\n`;

  return comment;
}

function main() {
  const args = process.argv.slice(2);
  const currentPath = args.find((arg, i) => args[i - 1] === "--current");
  const baselinePath = args.find((arg, i) => args[i - 1] === "--baseline");
  const shouldCheckTargets = args.includes("--check-targets");
  const outputComment = args.includes("--output-comment");

  if (!currentPath) {
    console.error("Usage: node compare-benchmarks.js --current <file> [--baseline <file>] [--check-targets] [--output-comment]");
    process.exit(1);
  }

  if (!fs.existsSync(currentPath)) {
    console.error(`Error: Benchmark file not found: ${currentPath}\n`);
    console.error(`Please run benchmarks first:\n`);
    console.error(`  npm run bench\n`);
    console.error(`This will create ${path.basename(currentPath)}`);
    process.exit(1);
  }

  const baselinesConfig = loadJSON<PerformanceBaselines>(
    path.join(__dirname, "../../bench/performance-baselines.json")
  );

  const currentData = loadJSON<any>(currentPath);
  const currentResults = normalizeBenchmarkFile(currentData);
  
  if (currentResults.results.length === 0) {
    console.error(`Error: No benchmark results found in ${currentPath}`);
    console.error(`\nThe file appears to be from a competitor comparison (array format).`);
    console.error(`Please run the standard benchmarks first:\n`);
    console.error(`  npm run bench\n`);
    console.error(`This will create the correct bench-results.json format.`);
    process.exit(1);
  }
  
  const baselineData = baselinePath ? loadJSON<any>(baselinePath) : null;
  const baselineResults = baselineData ? normalizeBenchmarkFile(baselineData) : null;

  let comparisons: ComparisonResult[];
  let mode: "baseline" | "targets";

  if (shouldCheckTargets) {
    // Compare against absolute targets
    mode = "targets";
    comparisons = checkTargets(currentResults, baselinesConfig.thresholds.targets);
  } else if (baselineResults) {
    // Compare against baseline
    mode = "baseline";
    comparisons = compareResults(currentResults, baselineResults, baselinesConfig.thresholds);
  } else {
    console.error("Error: Must specify either --baseline or --check-targets");
    process.exit(1);
  }

  const hasRegressions = printComparisons(comparisons, mode);

  if (outputComment) {
    const comment = generateGitHubComment(comparisons, mode);
    const commentPath = path.join(process.cwd(), "benchmark-comment.md");
    fs.writeFileSync(commentPath, comment);
    console.log(`\nGitHub comment saved to: ${commentPath}`);
  }

  process.exit(hasRegressions ? 1 : 0);
}

main();
