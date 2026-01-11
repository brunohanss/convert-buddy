/**
 * CSV to JSON Conversion Benchmark
 * Tests converting CSV files to JSON format
 * Competitors: PapaParse, csv-parse, fast-csv
 */

import { performance } from "node:perf_hooks";
import { convert } from "../../src/index.js";
import {
  generateCsvDataset,
  generateRealisticCsv,
  generateWideCsv,
} from "../datasets.js";

export type BenchmarkResult = {
  tool: string;
  dataset: string;
  throughputMbps: number;
  latencyMs: number;
  memoryMb: number;
  recordsPerSec: number;
  success: boolean;
  error?: string;
};

async function benchmarkConvertBuddy(
  name: string,
  data: Uint8Array
): Promise<BenchmarkResult> {
  try {
    if (global.gc) global.gc();

    const startMem = process.memoryUsage().heapUsed;
    const start = performance.now();

    const result = await convert(data, {
      inputFormat: "csv",
      outputFormat: "json",
    });

    const end = performance.now();
    const endMem = process.memoryUsage().heapUsed;

    const latencyMs = end - start;
    const throughputMbps = (data.length / (1024 * 1024)) / (latencyMs / 1000);
    const memoryMb = (endMem - startMem) / (1024 * 1024);
    // Count records in JSON output array
    let recordCount = 0;
    try {
      const jsonOutput = JSON.parse(new TextDecoder().decode(result));
      recordCount = Array.isArray(jsonOutput) ? jsonOutput.length : 0;
    } catch {
      recordCount = 0;
    }
    const recordsPerSec = recordCount / (latencyMs / 1000);

    return {
      tool: "convert-buddy",
      dataset: name,
      throughputMbps: parseFloat(throughputMbps.toFixed(2)),
      latencyMs: parseFloat(latencyMs.toFixed(2)),
      memoryMb: parseFloat(memoryMb.toFixed(2)),
      recordsPerSec: parseFloat(recordsPerSec.toFixed(0)),
      success: true,
    };
  } catch (error: any) {
    return {
      tool: "convert-buddy",
      dataset: name,
      throughputMbps: 0,
      latencyMs: 0,
      memoryMb: 0,
      recordsPerSec: 0,
      success: false,
      error: error.message,
    };
  }
}

async function benchmarkPapaParse(
  name: string,
  csvData: string
): Promise<BenchmarkResult | null> {
  try {
    const papaModule = await import("papaparse");
    const Papa = papaModule.default || papaModule;
    const data = new TextEncoder().encode(csvData);

    if (global.gc) global.gc();

    const startMem = process.memoryUsage().heapUsed;
    const start = performance.now();

    const result = Papa.parse(csvData, { header: true });
    JSON.stringify(result.data);

    const end = performance.now();
    const endMem = process.memoryUsage().heapUsed;

    const latencyMs = end - start;
    const throughputMbps = (data.length / (1024 * 1024)) / (latencyMs / 1000);
    const memoryMb = (endMem - startMem) / (1024 * 1024);
    const recordsPerSec = result.data.length / (latencyMs / 1000);

    return {
      tool: "PapaParse",
      dataset: name,
      throughputMbps: parseFloat(throughputMbps.toFixed(2)),
      latencyMs: parseFloat(latencyMs.toFixed(2)),
      memoryMb: parseFloat(memoryMb.toFixed(2)),
      recordsPerSec: parseFloat(recordsPerSec.toFixed(0)),
      success: true,
    };
  } catch (error: any) {
    return null;
  }
}

async function benchmarkCsvParse(
  name: string,
  csvData: string
): Promise<BenchmarkResult | null> {
  try {
    const { parse } = await import("csv-parse/sync");
    const data = new TextEncoder().encode(csvData);

    if (global.gc) global.gc();

    const startMem = process.memoryUsage().heapUsed;
    const start = performance.now();

    const records = parse(csvData, { columns: true });
    JSON.stringify(records);

    const end = performance.now();
    const endMem = process.memoryUsage().heapUsed;

    const latencyMs = end - start;
    const throughputMbps = (data.length / (1024 * 1024)) / (latencyMs / 1000);
    const memoryMb = (endMem - startMem) / (1024 * 1024);
    const recordsPerSec = records.length / (latencyMs / 1000);

    return {
      tool: "csv-parse",
      dataset: name,
      throughputMbps: parseFloat(throughputMbps.toFixed(2)),
      latencyMs: parseFloat(latencyMs.toFixed(2)),
      memoryMb: parseFloat(memoryMb.toFixed(2)),
      recordsPerSec: parseFloat(recordsPerSec.toFixed(0)),
      success: true,
    };
  } catch (error: any) {
    return null;
  }
}

