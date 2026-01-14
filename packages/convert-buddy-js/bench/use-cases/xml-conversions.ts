/**
 * XML Conversion Benchmark
 * Tests converting XML files to other formats
 */

import { performance } from "node:perf_hooks";
import { convert } from "../../index.js";
import { generateXmlDataset } from "../datasets.js";

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
  outputFormat: "csv" | "json" | "ndjson"
): Promise<BenchmarkResult> {
  try {
    if (global.gc) global.gc();

    const startMem = process.memoryUsage().heapUsed;
    const start = performance.now();

    const result = await convert(data, {
      inputFormat: "xml",
      outputFormat,
    });

    const end = performance.now();
    const endMem = process.memoryUsage().heapUsed;

    const latencyMs = end - start;
    const throughputMbps = (data.length / (1024 * 1024)) / (latencyMs / 1000);
    const memoryMb = (endMem - startMem) / (1024 * 1024);
    // Count records in output
    let recordCount = 0;
    if (outputFormat === "json") {
      try {
        const jsonOutput = JSON.parse(new TextDecoder().decode(result));
        recordCount = Array.isArray(jsonOutput) ? jsonOutput.length : 0;
      } catch {
        recordCount = 0;
      }
    } else if (outputFormat === "csv" || outputFormat === "ndjson") {
      // Count newlines in output
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

async function benchmarkFastXmlParser(
  name: string,
  xmlData: string
): Promise<BenchmarkResult | null> {
  try {
    const { XMLParser } = await import("fast-xml-parser");
    const data = new TextEncoder().encode(xmlData);

    if (global.gc) global.gc();

    const startMem = process.memoryUsage().heapUsed;
    const start = performance.now();

    const parser = new XMLParser();
    const result = parser.parse(xmlData);
    JSON.stringify(result);

    const end = performance.now();
    const endMem = process.memoryUsage().heapUsed;

    const latencyMs = end - start;
    const throughputMbps = (data.length / (1024 * 1024)) / (latencyMs / 1000);
    const memoryMb = (endMem - startMem) / (1024 * 1024);
    const recordsPerSec = 1 / (latencyMs / 1000); // Rough estimate

    return {
      tool: "fast-xml-parser",
      conversion: "XML→JSON",
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

export async function runXmlBench(): Promise<BenchmarkResult[]> {
  console.log("\n╔═══════════════════════════════════════════════════════════╗");
  console.log("║  XML Conversion Benchmark                                 ║");
  console.log("╚═══════════════════════════════════════════════════════════╝\n");

  const results: BenchmarkResult[] = [];

  // ===== XML → JSON =====
  console.log("📦 XML → JSON Conversions");
  console.log("─".repeat(60));

  console.log("🔍 Small XML (1K records)...");
  const xmlSmall = generateXmlDataset(1_000, 10);
  const xmlSmallStr = new TextDecoder().decode(xmlSmall);

  results.push(
    await benchmarkConvertBuddy("Small (1K records)", "XML→JSON", xmlSmall, "json")
  );
  const fastXmlSmall = await benchmarkFastXmlParser("Small (1K records)", xmlSmallStr);
  if (fastXmlSmall) results.push(fastXmlSmall);

  console.log("🔍 Medium XML (10K records)...");
  const xmlMedium = generateXmlDataset(10_000, 10);
  const xmlMediumStr = new TextDecoder().decode(xmlMedium);

  results.push(
    await benchmarkConvertBuddy("Medium (10K records)", "XML→JSON", xmlMedium, "json")
  );
  const fastXmlMedium = await benchmarkFastXmlParser("Medium (10K records)", xmlMediumStr);
  if (fastXmlMedium) results.push(fastXmlMedium);

  console.log("🔍 Large XML (100K records)...");
  const xmlLarge = generateXmlDataset(100_000, 10);
  const xmlLargeStr = new TextDecoder().decode(xmlLarge);

  results.push(
    await benchmarkConvertBuddy("Large (100K records)", "XML→JSON", xmlLarge, "json")
  );
  const fastXmlLarge = await benchmarkFastXmlParser("Large (100K records)", xmlLargeStr);
  if (fastXmlLarge) results.push(fastXmlLarge);

  // ===== XML → CSV =====
  console.log("\n📦 XML → CSV Conversions");
  console.log("─".repeat(60));

  console.log("🔍 Medium XML (10K records)...");
  const xmlCsv = generateXmlDataset(10_000, 10);

  results.push(
    await benchmarkConvertBuddy("Medium (10K records)", "XML→CSV", xmlCsv, "csv")
  );

  // ===== XML → NDJSON =====
  console.log("\n📦 XML → NDJSON Conversions");
  console.log("─".repeat(60));

  console.log("🔍 Medium XML (10K records)...");
  const xmlNdjson = generateXmlDataset(10_000, 10);

  results.push(
    await benchmarkConvertBuddy("Medium (10K records)", "XML→NDJSON", xmlNdjson, "ndjson")
  );

  console.log("\n📊 XML Conversion Results:");
  console.table(results);

  return results;
}

// Allow direct execution
if (import.meta.url === `file://${process.argv[1]}`) {
  runXmlBench().catch(console.error);
}
