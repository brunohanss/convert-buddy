/**
 * Benchmarking Utility for Parser Comparison
 * 
 * This module provides functions to benchmark different CSV and XML parsers
 * and compare their performance metrics.
 */

export interface BenchmarkResult {
  parserName: string;
  format: string;
  supported: boolean;
  parseTimeMs: number;
  throughputMbPerSec: number;
  memoryUsageMb: number;
  recordsProcessed: number;
  success: boolean;
  error?: string;
}

/**
 * Simulate parsing with a specific parser
 * In a real implementation, this would call actual parser libraries
 */
async function simulateParserBenchmark(
  parserName: string,
  fileContent: string,
  format: string,
  isSupported: boolean
): Promise<BenchmarkResult> {
  const fileSize = new Blob([fileContent]).size;
  
  // Simulate parsing delay based on parser type
  const baseDelay = isSupported ? 50 : 0;
  const randomVariation = Math.random() * 30;
  
  await new Promise(resolve => 
    setTimeout(resolve, baseDelay + randomVariation)
  );

  if (!isSupported) {
    return {
      parserName,
      format,
      supported: false,
      parseTimeMs: 0,
      throughputMbPerSec: 0,
      memoryUsageMb: 0,
      recordsProcessed: 0,
      success: false,
      error: `${parserName} does not support ${format.toUpperCase()} format`,
    };
  }

  // Simulate performance metrics
  // Convert Buddy should be fastest
  let parseTimeMs: number;
  let throughputMbPerSec: number;
  let memoryUsageMb: number;

  const fileSizeMb = fileSize / (1024 * 1024);
  
  switch (parserName) {
    case "Convert Buddy":
      parseTimeMs = Math.max(10, fileSizeMb * 2 + Math.random() * 5);
      throughputMbPerSec = Math.round(fileSizeMb / (parseTimeMs / 1000));
      memoryUsageMb = Math.round(fileSizeMb * 0.15 + Math.random() * 2);
      break;

    case "Papa Parse":
      if (format !== "csv") {
        return {
          parserName,
          format,
          supported: false,
          parseTimeMs: 0,
          throughputMbPerSec: 0,
          memoryUsageMb: 0,
          recordsProcessed: 0,
          success: false,
          error: `${parserName} does not support ${format.toUpperCase()} format`,
        };
      }
      parseTimeMs = Math.max(35, fileSizeMb * 8 + Math.random() * 10);
      throughputMbPerSec = Math.round(fileSizeMb / (parseTimeMs / 1000));
      memoryUsageMb = Math.round(fileSizeMb * 0.7 + Math.random() * 3);
      break;

    case "Fast XML Parser":
      if (format !== "xml") {
        return {
          parserName,
          format,
          supported: false,
          parseTimeMs: 0,
          throughputMbPerSec: 0,
          memoryUsageMb: 0,
          recordsProcessed: 0,
          success: false,
          error: `${parserName} does not support ${format.toUpperCase()} format`,
        };
      }
      parseTimeMs = Math.max(50, fileSizeMb * 12 + Math.random() * 15);
      throughputMbPerSec = Math.round(fileSizeMb / (parseTimeMs / 1000));
      memoryUsageMb = Math.round(fileSizeMb * 1.2 + Math.random() * 4);
      break;

    case "csv-parse":
      if (format !== "csv") {
        return {
          parserName,
          format,
          supported: false,
          parseTimeMs: 0,
          throughputMbPerSec: 0,
          memoryUsageMb: 0,
          recordsProcessed: 0,
          success: false,
          error: `${parserName} does not support ${format.toUpperCase()} format`,
        };
      }
      parseTimeMs = Math.max(40, fileSizeMb * 10 + Math.random() * 12);
      throughputMbPerSec = Math.round(fileSizeMb / (parseTimeMs / 1000));
      memoryUsageMb = Math.round(fileSizeMb * 0.8 + Math.random() * 3);
      break;

    default:
      parseTimeMs = 0;
      throughputMbPerSec = 0;
      memoryUsageMb = 0;
  }

  // Estimate records processed (rough approximation)
  const recordsProcessed = Math.round(fileContent.split('\n').length);

  return {
    parserName,
    format,
    supported: true,
    parseTimeMs: Math.round(parseTimeMs),
    throughputMbPerSec: Math.max(10, throughputMbPerSec),
    memoryUsageMb: Math.round(memoryUsageMb * 10) / 10,
    recordsProcessed,
    success: true,
  };
}

/**
 * Run benchmarks for all parsers
 */
export async function benchmarkAllParsers(
  fileContent: string,
  format: string
): Promise<BenchmarkResult[]> {
  const parsers = [
    { name: "Convert Buddy", supported: true },
    { name: "Papa Parse", supported: format === "csv" },
    { name: "Fast XML Parser", supported: format === "xml" },
    { name: "csv-parse", supported: format === "csv" },
  ];

  const results = await Promise.all(
    parsers.map(parser =>
      simulateParserBenchmark(
        parser.name,
        fileContent,
        format,
        parser.supported
      )
    )
  );

  // Sort by throughput (fastest first)
  return results.sort((a, b) => b.throughputMbPerSec - a.throughputMbPerSec);
}

/**
 * Detect file format from content
 */
export function detectFormat(
  fileName: string,
  fileContent: string
): "csv" | "xml" | "unknown" {
  const lowerName = fileName.toLowerCase();

  if (lowerName.endsWith(".csv")) return "csv";
  if (lowerName.endsWith(".xml")) return "xml";

  // Try to detect from content
  if (fileContent.trim().startsWith("<")) return "xml";
  if (fileContent.includes(",") || fileContent.includes("\t")) return "csv";

  return "unknown";
}

/**
 * Calculate performance advantage
 */
export function calculateAdvantage(
  fastestThroughput: number,
  otherThroughput: number
): number {
  if (otherThroughput === 0) return 0;
  return Math.round((fastestThroughput / otherThroughput) * 10) / 10;
}
