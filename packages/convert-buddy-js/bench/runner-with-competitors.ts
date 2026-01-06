import { performance } from "node:perf_hooks";
import { ConvertBuddy, convert, createNodeTransform } from "../src/index.js";
import { generateCsvDataset, generateNdjsonDataset } from "./datasets.js";
import * as fs from "node:fs";
import * as path from "node:path";
import { pipeline } from "node:stream/promises";
import { Readable, Writable } from "node:stream";

type BenchmarkResult = {
  tool: string;
  name: string;
  dataset: string;
  throughputMbps: number;
  latencyMs: number;
  memoryMb: number;
  recordsPerSec: number;
};

async function benchmarkConversion(
  tool: string,
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
    tool,
    name,
    dataset: `${(data.length / (1024 * 1024)).toFixed(2)} MB`,
    throughputMbps: parseFloat(throughputMbps.toFixed(2)),
    latencyMs: parseFloat(latencyMs.toFixed(2)),
    memoryMb: parseFloat(memoryMb.toFixed(2)),
    recordsPerSec: parseFloat(recordsPerSec.toFixed(0)),
  };
}

// Competitor benchmark: PapaParse
async function benchmarkPapaParse(
  name: string,
  csvData: string
): Promise<BenchmarkResult | null> {
  try {
    const Papa = await import("papaparse");
    const data = new TextEncoder().encode(csvData);
    
    const startMem = process.memoryUsage().heapUsed;
    const start = performance.now();

    const result = Papa.parse(csvData, { header: true });
    const ndjson = result.data.map((row: any) => JSON.stringify(row)).join("\n");

    const end = performance.now();
    const endMem = process.memoryUsage().heapUsed;

    const latencyMs = end - start;
    const throughputMbps = (data.length / (1024 * 1024)) / (latencyMs / 1000);
    const memoryMb = (endMem - startMem) / (1024 * 1024);
    const recordsPerSec = result.data.length / (latencyMs / 1000);

    return {
      tool: "PapaParse",
      name,
      dataset: `${(data.length / (1024 * 1024)).toFixed(2)} MB`,
      throughputMbps: parseFloat(throughputMbps.toFixed(2)),
      latencyMs: parseFloat(latencyMs.toFixed(2)),
      memoryMb: parseFloat(memoryMb.toFixed(2)),
      recordsPerSec: parseFloat(recordsPerSec.toFixed(0)),
    };
  } catch (error) {
    console.log(`⚠️  PapaParse not available (run: npm install)`);
    return null;
  }
}

// Competitor benchmark: csv-parse
async function benchmarkCsvParse(
  name: string,
  csvData: string
): Promise<BenchmarkResult | null> {
  try {
    const { parse } = await import("csv-parse/sync");
    const data = new TextEncoder().encode(csvData);
    
    const startMem = process.memoryUsage().heapUsed;
    const start = performance.now();

    const records = parse(csvData, { columns: true });
    const ndjson = records.map((row: any) => JSON.stringify(row)).join("\n");

    const end = performance.now();
    const endMem = process.memoryUsage().heapUsed;

    const latencyMs = end - start;
    const throughputMbps = (data.length / (1024 * 1024)) / (latencyMs / 1000);
    const memoryMb = (endMem - startMem) / (1024 * 1024);
    const recordsPerSec = records.length / (latencyMs / 1000);

    return {
      tool: "csv-parse",
      name,
      dataset: `${(data.length / (1024 * 1024)).toFixed(2)} MB`,
      throughputMbps: parseFloat(throughputMbps.toFixed(2)),
      latencyMs: parseFloat(latencyMs.toFixed(2)),
      memoryMb: parseFloat(memoryMb.toFixed(2)),
      recordsPerSec: parseFloat(recordsPerSec.toFixed(0)),
    };
  } catch (error) {
    console.log(`⚠️  csv-parse not available (run: npm install)`);
    return null;
  }
}

