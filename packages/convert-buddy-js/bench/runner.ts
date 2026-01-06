import { performance } from "node:perf_hooks";
import { ConvertBuddy, convert, createNodeTransform } from "../src/index.js";
import { generateCsvDataset, generateNdjsonDataset } from "./datasets.js";
import * as fs from "node:fs";
import * as path from "node:path";
import { pipeline } from "node:stream/promises";
import { Readable, Writable } from "node:stream";

type BenchmarkResult = {
  name: string;
  dataset: string;
  throughputMbps: number;
  latencyMs: number;
  memoryMb: number;
  recordsPerSec: number;
};

async function benchmarkConversion(
  name: string,
  data: Uint8Array,
  opts: any
): Promise<BenchmarkResult> {
  const startMem = process.memoryUsage().heapUsed;
  const start = performance.now();

  const result = await convert(data, opts);

  const end = performance.now();
  const endMem = process.memoryUsage().heapUsed;

  const latencyMs = end - start;
  const throughputMbps = (data.length / (1024 * 1024)) / (latencyMs / 1000);
  const memoryMb = (endMem - startMem) / (1024 * 1024);

  // Estimate records (count newlines in output)
  const records = result.filter((b) => b === 10).length; // newline count
  const recordsPerSec = records / (latencyMs / 1000);

  return {
    name,
    dataset: `${(data.length / (1024 * 1024)).toFixed(2)} MB`,
    throughputMbps: parseFloat(throughputMbps.toFixed(2)),
    latencyMs: parseFloat(latencyMs.toFixed(2)),
    memoryMb: parseFloat(memoryMb.toFixed(2)),
    recordsPerSec: parseFloat(recordsPerSec.toFixed(0)),
  };
}

async function benchmarkStreaming(
  name: string,
  data: Uint8Array,
  opts: any,
  chunkSize: number = 64 * 1024
): Promise<BenchmarkResult> {
  const startMem = process.memoryUsage().heapUsed;
  const start = performance.now();

  const chunks: Buffer[] = [];
  const transform = createNodeTransform(opts);

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

  const result = Buffer.concat(chunks);
  const latencyMs = end - start;
  const throughputMbps = (data.length / (1024 * 1024)) / (latencyMs / 1000);
  const memoryMb = (endMem - startMem) / (1024 * 1024);

  const records = result.filter((b) => b === 10).length;
  const recordsPerSec = records / (latencyMs / 1000);

  return {
    name,
    dataset: `${(data.length / (1024 * 1024)).toFixed(2)} MB (streaming)`,
    throughputMbps: parseFloat(throughputMbps.toFixed(2)),
    latencyMs: parseFloat(latencyMs.toFixed(2)),
    memoryMb: parseFloat(memoryMb.toFixed(2)),
    recordsPerSec: parseFloat(recordsPerSec.toFixed(0)),
  };
}

async function runBenchmarks() {
  console.log("=== Convert Buddy Benchmark Suite ===\n");

  const results: BenchmarkResult[] = [];

  // CSV Benchmarks
  console.log("Generating CSV datasets...");
  const csvSmall = generateCsvDataset(1000, 10); // 1K rows, 10 cols
  const csvMedium = generateCsvDataset(100000, 20); // 100K rows, 20 cols
  const csvLarge = generateCsvDataset(1000000, 10); // 1M rows, 10 cols

  console.log("\nBenchmarking CSV -> NDJSON (small)...");
  results.push(
    await benchmarkConversion("CSV->NDJSON (small)", csvSmall, {
      inputFormat: "csv",
      outputFormat: "ndjson",
      profile: true,
    })
  );

  console.log("Benchmarking CSV -> NDJSON (medium)...");
  results.push(
    await benchmarkConversion("CSV->NDJSON (medium)", csvMedium, {
      inputFormat: "csv",
      outputFormat: "ndjson",
      profile: true,
    })
  );

  console.log("Benchmarking CSV -> NDJSON (large)...");
  results.push(
    await benchmarkConversion("CSV->NDJSON (large)", csvLarge, {
      inputFormat: "csv",
      outputFormat: "ndjson",
      profile: true,
    })
  );

  console.log("Benchmarking CSV -> NDJSON (streaming)...");
  results.push(
    await benchmarkStreaming("CSV->NDJSON (streaming)", csvMedium, {
      inputFormat: "csv",
      outputFormat: "ndjson",
      profile: true,
    })
  );

  // NDJSON Benchmarks
  console.log("\nGenerating NDJSON datasets...");
  const ndjsonSmall = generateNdjsonDataset(1000, 10);
  const ndjsonMedium = generateNdjsonDataset(100000, 20);
  const ndjsonLarge = generateNdjsonDataset(1000000, 10);

  console.log("Benchmarking NDJSON -> JSON (small)...");
  results.push(
    await benchmarkConversion("NDJSON->JSON (small)", ndjsonSmall, {
      inputFormat: "ndjson",
      outputFormat: "json",
      profile: true,
    })
  );

  console.log("Benchmarking NDJSON -> JSON (medium)...");
  results.push(
    await benchmarkConversion("NDJSON->JSON (medium)", ndjsonMedium, {
      inputFormat: "ndjson",
      outputFormat: "json",
      profile: true,
    })
  );

  console.log("Benchmarking NDJSON passthrough (large)...");
  results.push(
    await benchmarkConversion("NDJSON passthrough (large)", ndjsonLarge, {
      inputFormat: "ndjson",
      outputFormat: "ndjson",
      profile: true,
    })
  );

  // Print results
  console.log("\n=== Benchmark Results ===\n");
  console.table(results);

  // Save results to JSON
  const outputPath = path.join(process.cwd(), "bench-results.json");
  fs.writeFileSync(
    outputPath,
    JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        platform: process.platform,
        arch: process.arch,
        nodeVersion: process.version,
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

  console.log("\n=== Summary ===");
  console.log(`Average Throughput: ${avgThroughput.toFixed(2)} MB/s`);
  console.log(`Peak Throughput: ${maxThroughput.toFixed(2)} MB/s`);
  console.log(`Average Memory: ${avgMemory.toFixed(2)} MB`);
}

// Run benchmarks
runBenchmarks().catch(console.error);