async function benchmarkFastCsv(
  name: string,
  csvData: string
): Promise<BenchmarkResult | null> {
  try {
    const fastCsv = await import("fast-csv");
    const { Readable } = await import("stream");
    const data = new TextEncoder().encode(csvData);

    if (global.gc) global.gc();

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

    JSON.stringify(rows);

    const end = performance.now();
    const endMem = process.memoryUsage().heapUsed;

    const latencyMs = end - start;
    const throughputMbps = (data.length / (1024 * 1024)) / (latencyMs / 1000);
    const memoryMb = (endMem - startMem) / (1024 * 1024);
    const recordsPerSec = rows.length / (latencyMs / 1000);

    return {
      tool: "fast-csv",
      dataset: name,
      throughputMbps: parseFloat(throughputMbps.toFixed(2)),
      latencyMs: parseFloat(latencyMs.toFixed(2)),
      memoryMb: parseFloat(memoryMb.toFixed(2)),
      recordsPerSec: parseFloat(recordsPerSec.toFixed(0)),
      success: true,
    };
  } catch (error: any) {
    return null;
  }
}

export async function runCsvToJsonBench(): Promise<BenchmarkResult[]> {
  console.log("\n╔═══════════════════════════════════════════════════════════╗");
  console.log("║  CSV → JSON Conversion Benchmark                          ║");
  console.log("╚═══════════════════════════════════════════════════════════╝\n");

  const results: BenchmarkResult[] = [];

  // Small dataset
  console.log("🔍 Small CSV (1K rows)...");
  const csvSmall = generateCsvDataset(1_000, 10);
  const csvSmallStr = new TextDecoder().decode(csvSmall);

  results.push(await benchmarkConvertBuddy("Small (1K rows)", csvSmall));
  const papaSmall = await benchmarkPapaParse("Small (1K rows)", csvSmallStr);
  if (papaSmall) results.push(papaSmall);
  const csvParseSmall = await benchmarkCsvParse("Small (1K rows)", csvSmallStr);
  if (csvParseSmall) results.push(csvParseSmall);
  const fastCsvSmall = await benchmarkFastCsv("Small (1K rows)", csvSmallStr);
  if (fastCsvSmall) results.push(fastCsvSmall);

  // Medium dataset
  console.log("🔍 Medium CSV (10K rows)...");
  const csvMedium = generateCsvDataset(10_000, 10);
  const csvMediumStr = new TextDecoder().decode(csvMedium);

  results.push(await benchmarkConvertBuddy("Medium (10K rows)", csvMedium));
  const papaMedium = await benchmarkPapaParse("Medium (10K rows)", csvMediumStr);
  if (papaMedium) results.push(papaMedium);
  const csvParseMedium = await benchmarkCsvParse("Medium (10K rows)", csvMediumStr);
  if (csvParseMedium) results.push(csvParseMedium);
  const fastCsvMedium = await benchmarkFastCsv("Medium (10K rows)", csvMediumStr);
  if (fastCsvMedium) results.push(fastCsvMedium);

  // Large dataset
  console.log("🔍 Large CSV (100K rows)...");
  const csvLarge = generateCsvDataset(100_000, 10);
  const csvLargeStr = new TextDecoder().decode(csvLarge);

  results.push(await benchmarkConvertBuddy("Large (100K rows)", csvLarge));
  const papaLarge = await benchmarkPapaParse("Large (100K rows)", csvLargeStr);
  if (papaLarge) results.push(papaLarge);
  const csvParseLarge = await benchmarkCsvParse("Large (100K rows)", csvLargeStr);
  if (csvParseLarge) results.push(csvParseLarge);
  const fastCsvLarge = await benchmarkFastCsv("Large (100K rows)", csvLargeStr);
  if (fastCsvLarge) results.push(fastCsvLarge);

  // Realistic dataset
  console.log("🔍 Realistic CSV (5K rows with quotes)...");
  const csvRealistic = generateRealisticCsv(5_000);
  const csvRealisticStr = new TextDecoder().decode(csvRealistic);

  results.push(
    await benchmarkConvertBuddy("Realistic (5K rows)", csvRealistic)
  );
  const papaRealistic = await benchmarkPapaParse(
    "Realistic (5K rows)",
    csvRealisticStr
  );
  if (papaRealistic) results.push(papaRealistic);

  // Wide dataset
  console.log("🔍 Wide CSV (100 columns, 1K rows)...");
  const csvWide = generateWideCsv(1_000, 100);
  const csvWideStr = new TextDecoder().decode(csvWide);

  results.push(await benchmarkConvertBuddy("Wide (100 cols, 1K rows)", csvWide));
  const papaWide = await benchmarkPapaParse(
    "Wide (100 cols, 1K rows)",
    csvWideStr
  );
  if (papaWide) results.push(papaWide);

  console.log("\n📊 CSV → JSON Results:");
  console.table(results);

  return results;
}

// Allow direct execution
if (import.meta.url === `file://${process.argv[1]}`) {
  runCsvToJsonBench().catch(console.error);
}