// Competitor benchmark: fast-csv
async function benchmarkFastCsv(
  name: string,
  csvData: string
): Promise<BenchmarkResult | null> {
  try {
    const fastCsv = await import("fast-csv");
    const { Readable } = await import("stream");
    const data = new TextEncoder().encode(csvData);
    
    const startMem = process.memoryUsage().heapUsed;
    const start = performance.now();

    const rows: any[] = [];
    await new Promise<void>((resolve, reject) => {
      Readable.from([csvData])
        .pipe(fastCsv.parse({ headers: true }))
        .on("data", (row) => rows.push(row))
        .on("end", () => resolve())
        .on("error", reject);
    });

    const ndjson = rows.map((row) => JSON.stringify(row)).join("\n");

    const end = performance.now();
    const endMem = process.memoryUsage().heapUsed;

    const latencyMs = end - start;
    const throughputMbps = (data.length / (1024 * 1024)) / (latencyMs / 1000);
    const memoryMb = (endMem - startMem) / (1024 * 1024);
    const recordsPerSec = rows.length / (latencyMs / 1000);

    return {
      tool: "fast-csv",
      name,
      dataset: `${(data.length / (1024 * 1024)).toFixed(2)} MB`,
      throughputMbps: parseFloat(throughputMbps.toFixed(2)),
      latencyMs: parseFloat(latencyMs.toFixed(2)),
      memoryMb: parseFloat(memoryMb.toFixed(2)),
      recordsPerSec: parseFloat(recordsPerSec.toFixed(0)),
    };
  } catch (error) {
    console.log(`⚠️  fast-csv not available (run: npm install)`);
    return null;
  }
}

async function benchmarkStreaming(
  tool: string,
  name: string,
  data: Uint8Array,
  opts: any
): Promise<BenchmarkResult> {
  const startMem = process.memoryUsage().heapUsed;
  const start = performance.now();

  const buddy = await ConvertBuddy.create(opts);
  const result = buddy.push(data);
  const final = buddy.finish();

  const end = performance.now();
  const endMem = process.memoryUsage().heapUsed;

  const latencyMs = end - start;
  const throughputMbps = (data.length / (1024 * 1024)) / (latencyMs / 1000);
  const memoryMb = (endMem - startMem) / (1024 * 1024);

  const totalOutput = new Uint8Array(result.length + final.length);
  totalOutput.set(result);
  totalOutput.set(final, result.length);

  const records = totalOutput.filter((b) => b === 10).length;
  const recordsPerSec = records / (latencyMs / 1000);

  return {
    tool,
    name,
    dataset: `${(data.length / (1024 * 1024)).toFixed(2)} MB (streaming)`,
    throughputMbps: parseFloat(throughputMbps.toFixed(2)),
    latencyMs: parseFloat(latencyMs.toFixed(2)),
    memoryMb: parseFloat(memoryMb.toFixed(2)),
    recordsPerSec: parseFloat(recordsPerSec.toFixed(0)),
  };
}

