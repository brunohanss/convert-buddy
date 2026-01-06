import { performance } from "node:perf_hooks";
import { ConvertBuddy, convert, createNodeTransform } from "../src/index.js";
import { generateCsvDataset, generateNdjsonDataset, generateXmlDataset } from "./datasets.js";
import * as fs from "node:fs";
import * as path from "node:path";
import { pipeline } from "node:stream/promises";
import { Readable, Writable } from "node:stream";

type BenchmarkResult = {
  tool: string;
  conversion: string;
  size: string;
  dataset: string;
  throughputMbps: number;
  latencyMs: number;
  memoryMb: number;
  recordsPerSec: number;
};

async function benchmarkConversion(
  tool: string,
  conversion: string,
  size: string,
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
    conversion,
    size,
    dataset: `${(data.length / (1024 * 1024)).toFixed(2)} MB`,
    throughputMbps: parseFloat(throughputMbps.toFixed(2)),
    latencyMs: parseFloat(latencyMs.toFixed(2)),
    memoryMb: parseFloat(memoryMb.toFixed(2)),
    recordsPerSec: parseFloat(recordsPerSec.toFixed(0)),
  };
}

// Competitor benchmark: PapaParse
async function benchmarkPapaParse(
  conversion: string,
  size: string,
  csvData: string
): Promise<BenchmarkResult | null> {
  try {
    const papaModule = await import("papaparse");
    const Papa = papaModule.default || papaModule;
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
      conversion,
      size,
      dataset: `${(data.length / (1024 * 1024)).toFixed(2)} MB`,
      throughputMbps: parseFloat(throughputMbps.toFixed(2)),
      latencyMs: parseFloat(latencyMs.toFixed(2)),
      memoryMb: parseFloat(memoryMb.toFixed(2)),
      recordsPerSec: parseFloat(recordsPerSec.toFixed(0)),
    };
  } catch (error) {
    console.log(`⚠️  PapaParse not available: ${error}`);
    return null;
  }
}

// Competitor benchmark: csv-parse
async function benchmarkCsvParse(
  conversion: string,
  size: string,
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
      conversion,
      size,
      dataset: `${(data.length / (1024 * 1024)).toFixed(2)} MB`,
      throughputMbps: parseFloat(throughputMbps.toFixed(2)),
      latencyMs: parseFloat(latencyMs.toFixed(2)),
      memoryMb: parseFloat(memoryMb.toFixed(2)),
      recordsPerSec: parseFloat(recordsPerSec.toFixed(0)),
    };
  } catch (error) {
    console.log(`⚠️  csv-parse not available: ${error}`);
    return null;
  }
}

// Competitor benchmark: fast-csv
async function benchmarkFastCsv(
  conversion: string,
  size: string,
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
      conversion,
      size,
      dataset: `${(data.length / (1024 * 1024)).toFixed(2)} MB`,
      throughputMbps: parseFloat(throughputMbps.toFixed(2)),
      latencyMs: parseFloat(latencyMs.toFixed(2)),
      memoryMb: parseFloat(memoryMb.toFixed(2)),
      recordsPerSec: parseFloat(recordsPerSec.toFixed(0)),
    };
  } catch (error) {
    console.log(`⚠️  fast-csv not available: ${error}`);
    return null;
  }
}

