import { performance } from "node:perf_hooks";
import { ConvertBuddy, convert } from "../src/index.js";
import { createNodeTransform } from "../src/node.js";

import { 
  generateCsvDataset, 
  generateNdjsonDataset, 
  generateXmlDataset,
  generateRealisticCsv,
  generateWideCsv,
  generateLargeObjectNdjson
} from "./datasets.js";
import * as fs from "node:fs";
import * as path from "node:path";
import { pipeline } from "node:stream/promises";
import { Readable, Writable } from "node:stream";

/**
 * Comprehensive Objective Competitor Benchmark Suite
 * 
 * This benchmark is designed to be OBJECTIVE and include ALL scenarios:
 * 1. Favorable cases (where convert-buddy excels)
 * 2. Neutral cases (balanced comparison)
 * 3. UNFAVORABLE cases (where competitors may outperform)
 * 
 * Critical for honest performance evaluation!
 */

type BenchmarkResult = {
  tool: string;
  scenario: string;
  conversion: string;
  size: string;
  dataset: string;
  throughputMbps: number;
  latencyMs: number;
  memoryMb: number;
  recordsPerSec: number;
  success: boolean;
  error?: string;
};

type ScenarioType = "favorable" | "neutral" | "unfavorable";

async function benchmarkConvertBuddy(
  scenario: string,
  conversion: string,
  size: string,
  data: Uint8Array,
  opts: any
): Promise<BenchmarkResult> {
  try {
    if (global.gc) global.gc();

    const startMem = process.memoryUsage().heapUsed;
    const start = performance.now();

    const result = await convert(data, opts);

    const end = performance.now();
    const endMem = process.memoryUsage().heapUsed;

    const latencyMs = end - start;
    const throughputMbps = (data.length / (1024 * 1024)) / (latencyMs / 1000);
    const memoryMb = (endMem - startMem) / (1024 * 1024);

    const records = result.filter((b) => b === 10).length;
    const recordsPerSec = records / (latencyMs / 1000);

    return {
      tool: "convert-buddy",
      scenario,
      conversion,
      size,
      dataset: `${(data.length / (1024 * 1024)).toFixed(2)} MB`,
      throughputMbps: parseFloat(throughputMbps.toFixed(2)),
      latencyMs: parseFloat(latencyMs.toFixed(2)),
      memoryMb: parseFloat(memoryMb.toFixed(2)),
      recordsPerSec: parseFloat(recordsPerSec.toFixed(0)),
      success: true,
    };
  } catch (error: any) {
    return {
      tool: "convert-buddy",
      scenario,
      conversion,
      size,
      dataset: `${(data.length / (1024 * 1024)).toFixed(2)} MB`,
      throughputMbps: 0,
      latencyMs: 0,
      memoryMb: 0,
      recordsPerSec: 0,
      success: false,
      error: error.message,
    };
  }
}

// ========== Competitor: PapaParse ==========
async function benchmarkPapaParse(
  scenario: string,
  conversion: string,
  size: string,
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
    const ndjson = result.data.map((row: any) => JSON.stringify(row)).join("\n");

    const end = performance.now();
    const endMem = process.memoryUsage().heapUsed;

    const latencyMs = end - start;
    const throughputMbps = (data.length / (1024 * 1024)) / (latencyMs / 1000);
    const memoryMb = (endMem - startMem) / (1024 * 1024);
    const recordsPerSec = result.data.length / (latencyMs / 1000);

    return {
      tool: "PapaParse",
      scenario,
      conversion,
      size,
      dataset: `${(data.length / (1024 * 1024)).toFixed(2)} MB`,
      throughputMbps: parseFloat(throughputMbps.toFixed(2)),
      latencyMs: parseFloat(latencyMs.toFixed(2)),
      memoryMb: parseFloat(memoryMb.toFixed(2)),
      recordsPerSec: parseFloat(recordsPerSec.toFixed(0)),
      success: true,
    };
  } catch (error: any) {
    console.log(`⚠️  PapaParse failed: ${error.message}`);
    return null;
  }
}

