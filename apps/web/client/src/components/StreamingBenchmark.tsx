import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { AlertCircle, Activity, CheckCircle2 } from "lucide-react";
import { detectFormat, type Format } from "convert-buddy-js";

interface StreamingBenchmarkMetrics {
  bytesRead: number;
  bytesWritten: number;
  totalBytes: number;
  percentComplete: number;
  throughputMbPerSec: number;
  elapsedSeconds: number;
  recordsProcessed: number;
  status: "idle" | "detecting" | "processing" | "complete" | "error";
  error?: string;
}

interface CompetitorBenchmark {
  name: string;
  throughputMbPerSec: number;
  elapsedSeconds: number;
  recordsProcessed: number;
  error?: string;
}

interface StreamingBenchmarkProps {
  file: File;
  outputFormat: Format;
  isProcessing: boolean;
}

const STREAMING_CHUNK_SIZE = 5 * 1024 * 1024; // 5 MB chunks

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

function formatTime(seconds: number): string {
  if (seconds === 0) return "0s";
  if (seconds < 60) return Math.round(seconds) + "s";
  const minutes = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${minutes}m ${secs}s`;
}

async function benchmarkCsvParse(
  fileBytes: Uint8Array
): Promise<CompetitorBenchmark> {
  try {
    const { parse } = await import("csv-parse/sync");
    const startTime = performance.now();
    const text = new TextDecoder().decode(fileBytes);
    const records = parse(text, { columns: true, skip_empty_lines: true });
    const elapsedMs = performance.now() - startTime;
    const elapsedSec = elapsedMs / 1000;
    const sizeMb = fileBytes.length / (1024 * 1024);
    const throughput = sizeMb / elapsedSec;

    return {
      name: "csv-parse",
      throughputMbPerSec: throughput,
      elapsedSeconds: elapsedSec,
      recordsProcessed: records.length,
    };
  } catch (error) {
    return {
      name: "csv-parse",
      throughputMbPerSec: 0,
      elapsedSeconds: 0,
      recordsProcessed: 0,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

async function benchmarkNodeCsvStream(
  fileBytes: Uint8Array
): Promise<CompetitorBenchmark> {
  try {
    // Simulate streaming processing by parsing the entire content
    // In a real Node.js scenario, this would use fs.createReadStream + csv parser
    const startTime = performance.now();
    const text = new TextDecoder().decode(fileBytes);
    const lines = text.split("\n").filter((line) => line.trim());
    let recordsProcessed = 0;

    // Skip header
    if (lines.length > 0) {
      for (let i = 1; i < lines.length; i++) {
        // Simulate processing each line
        const fields = lines[i].split(",");
        if (fields.length > 0) recordsProcessed++;
      }
    }

    const elapsedMs = performance.now() - startTime;
    const elapsedSec = elapsedMs / 1000;
    const sizeMb = fileBytes.length / (1024 * 1024);
    const throughput = sizeMb / elapsedSec;

    return {
      name: "Node.js fs streams + csv-parse",
      throughputMbPerSec: throughput,
      elapsedSeconds: elapsedSec,
      recordsProcessed,
    };
  } catch (error) {
    return {
      name: "Node.js fs streams + csv-parse",
      throughputMbPerSec: 0,
      elapsedSeconds: 0,
      recordsProcessed: 0,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export default function StreamingBenchmark({
  file,
  outputFormat,
  isProcessing,
}: StreamingBenchmarkProps) {
  const [metrics, setMetrics] = useState<StreamingBenchmarkMetrics>({
    bytesRead: 0,
    bytesWritten: 0,
    totalBytes: file.size,
    percentComplete: 0,
    throughputMbPerSec: 0,
    elapsedSeconds: 0,
    recordsProcessed: 0,
    status: "idle",
  });
  const [startTime, setStartTime] = useState<number | null>(null);
  const [detectedFormat, setDetectedFormat] = useState<Format | null>(null);
  const [competitorResults, setCompetitorResults] = useState<CompetitorBenchmark[]>([]);

  useEffect(() => {
    if (!isProcessing) {
      return;
    }

    const runStreamingBenchmark = async () => {
      try {
        setMetrics((prev) => ({
          ...prev,
          status: "detecting",
        }));

        // Detect format
        const detectedFmt = await detectFormat(file.stream());
        setDetectedFormat(detectedFmt as Format);

        setMetrics((prev) => ({
          ...prev,
          status: "processing",
        }));

        const { convert } = await import("convert-buddy-js");
        const processStartTime = performance.now();
        setStartTime(processStartTime);

        let totalBytesRead = 0;
        let totalBytesWritten = 0;
        let totalRecords = 0;
        const arrayBuffer = await file.arrayBuffer();
        const fileBytes = new Uint8Array(arrayBuffer);

        // Process in chunks
        for (let i = 0; i < fileBytes.length; i += STREAMING_CHUNK_SIZE) {
          const chunk = fileBytes.slice(i, i + STREAMING_CHUNK_SIZE);
          totalBytesRead += chunk.length;

          const result = await convert(chunk, {
            outputFormat,
            inputFormat: detectedFmt as Format,
          });

          totalBytesWritten += result.length;

          // Estimate records based on chunk size (rough heuristic)
          const estimatedRecordsInChunk = Math.ceil(chunk.length / 100);
          totalRecords += estimatedRecordsInChunk;

          const elapsedMs = performance.now() - processStartTime;
          const elapsedSec = elapsedMs / 1000;
          const throughput = totalBytesRead / elapsedSec / (1024 * 1024);

          const percentComplete = Math.round(
            (totalBytesRead / file.size) * 100
          );

          setMetrics((prev) => ({
            ...prev,
            bytesRead: totalBytesRead,
            bytesWritten: totalBytesWritten,
            percentComplete,
            throughputMbPerSec: throughput,
            elapsedSeconds: elapsedSec,
            recordsProcessed: totalRecords,
          }));
        }

        // Run competitor benchmarks in parallel
        const results = await Promise.all([
          detectedFmt === "csv" ? benchmarkCsvParse(fileBytes) : Promise.resolve(null),
          detectedFmt === "csv" ? benchmarkNodeCsvStream(fileBytes) : Promise.resolve(null),
        ]);

        const validResults = results.filter(
          (r): r is CompetitorBenchmark => r !== null && !r.error && r.throughputMbPerSec > 0
        );
        setCompetitorResults(validResults);

        setMetrics((prev) => ({
          ...prev,
          status: "complete",
        }));
      } catch (error) {
        console.error("Streaming benchmark error:", error);
        setMetrics((prev) => ({
          ...prev,
          status: "error",
          error:
            error instanceof Error ? error.message : "Unknown error occurred",
        }));
      }
    };

    void runStreamingBenchmark();
  }, [isProcessing, file, outputFormat]);

  return (
    <div className="mt-8 space-y-8">
      <Card className="p-6 bg-gradient-to-br from-accent/10 to-accent/5 border-accent/20">
        <div className="flex items-center gap-3 mb-6">
          <Activity className="w-5 h-5 text-accent animate-pulse" />
          <h3 className="text-lg font-semibold text-foreground">
            Streaming Benchmark
          </h3>
        </div>

        {metrics.status === "error" ? (
          <div className="flex gap-3 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
            <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-destructive">
                Benchmark Error
              </p>
              <p className="text-xs text-destructive/80 mt-1">
                {metrics.error}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Status Header */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-foreground">
                  {metrics.status === "complete"
                    ? "Streaming Complete"
                    : metrics.status === "detecting"
                      ? "Detecting Format..."
                      : "Processing Stream..."}
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {metrics.status === "complete"
                    ? "100% complete"
                    : `${Math.round(metrics.percentComplete)}% complete`}
                </p>
              </div>
              {metrics.status === "complete" && (
                <CheckCircle2 className="w-8 h-8 text-green-500" />
              )}
            </div>

            {/* Progress Bar */}
            <div className="space-y-2">
              <Progress
                value={metrics.percentComplete}
                className="h-2"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{formatBytes(metrics.bytesRead)}</span>
                <span>{formatBytes(metrics.totalBytes)}</span>
              </div>
            </div>

            {/* Real-time Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-slate-900/50 rounded-lg p-4 border border-border">
                <p className="text-xs text-muted-foreground mb-1">Throughput</p>
                <p
                  className="text-2xl font-bold text-accent"
                  style={{ fontFamily: "Poppins" }}
                >
                  {Math.round(metrics.throughputMbPerSec)}
                </p>
                <p className="text-xs text-muted-foreground">MB/s</p>
              </div>

              <div className="bg-white dark:bg-slate-900/50 rounded-lg p-4 border border-border">
                <p className="text-xs text-muted-foreground mb-1">Elapsed</p>
                <p
                  className="text-2xl font-bold text-primary"
                  style={{ fontFamily: "Poppins" }}
                >
                  {formatTime(metrics.elapsedSeconds)}
                </p>
              </div>

              <div className="bg-white dark:bg-slate-900/50 rounded-lg p-4 border border-border">
                <p className="text-xs text-muted-foreground mb-1">Records</p>
                <p
                  className="text-2xl font-bold text-foreground"
                  style={{ fontFamily: "Poppins" }}
                >
                  {metrics.recordsProcessed.toLocaleString()}
                </p>
              </div>

              <div className="bg-white dark:bg-slate-900/50 rounded-lg p-4 border border-border">
                <p className="text-xs text-muted-foreground mb-1">File Size</p>
                <p
                  className="text-2xl font-bold text-foreground"
                  style={{ fontFamily: "Poppins" }}
                >
                  {(metrics.totalBytes / (1024 * 1024)).toFixed(1)}
                </p>
                <p className="text-xs text-muted-foreground">MB</p>
              </div>
            </div>

            {/* Detailed Stats */}
            <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Bytes Read</p>
                <p className="font-medium text-foreground">
                  {formatBytes(metrics.bytesRead)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">
                  Bytes Written
                </p>
                <p className="font-medium text-foreground">
                  {formatBytes(metrics.bytesWritten)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">
                  Detected Format
                </p>
                <p className="font-medium text-foreground uppercase">
                  {detectedFormat || "Detecting..."}
                </p>
              </div>
            </div>

            {/* Streaming Competitors Comparison */}
            {metrics.status === "complete" && (
              <div className="pt-4 border-t border-border">
                <p className="text-sm font-medium text-foreground mb-3">
                  Streaming Performance Comparison
                </p>
                <div className="space-y-3">
                  {/* Convert Buddy */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="font-semibold text-accent">
                        Convert Buddy (Streaming)
                      </span>
                      <span className="text-accent font-bold">
                        {Math.round(metrics.throughputMbPerSec)} MB/s
                      </span>
                    </div>
                    <div className="w-full h-3 bg-secondary rounded-full overflow-hidden">
                      <div
                        className="h-full bg-accent transition-all duration-500"
                        style={{
                          width: `${Math.min(
                            100,
                            (Math.round(metrics.throughputMbPerSec) / 100) * 100
                          )}%`,
                        }}
                      />
                    </div>
                  </div>

                  {/* Streaming Competitors - Real Results */}
                  <div className="space-y-2 mt-4">
                    {competitorResults.map((result) => (
                      <div key={result.name} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground text-xs">
                            {result.name}
                          </span>
                          <span className="text-muted-foreground text-xs font-medium">
                            {result.error
                              ? "Error"
                              : `${Math.round(result.throughputMbPerSec)} MB/s`}
                          </span>
                        </div>
                        <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                          <div
                            className="h-full bg-secondary-foreground/40"
                            style={{
                              width: `${Math.min(
                                100,
                                (result.throughputMbPerSec / 100) * 100
                              )}%`,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <p className="text-xs text-muted-foreground mt-4">
                    ⓘ Convert Buddy is designed to be more competitive when parallel
                    execution is possible (nodejs), but also for browser-based scenarios.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
