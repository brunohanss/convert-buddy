import { performance } from "node:perf_hooks";
import { convert } from "../src/index.js";
import { generateCsvDataset } from "./datasets.js";

/**
 * Quick benchmark to measure optimization impact
 * Run with: npm run ts -- bench/quick-test.ts
 */

interface BenchmarkRun {
  name: string;
  fileSizeMb: number;
  throughputMbps: number;
  latencyMs: number;
  memoryMb: number;
  heapGrowthMb: number;
}

const results: BenchmarkRun[] = [];

async function quickBenchmark() {
  console.log("\n🚀 Convert-Buddy Quick Performance Benchmark");
  console.log("============================================\n");

  // Test different file sizes to understand scaling behavior
  const testCases = [
    { rows: 5000, cols: 10, name: "Small (0.5MB)" },
    { rows: 50000, cols: 10, name: "Medium (5MB)" },
    { rows: 100000, cols: 10, name: "Large (10MB)" },
  ];

  for (const testCase of testCases) {
    console.log(`Testing: ${testCase.name}`);
    
    // Generate CSV dataset
    const data = generateCsvDataset(testCase.rows, testCase.cols);
    const fileSizeMb = data.length / (1024 * 1024);

    // Warm up
    try {
      await convert(data, {
        inputFormat: "csv",
        outputFormat: "ndjson",
      });
    } catch (e) {
      console.error("Warmup failed:", e);
      continue;
    }

    // Run benchmark
    const startMem = process.memoryUsage().heapUsed;
    const startGc = process.memoryUsage().heapTotal;
    
    const start = performance.now();
    const result = await convert(data, {
      inputFormat: "csv",
      outputFormat: "ndjson",
    });
    const end = performance.now();

    const endMem = process.memoryUsage().heapUsed;
    const endGc = process.memoryUsage().heapTotal;

    const duration = end - start;
    const throughput = fileSizeMb / (duration / 1000);
    const memoryDelta = (endMem - startMem) / (1024 * 1024);
    const heapGrowth = (endGc - startGc) / (1024 * 1024);

    const run: BenchmarkRun = {
      name: testCase.name,
      fileSizeMb: parseFloat(fileSizeMb.toFixed(2)),
      throughputMbps: parseFloat(throughput.toFixed(2)),
      latencyMs: parseFloat(duration.toFixed(2)),
      memoryMb: parseFloat(memoryDelta.toFixed(2)),
      heapGrowthMb: parseFloat(heapGrowth.toFixed(2)),
    };

    results.push(run);

    console.log(`  ✅ ${throughput.toFixed(2)} MB/s | ${duration.toFixed(0)}ms | Output: ${(result.length / (1024 * 1024)).toFixed(2)}MB`);
    console.log(`     Memory Δ: ${memoryDelta.toFixed(2)}MB, Heap Growth: ${heapGrowth.toFixed(2)}MB\n`);

    // Allow garbage collection between tests
    if (global.gc) global.gc();
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  // Summary
  console.log("\n📊 Benchmark Results Summary");
  console.log("============================");
  console.table(results);

  // Calculate average throughput
  const avgThroughput = results.reduce((sum, r) => sum + r.throughputMbps, 0) / results.length;
  console.log(`\n📈 Average Throughput: ${avgThroughput.toFixed(2)} MB/s`);
  
  // Comparison with Papa Parse (114.4 MB/s)
  const papaParse = 114.4;
  const gap = papaParse - avgThroughput;
  const percentDiff = (gap / papaParse) * 100;
  
  console.log(`\n📊 Papa Parse Reference: ${papaParse} MB/s`);
  if (avgThroughput >= papaParse) {
    console.log(`✅ WINNING! (+${(avgThroughput - papaParse).toFixed(2)} MB/s, +${((avgThroughput / papaParse - 1) * 100).toFixed(1)}%)`);
  } else {
    console.log(`⏳ Gap: ${gap.toFixed(2)} MB/s (${percentDiff.toFixed(1)}% slower)`);
  }

  return results;
}

quickBenchmark()
  .then(() => {
    process.exit(0);
  })
  .catch(err => {
    console.error("Benchmark failed:", err);
    process.exit(1);
  });