async function runBenchmarks() {
  console.log("╔════════════════════════════════════════╗");
  console.log("║  Convert Buddy Benchmarks (with Competitors)  ║");
  console.log("╚════════════════════════════════════════╝\n");

  const results: BenchmarkResult[] = [];

  // Generate datasets
  console.log("Generating CSV datasets...\n");
  const csvSmall = generateCsvDataset(1_000, 10);
  const csvMedium = generateCsvDataset(10_000, 10);
  const csvLarge = generateCsvDataset(100_000, 10);

  const csvSmallStr = new TextDecoder().decode(csvSmall);
  const csvMediumStr = new TextDecoder().decode(csvMedium);
  const csvLargeStr = new TextDecoder().decode(csvLarge);

  // Benchmark convert-buddy
  console.log("Benchmarking convert-buddy CSV -> NDJSON (small)...");
  results.push(
    await benchmarkConversion("convert-buddy", "CSV->NDJSON (small)", csvSmall, {
      inputFormat: "csv",
      outputFormat: "ndjson",
      profile: true,
    })
  );

  console.log("Benchmarking convert-buddy CSV -> NDJSON (medium)...");
  results.push(
    await benchmarkConversion("convert-buddy", "CSV->NDJSON (medium)", csvMedium, {
      inputFormat: "csv",
      outputFormat: "ndjson",
      profile: true,
    })
  );

  console.log("Benchmarking convert-buddy CSV -> NDJSON (large)...");
  results.push(
    await benchmarkConversion("convert-buddy", "CSV->NDJSON (large)", csvLarge, {
      inputFormat: "csv",
      outputFormat: "ndjson",
      profile: true,
    })
  );

  // Benchmark competitors (medium dataset only for comparison)
  console.log("\nBenchmarking competitors (medium dataset)...\n");
  
  const papaResult = await benchmarkPapaParse("CSV->NDJSON (medium)", csvMediumStr);
  if (papaResult) results.push(papaResult);

  const csvParseResult = await benchmarkCsvParse("CSV->NDJSON (medium)", csvMediumStr);
  if (csvParseResult) results.push(csvParseResult);

  const fastCsvResult = await benchmarkFastCsv("CSV->NDJSON (medium)", csvMediumStr);
  if (fastCsvResult) results.push(fastCsvResult);

  // Streaming benchmark
  console.log("\nBenchmarking convert-buddy streaming...");
  results.push(
    await benchmarkStreaming("convert-buddy", "CSV->NDJSON (streaming)", csvMedium, {
      inputFormat: "csv",
      outputFormat: "ndjson",
    })
  );

  // NDJSON benchmarks
  console.log("\nGenerating NDJSON datasets...\n");
  const ndjsonSmall = generateNdjsonDataset(1_000, 10);
  const ndjsonMedium = generateNdjsonDataset(10_000, 10);
  const ndjsonLarge = generateNdjsonDataset(100_000, 10);

  console.log("Benchmarking NDJSON -> JSON (small)...");
  results.push(
    await benchmarkConversion("convert-buddy", "NDJSON->JSON (small)", ndjsonSmall, {
      inputFormat: "ndjson",
      outputFormat: "json",
    })
  );

  console.log("Benchmarking NDJSON -> JSON (medium)...");
  results.push(
    await benchmarkConversion("convert-buddy", "NDJSON->JSON (medium)", ndjsonMedium, {
      inputFormat: "ndjson",
      outputFormat: "json",
    })
  );

  console.log("Benchmarking NDJSON passthrough (large)...");
  results.push(
    await benchmarkConversion("convert-buddy", "NDJSON passthrough (large)", ndjsonLarge, {
      inputFormat: "ndjson",
      outputFormat: "ndjson",
    })
  );

  // Print results
  console.log("\n╔════════════════════════════════════════╗");
  console.log("║  Benchmark Results                     ║");
  console.log("╚════════════════════════════════════════╝\n");
  console.table(results);

  // Save to file
  const outputPath = path.join(process.cwd(), "bench-results.json");
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
  console.log(`\nResults saved to: ${outputPath}`);

  // Print comparison summary
  console.log("\n╔════════════════════════════════════════╗");
  console.log("║  Competitive Comparison (Medium CSV)  ║");
  console.log("╚════════════════════════════════════════╝\n");

  const mediumResults = results.filter(r => r.name === "CSV->NDJSON (medium)");
  if (mediumResults.length > 1) {
    const sorted = mediumResults.sort((a, b) => b.throughputMbps - a.throughputMbps);
    console.log("Ranking by Throughput:");
    sorted.forEach((r, i) => {
      const speedup = i === 0 ? "" : ` (${(sorted[0].throughputMbps / r.throughputMbps).toFixed(2)}x slower)`;
      console.log(`  ${i + 1}. ${r.tool}: ${r.throughputMbps} MB/s${speedup}`);
    });
    console.log();
  }
}

runBenchmarks().catch(console.error);
