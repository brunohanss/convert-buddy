import * as fs from "node:fs";
import * as path from "node:path";

/**
 * Thread Comparison Script
 * 
 * Compares single-thread vs multi-thread benchmark results
 * to analyze performance characteristics and scalability.
 */

type BenchmarkResult = {
  name: string;
  threadMode: string;
  dataset: string;
  size: string;
  throughputMbps: number;
  latencyMs: number;
  memoryMb: number;
  recordsPerSec: number;
  cpuTime: number;
  parallelism?: number;
};

type BenchmarkData = {
  timestamp: string;
  threadMode: string;
  environment: any;
  results: BenchmarkResult[];
};

function loadBenchmarkData(filename: string): BenchmarkData | null {
  const filepath = path.join(process.cwd(), filename);
  
  if (!fs.existsSync(filepath)) {
    console.error(`❌ File not found: ${filepath}`);
    return null;
  }

  try {
    const content = fs.readFileSync(filepath, "utf-8");
    return JSON.parse(content);
  } catch (error) {
    console.error(`❌ Error reading ${filename}:`, error);
    return null;
  }
}

function compareResults(singleThread: BenchmarkData, multiThread: BenchmarkData) {
  console.log("╔════════════════════════════════════════════════════════════════════╗");
  console.log("║  Convert Buddy - Thread Performance Comparison                    ║");
  console.log("╚════════════════════════════════════════════════════════════════════╝\n");

  // Environment comparison
  console.log("Environment Comparison:");
  console.log("┌─────────────────────────────────────────────────────────────────┐");
  console.log("│ Single-Thread Configuration                                     │");
  console.log("├─────────────────────────────────────────────────────────────────┤");
  console.log(`│ UV_THREADPOOL_SIZE: ${singleThread.environment.uvThreadpoolSize.toString().padEnd(44)} │`);
  console.log(`│ CPU Cores: ${singleThread.environment.cpuCores.toString().padEnd(53)} │`);
  console.log(`│ Timestamp: ${singleThread.timestamp.padEnd(53)} │`);
  console.log("└─────────────────────────────────────────────────────────────────┘");
  console.log();
  console.log("┌─────────────────────────────────────────────────────────────────┐");
  console.log("│ Multi-Thread Configuration                                      │");
  console.log("├─────────────────────────────────────────────────────────────────┤");
  console.log(`│ UV_THREADPOOL_SIZE: ${multiThread.environment.uvThreadpoolSize.toString().padEnd(44)} │`);
  console.log(`│ CPU Cores: ${multiThread.environment.cpuCores.toString().padEnd(53)} │`);
  console.log(`│ Timestamp: ${multiThread.timestamp.padEnd(53)} │`);
  console.log("└─────────────────────────────────────────────────────────────────┘\n");

  // Match results by name and size
  const comparisons: any[] = [];

  for (const stResult of singleThread.results) {
    // Skip streaming results with chunk size info for simpler comparison
    if (stResult.dataset.includes("streaming") && stResult.dataset.includes("KB chunks")) {
      continue;
    }

    // Find matching multi-thread result
    const mtResult = multiThread.results.find(
      (r) =>
        r.name === stResult.name &&
        r.size === stResult.size &&
        !r.dataset.includes("concurrent") &&
        (r.dataset.includes("streaming") === stResult.dataset.includes("streaming"))
    );

    if (mtResult) {
      const throughputSpeedup = mtResult.throughputMbps / stResult.throughputMbps;
      const latencyImprovement = ((stResult.latencyMs - mtResult.latencyMs) / stResult.latencyMs) * 100;
      const memoryIncrease = ((mtResult.memoryMb - stResult.memoryMb) / stResult.memoryMb) * 100;

      comparisons.push({
        name: stResult.name,
        size: stResult.size,
        singleThreadThroughput: stResult.throughputMbps.toFixed(2),
        multiThreadThroughput: mtResult.throughputMbps.toFixed(2),
        speedup: `${throughputSpeedup.toFixed(2)}x`,
        singleThreadLatency: stResult.latencyMs.toFixed(2),
        multiThreadLatency: mtResult.latencyMs.toFixed(2),
        latencyImprovement: `${latencyImprovement.toFixed(1)}%`,
        memoryChange: `${memoryIncrease > 0 ? '+' : ''}${memoryIncrease.toFixed(1)}%`,
      });
    }
  }

  // Display comparison table
  console.log("╔════════════════════════════════════════════════════════════════════╗");
  console.log("║  Throughput Comparison (MB/s)                                      ║");
  console.log("╚════════════════════════════════════════════════════════════════════╝\n");
  console.table(
    comparisons.map((c) => ({
      Test: c.name,
      Size: c.size,
      "Single-Thread": c.singleThreadThroughput,
      "Multi-Thread": c.multiThreadThroughput,
      "Speedup": c.speedup,
    }))
  );

  console.log("\n╔════════════════════════════════════════════════════════════════════╗");
  console.log("║  Latency Comparison (ms)                                           ║");
  console.log("╚════════════════════════════════════════════════════════════════════╝\n");
  console.table(
    comparisons.map((c) => ({
      Test: c.name,
      Size: c.size,
      "Single-Thread": c.singleThreadLatency,
      "Multi-Thread": c.multiThreadLatency,
      "Improvement": c.latencyImprovement,
    }))
  );

  // Summary statistics
  console.log("\n╔════════════════════════════════════════════════════════════════════╗");
  console.log("║  Summary Statistics                                                ║");
  console.log("╚════════════════════════════════════════════════════════════════════╝\n");

  const avgSpeedup =
    comparisons.reduce((sum, c) => sum + parseFloat(c.speedup), 0) / comparisons.length;
  const maxSpeedup = Math.max(...comparisons.map((c) => parseFloat(c.speedup)));
  const minSpeedup = Math.min(...comparisons.map((c) => parseFloat(c.speedup)));

  console.log("Throughput Speedup:");
  console.log(`  Average: ${avgSpeedup.toFixed(2)}x`);
  console.log(`  Maximum: ${maxSpeedup.toFixed(2)}x`);
  console.log(`  Minimum: ${minSpeedup.toFixed(2)}x`);

  // Analyze by size
  console.log("\nSpeedup by Dataset Size:");
  const sizes = ["small", "medium", "large"];
  for (const size of sizes) {
    const sizeComparisons = comparisons.filter((c) => c.size === size);
    if (sizeComparisons.length > 0) {
      const avgSizeSpeedup =
        sizeComparisons.reduce((sum, c) => sum + parseFloat(c.speedup), 0) /
        sizeComparisons.length;
      console.log(`  ${size.charAt(0).toUpperCase() + size.slice(1)}: ${avgSizeSpeedup.toFixed(2)}x`);
    }
  }

  // Analyze by conversion type
  console.log("\nSpeedup by Conversion Type:");
  const conversionTypes = ["CSV→NDJSON", "NDJSON→JSON", "NDJSON→NDJSON", "XML→NDJSON"];
  for (const convType of conversionTypes) {
    const typeComparisons = comparisons.filter((c) => c.name.includes(convType));
    if (typeComparisons.length > 0) {
      const avgTypeSpeedup =
        typeComparisons.reduce((sum, c) => sum + parseFloat(c.speedup), 0) /
        typeComparisons.length;
      console.log(`  ${convType}: ${avgTypeSpeedup.toFixed(2)}x`);
    }
  }

  // Threading efficiency
  console.log("\n╔════════════════════════════════════════════════════════════════════╗");
  console.log("║  Threading Efficiency Analysis                                     ║");
  console.log("╚════════════════════════════════════════════════════════════════════╝\n");

  const cpuCores = multiThread.environment.cpuCores;
  const threadPoolSize = parseInt(multiThread.environment.uvThreadpoolSize) || 4;
  const theoreticalMaxSpeedup = Math.min(cpuCores, threadPoolSize);
  const efficiency = (avgSpeedup / theoreticalMaxSpeedup) * 100;

  console.log(`CPU Cores Available: ${cpuCores}`);
  console.log(`Thread Pool Size: ${threadPoolSize}`);
  console.log(`Theoretical Max Speedup: ${theoreticalMaxSpeedup.toFixed(2)}x`);
  console.log(`Actual Average Speedup: ${avgSpeedup.toFixed(2)}x`);
  console.log(`Threading Efficiency: ${efficiency.toFixed(1)}%`);

  if (efficiency < 50) {
    console.log("\n⚠️  Low threading efficiency detected!");
    console.log("   Possible reasons:");
    console.log("   - WASM execution is primarily single-threaded");
    console.log("   - Overhead from thread synchronization");
    console.log("   - Dataset size too small to benefit from parallelism");
  } else if (efficiency > 80) {
    console.log("\n✓ Excellent threading efficiency!");
    console.log("  The workload scales well with multiple threads.");
  } else {
    console.log("\n✓ Good threading efficiency.");
    console.log("  Some benefit from multi-threading, with room for optimization.");
  }

  // Recommendations
  console.log("\n╔════════════════════════════════════════════════════════════════════╗");
  console.log("║  Recommendations                                                   ║");
  console.log("╚════════════════════════════════════════════════════════════════════╝\n");

  const smallDatasetSpeedup = comparisons
    .filter((c) => c.size === "small")
    .reduce((sum, c) => sum + parseFloat(c.speedup), 0) /
    comparisons.filter((c) => c.size === "small").length;

  const largeDatasetSpeedup = comparisons
    .filter((c) => c.size === "large")
    .reduce((sum, c) => sum + parseFloat(c.speedup), 0) /
    comparisons.filter((c) => c.size === "large").length;

  if (smallDatasetSpeedup < 1.2) {
    console.log("📌 Small Datasets:");
    console.log("   Single-thread mode is recommended for small datasets");
    console.log("   (minimal speedup from multi-threading, avoid overhead)\n");
  }

  if (largeDatasetSpeedup > 1.5) {
    console.log("📌 Large Datasets:");
    console.log("   Multi-thread mode is recommended for large datasets");
    console.log(`   (${largeDatasetSpeedup.toFixed(2)}x average speedup)\n`);
  }

  console.log("📌 Browser Deployments:");
  console.log("   Use single-thread benchmarks as reference");
  console.log("   (browsers typically run JavaScript on a single thread)\n");

  console.log("📌 Server Deployments:");
  console.log("   Use multi-thread benchmarks as reference");
  console.log("   (Node.js can leverage multiple cores)\n");

  // Save comparison report
  const report = {
    timestamp: new Date().toISOString(),
    singleThreadEnv: singleThread.environment,
    multiThreadEnv: multiThread.environment,
    comparisons,
    summary: {
      avgSpeedup,
      maxSpeedup,
      minSpeedup,
      efficiency,
      theoreticalMaxSpeedup,
    },
  };

  const reportPath = path.join(process.cwd(), "bench-results-comparison.json");
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n✓ Comparison report saved to: ${reportPath}\n`);
}

// Main execution
async function main() {
  const singleThreadData = loadBenchmarkData("bench-results-single-thread.json");
  const multiThreadData = loadBenchmarkData("bench-results-multi-thread.json");

  if (!singleThreadData || !multiThreadData) {
    console.error("\n❌ Missing benchmark data files!");
    console.error("   Please run both benchmarks first:");
    console.error("   1. npm run bench:single-thread");
    console.error("   2. npm run bench:multi-thread");
    console.error("   3. npm run bench:compare\n");
    process.exit(1);
  }

  compareResults(singleThreadData, multiThreadData);
}

main().catch(console.error);