// ========== Competitor: csv-parse ==========
async function benchmarkCsvParse(
  scenario: string,
  conversion: string,
  size: string,
  csvData: string
): Promise<BenchmarkResult | null> {
  try {
    const { parse } = await import("csv-parse/sync");
    const data = new TextEncoder().encode(csvData);

    if (global.gc) global.gc();

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
      scenario,
      conversion,
      size,
      dataset: `${(data.length / (1024 * 1024)).toFixed(2)} MB`,
      throughputMbps: parseFloat(throughputMbps.toFixed(2)),
      latencyMs: parseFloat(latencyMs.toFixed(2)),
      memoryMb: parseFloat(memoryMb.toFixed(2)),
      recordsPerSec: parseFloat(recordsPerSec.toFixed(0)),
      success: true,
    };
  } catch (error: any) {
    console.log(`⚠️  csv-parse failed: ${error.message}`);
    return null;
  }
}

// ========== Competitor: fast-csv ==========
async function benchmarkFastCsv(
  scenario: string,
  conversion: string,
  size: string,
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

    const ndjson = rows.map((row) => JSON.stringify(row)).join("\n");

    const end = performance.now();
    const endMem = process.memoryUsage().heapUsed;

    const latencyMs = end - start;
    const throughputMbps = (data.length / (1024 * 1024)) / (latencyMs / 1000);
    const memoryMb = (endMem - startMem) / (1024 * 1024);
    const recordsPerSec = rows.length / (latencyMs / 1000);

    return {
      tool: "fast-csv",
      scenario,
      conversion,
      size,
      dataset: `${(data.length / (1024 * 1024)).toFixed(2)} MB`,
      throughputMbps: parseFloat(throughputMbps.toFixed(2)),
      latencyMs: parseFloat(latencyMs.toFixed(2)),
      memoryMb: parseFloat(memoryMb.toFixed(2)),
      recordsPerSec: parseFloat(recordsPerSec.toFixed(0)),
      success: true,
    };
  } catch (error: any) {
    console.log(`⚠️  fast-csv failed: ${error.message}`);
    return null;
  }
}

// ========== Competitor: Native JSON.parse ==========
async function benchmarkNativeJSON(
  scenario: string,
  conversion: string,
  size: string,
  ndjsonData: string
): Promise<BenchmarkResult | null> {
  try {
    const data = new TextEncoder().encode(ndjsonData);

    if (global.gc) global.gc();

    const startMem = process.memoryUsage().heapUsed;
    const start = performance.now();

    // Parse each line and convert to JSON array
    const lines = ndjsonData.trim().split("\n");
    const records = lines.map((line) => JSON.parse(line));
    const json = JSON.stringify(records);

    const end = performance.now();
    const endMem = process.memoryUsage().heapUsed;

    const latencyMs = end - start;
    const throughputMbps = (data.length / (1024 * 1024)) / (latencyMs / 1000);
    const memoryMb = (endMem - startMem) / (1024 * 1024);
    const recordsPerSec = records.length / (latencyMs / 1000);

    return {
      tool: "Native JSON",
      scenario,
      conversion,
      size,
      dataset: `${(data.length / (1024 * 1024)).toFixed(2)} MB`,
      throughputMbps: parseFloat(throughputMbps.toFixed(2)),
      latencyMs: parseFloat(latencyMs.toFixed(2)),
      memoryMb: parseFloat(memoryMb.toFixed(2)),
      recordsPerSec: parseFloat(recordsPerSec.toFixed(0)),
      success: true,
    };
  } catch (error: any) {
    console.log(`⚠️  Native JSON failed: ${error.message}`);
    return null;
  }
}

