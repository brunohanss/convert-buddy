import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { AlertCircle, Activity, Zap } from "lucide-react";
import { detectFormat, type Format } from "convert-buddy-js";
import ParserDetailsCollapsible from "./ParserDetailsCollapsible";
import StreamingBenchmark from "./StreamingBenchmark";

interface CompetitorBenchmark {
  name: string;
  throughputMbPerSec: number;
  latencyMs: number;
  outputPreview?: string;
  error?: string;
}

// Benchmark csv-parse
async function benchmarkCsvParse(fileBytes: Uint8Array): Promise<CompetitorBenchmark> {
  try {
    // Dynamically import csv-parse
    const csvParse = await import("csv-parse/sync");
    const parse = csvParse.parse;
    
    const startTime = performance.now();
    const text = new TextDecoder().decode(fileBytes);
    const records = parse(text, { columns: true, skip_empty_lines: true });
    const latencyMs = performance.now() - startTime;
    const fileSizeMb = fileBytes.length / (1024 * 1024);
    const throughputMbPerSec = fileSizeMb / (latencyMs / 1000);

    // Generate output preview - show first few records as JSON
    let outputPreview = "";
    if (records && records.length > 0) {
      // Show first 3 records as JSON for preview
      const previewRecords = records.slice(0, 3);
      outputPreview = JSON.stringify(previewRecords, null, 2);
      // Limit to first 500 characters
      if (outputPreview.length > 500) {
        outputPreview = outputPreview.substring(0, 500) + "\n...";
      }
    }

    return {
      name: "csv-parse",
      throughputMbPerSec,
      latencyMs,
      outputPreview,
    };
  } catch (error) {
    console.error("csv-parse benchmark error:", error);
    return {
      name: "csv-parse",
      throughputMbPerSec: 0,
      latencyMs: 0,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Benchmark Papa Parse
async function benchmarkPapaparse(fileBytes: Uint8Array): Promise<CompetitorBenchmark> {
  try {
    // Dynamically import Papa Parse
    const Papa = await import("papaparse");
    
    const text = new TextDecoder().decode(fileBytes);
    const fileSizeMb = fileBytes.length / (1024 * 1024);
    
    let records: any[] = [];
    let latencyMs = 0;

    // Use a promise wrapper to measure Papa Parse performance
    await new Promise<void>((resolve) => {
      const startTime = performance.now();
      
      Papa.default.parse(text, {
        header: true,
        skipEmptyLines: true,
        complete: (results: any) => {
          latencyMs = performance.now() - startTime;
          records = results.data || [];
          resolve();
        },
        error: () => {
          latencyMs = performance.now() - startTime;
          resolve();
        },
      });
    });

    const throughputMbPerSec = fileSizeMb / (latencyMs / 1000);

    // Generate output preview - show first few records as JSON
    let outputPreview = "";
    if (records && records.length > 0) {
      // Show first 3 records as JSON for preview
      const previewRecords = records.slice(0, 3);
      outputPreview = JSON.stringify(previewRecords, null, 2);
      // Limit to first 500 characters
      if (outputPreview.length > 500) {
        outputPreview = outputPreview.substring(0, 500) + "\n...";
      }
    }

    return {
      name: "Papa Parse",
      throughputMbPerSec,
      latencyMs,
      outputPreview,
    };
  } catch (error) {
    console.error("Papa Parse benchmark error:", error);
    return {
      name: "Papa Parse",
      throughputMbPerSec: 0,
      latencyMs: 0,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Helper function to generate code snippets
function getConvertBuddyCode(inputFormat: string, outputFormat: string): string {
  return `import { convert } from 'convert-buddy-js';

// Read file
const file = new File([...], 'data.${inputFormat}');
const arrayBuffer = await file.arrayBuffer();
const bytes = new Uint8Array(arrayBuffer);

// Convert the file
const result = await convert(bytes, {
  inputFormat: '${inputFormat}',
  outputFormat: '${outputFormat}',
});

// The result is a Uint8Array containing the converted data`;
}

function getParsersForFormat(
  format: string
): Array<{ name: string; code: string; note?: string }> {
  const parsersMap: Record<string, Array<{ name: string; code: string; note?: string }>> = {
    csv: [
      {
        name: "PapaParse",
        code: `import Papa from 'papaparse';

const file = new File([...], 'data.csv');
Papa.parse(file, {
  header: true,
  skipEmptyLines: true,
  complete: (results) => {
    console.log(results.data);
  },
});`,
        note: "Widely used CSV parser with streaming support"
      },
      {
        name: "csv-parse",
        code: `import { parse } from 'csv-parse/sync';

const csvText = await file.text();
const records = parse(csvText, {
  columns: true,
  skip_empty_lines: true,
});

console.log(records);`,
        note: "Streaming and callback-based CSV parser"
      },
      {
        name: "fast-csv",
        code: `import { parse } from 'fast-csv';

const stream = fs.createReadStream('data.csv');
parse({ headers: true })
  .on('data', (row) => console.log(row))
  .on('error', (error) => console.error(error))
  .pipe(stream);`,
        note: "Fast CSV parser with streaming"
      },
    ],
    xml: [
      {
        name: "fast-xml-parser",
        code: `import { XMLParser } from 'fast-xml-parser';

const xmlText = await file.text();
const parser = new XMLParser();
const result = parser.parse(xmlText);

console.log(result);`,
        note: "Lightweight and fast XML parser"
      },
      {
        name: "xml2js",
        code: `import { parseString } from 'xml2js';

const xmlText = await file.text();
parseString(xmlText, (err, result) => {
  if (!err) {
    console.log(result);
  }
});`,
        note: "Classic XML parser with callback-based API"
      },
    ],
    json: [
      {
        name: "Native JSON",
        code: `// For streaming NDJSON
const text = await file.text();
const lines = text.split('\\n');
const records = lines
  .filter(line => line.trim())
  .map(line => JSON.parse(line));

console.log(records);`,
        note: "Using native JSON parsing"
      },
    ],
    ndjson: [
      {
        name: "ndjson Parser",
        code: `const text = await file.text();
const records = text
  .split('\\n')
  .filter(line => line.trim())
  .map(line => JSON.parse(line));

console.log(records);`,
        note: "Simple line-by-line JSON parsing"
      },
    ],
  };

  return parsersMap[format] || [];
}

function getOutputPreview(result: Uint8Array, format: string): string {
  try {
    const text = new TextDecoder().decode(result.slice(0, 500));
    
    // Limit preview to first 500 characters and ensure it's valid
    if (text.length > 0) {
      return text.length < 500 ? text : text.substring(0, 500) + "...";
    }
    return "[Unable to preview output]";
  } catch {
    return "[Unable to preview output]";
  }
}

interface BenchmarkMetrics {
  throughputMbps: number;
  latencyMs: number;
  fileSizeMb: number;
  recordsPerSec: number;
  memoryEstimateMb: number;
  isComplete: boolean;
  error?: string;
}

interface LiveBenchmarkSectionProps {
  file: File;
  outputFormat: Format;
  isProcessing: boolean;
}

// Constants for streaming
const STREAMING_THRESHOLD = 50 * 1024 * 1024; // 50 MB
const STREAM_CHUNK_SIZE = 5 * 1024 * 1024; // 5 MB chunks

export default function LiveBenchmarkSection({
  file,
  outputFormat,
  isProcessing,
}: LiveBenchmarkSectionProps) {
  const [metrics, setMetrics] = useState<BenchmarkMetrics | null>(null);
  const [progress, setProgress] = useState(0);
  const [detectedFormat, setDetectedFormat] = useState<Format | null>(null);
  const [conversionResult, setConversionResult] = useState<Uint8Array | null>(null);
  const [hasStarted, setHasStarted] = useState(false);
  const [competitorResults, setCompetitorResults] = useState<CompetitorBenchmark[]>([]);

  useEffect(() => {
    // Auto-start benchmark when component is rendered
    if (!hasStarted && file) {
      setHasStarted(true);
    }
  }, [file, hasStarted]);

  useEffect(() => {
    if (!hasStarted || !file) {
      return;
    }

    const runBenchmark = async () => {
      try {
        setProgress(0);
        const initialMemory = (performance as any).memory?.usedJSHeapSize || 0;
        const isLargeFile = file.size > STREAMING_THRESHOLD;

        // Read file
        setProgress(10);
        const arrayBuffer = await file.arrayBuffer();
        const fileBytes = new Uint8Array(arrayBuffer);
        const fileSizeMb = file.size / (1024 * 1024);

        // Detect format
        setProgress(30);
        const detectedFmt = await detectFormat(file.stream());
        setDetectedFormat(detectedFmt as Format);

        // Convert to target format
        setProgress(50);
        const { convert } = await import("convert-buddy-js");

        const startConvert = performance.now();
        const convertOptions: any = {
          outputFormat,
          inputFormat: detectedFmt as Format,
        };

        let result: Uint8Array;

        if (isLargeFile) {
          // Streaming mode for large files
          const chunks: Uint8Array[] = [];
          for (let i = 0; i < fileBytes.length; i += STREAM_CHUNK_SIZE) {
            const chunk = fileBytes.slice(i, i + STREAM_CHUNK_SIZE);
            const chunkResult = await convert(chunk, convertOptions);
            chunks.push(chunkResult);
            
            // Update progress during streaming
            const progressPercent = 50 + ((i / fileBytes.length) * 30);
            setProgress(Math.min(progressPercent, 80));
          }
          
          // Combine chunks
          const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
          result = new Uint8Array(totalLength);
          let offset = 0;
          for (const chunk of chunks) {
            result.set(chunk, offset);
            offset += chunk.length;
          }
        } else {
          // Direct mode for small files
          result = await convert(fileBytes, convertOptions);
        }

        const endConvert = performance.now();

        setConversionResult(result);

        setProgress(80);
        const finalMemory = (performance as any).memory?.usedJSHeapSize || 0;
        const totalTime = (endConvert - startConvert) / 1000; // seconds
        const throughputMbps = fileSizeMb / totalTime;
        const latencyMs = endConvert - startConvert;
        const memoryEstimateMb = (finalMemory - initialMemory) / (1024 * 1024);

        // Estimate records processed based on file size and common record size
        const estimatedRecordSize = Math.max(100, fileSizeMb * 1024 / 100); // rough estimate
        const recordsPerSec = (fileSizeMb * 1024 * 1024) / (totalTime * estimatedRecordSize);

        setMetrics({
          throughputMbps,
          latencyMs,
          fileSizeMb,
          recordsPerSec,
          memoryEstimateMb: Math.max(0, memoryEstimateMb), // clamp to 0
          isComplete: true,
        });

        // Benchmark competitors for CSV files
        if (detectedFmt === "csv") {
          const [csvParseResult, papaparseResult] = await Promise.all([
            benchmarkCsvParse(fileBytes),
            benchmarkPapaparse(fileBytes),
          ]);
          // Only include successfully measured results (no errors)
          const successfulResults = [csvParseResult, papaparseResult].filter(
            (result) => !result.error && result.throughputMbPerSec > 0
          );
          setCompetitorResults(successfulResults);
        }

        setProgress(100);
      } catch (error) {
        console.error("Benchmark error:", error);
        setMetrics((prev) => ({
          ...prev,
          isComplete: true,
          error: error instanceof Error ? error.message : "Unknown error",
        } as BenchmarkMetrics));
        setProgress(100);
      } finally {
        // Benchmark complete, no need for callbacks
      }
    };

    void runBenchmark();
  }, [hasStarted, file, outputFormat]);

  if (!hasStarted && !metrics) {
    return null;
  }

  // Use streaming benchmark for large files (> 50 MB)
  const isLargeFile = file.size > STREAMING_THRESHOLD;
  if (isLargeFile) {
    return <StreamingBenchmark file={file} outputFormat={outputFormat} isProcessing={hasStarted} />;
  }

  return (
    <div className="mt-8 space-y-8">
      <Card className="p-6 bg-gradient-to-br from-accent/10 to-accent/5 border-accent/20">
        <div className="flex items-center gap-3 mb-6">
          <Activity className="w-5 h-5 text-accent animate-pulse" />
          <h3 className="text-lg font-semibold text-foreground">Live Performance Metrics</h3>
        </div>

        {/* Progress bar */}
        {!metrics && (
          <div className="space-y-2 mb-6">
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Processing file...</span>
              <span className="text-muted-foreground">{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}

        {/* Metrics Grid */}
        {metrics && (
          <div className="space-y-6">
            {metrics.error ? (
              <div className="flex gap-3 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-destructive">Benchmark Error</p>
                  <p className="text-xs text-destructive/80 mt-1">{metrics.error}</p>
                </div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <MetricCard
                    label="Throughput"
                    value={metrics.throughputMbps.toFixed(2)}
                    unit="MB/s"
                    icon={<Zap className="w-4 h-4" />}
                  />
                  <MetricCard
                    label="Latency"
                    value={metrics.latencyMs.toFixed(2)}
                    unit="ms"
                  />
                  <MetricCard
                    label="Memory Used"
                    value={metrics.memoryEstimateMb.toFixed(2)}
                    unit="MB"
                  />
                  <MetricCard
                    label="File Size"
                    value={metrics.fileSizeMb.toFixed(2)}
                    unit="MB"
                  />
                </div>

                {/* Performance comparison bar */}
                <div className="pt-4 border-t border-border">
                  <p className="text-sm text-muted-foreground mb-3">
                    Performance Comparison
                  </p>
                  <PerformanceComparison throughput={metrics.throughputMbps} competitors={competitorResults} />
                </div>

                {/* Success message */}
                {metrics.isComplete && (
                  <div className="flex gap-2 p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
                    <div className="w-2 h-2 rounded-full bg-green-600 mt-1.5 flex-shrink-0" />
                    <p className="text-sm text-green-800 dark:text-green-300">
                      Benchmark complete! Convert Buddy processed your file at {metrics.throughputMbps.toFixed(1)} MB/s
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </Card>

      {/* Parser Details Section */}
      {metrics && !metrics.error && detectedFormat && conversionResult && (
        <div className="space-y-6">
          {/* Convert Buddy Parser Details */}
          <Card className="p-6 border border-border">
            <h3 className="text-lg font-semibold text-foreground mb-4">Convert Buddy</h3>
            <ParserDetailsCollapsible
              parserName="Convert Buddy"
              codeSnippet={getConvertBuddyCode(detectedFormat, outputFormat)}
              outputPreview={getOutputPreview(conversionResult, outputFormat)}
              outputFormat={outputFormat}
            />
          </Card>

          {/* Benchmarked Competitors */}
          {competitorResults.map((competitor) => (
            <Card key={competitor.name} className="p-6 border border-border opacity-75">
              <h3 className="text-lg font-semibold text-foreground mb-2">{competitor.name}</h3>
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs text-muted-foreground">
                  {competitor.error ? (
                    <span className="text-destructive">Error: {competitor.error}</span>
                  ) : (
                    <>
                      {competitor.throughputMbPerSec.toFixed(1)} MB/s •{" "}
                      {competitor.latencyMs.toFixed(0)} ms
                    </>
                  )}
                </p>
              </div>
              {competitor.outputPreview && (
                <div className="bg-slate-50 dark:bg-slate-900/30 rounded p-3 mb-4 border border-border/50">
                  <p className="text-xs text-muted-foreground mb-2">
                    Sample output from {competitor.name}
                  </p>
                  <pre className="text-xs overflow-auto max-h-40 text-foreground whitespace-pre-wrap break-words">
                    {competitor.outputPreview}
                  </pre>
                </div>
              )}
            </Card>
          ))}

          {/* Other Parsers - Code examples only */}
          {getParsersForFormat(detectedFormat)
            .filter(
              (parser) =>
                !competitorResults.some((c) => c.name === parser.name)
            )
            .map((parser) => (
              <Card key={parser.name} className="p-6 border border-border opacity-75">
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {parser.name}
                </h3>
                <p className="text-xs text-muted-foreground mb-4">
                  {parser.note || "Parser information"}
                </p>
                <ParserDetailsCollapsible
                  parserName={parser.name}
                  codeSnippet={parser.code}
                  outputPreview=""
                  outputFormat={outputFormat}
                />
              </Card>
            ))}
        </div>
      )}
    </div>
  );
}

interface MetricCardProps {
  label: string;
  value: string;
  unit: string;
  icon?: React.ReactNode;
}

function MetricCard({ label, value, unit, icon }: MetricCardProps) {
  return (
    <div className="bg-white dark:bg-slate-900/50 rounded-lg p-4 border border-border">
      <div className="flex items-start justify-between mb-2">
        <p className="text-xs text-muted-foreground">{label}</p>
        {icon && <div className="text-accent">{icon}</div>}
      </div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground mt-1">{unit}</p>
    </div>
  );
}

interface PerformanceComparisonProps {
  throughput: number;
  competitors?: CompetitorBenchmark[];
}

function PerformanceComparison({ throughput, competitors = [] }: PerformanceComparisonProps) {
  // Use real measured competitors or show fallback message
  const maxThroughput = Math.max(
    throughput,
    ...competitors.map((c) => c.throughputMbPerSec)
  );

  return (
    <div className="space-y-2">
      {/* Convert Buddy */}
      <div className="space-y-1">
        <div className="flex justify-between text-sm">
          <span className="font-semibold text-accent">Convert Buddy</span>
          <span className="text-accent font-bold">{throughput.toFixed(1)} MB/s</span>
        </div>
        <div className="w-full h-3 bg-secondary rounded-full overflow-hidden">
          <div
            className="h-full bg-accent transition-all duration-500"
            style={{ width: `${(throughput / maxThroughput) * 100}%` }}
          />
        </div>
      </div>

      {/* Measured Competitors */}
      {competitors.length > 0 ? (
        <div className="space-y-2 mt-4">
          {competitors.map((competitor) => (
            <div key={competitor.name} className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground text-xs">{competitor.name}</span>
                <span className="text-muted-foreground text-xs font-medium">
                  {competitor.error
                    ? "Error"
                    : `${competitor.throughputMbPerSec.toFixed(1)} MB/s`}
                </span>
              </div>
              <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-secondary-foreground/40 transition-all duration-500"
                  style={{
                    width: `${(competitor.throughputMbPerSec / maxThroughput) * 100}%`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground mt-2">
          Competitor benchmarks available for CSV files
        </p>
      )}
    </div>
  );
}
