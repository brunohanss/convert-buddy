import { performance } from "node:perf_hooks";
import { ConvertBuddy, convert } from "../src/index.js";
import { createNodeTransform } from "../src/node.js";
import { generateCsvDataset, generateNdjsonDataset, generateXmlDataset } from "./datasets.js";
import * as fs from "node:fs";
import * as path from "node:path";
import { pipeline } from "node:stream/promises";
import { Readable, Writable } from "node:stream";

/**
 * Single-Thread Benchmark Runner
 * 
 * Simulates browser environment where JavaScript runs on a single thread.
 * This is critical for testing WASM performance in constrained environments.
 * 
 * Configuration:
 * - UV_THREADPOOL_SIZE=1 (set via environment)
 * - Single-threaded execution
 * - No parallel processing
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

  // Estimate records (count newlines in output)
  const records = result.filter((b) => b === 10).length;
  const recordsPerSec = records / (latencyMs / 1000);

  return {
    name,
    threadMode: "single-thread",
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
  chunkSize: number = 4 * 1024 // Smaller chunks for single-thread (4KB)
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

  const records = result.filter((b) => b === 10).length;
  const recordsPerSec = records / (latencyMs / 1000);

  return {
    name,
    threadMode: "single-thread",
    dataset: `${(data.length / (1024 * 1024)).toFixed(2)} MB (streaming, ${chunkSize / 1024}KB chunks)`,
    size: data.length < 100000 ? "small" : data.length < 10000000 ? "medium" : "large",
    throughputMbps: parseFloat(throughputMbps.toFixed(2)),
    latencyMs: parseFloat(latencyMs.toFixed(2)),
    memoryMb: parseFloat(memoryMb.toFixed(2)),
    recordsPerSec: parseFloat(recordsPerSec.toFixed(0)),
    cpuTime: parseFloat(cpuTime.toFixed(2)),
  };
}

async function runBenchmarks() {
  console.log("╔════════════════════════════════════════════════════════╗");
  console.log("║  Convert Buddy - Single-Thread Benchmark Suite        ║");
  console.log("║  (Simulating Browser Environment)                      ║");
  console.log("╚════════════════════════════════════════════════════════╝\n");

  // Verify single-thread configuration
  console.log("Environment Configuration:");
  console.log(`  UV_THREADPOOL_SIZE: ${process.env.UV_THREADPOOL_SIZE || "default (4)"}`);
  console.log(`  Node.js Version: ${process.version}`);
  console.log(`  Platform: ${process.platform}`);
  console.log(`  Architecture: ${process.arch}`);
  console.log(`  CPU Cores: ${require("os").cpus().length}`);
  console.log();

  if (process.env.UV_THREADPOOL_SIZE !== "1") {
    console.warn("⚠️  WARNING: UV_THREADPOOL_SIZE is not set to 1!");
    console.warn("   For true single-thread testing, run with:");
    console.warn("   UV_THREADPOOL_SIZE=1 node ./dist/bench/single-thread.js\n");
  }

  const results: BenchmarkResult[] = [];

  // Generate datasets
  console.log("Generating datasets...\n");
  const csvTiny = generateCsvDataset(100, 5);
  const csvSmall = generateCsvDataset(1_000, 10);
  const csvMedium = generateCsvDataset(10_000, 10);
  const csvLarge = generateCsvDataset(100_000, 10);

  const ndjsonTiny = generateNdjsonDataset(100, 5);
  const ndjsonSmall = generateNdjsonDataset(1_000, 10);
  const ndjsonMedium = generateNdjsonDataset(10_000, 10);
  const ndjsonLarge = generateNdjsonDataset(100_000, 10);

  const xmlTiny = generateXmlDataset(100, 5);
  const xmlSmall = generateXmlDataset(1_000, 10);
  const xmlMedium = generateXmlDataset(10_000, 10);

  // ========== CSV Benchmarks ==========
  console.log("╔════════════════════════════════════════════════════════╗");
  console.log("║  CSV → NDJSON [single-thread]                          ║");
  console.log("╚════════════════════════════════════════════════════════╝\n");

  console.log("Benchmarking CSV → NDJSON (tiny) [single-thread]...");
  results.push(
    await benchmarkConversion("CSV→NDJSON (tiny)", csvTiny, {
      inputFormat: "csv",
      outputFormat: "ndjson",
      profile: true,
    })
  );

  console.log("Benchmarking CSV → NDJSON (small) [single-thread]...");
  results.push(
    await benchmarkConversion("CSV→NDJSON (small)", csvSmall, {
      inputFormat: "csv",
      outputFormat: "ndjson",
      profile: true,
    })
  );

  console.log("Benchmarking CSV → NDJSON (medium) [single-thread]...");
  results.push(
    await benchmarkConversion("CSV→NDJSON (medium)", csvMedium, {
      inputFormat: "csv",
      outputFormat: "ndjson",
      profile: true,
    })
  );

  console.log("Benchmarking CSV → NDJSON (large) [single-thread]...");
  results.push(
    await benchmarkConversion("CSV→NDJSON (large)", csvLarge, {
      inputFormat: "csv",
      outputFormat: "ndjson",
      profile: true,
    })
  );

  console.log("Benchmarking CSV → NDJSON (streaming, 4KB chunks) [single-thread]...");
  results.push(
    await benchmarkStreaming("CSV→NDJSON (streaming)", csvMedium, {
      inputFormat: "csv",
      outputFormat: "ndjson",
      profile: true,
    }, 4 * 1024)
  );

  console.log("Benchmarking CSV → NDJSON (streaming, 16KB chunks) [single-thread]...");
  results.push(
    await benchmarkStreaming("CSV→NDJSON (streaming)", csvMedium, {
      inputFormat: "csv",
      outputFormat: "ndjson",
      profile: true,
    }, 16 * 1024)
  );

  // ========== NDJSON Benchmarks ==========
  console.log("\n╔════════════════════════════════════════════════════════╗");
  console.log("║  NDJSON Conversions [single-thread]                    ║");
  console.log("╚════════════════════════════════════════════════════════╝\n");

  console.log("Benchmarking NDJSON → JSON (tiny) [single-thread]...");
  results.push(
    await benchmarkConversion("NDJSON→JSON (tiny)", ndjsonTiny, {
      inputFormat: "ndjson",
      outputFormat: "json",
      profile: true,
    })
  );

  console.log("Benchmarking NDJSON → JSON (small) [single-thread]...");
  results.push(
    await benchmarkConversion("NDJSON→JSON (small)", ndjsonSmall, {
      inputFormat: "ndjson",
      outputFormat: "json",
      profile: true,
    })
  );

  console.log("Benchmarking NDJSON → JSON (medium) [single-thread]...");
  results.push(
    await benchmarkConversion("NDJSON→JSON (medium)", ndjsonMedium, {
      inputFormat: "ndjson",
      outputFormat: "json",
      profile: true,
    })
  );

  console.log("Benchmarking NDJSON → JSON (large) [single-thread]...");
  results.push(
    await benchmarkConversion("NDJSON→JSON (large)", ndjsonLarge, {
      inputFormat: "ndjson",
      outputFormat: "json",
      profile: true,
    })
  );

  console.log("Benchmarking NDJSON passthrough (large) [single-thread]...");
  results.push(
    await benchmarkConversion("NDJSON→NDJSON (large)", ndjsonLarge, {
      inputFormat: "ndjson",
      outputFormat: "ndjson",
      profile: true,
    })
  );

  // ========== XML Benchmarks ==========
  console.log("\n╔════════════════════════════════════════════════════════╗");
  console.log("║  XML → NDJSON [single-thread]                          ║");
  console.log("╚════════════════════════════════════════════════════════╝\n");

  console.log("Benchmarking XML → NDJSON (tiny) [single-thread]...");
  results.push(
    await benchmarkConversion("XML→NDJSON (tiny)", xmlTiny, {
      inputFormat: "xml",
      outputFormat: "ndjson",
      profile: true,
    })
  );

  console.log("Benchmarking XML → NDJSON (small) [single-thread]...");
  results.push(
    await benchmarkConversion("XML→NDJSON (small)", xmlSmall, {
      inputFormat: "xml",
      outputFormat: "ndjson",
      profile: true,
    })
  );

  console.log("Benchmarking XML → NDJSON (medium) [single-thread]...");
  results.push(
    await benchmarkConversion("XML→NDJSON (medium)", xmlMedium, {
      inputFormat: "xml",
      outputFormat: "ndjson",
      profile: true,
    })
  );

  // Print results
  console.log("\n╔════════════════════════════════════════════════════════╗");
  console.log("║  Single-Thread Benchmark Results                       ║");
  console.log("╚════════════════════════════════════════════════════════╝\n");
  console.table(results);

  // Save results to JSON
  const outputPath = path.join(process.cwd(), "bench-results-single-thread.json");
  fs.writeFileSync(
    outputPath,
    JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        threadMode: "single-thread",
        environment: {
          uvThreadpoolSize: process.env.UV_THREADPOOL_SIZE || "default",
          nodeVersion: process.version,
          platform: process.platform,
          arch: process.arch,
          cpuCores: require("os").cpus().length,
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
  console.log("║  Summary Statistics [single-thread]                    ║");
  console.log("╚════════════════════════════════════════════════════════╝");
  console.log(`Average Throughput: ${avgThroughput.toFixed(2)} MB/s`);
  console.log(`Peak Throughput: ${maxThroughput.toFixed(2)} MB/s`);
  console.log(`Average Memory: ${avgMemory.toFixed(2)} MB`);
  console.log(`Average CPU Time: ${avgCpuTime.toFixed(2)} ms`);

  // Performance characteristics
  console.log("\n╔════════════════════════════════════════════════════════╗");
  console.log("║  Performance Characteristics [single-thread]           ║");
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

  console.log("\n✓ Single-thread benchmarks complete!");
  console.log("  Run multi-thread benchmarks for comparison:");
  console.log("  npm run bench:multi-thread\n");
}

// Run benchmarks
runBenchmarks().catch(console.error);
