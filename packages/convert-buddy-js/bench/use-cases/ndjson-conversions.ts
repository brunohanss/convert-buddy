/**
 * NDJSON Conversion Benchmark
 * Tests various NDJSON conversions: to JSON, CSV, and passthrough
 */

import { performance } from "node:perf_hooks";
import { convert } from "../../index.js";
import {
  generateNdjsonDataset,
  generateLargeObjectNdjson,
} from "../datasets.js";

export type BenchmarkResult = {
  tool: string;
  conversion: string;
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
  conversion: string,
  data: Uint8Array,
  outputFormat: "json" | "csv" | "ndjson"
): Promise<BenchmarkResult> {
  try {
    if (global.gc) global.gc();

    const startMem = process.memoryUsage().heapUsed;
    const start = performance.now();

    const result = await convert(data, {
      inputFormat: "ndjson",
      outputFormat,
    });

    const end = performance.now();
    const endMem = process.memoryUsage().heapUsed;

    const latencyMs = end - start;
    const throughputMbps = (data.length / (1024 * 1024)) / (latencyMs / 1000);
    const memoryMb = (endMem - startMem) / (1024 * 1024);
    // Count records in output intelligently
    let recordCount = 0;
    if (outputFormat === "json") {
      // JSON array - parse and count
      try {
        const jsonOutput = JSON.parse(new TextDecoder().decode(result));
        recordCount = Array.isArray(jsonOutput) ? jsonOutput.length : 0;
      } catch {
        recordCount = 0;
      }
    } else {
      // CSV/NDJSON - count newlines
      recordCount = result.filter((b) => b === 10).length;
    }
    const recordsPerSec = recordCount / (latencyMs / 1000);

    return {
      tool: "convert-buddy",
      conversion,
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
      conversion,
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

async function benchmarkNativeJSON(
  name: string,
  ndjsonData: string
): Promise<BenchmarkResult | null> {
  try {
    const data = new TextEncoder().encode(ndjsonData);

    if (global.gc) global.gc();

    const startMem = process.memoryUsage().heapUsed;
    const start = performance.now();

    const lines = ndjsonData.trim().split("\n");
    const records = lines.map((line) => JSON.parse(line));
    JSON.stringify(records);

    const end = performance.now();
    const endMem = process.memoryUsage().heapUsed;

    const latencyMs = end - start;
    const throughputMbps = (data.length / (1024 * 1024)) / (latencyMs / 1000);
    const memoryMb = (endMem - startMem) / (1024 * 1024);
    const recordsPerSec = records.length / (latencyMs / 1000);

    return {
      tool: "Native JSON",
      conversion: "NDJSON→JSON",
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

export async function runNdjsonBench(): Promise<BenchmarkResult[]> {
  console.log("\n╔═══════════════════════════════════════════════════════════╗");
  console.log("║  NDJSON Conversion Benchmark                              ║");
  console.log("╚═══════════════════════════════════════════════════════════╝\n");

  const results: BenchmarkResult[] = [];

  // ===== NDJSON → JSON =====
  console.log("📦 NDJSON → JSON Conversions");
  console.log("─".repeat(60));

  // Small
  console.log("🔍 Small NDJSON (1K records)...");
  const ndjsonSmall = generateNdjsonDataset(1_000, 10);
  const ndjsonSmallStr = new TextDecoder().decode(ndjsonSmall);

  results.push(
    await benchmarkConvertBuddy("Small (1K records)", "NDJSON→JSON", ndjsonSmall, "json")
  );
  const nativeSmall = await benchmarkNativeJSON("Small (1K records)", ndjsonSmallStr);
  if (nativeSmall) results.push(nativeSmall);

  // Medium
  console.log("🔍 Medium NDJSON (10K records)...");
  const ndjsonMedium = generateNdjsonDataset(10_000, 10);
  const ndjsonMediumStr = new TextDecoder().decode(ndjsonMedium);

  results.push(
    await benchmarkConvertBuddy("Medium (10K records)", "NDJSON→JSON", ndjsonMedium, "json")
  );
  const nativeMedium = await benchmarkNativeJSON("Medium (10K records)", ndjsonMediumStr);
  if (nativeMedium) results.push(nativeMedium);

  // Large
  console.log("🔍 Large NDJSON (100K records)...");
  const ndjsonLarge = generateNdjsonDataset(100_000, 10);
  const ndjsonLargeStr = new TextDecoder().decode(ndjsonLarge);

  results.push(
    await benchmarkConvertBuddy("Large (100K records)", "NDJSON→JSON", ndjsonLarge, "json")
  );
  const nativeLarge = await benchmarkNativeJSON("Large (100K records)", ndjsonLargeStr);
  if (nativeLarge) results.push(nativeLarge);

  // Complex nested objects
  console.log("🔍 Complex NDJSON with nested objects (10K records)...");
  const ndjsonComplex = generateLargeObjectNdjson(10_000);

  results.push(
    await benchmarkConvertBuddy("Complex nested (10K records)", "NDJSON→JSON", ndjsonComplex, "json")
  );

  // ===== NDJSON → CSV =====
  console.log("\n📦 NDJSON → CSV Conversions");
  console.log("─".repeat(60));

  console.log("🔍 NDJSON to CSV (10K records)...");
  const ndjsonCsv = generateNdjsonDataset(10_000, 10);

  results.push(
    await benchmarkConvertBuddy("Medium (10K records)", "NDJSON→CSV", ndjsonCsv, "csv")
  );

  // ===== NDJSON → NDJSON (Passthrough) =====
  console.log("\n📦 NDJSON Passthrough (format validation)");
  console.log("─".repeat(60));

  console.log("🔍 NDJSON passthrough (100K records)...");
  const ndjsonPass = generateNdjsonDataset(100_000, 10);

  results.push(
    await benchmarkConvertBuddy("Large (100K records)", "NDJSON→NDJSON", ndjsonPass, "ndjson")
  );

  console.log("\n📊 NDJSON Conversion Results:");
  console.table(results);

  return results;
}

// Allow direct execution
if (import.meta.url === `file://${process.argv[1]}`) {
  runNdjsonBench().catch(console.error);
}
