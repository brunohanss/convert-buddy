import { performance } from "node:perf_hooks";
import { ConvertBuddy, convert } from "../src/index.js";
import { createNodeTransform } from "../src/node.js";
import { cpus } from "node:os";

import { generateCsvDataset, generateNdjsonDataset, generateXmlDataset } from "./datasets.js";
import * as fs from "node:fs";
import * as path from "node:path";
import { pipeline } from "node:stream/promises";
import { Readable, Writable } from "node:stream";
import { Worker } from "node:worker_threads";

/**
 * Multi-Thread Benchmark Runner
 * 
 * Tests performance on multi-core systems (e.g., 20-core server).
 * This represents server-side deployment scenarios.
 * 
 * Configuration:
 * - UV_THREADPOOL_SIZE=20 (or number of cores)
 * - Multi-threaded execution
 * - Parallel processing where applicable
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

async function benchmarkConversion(
  name: string,
  data: Uint8Array,
  opts: any
): Promise<BenchmarkResult> {
  // Force garbage collection if available
  if (global.gc) {
    global.gc();
  }

  const startMem = process.memoryUsage().heapUsed;
  const startCpu = process.cpuUsage();
  const start = performance.now();

  const result = await convert(data, opts);

  const end = performance.now();
  const endMem = process.memoryUsage().heapUsed;
  const endCpu = process.cpuUsage(startCpu);

  const latencyMs = end - start;
  const throughputMbps = (data.length / (1024 * 1024)) / (latencyMs / 1000);
  const memoryMb = (endMem - startMem) / (1024 * 1024);
  const cpuTime = (endCpu.user + endCpu.system) / 1000; // microseconds to milliseconds

  // Count records based on input format (more accurate for all output formats)
  const inputRecords = data.filter((b) => b === 10).length; // newline count in input
  const recordsPerSec = inputRecords / (latencyMs / 1000);

  return {
    name,
    threadMode: "multi-thread",
    dataset: `${(data.length / (1024 * 1024)).toFixed(2)} MB`,
    size: data.length < 100000 ? "small" : data.length < 10000000 ? "medium" : "large",
    throughputMbps: parseFloat(throughputMbps.toFixed(2)),
    latencyMs: parseFloat(latencyMs.toFixed(2)),
    memoryMb: parseFloat(memoryMb.toFixed(2)),
    recordsPerSec: parseFloat(recordsPerSec.toFixed(0)),
    cpuTime: parseFloat(cpuTime.toFixed(2)),
  };
}

async function benchmarkStreaming(
  name: string,
  data: Uint8Array,
  opts: any,
  chunkSize: number = 1024 * 1024 // Larger chunks for multi-thread (1MB)
): Promise<BenchmarkResult> {
  if (global.gc) {
    global.gc();
  }

  const startMem = process.memoryUsage().heapUsed;
  const startCpu = process.cpuUsage();
  const start = performance.now();

  const chunks: Buffer[] = [];
  const transform = await createNodeTransform(opts);

  const readable = Readable.from(
    (async function* () {
      for (let i = 0; i < data.length; i += chunkSize) {
        yield Buffer.from(data.slice(i, i + chunkSize));
      }
    })()
  );

  const writable = new Writable({
    write(chunk, encoding, callback) {
      chunks.push(chunk);
      callback();
    },
  });

  await pipeline(readable, transform, writable);

  const end = performance.now();
  const endMem = process.memoryUsage().heapUsed;
  const endCpu = process.cpuUsage(startCpu);

  const result = Buffer.concat(chunks);
  const latencyMs = end - start;
  const throughputMbps = (data.length / (1024 * 1024)) / (latencyMs / 1000);
  const memoryMb = (endMem - startMem) / (1024 * 1024);
  const cpuTime = (endCpu.user + endCpu.system) / 1000;

  // Count records based on input format (more accurate for all output formats)
  const inputRecords = data.filter((b) => b === 10).length; // newline count in input
  const recordsPerSec = inputRecords / (latencyMs / 1000);

  return {
    name,
    threadMode: "multi-thread",
    dataset: `${(data.length / (1024 * 1024)).toFixed(2)} MB (streaming, ${chunkSize / 1024}KB chunks)`,
    size: data.length < 100000 ? "small" : data.length < 10000000 ? "medium" : "large",
    throughputMbps: parseFloat(throughputMbps.toFixed(2)),
    latencyMs: parseFloat(latencyMs.toFixed(2)),
    memoryMb: parseFloat(memoryMb.toFixed(2)),
    recordsPerSec: parseFloat(recordsPerSec.toFixed(0)),
    cpuTime: parseFloat(cpuTime.toFixed(2)),
  };
}

async function benchmarkConcurrent(
  name: string,
  data: Uint8Array,
  opts: any,
  concurrency: number = 4
): Promise<BenchmarkResult> {
  if (global.gc) {
    global.gc();
  }

  const startMem = process.memoryUsage().heapUsed;
  const startCpu = process.cpuUsage();
  const start = performance.now();

  // Run multiple conversions concurrently
  const promises = Array.from({ length: concurrency }, () => convert(data, opts));
  const results = await Promise.all(promises);

  const end = performance.now();
  const endMem = process.memoryUsage().heapUsed;
  const endCpu = process.cpuUsage(startCpu);

  const latencyMs = end - start;
  const totalData = data.length * concurrency;
  const throughputMbps = (totalData / (1024 * 1024)) / (latencyMs / 1000);
  const memoryMb = (endMem - startMem) / (1024 * 1024);
  const cpuTime = (endCpu.user + endCpu.system) / 1000;

  // Count records from first result
  const records = results[0].filter((b) => b === 10).length;
  const totalRecords = records * concurrency;
  const recordsPerSec = totalRecords / (latencyMs / 1000);

  return {
    name,
    threadMode: "multi-thread",
    dataset: `${(data.length / (1024 * 1024)).toFixed(2)} MB × ${concurrency} concurrent`,
    size: data.length < 100000 ? "small" : data.length < 10000000 ? "medium" : "large",
    throughputMbps: parseFloat(throughputMbps.toFixed(2)),
    latencyMs: parseFloat(latencyMs.toFixed(2)),
    memoryMb: parseFloat(memoryMb.toFixed(2)),
    recordsPerSec: parseFloat(recordsPerSec.toFixed(0)),
    cpuTime: parseFloat(cpuTime.toFixed(2)),
    parallelism: concurrency,
  };
}

async function runBenchmarks() {
  console.log("╔════════════════════════════════════════════════════════╗");
  console.log("║  Convert Buddy - Multi-Thread Benchmark Suite         ║");
  console.log("║  (Simulating Server Environment)                       ║");
  console.log("╚════════════════════════════════════════════════════════╝\n");

  // Verify multi-thread configuration
  const cpuCount = cpus().length;
  const threadPoolSize = process.env.UV_THREADPOOL_SIZE || "10";

  console.log("Environment Configuration:");
  console.log(`  UV_THREADPOOL_SIZE: ${threadPoolSize}`);
  console.log(`  Node.js Version: ${process.version}`);
  console.log(`  Platform: ${process.platform}`);
  console.log(`  Architecture: ${process.arch}`);
  console.log(`  CPU Cores: ${cpuCount}`);
  console.log();

  if (parseInt(threadPoolSize) < cpuCount) {
    console.warn(`⚠️  NOTICE: UV_THREADPOOL_SIZE (${threadPoolSize}) is less than CPU cores (${cpuCount})`);
    console.warn("   For optimal multi-thread testing, consider running with:");
    console.warn(`   UV_THREADPOOL_SIZE=${cpuCount} node ./dist/bench/multi-thread.js\n`);
  }

  const results: BenchmarkResult[] = [];

  // Generate datasets
  console.log("Generating datasets...\n");
  const csvTiny = generateCsvDataset(100, 5);
  const csvSmall = generateCsvDataset(1_000, 10);
  const csvMedium = generateCsvDataset(10_000, 10);
  const csvLarge = generateCsvDataset(100_000, 10);
  const csvXLarge = generateCsvDataset(1_000_000, 10);

  const ndjsonTiny = generateNdjsonDataset(100, 5);
  const ndjsonSmall = generateNdjsonDataset(1_000, 10);
  const ndjsonMedium = generateNdjsonDataset(10_000, 10);
  const ndjsonLarge = generateNdjsonDataset(100_000, 10);
  const ndjsonXLarge = generateNdjsonDataset(1_000_000, 10);

  const xmlTiny = generateXmlDataset(100, 5);
  const xmlSmall = generateXmlDataset(1_000, 10);
  const xmlMedium = generateXmlDataset(10_000, 10);
  const xmlLarge = generateXmlDataset(100_000, 10);

  // ========== CSV Benchmarks ==========
  console.log("╔════════════════════════════════════════════════════════╗");
  console.log("║  CSV → NDJSON [multi-thread]                           ║");
  console.log("╚════════════════════════════════════════════════════════╝\n");

  console.log("Benchmarking CSV → NDJSON (tiny) [multi-thread]...");
  results.push(
    await benchmarkConversion("CSV→NDJSON (tiny)", csvTiny, {
      inputFormat: "csv",
      outputFormat: "ndjson",
      profile: true,
    })
  );

  console.log("Benchmarking CSV → NDJSON (small) [multi-thread]...");
  results.push(
    await benchmarkConversion("CSV→NDJSON (small)", csvSmall, {
      inputFormat: "csv",
      outputFormat: "ndjson",
      profile: true,
    })
  );

  console.log("Benchmarking CSV → NDJSON (medium) [multi-thread]...");
  results.push(
    await benchmarkConversion("CSV→NDJSON (medium)", csvMedium, {
      inputFormat: "csv",
      outputFormat: "ndjson",
      profile: true,
    })
  );

  console.log("Benchmarking CSV → NDJSON (large) [multi-thread]...");
  results.push(
    await benchmarkConversion("CSV→NDJSON (large)", csvLarge, {
      inputFormat: "csv",
      outputFormat: "ndjson",
      profile: true,
    })
  );

  console.log("Benchmarking CSV → NDJSON (xlarge) [multi-thread]...");
  results.push(
    await benchmarkConversion("CSV→NDJSON (xlarge)", csvXLarge, {
      inputFormat: "csv",
      outputFormat: "ndjson",
      profile: true,
    })
  );

  console.log("Benchmarking CSV → NDJSON (streaming, 64KB chunks) [multi-thread]...");
  results.push(
    await benchmarkStreaming("CSV→NDJSON (streaming)", csvLarge, {
      inputFormat: "csv",
      outputFormat: "ndjson",
      profile: true,
    }, 64 * 1024)
  );

  console.log("Benchmarking CSV → NDJSON (streaming, 1MB chunks) [multi-thread]...");
  results.push(
    await benchmarkStreaming("CSV→NDJSON (streaming)", csvLarge, {
      inputFormat: "csv",
      outputFormat: "ndjson",
      profile: true,
    }, 1024 * 1024)
  );

  // Concurrent benchmarks
  console.log("Benchmarking CSV → NDJSON (2x concurrent) [multi-thread]...");
  results.push(
    await benchmarkConcurrent("CSV→NDJSON (concurrent)", csvMedium, {
      inputFormat: "csv",
      outputFormat: "ndjson",
      profile: true,
    }, 2)
  );

  console.log("Benchmarking CSV → NDJSON (4x concurrent) [multi-thread]...");
  results.push(
    await benchmarkConcurrent("CSV→NDJSON (concurrent)", csvMedium, {
      inputFormat: "csv",
      outputFormat: "ndjson",
      profile: true,
    }, 10)
  );

  // ========== NDJSON Benchmarks ==========
  console.log("\n╔════════════════════════════════════════════════════════╗");
  console.log("║  NDJSON Conversions [multi-thread]                     ║");
  console.log("╚════════════════════════════════════════════════════════╝\n");

  console.log("Benchmarking NDJSON → JSON (tiny) [multi-thread]...");
  results.push(
    await benchmarkConversion("NDJSON→JSON (tiny)", ndjsonTiny, {
      inputFormat: "ndjson",
      outputFormat: "json",
      profile: true,
    })
  );

  console.log("Benchmarking NDJSON → JSON (small) [multi-thread]...");
  results.push(
    await benchmarkConversion("NDJSON→JSON (small)", ndjsonSmall, {
      inputFormat: "ndjson",
      outputFormat: "json",
      profile: true,
    })
  );

  console.log("Benchmarking NDJSON → JSON (medium) [multi-thread]...");
  results.push(
    await benchmarkConversion("NDJSON→JSON (medium)", ndjsonMedium, {
      inputFormat: "ndjson",
      outputFormat: "json",
      profile: true,
    })
  );

  console.log("Benchmarking NDJSON → JSON (large) [multi-thread]...");
  results.push(
    await benchmarkConversion("NDJSON→JSON (large)", ndjsonLarge, {
      inputFormat: "ndjson",
      outputFormat: "json",
      profile: true,
    })
  );

  console.log("Benchmarking NDJSON → JSON (xlarge) [multi-thread]...");
  results.push(
    await benchmarkConversion("NDJSON→JSON (xlarge)", ndjsonXLarge, {
      inputFormat: "ndjson",
      outputFormat: "json",
      profile: true,
    })
  );

  console.log("Benchmarking NDJSON passthrough (xlarge) [multi-thread]...");
  results.push(
    await benchmarkConversion("NDJSON→NDJSON (xlarge)", ndjsonXLarge, {
      inputFormat: "ndjson",
      outputFormat: "ndjson",
      profile: true,
    })
  );

  // ========== XML Benchmarks ==========
  console.log("\n╔════════════════════════════════════════════════════════╗");
  console.log("║  XML → NDJSON [multi-thread]                           ║");
  console.log("╚════════════════════════════════════════════════════════╝\n");

  console.log("Benchmarking XML → NDJSON (tiny) [multi-thread]...");
  results.push(
    await benchmarkConversion("XML→NDJSON (tiny)", xmlTiny, {
      inputFormat: "xml",
      outputFormat: "ndjson",
      profile: true,
    })
  );

  console.log("Benchmarking XML → NDJSON (small) [multi-thread]...");
  results.push(
    await benchmarkConversion("XML→NDJSON (small)", xmlSmall, {
      inputFormat: "xml",
      outputFormat: "ndjson",
      profile: true,
    })
  );

  console.log("Benchmarking XML → NDJSON (medium) [multi-thread]...");
  results.push(
    await benchmarkConversion("XML→NDJSON (medium)", xmlMedium, {
      inputFormat: "xml",
      outputFormat: "ndjson",
      profile: true,
    })
  );

  console.log("Benchmarking XML → NDJSON (large) [multi-thread]...");
  results.push(
    await benchmarkConversion("XML→NDJSON (large)", xmlLarge, {
      inputFormat: "xml",
      outputFormat: "ndjson",
      profile: true,
    })
  );

  // Print results
  console.log("\n╔════════════════════════════════════════════════════════╗");
  console.log("║  Multi-Thread Benchmark Results                        ║");
  console.log("╚════════════════════════════════════════════════════════╝\n");
  console.table(results);

  // Save results to JSON
  const outputPath = path.join(process.cwd(), "bench-results-multi-thread.json");
  fs.writeFileSync(
    outputPath,
    JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        threadMode: "multi-thread",
        environment: {
          uvThreadpoolSize: threadPoolSize,
          nodeVersion: process.version,
          platform: process.platform,
          arch: process.arch,
          cpuCores: cpuCount,
        },
        results,
      },
      null,
      2
    )
  );

  console.log(`\nResults saved to: ${outputPath}`);

  // Calculate summary statistics
  const avgThroughput =
    results.reduce((sum, r) => sum + r.throughputMbps, 0) / results.length;
  const maxThroughput = Math.max(...results.map((r) => r.throughputMbps));
  const avgMemory =
    results.reduce((sum, r) => sum + r.memoryMb, 0) / results.length;
  const avgCpuTime =
    results.reduce((sum, r) => sum + r.cpuTime, 0) / results.length;

  console.log("\n╔════════════════════════════════════════════════════════╗");
  console.log("║  Summary Statistics [multi-thread]                     ║");
  console.log("╚════════════════════════════════════════════════════════╝");
  console.log(`Average Throughput: ${avgThroughput.toFixed(2)} MB/s`);
  console.log(`Peak Throughput: ${maxThroughput.toFixed(2)} MB/s`);
  console.log(`Average Memory: ${avgMemory.toFixed(2)} MB`);
  console.log(`Average CPU Time: ${avgCpuTime.toFixed(2)} ms`);

  // Performance characteristics
  console.log("\n╔════════════════════════════════════════════════════════╗");
  console.log("║  Performance Characteristics [multi-thread]            ║");
  console.log("╚════════════════════════════════════════════════════════╝");

  const tinyResults = results.filter((r) => r.size === "small");
  const mediumResults = results.filter((r) => r.size === "medium");
  const largeResults = results.filter((r) => r.size === "large");

  if (tinyResults.length > 0) {
    const avgTiny = tinyResults.reduce((sum, r) => sum + r.throughputMbps, 0) / tinyResults.length;
    console.log(`Small datasets: ${avgTiny.toFixed(2)} MB/s (avg)`);
  }

  if (mediumResults.length > 0) {
    const avgMedium = mediumResults.reduce((sum, r) => sum + r.throughputMbps, 0) / mediumResults.length;
    console.log(`Medium datasets: ${avgMedium.toFixed(2)} MB/s (avg)`);
  }

  if (largeResults.length > 0) {
    const avgLarge = largeResults.reduce((sum, r) => sum + r.throughputMbps, 0) / largeResults.length;
    console.log(`Large datasets: ${avgLarge.toFixed(2)} MB/s (avg)`);
  }

  // Concurrency analysis
  const concurrentResults = results.filter((r) => r.parallelism);
  if (concurrentResults.length > 0) {
    console.log("\nConcurrency Analysis:");
    concurrentResults.forEach((r) => {
      console.log(`  ${r.parallelism}x concurrent: ${r.throughputMbps.toFixed(2)} MB/s`);
    });
  }

  console.log("\n✓ Multi-thread benchmarks complete!");
  console.log("  Compare with single-thread results:");
  console.log("  npm run bench:compare\n");
}

// Run benchmarks
runBenchmarks().catch(console.error);