async function runBenchmarks() {
  console.log("╔════════════════════════════════════════════════════════════════════╗");
  console.log("║  Convert Buddy - OBJECTIVE Competitor Benchmark Suite             ║");
  console.log("║  Including Favorable, Neutral, AND Unfavorable Cases               ║");
  console.log("╚════════════════════════════════════════════════════════════════════╝\n");

  console.log("⚠️  IMPORTANT: This benchmark includes cases where convert-buddy");
  console.log("   may be SLOWER than competitors. This is intentional for objectivity!\n");

  const results: BenchmarkResult[] = [];

  // ========== FAVORABLE CASES (convert-buddy should excel) ==========
  console.log("╔════════════════════════════════════════════════════════════════════╗");
  console.log("║  FAVORABLE Cases (convert-buddy expected to excel)                 ║");
  console.log("╚════════════════════════════════════════════════════════════════════╝\n");

  // Large datasets (WASM shines here)
  console.log("📊 Large CSV dataset (100K rows)...");
  const csvLarge = generateCsvDataset(100_000, 10);
  const csvLargeStr = new TextDecoder().decode(csvLarge);

  results.push(
    await benchmarkConvertBuddy("favorable-large", "CSV→NDJSON", "large", csvLarge, {
      inputFormat: "csv",
      outputFormat: "ndjson",
    })
  );

  const papaLarge = await benchmarkPapaParse("favorable-large", "CSV→NDJSON", "large", csvLargeStr);
  if (papaLarge) results.push(papaLarge);

  const csvParseLarge = await benchmarkCsvParse("favorable-large", "CSV→NDJSON", "large", csvLargeStr);
  if (csvParseLarge) results.push(csvParseLarge);

  const fastCsvLarge = await benchmarkFastCsv("favorable-large", "CSV→NDJSON", "large", csvLargeStr);
  if (fastCsvLarge) results.push(fastCsvLarge);

  // NDJSON passthrough (convert-buddy's strength)
  console.log("📊 NDJSON passthrough (100K records)...");
  const ndjsonLarge = generateNdjsonDataset(100_000, 10);

  results.push(
    await benchmarkConvertBuddy("favorable-passthrough", "NDJSON→NDJSON", "large", ndjsonLarge, {
      inputFormat: "ndjson",
      outputFormat: "ndjson",
    })
  );

  // Simple CSV (fast path optimization)
  console.log("📊 Simple CSV (no quotes, 10K rows)...");
  const csvSimple = generateCsvDataset(10_000, 10);
  const csvSimpleStr = new TextDecoder().decode(csvSimple);

  results.push(
    await benchmarkConvertBuddy("favorable-simple", "CSV→NDJSON", "medium", csvSimple, {
      inputFormat: "csv",
      outputFormat: "ndjson",
    })
  );

  const papaSimple = await benchmarkPapaParse("favorable-simple", "CSV→NDJSON", "medium", csvSimpleStr);
  if (papaSimple) results.push(papaSimple);

  // ========== NEUTRAL CASES (balanced comparison) ==========
  console.log("\n╔════════════════════════════════════════════════════════════════════╗");
  console.log("║  NEUTRAL Cases (balanced comparison)                               ║");
  console.log("╚════════════════════════════════════════════════════════════════════╝\n");

  // Medium datasets
  console.log("📊 Medium CSV dataset (10K rows)...");
  const csvMedium = generateCsvDataset(10_000, 10);
  const csvMediumStr = new TextDecoder().decode(csvMedium);

  results.push(
    await benchmarkConvertBuddy("neutral-medium", "CSV→NDJSON", "medium", csvMedium, {
      inputFormat: "csv",
      outputFormat: "ndjson",
    })
  );

  const papaMedium = await benchmarkPapaParse("neutral-medium", "CSV→NDJSON", "medium", csvMediumStr);
  if (papaMedium) results.push(papaMedium);

  const csvParseMedium = await benchmarkCsvParse("neutral-medium", "CSV→NDJSON", "medium", csvMediumStr);
  if (csvParseMedium) results.push(csvParseMedium);

  const fastCsvMedium = await benchmarkFastCsv("neutral-medium", "CSV→NDJSON", "medium", csvMediumStr);
  if (fastCsvMedium) results.push(fastCsvMedium);

  // NDJSON to JSON (medium)
  console.log("📊 NDJSON → JSON (10K records)...");
  const ndjsonMedium = generateNdjsonDataset(10_000, 10);
  const ndjsonMediumStr = new TextDecoder().decode(ndjsonMedium);

  results.push(
    await benchmarkConvertBuddy("neutral-ndjson-json", "NDJSON→JSON", "medium", ndjsonMedium, {
      inputFormat: "ndjson",
      outputFormat: "json",
    })
  );

  const nativeJsonMedium = await benchmarkNativeJSON("neutral-ndjson-json", "NDJSON→JSON", "medium", ndjsonMediumStr);
  if (nativeJsonMedium) results.push(nativeJsonMedium);

  // Realistic CSV with quotes
  console.log("📊 Realistic CSV with quotes (5K rows)...");
  const csvRealistic = generateRealisticCsv(5_000);
  const csvRealisticStr = new TextDecoder().decode(csvRealistic);

  results.push(
    await benchmarkConvertBuddy("neutral-realistic", "CSV→NDJSON", "medium", csvRealistic, {
      inputFormat: "csv",
      outputFormat: "ndjson",
    })
  );

  const papaRealistic = await benchmarkPapaParse("neutral-realistic", "CSV→NDJSON", "medium", csvRealisticStr);
  if (papaRealistic) results.push(papaRealistic);

  // ========== UNFAVORABLE CASES (competitors may outperform) ==========
  console.log("\n╔════════════════════════════════════════════════════════════════════╗");
  console.log("║  UNFAVORABLE Cases (competitors may outperform convert-buddy)      ║");
  console.log("║  ⚠️  CRITICAL FOR OBJECTIVITY!                                      ║");
  console.log("╚════════════════════════════════════════════════════════════════════╝\n");

  // Tiny datasets (WASM initialization overhead)
  console.log("📊 Tiny CSV (10 rows) - WASM overhead expected...");
  const csvTiny = generateCsvDataset(10, 5);
  const csvTinyStr = new TextDecoder().decode(csvTiny);

  results.push(
    await benchmarkConvertBuddy("unfavorable-tiny", "CSV→NDJSON", "tiny", csvTiny, {
      inputFormat: "csv",
      outputFormat: "ndjson",
    })
  );

  const papaTiny = await benchmarkPapaParse("unfavorable-tiny", "CSV→NDJSON", "tiny", csvTinyStr);
  if (papaTiny) results.push(papaTiny);

  const csvParseTiny = await benchmarkCsvParse("unfavorable-tiny", "CSV→NDJSON", "tiny", csvTinyStr);
  if (csvParseTiny) results.push(csvParseTiny);

  const fastCsvTiny = await benchmarkFastCsv("unfavorable-tiny", "CSV→NDJSON", "tiny", csvTinyStr);
  if (fastCsvTiny) results.push(fastCsvTiny);

  // Single record (worst case for WASM)
  console.log("📊 Single record CSV - worst case for WASM...");
  const csvSingle = generateCsvDataset(1, 5);
  const csvSingleStr = new TextDecoder().decode(csvSingle);

  results.push(
    await benchmarkConvertBuddy("unfavorable-single", "CSV→NDJSON", "tiny", csvSingle, {
      inputFormat: "csv",
      outputFormat: "ndjson",
    })
  );

  const papaSingle = await benchmarkPapaParse("unfavorable-single", "CSV→NDJSON", "tiny", csvSingleStr);
  if (papaSingle) results.push(papaSingle);

  // Very small NDJSON to JSON (overhead dominates)
  console.log("📊 Tiny NDJSON → JSON (10 records) - overhead expected...");
  const ndjsonTiny = generateNdjsonDataset(10, 5);
  const ndjsonTinyStr = new TextDecoder().decode(ndjsonTiny);

  results.push(
    await benchmarkConvertBuddy("unfavorable-tiny-ndjson", "NDJSON→JSON", "tiny", ndjsonTiny, {
      inputFormat: "ndjson",
      outputFormat: "json",
    })
  );

  const nativeJsonTiny = await benchmarkNativeJSON("unfavorable-tiny-ndjson", "NDJSON→JSON", "tiny", ndjsonTinyStr);
  if (nativeJsonTiny) results.push(nativeJsonTiny);

  // Wide CSV (many columns - memory pressure)
  console.log("📊 Wide CSV (100 columns, 1K rows) - memory pressure...");
  const csvWide = generateWideCsv(1_000, 100);
  const csvWideStr = new TextDecoder().decode(csvWide);

  results.push(
    await benchmarkConvertBuddy("unfavorable-wide", "CSV→NDJSON", "medium", csvWide, {
      inputFormat: "csv",
      outputFormat: "ndjson",
    })
  );

  const papaWide = await benchmarkPapaParse("unfavorable-wide", "CSV→NDJSON", "medium", csvWideStr);
  if (papaWide) results.push(papaWide);

  // Large nested objects (JSON parsing complexity)
  console.log("📊 Large nested NDJSON objects (1K records) - complex parsing...");
  const ndjsonLargeObj = generateLargeObjectNdjson(1_000);
  const ndjsonLargeObjStr = new TextDecoder().decode(ndjsonLargeObj);

  results.push(
    await benchmarkConvertBuddy("unfavorable-nested", "NDJSON→JSON", "medium", ndjsonLargeObj, {
      inputFormat: "ndjson",
      outputFormat: "json",
    })
  );

  const nativeJsonLargeObj = await benchmarkNativeJSON("unfavorable-nested", "NDJSON→JSON", "medium", ndjsonLargeObjStr);
  if (nativeJsonLargeObj) results.push(nativeJsonLargeObj);

  // Small datasets with complex quoting (overhead + complexity)
  console.log("📊 Small CSV with complex quoting (100 rows) - overhead + complexity...");
  const csvComplexQuotes = generateRealisticCsv(100);
  const csvComplexQuotesStr = new TextDecoder().decode(csvComplexQuotes);

  results.push(
    await benchmarkConvertBuddy("unfavorable-complex", "CSV→NDJSON", "small", csvComplexQuotes, {
      inputFormat: "csv",
      outputFormat: "ndjson",
    })
  );

  const papaComplexQuotes = await benchmarkPapaParse("unfavorable-complex", "CSV→NDJSON", "small", csvComplexQuotesStr);
  if (papaComplexQuotes) results.push(papaComplexQuotes);

  // ========== RESULTS ==========
  console.log("\n╔════════════════════════════════════════════════════════════════════╗");
  console.log("║  All Benchmark Results                                             ║");
  console.log("╚════════════════════════════════════════════════════════════════════╝\n");
  console.table(results);

  // Save results
  const outputPath = path.join(process.cwd(), "bench-results-competitors-comprehensive.json");
  fs.writeFileSync(
    outputPath,
    JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        note: "This benchmark includes favorable, neutral, AND unfavorable cases for objectivity",
        results,
      },
      null,
      2
    )
  );
  console.log(`\nResults saved to: ${outputPath}`);

  // ========== ANALYSIS BY SCENARIO ==========
  console.log("\n╔════════════════════════════════════════════════════════════════════╗");
  console.log("║  Analysis by Scenario Type                                         ║");
  console.log("╚════════════════════════════════════════════════════════════════════╝\n");

  const scenarios: ScenarioType[] = ["favorable", "neutral", "unfavorable"];

  for (const scenarioType of scenarios) {
    const scenarioResults = results.filter((r) => r.scenario.startsWith(scenarioType));

    if (scenarioResults.length === 0) continue;

    console.log(`\n${scenarioType.toUpperCase()} Cases:`);
    console.log("─".repeat(70));

    // Group by conversion type
    const conversions = [...new Set(scenarioResults.map((r) => r.conversion))];

    for (const conversion of conversions) {
      const convResults = scenarioResults.filter((r) => r.conversion === conversion);
      const grouped = new Map<string, BenchmarkResult[]>();

      convResults.forEach((r) => {
        const key = `${r.scenario}-${r.size}`;
        if (!grouped.has(key)) grouped.set(key, []);
        grouped.get(key)!.push(r);
      });

      grouped.forEach((group, key) => {
        if (group.length > 1) {
          const sorted = group.sort((a, b) => b.throughputMbps - a.throughputMbps);
          const winner = sorted[0];
          const convertBuddyResult = sorted.find((r) => r.tool === "convert-buddy");

          console.log(`\n  ${conversion} (${key}):`);
          sorted.forEach((r, i) => {
            const speedup =
              i === 0 ? "" : ` (${(sorted[0].throughputMbps / r.throughputMbps).toFixed(2)}x slower)`;
            const isWinner = i === 0 ? "🏆 " : "   ";
            console.log(
              `  ${isWinner}${(i + 1)}. ${r.tool.padEnd(20)} ${r.throughputMbps.toFixed(2).padStart(8)} MB/s${speedup}`
            );
          });

          if (convertBuddyResult && winner.tool !== "convert-buddy") {
            const gap = (winner.throughputMbps / convertBuddyResult.throughputMbps).toFixed(2);
            console.log(`     ⚠️  convert-buddy is ${gap}x slower than ${winner.tool}`);
          }
        }
      });
    }
  }

  // ========== OBJECTIVITY REPORT ==========
  console.log("\n\n╔════════════════════════════════════════════════════════════════════╗");
  console.log("║  Objectivity Report                                                ║");
  console.log("╚════════════════════════════════════════════════════════════════════╝\n");

  const convertBuddyResults = results.filter((r) => r.tool === "convert-buddy" && r.success);
  const competitorResults = results.filter((r) => r.tool !== "convert-buddy" && r.success);

  // Count wins
  const grouped = new Map<string, BenchmarkResult[]>();
  results.forEach((r) => {
    const key = `${r.scenario}-${r.conversion}-${r.size}`;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(r);
  });

  let convertBuddyWins = 0;
  let competitorWins = 0;
  let totalComparisons = 0;

  grouped.forEach((group) => {
    if (group.length > 1) {
      const sorted = group.sort((a, b) => b.throughputMbps - a.throughputMbps);
      totalComparisons++;
      if (sorted[0].tool === "convert-buddy") {
        convertBuddyWins++;
      } else {
        competitorWins++;
      }
    }
  });

  console.log("Win/Loss Analysis:");
  console.log(`  Total Comparisons: ${totalComparisons}`);
  console.log(`  convert-buddy Wins: ${convertBuddyWins} (${((convertBuddyWins / totalComparisons) * 100).toFixed(1)}%)`);
  console.log(`  Competitor Wins: ${competitorWins} (${((competitorWins / totalComparisons) * 100).toFixed(1)}%)`);

  console.log("\nScenario Breakdown:");
  for (const scenarioType of scenarios) {
    const scenarioComparisons = Array.from(grouped.entries()).filter(([key]) =>
      key.startsWith(scenarioType)
    );
    const scenarioWins = scenarioComparisons.filter(([_, group]) => {
      const sorted = group.sort((a, b) => b.throughputMbps - a.throughputMbps);
      return sorted[0].tool === "convert-buddy";
    }).length;

    console.log(
      `  ${scenarioType}: ${scenarioWins}/${scenarioComparisons.length} wins (${((scenarioWins / scenarioComparisons.length) * 100).toFixed(1)}%)`
    );
  }

  console.log("\n✓ Objective benchmark complete!");
  console.log("  This benchmark includes cases where convert-buddy is slower.");
  console.log("  This is INTENTIONAL for honest performance evaluation.\n");
}

runBenchmarks().catch(console.error);
