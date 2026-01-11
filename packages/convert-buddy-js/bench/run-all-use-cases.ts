/**
 * Unified Benchmark Runner
 * Runs all use-case benchmarks and generates a compact summary
 */

import { runCsvToJsonBench } from "./use-cases/csv-to-json.js";
import { runNdjsonBench } from "./use-cases/ndjson-conversions.js";
import { runJsonBench } from "./use-cases/json-conversions.js";
import { runXmlBench } from "./use-cases/xml-conversions.js";
import * as fs from "node:fs";
import * as path from "node:path";

type AllBenchmarkResults = {
  timestamp: string;
  totalDuration: number;
  summaries: {
    useCaseName: string;
    toolResults: {
      tool: string;
      avgThroughput: number;
      avgLatency: number;
      avgMemory: number;
      count: number;
    }[];
  }[];
};

function generateSummary(
  useCaseName: string,
  results: any[]
): AllBenchmarkResults["summaries"][0] {
  const byTool = new Map<
    string,
    {
      throughputs: number[];
      latencies: number[];
      memories: number[];
    }
  >();

  for (const result of results) {
    if (!result.success) continue;

    if (!byTool.has(result.tool)) {
      byTool.set(result.tool, { throughputs: [], latencies: [], memories: [] });
    }

    const data = byTool.get(result.tool)!;
    data.throughputs.push(result.throughputMbps);
    data.latencies.push(result.latencyMs);
    data.memories.push(result.memoryMb);
  }

  const toolResults = Array.from(byTool.entries()).map(([tool, data]) => ({
    tool,
    avgThroughput: data.throughputs.reduce((a, b) => a + b, 0) / data.throughputs.length,
    avgLatency: data.latencies.reduce((a, b) => a + b, 0) / data.latencies.length,
    avgMemory: data.memories.reduce((a, b) => a + b, 0) / data.memories.length,
    count: data.throughputs.length,
  }));

  return {
    useCaseName,
    toolResults: toolResults.sort((a, b) => b.avgThroughput - a.avgThroughput),
  };
}

function printCompactSummary(summary: AllBenchmarkResults) {
  console.log("\n╔════════════════════════════════════════════════════════════════════╗");
  console.log("║  BENCHMARK SUMMARY - All Use Cases                                 ║");
  console.log("╚════════════════════════════════════════════════════════════════════╝\n");

  console.log(`Timestamp: ${summary.timestamp}`);
  console.log(`Total Duration: ${(summary.totalDuration / 1000).toFixed(1)}s\n`);

  for (const useCase of summary.summaries) {
    console.log(`\n📊 ${useCase.useCaseName}`);
    console.log("─".repeat(70));

    const table = useCase.toolResults.map((result) => ({
      Tool: result.tool,
      "Throughput (MB/s)": `${result.avgThroughput.toFixed(2)}`,
      "Latency (ms)": `${result.avgLatency.toFixed(2)}`,
      "Memory (MB)": `${result.avgMemory.toFixed(2)}`,
      Benchmarks: result.count,
    }));

    console.table(table);

    // Show top performer
    if (table.length > 0) {
      const topPerformer = useCase.toolResults[0];
      console.log(`✅ Fastest: ${topPerformer.tool} (${topPerformer.avgThroughput.toFixed(2)} MB/s)`);
    }
  }

  // Overall statistics
  console.log("\n╔════════════════════════════════════════════════════════════════════╗");
  console.log("║  Overall Performance Summary                                        ║");
  console.log("╚════════════════════════════════════════════════════════════════════╝\n");

  const allTools = new Set<string>();
  for (const useCase of summary.summaries) {
    for (const tool of useCase.toolResults) {
      allTools.add(tool.tool);
    }
  }

  const overallStats = Array.from(allTools).map((tool) => {
    const toolResults = summary.summaries
      .flatMap((uc) => uc.toolResults)
      .filter((r) => r.tool === tool);

    const avgThroughput =
      toolResults.reduce((sum, r) => sum + r.avgThroughput, 0) / toolResults.length;
    const avgLatency =
      toolResults.reduce((sum, r) => sum + r.avgLatency, 0) / toolResults.length;
    const avgMemory =
      toolResults.reduce((sum, r) => sum + r.avgMemory, 0) / toolResults.length;

    return {
      Tool: tool,
      "Avg Throughput": `${avgThroughput.toFixed(2)}`,
      "Avg Latency": `${avgLatency.toFixed(2)}`,
      "Avg Memory": `${avgMemory.toFixed(2)}`,
    };
  });

  console.table(overallStats.sort((a, b) => parseFloat(b["Avg Throughput"]) - parseFloat(a["Avg Throughput"])));

  console.log(
    "\n💡 Tip: Run individual benchmarks for detailed analysis:\n"
  );
  console.log("   npm run bench:use-case-csv-json");
  console.log("   npm run bench:use-case-ndjson");
  console.log("   npm run bench:use-case-json");
  console.log("   npm run bench:use-case-xml\n");
}

async function runAllBenchmarks() {
  console.log("╔════════════════════════════════════════════════════════════════════╗");
  console.log("║  Convert Buddy - Complete Benchmark Suite                          ║");
  console.log("║  Running all use-case benchmarks with competitor analysis           ║");
  console.log("╚════════════════════════════════════════════════════════════════════╝");

  const startTime = performance.now();

  try {
    // Run all benchmarks
    const csvToJsonResults = await runCsvToJsonBench();
    const ndjsonResults = await runNdjsonBench();
    const jsonResults = await runJsonBench();
    const xmlResults = await runXmlBench();

    const endTime = performance.now();
    const totalDuration = endTime - startTime;

    // Generate summaries
    const summary: AllBenchmarkResults = {
      timestamp: new Date().toISOString(),
      totalDuration,
      summaries: [
        generateSummary("CSV → JSON", csvToJsonResults),
        generateSummary("NDJSON Conversions", ndjsonResults),
        generateSummary("JSON Conversions", jsonResults),
        generateSummary("XML Conversions", xmlResults),
      ],
    };

    // Print compact summary
    printCompactSummary(summary);

    // Save detailed results
    const outputPath = path.join(process.cwd(), "bench-results-all-use-cases.json");
    fs.writeFileSync(outputPath, JSON.stringify(summary, null, 2));
    console.log(`\n📁 Detailed results saved to: ${outputPath}`);
  } catch (error) {
    console.error("❌ Benchmark failed:", error);
    process.exit(1);
  }
}

runAllBenchmarks();
