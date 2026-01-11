/**
 * JSON Conversion Benchmark
 * Tests converting JSON arrays to other formats
 */

import { performance } from "node:perf_hooks";
import { convert } from "../../src/index.js";
import { generateJsonDataset } from "../datasets.js";

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
  outputFormat: "csv" | "ndjson" | "xml"
): Promise<BenchmarkResult> {
  try {
    if (global.gc) global.gc();

    const startMem = process.memoryUsage().heapUsed;
    const start = performance.now();

    const result = await convert(data, {
      inputFormat: "json",
      outputFormat,
    });

    const end = performance.now();
    const endMem = process.memoryUsage().heapUsed;

    const latencyMs = end - start;
    const throughputMbps = (data.length / (1024 * 1024)) / (latencyMs / 1000);
    const memoryMb = (endMem - startMem) / (1024 * 1024);
    // Count records in output based on format or detect format from output
    let recordCount = 0;
    const outputStr = new TextDecoder().decode(result);
    
    // Try to auto-detect format if it's using passthrough
    // Count newlines for CSV/NDJSON-like output, but if none found and output looks like JSON, parse it
    const newlineCount = result.filter((b) => b === 10).length;
    
    if (outputFormat === "csv" || outputFormat === "ndjson") {
      recordCount = newlineCount;
      // If no newlines found, check if output is JSON array (passthrough case)
      if (recordCount === 0) {
        try {
          const parsed = JSON.parse(outputStr);
          recordCount = Array.isArray(parsed) ? parsed.length : 0;
        } catch {
          recordCount = 0;
        }
      }
    } else if (outputFormat === "xml") {
      // Try to parse and count records
      try {
        const matches = outputStr.match(/<record[^>]*>/g) || [];
        recordCount = matches.length > 0 ? matches.length : newlineCount;
        // If no records found, check if output is JSON (passthrough case)
        if (recordCount === 0) {
          const parsed = JSON.parse(outputStr);
          recordCount = Array.isArray(parsed) ? parsed.length : 0;
        }
      } catch {
        recordCount = newlineCount;
      }
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

export async function runJsonBench(): Promise<BenchmarkResult[]> {
  console.log("\n╔═══════════════════════════════════════════════════════════╗");
  console.log("║  JSON Conversion Benchmark                                ║");
  console.log("╚═══════════════════════════════════════════════════════════╝\n");

  const results: BenchmarkResult[] = [];

  // ===== JSON → CSV =====
  console.log("📦 JSON → CSV Conversions");
  console.log("─".repeat(60));

  console.log("🔍 Small JSON (1K records)...");
  const jsonSmall = generateJsonDataset(1_000, 10);

  results.push(
    await benchmarkConvertBuddy("Small (1K records)", "JSON→CSV", jsonSmall, "csv")
  );

  console.log("🔍 Medium JSON (10K records)...");
  const jsonMedium = generateJsonDataset(10_000, 10);

  results.push(
    await benchmarkConvertBuddy("Medium (10K records)", "JSON→CSV", jsonMedium, "csv")
  );

  console.log("🔍 Large JSON (100K records)...");
  const jsonLarge = generateJsonDataset(100_000, 10);

  results.push(
    await benchmarkConvertBuddy("Large (100K records)", "JSON→CSV", jsonLarge, "csv")
  );

  // ===== JSON → NDJSON =====
  console.log("\n📦 JSON → NDJSON Conversions");
  console.log("─".repeat(60));

  console.log("🔍 Small JSON (1K records)...");
  const jsonSmallNdjson = generateJsonDataset(1_000, 10);

  results.push(
    await benchmarkConvertBuddy("Small (1K records)", "JSON→NDJSON", jsonSmallNdjson, "ndjson")
  );

  console.log("🔍 Medium JSON (10K records)...");
  const jsonMediumNdjson = generateJsonDataset(10_000, 10);

  results.push(
    await benchmarkConvertBuddy("Medium (10K records)", "JSON→NDJSON", jsonMediumNdjson, "ndjson")
  );

  console.log("🔍 Large JSON (100K records)...");
  const jsonLargeNdjson = generateJsonDataset(100_000, 10);

  results.push(
    await benchmarkConvertBuddy("Large (100K records)", "JSON→NDJSON", jsonLargeNdjson, "ndjson")
  );

  // ===== JSON → XML =====
  console.log("\n📦 JSON → XML Conversions");
  console.log("─".repeat(60));

  console.log("🔍 Small JSON (1K records)...");
  const jsonSmallXml = generateJsonDataset(1_000, 10);

  results.push(
    await benchmarkConvertBuddy("Small (1K records)", "JSON→XML", jsonSmallXml, "xml")
  );

  console.log("🔍 Medium JSON (10K records)...");
  const jsonMediumXml = generateJsonDataset(10_000, 10);

  results.push(
    await benchmarkConvertBuddy("Medium (10K records)", "JSON→XML", jsonMediumXml, "xml")
  );

  console.log("\n📊 JSON Conversion Results:");
  console.table(results);

  return results;
}

// Allow direct execution
if (import.meta.url === `file://${process.argv[1]}`) {
  runJsonBench().catch(console.error);
}