async function runBenchmarks() {
  console.log("╔════════════════════════════════════════╗");
  console.log("║  Convert Buddy Comprehensive Benchmarks  ║");
  console.log("╚════════════════════════════════════════╝\n");

  const results: BenchmarkResult[] = [];

  // Generate datasets
  console.log("Generating datasets...\n");
  const csvSmall = generateCsvDataset(1_000, 10);
  const csvMedium = generateCsvDataset(10_000, 10);
  const csvLarge = generateCsvDataset(100_000, 10);

  const csvSmallStr = new TextDecoder().decode(csvSmall);
  const csvMediumStr = new TextDecoder().decode(csvMedium);
  const csvLargeStr = new TextDecoder().decode(csvLarge);

  const ndjsonSmall = generateNdjsonDataset(1_000, 10);
  const ndjsonMedium = generateNdjsonDataset(10_000, 10);
  const ndjsonLarge = generateNdjsonDataset(100_000, 10);

  const xmlSmall = generateXmlDataset(1_000, 10);
  const xmlMedium = generateXmlDataset(10_000, 10);
  const xmlLarge = generateXmlDataset(100_000, 10);

  // ========== CSV -> NDJSON Benchmarks ==========
  console.log("╔════════════════════════════════════════╗");
  console.log("║  CSV → NDJSON Benchmarks               ║");
  console.log("╚════════════════════════════════════════╝\n");

  // Small
  console.log("Benchmarking CSV → NDJSON (small)...");
  results.push(
    await benchmarkConversion("convert-buddy", "CSV→NDJSON", "small", csvSmall, {
      inputFormat: "csv",
      outputFormat: "ndjson",
    })
  );

  const papaSmall = await benchmarkPapaParse("CSV→NDJSON", "small", csvSmallStr);
  if (papaSmall) results.push(papaSmall);

  const csvParseSmall = await benchmarkCsvParse("CSV→NDJSON", "small", csvSmallStr);
  if (csvParseSmall) results.push(csvParseSmall);

  const fastCsvSmall = await benchmarkFastCsv("CSV→NDJSON", "small", csvSmallStr);
  if (fastCsvSmall) results.push(fastCsvSmall);

  // Medium
  console.log("Benchmarking CSV → NDJSON (medium)...");
  results.push(
    await benchmarkConversion("convert-buddy", "CSV→NDJSON", "medium", csvMedium, {
      inputFormat: "csv",
      outputFormat: "ndjson",
    })
  );

  const papaMedium = await benchmarkPapaParse("CSV→NDJSON", "medium", csvMediumStr);
  if (papaMedium) results.push(papaMedium);

  const csvParseMedium = await benchmarkCsvParse("CSV→NDJSON", "medium", csvMediumStr);
  if (csvParseMedium) results.push(csvParseMedium);

  const fastCsvMedium = await benchmarkFastCsv("CSV→NDJSON", "medium", csvMediumStr);
  if (fastCsvMedium) results.push(fastCsvMedium);

  // Large
  console.log("Benchmarking CSV → NDJSON (large)...");
  results.push(
    await benchmarkConversion("convert-buddy", "CSV→NDJSON", "large", csvLarge, {
      inputFormat: "csv",
      outputFormat: "ndjson",
    })
  );

  const papaLarge = await benchmarkPapaParse("CSV→NDJSON", "large", csvLargeStr);
  if (papaLarge) results.push(papaLarge);

  const csvParseLarge = await benchmarkCsvParse("CSV→NDJSON", "large", csvLargeStr);
  if (csvParseLarge) results.push(csvParseLarge);

  const fastCsvLarge = await benchmarkFastCsv("CSV→NDJSON", "large", csvLargeStr);
  if (fastCsvLarge) results.push(fastCsvLarge);

  // ========== NDJSON Benchmarks ==========
  console.log("\n╔════════════════════════════════════════╗");
  console.log("║  NDJSON Benchmarks                     ║");
  console.log("╚════════════════════════════════════════╝\n");

  console.log("Benchmarking NDJSON → JSON (small)...");
  results.push(
    await benchmarkConversion("convert-buddy", "NDJSON→JSON", "small", ndjsonSmall, {
      inputFormat: "ndjson",
      outputFormat: "json",
    })
  );

  console.log("Benchmarking NDJSON → JSON (medium)...");
  results.push(
    await benchmarkConversion("convert-buddy", "NDJSON→JSON", "medium", ndjsonMedium, {
      inputFormat: "ndjson",
      outputFormat: "json",
    })
  );

  console.log("Benchmarking NDJSON → JSON (large)...");
  results.push(
    await benchmarkConversion("convert-buddy", "NDJSON→JSON", "large", ndjsonLarge, {
      inputFormat: "ndjson",
      outputFormat: "json",
    })
  );

  console.log("Benchmarking NDJSON passthrough (large)...");
  results.push(
    await benchmarkConversion("convert-buddy", "NDJSON→NDJSON", "large", ndjsonLarge, {
      inputFormat: "ndjson",
      outputFormat: "ndjson",
    })
  );

  // ========== XML Benchmarks ==========
  console.log("\n╔════════════════════════════════════════╗");
  console.log("║  XML → NDJSON Benchmarks               ║");
  console.log("╚════════════════════════════════════════╝\n");

  console.log("Benchmarking XML → NDJSON (small)...");
  results.push(
    await benchmarkConversion("convert-buddy", "XML→NDJSON", "small", xmlSmall, {
      inputFormat: "xml",
      outputFormat: "ndjson",
    })
  );

  console.log("Benchmarking XML → NDJSON (medium)...");
  results.push(
    await benchmarkConversion("convert-buddy", "XML→NDJSON", "medium", xmlMedium, {
      inputFormat: "xml",
      outputFormat: "ndjson",
    })
  );

  console.log("Benchmarking XML → NDJSON (large)...");
  results.push(
    await benchmarkConversion("convert-buddy", "XML→NDJSON", "large", xmlLarge, {
      inputFormat: "xml",
      outputFormat: "ndjson",
    })
  );

  // Print results
  console.log("\n╔════════════════════════════════════════╗");
  console.log("║  All Benchmark Results                 ║");
  console.log("╚════════════════════════════════════════╝\n");
  console.table(results);

  // Save to file
  const outputPath = path.join(process.cwd(), "bench-results.json");
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
  console.log(`\nResults saved to: ${outputPath}`);

  // Print comparison summaries by size
  console.log("\n╔════════════════════════════════════════╗");
  console.log("║  CSV→NDJSON Comparison by Size        ║");
  console.log("╚════════════════════════════════════════╝\n");

  for (const size of ["small", "medium", "large"]) {
    const csvResults = results.filter(
      (r) => r.conversion === "CSV→NDJSON" && r.size === size
    );
    
    if (csvResults.length > 1) {
      const sorted = csvResults.sort((a, b) => b.throughputMbps - a.throughputMbps);
      console.log(`\n${size.toUpperCase()} (${sorted[0].dataset}):`);
      sorted.forEach((r, i) => {
        const speedup = i === 0 ? "" : ` (${(sorted[0].throughputMbps / r.throughputMbps).toFixed(2)}x slower)`;
        console.log(`  ${i + 1}. ${r.tool.padEnd(15)} ${r.throughputMbps.toString().padStart(8)} MB/s  ${r.recordsPerSec.toLocaleString().padStart(10)} rec/s${speedup}`);
      });
    }
  }

  // Summary statistics
  console.log("\n╔════════════════════════════════════════╗");
  console.log("║  Summary Statistics                    ║");
  console.log("╚════════════════════════════════════════╝\n");

  const convertBuddyResults = results.filter((r) => r.tool === "convert-buddy");
  const avgThroughput = convertBuddyResults.reduce((sum, r) => sum + r.throughputMbps, 0) / convertBuddyResults.length;
  const maxThroughput = Math.max(...convertBuddyResults.map((r) => r.throughputMbps));
  const maxRecordsPerSec = Math.max(...convertBuddyResults.map((r) => r.recordsPerSec));

  console.log(`convert-buddy Performance:`);
  console.log(`  Average Throughput: ${avgThroughput.toFixed(2)} MB/s`);
  console.log(`  Peak Throughput: ${maxThroughput.toFixed(2)} MB/s`);
  console.log(`  Peak Records/sec: ${maxRecordsPerSec.toLocaleString()}`);
  console.log(`  Conversions Tested: ${new Set(convertBuddyResults.map(r => r.conversion)).size}`);
  console.log(`  Total Benchmarks: ${convertBuddyResults.length}`);
}

runBenchmarks().catch(console.error);
