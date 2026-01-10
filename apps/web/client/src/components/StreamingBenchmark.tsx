import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { AlertCircle, Activity, CheckCircle2 } from "lucide-react";
import { detectFormat, type Format } from "convert-buddy-js";
import { Button } from "@/components/ui/button";

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

async function benchmarkCsvParseStreaming(
  file: File,
  saveHandle?: any
): Promise<CompetitorBenchmark> {
  try {
    const { parse } = await import("csv-parse/sync");
    const startTime = performance.now();
    let totalBytes = 0;
    let recordsProcessed = 0;

    const reader = (file as any).stream().getReader();
    const chunks: Uint8Array[] = [];
    let writable: any = null;
    let chunkCount = 0;

    if (saveHandle) {
      writable = await saveHandle.createWritable();
    }

    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = value as Uint8Array;
        totalBytes += chunk.length;
        chunks.push(chunk);

        // If writing to file, write the chunk
        if (writable) {
          await writable.write(chunk);
        }

        // Yield to browser every 50 chunks to prevent UI freeze
        chunkCount++;
        if (chunkCount % 50 === 0) {
          await new Promise(resolve => setTimeout(resolve, 0));
        }
      }

      // Combine chunks and parse
      const allData = new Uint8Array(totalBytes);
      let offset = 0;
      for (const chunk of chunks) {
        allData.set(chunk, offset);
        offset += chunk.length;
      }

      const text = new TextDecoder().decode(allData);
      const records = parse(text, { columns: true, skip_empty_lines: true });
      recordsProcessed = records.length;
    } finally {
      try {
        if ((reader as any).cancel) await (reader as any).cancel();
      } catch {}
      if (writable) {
        try {
          await writable.close();
        } catch {}
      }
    }

    const elapsedMs = performance.now() - startTime;
    const elapsedSec = elapsedMs / 1000;
    const sizeMb = totalBytes / (1024 * 1024);
    const throughput = sizeMb / elapsedSec;

    return {
      name: "csv-parse",
      throughputMbPerSec: throughput,
      elapsedSeconds: elapsedSec,
      recordsProcessed,
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

async function benchmarkNodeCsvStreamStreaming(
  file: File,
  saveHandle?: any
): Promise<CompetitorBenchmark> {
  try {
    const startTime = performance.now();
    let totalBytes = 0;
    let recordsProcessed = 0;
    let buffer = "";

    const reader = (file as any).stream().getReader();
    let writable: any = null;

    if (saveHandle) {
      writable = await saveHandle.createWritable();
    }

    let chunkCount = 0;
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = value as Uint8Array;
        totalBytes += chunk.length;
        const text = new TextDecoder().decode(chunk);
        buffer += text;

        // If writing to file, write the chunk
        if (writable) {
          await writable.write(chunk);
        }

        // Process complete lines
        const lines = buffer.split("\n");
        // Keep the last incomplete line in the buffer
        buffer = lines.pop() || "";

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          if (line) {
            // Simulate processing each line
            const fields = line.split(",");
            if (fields.length > 0) recordsProcessed++;
          }
        }

        // Yield to browser every 100 chunks to prevent UI freeze
        chunkCount++;
        if (chunkCount % 100 === 0) {
          await new Promise(resolve => setTimeout(resolve, 0));
        }
      }

      // Process any remaining data in buffer
      if (buffer.trim()) {
        const fields = buffer.split(",");
        if (fields.length > 0) recordsProcessed++;
      }
    } finally {
      try {
        if ((reader as any).cancel) await (reader as any).cancel();
      } catch {}
      if (writable) {
        try {
          await writable.close();
        } catch {}
      }
    }

    const elapsedMs = performance.now() - startTime;
    const elapsedSec = elapsedMs / 1000;
    const sizeMb = totalBytes / (1024 * 1024);
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
  const [isStreamProcessing, setIsStreamProcessing] = useState(false);
  const [saveHandle, setSaveHandle] = useState<any | null>(null);
  const [competitorSaveHandles, setCompetitorSaveHandles] = useState<Record<string, any>>({});

  // Detect format once on mount
  useEffect(() => {
    const detectOnce = async () => {
      try {
        const detectedFmt = await detectFormat(file.stream());
        setDetectedFormat(detectedFmt as Format);
      } catch (error) {
        console.error("Format detection error:", error);
      }
    };

    void detectOnce();
  }, [file]);

  useEffect(() => {
    if (!isProcessing || !isStreamProcessing || !saveHandle) {
      return;
    }

    const runStreamingBenchmark = async () => {
      try {
        setMetrics((prev) => ({
          ...prev,
          status: "processing",
        }));

        const { ConvertBuddy } = await import("convert-buddy-js");
        const processStartTime = performance.now();
        setStartTime(processStartTime);
        let totalBytesRead = 0;
        let totalBytesWritten = 0;
        let totalRecords = 0;
        let fileBytes: Uint8Array | null = null;
        let benchmarkPromise: Promise<CompetitorBenchmark[] | null> = Promise.resolve(null);

        // Create a single ConvertBuddy instance for all chunks
        const buddy = await ConvertBuddy.create({
          outputFormat,
          inputFormat: detectedFormat as Format,
        });

        // If user has started an explicit stream processing session (saveHandle
        // selected), prefer streaming read/write using the File System Access API
        if (isStreamProcessing && saveHandle && (file as any).stream) {
          // Stream from file and write converted chunks directly to the selected file
          const reader = (file as any).stream().getReader();
          let writable: any = null;

          try {
            writable = await saveHandle.createWritable();
            
            while (true) {
              const { value, done } = await reader.read();
              if (done) break;
              const chunk = value as Uint8Array;
              totalBytesRead += chunk.length;

              // Push chunk to the single buddy instance
              const result = buddy.push(chunk);

              // Write the converted chunk to the file as-is
              if (writable) {
                await writable.write(result);
              }
              totalBytesWritten += result.length;

              // Update estimates
              const estimatedRecordsInChunk = Math.ceil(chunk.length / 100);
              totalRecords += estimatedRecordsInChunk;

              const elapsedMs = performance.now() - processStartTime;
              const elapsedSec = elapsedMs / 1000;
              const throughput = totalBytesRead / elapsedSec / (1024 * 1024);
              const percentComplete = Math.round((totalBytesRead / file.size) * 100);

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

            // Finish the conversion to get any remaining output
            const finalResult = buddy.finish();
            if (finalResult.length > 0) {
              if (writable) {
                await writable.write(finalResult);
              }
              totalBytesWritten += finalResult.length;
            }

            if (writable) {
              await writable.close();
            }
          } catch (streamError) {
            if (writable) {
              try {
                await writable.abort();
              } catch {}
            }
            throw streamError;
          } finally {
            try {
              if ((reader as any).cancel) await (reader as any).cancel();
            } catch {}
          }

          // Start benchmarks AFTER streaming conversion completes (not in parallel)
          if (detectedFormat === "csv") {
            benchmarkPromise = Promise.all([
              benchmarkCsvParseStreaming(file, competitorSaveHandles['csv-parse']),
              benchmarkNodeCsvStreamStreaming(file, competitorSaveHandles['node-csv']),
            ]);
          }
        } else {
          // Non-streaming: load entire file into memory for both conversion and benchmarks
          const arrayBuffer = await file.arrayBuffer();
          fileBytes = new Uint8Array(arrayBuffer);

          // Process in chunks
          for (let i = 0; i < fileBytes.length; i += STREAMING_CHUNK_SIZE) {
            const chunk = fileBytes.slice(i, i + STREAMING_CHUNK_SIZE);
            totalBytesRead += chunk.length;

            // Push chunk to the single buddy instance
            const result = buddy.push(chunk);

            totalBytesWritten += result.length;

            // Estimate records based on chunk size (rough heuristic)
            const estimatedRecordsInChunk = Math.ceil(chunk.length / 100);
            totalRecords += estimatedRecordsInChunk;

            const elapsedMs = performance.now() - processStartTime;
            const elapsedSec = elapsedMs / 1000;
            const throughput = totalBytesRead / elapsedSec / (1024 * 1024);
            const percentComplete = Math.round((totalBytesRead / file.size) * 100);

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

          // Finish the conversion to get any remaining output
          const finalResult = buddy.finish();
          if (finalResult.length > 0) {
            totalBytesWritten += finalResult.length;
          }

          // Start benchmarks AFTER conversion completes (not in parallel)
          if (detectedFormat === "csv" && fileBytes) {
            benchmarkPromise = Promise.all([
              benchmarkCsvParse(fileBytes),
              benchmarkNodeCsvStream(fileBytes),
            ]);
          }
        }

        // Wait for benchmarks to complete
        try {
          const benchmarkResults = await benchmarkPromise;
          if (benchmarkResults && Array.isArray(benchmarkResults)) {
            const validResults = benchmarkResults.filter(
              (r): r is CompetitorBenchmark => r !== null && !r.error && r.throughputMbPerSec > 0
            );
            setCompetitorResults(validResults);
          }
        } catch (benchError) {
          // Silently fail benchmarks to avoid breaking the main process
          console.warn("Competitor benchmarks failed:", benchError);
        }

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
  }, [isProcessing, isStreamProcessing, saveHandle, competitorSaveHandles, file, outputFormat, detectedFormat]);

  // Handler to prompt user for a destination file using File System Access API
  async function handleSelectSaveFile() {
    try {
      // @ts-ignore - showSaveFilePicker is not yet standard in TypeScript lib
      const handle = await (window as any).showSaveFilePicker({
        suggestedName: `${file.name}.${outputFormat}`,
        types: [
          {
            description: `${outputFormat} file`,
            accept: { 'application/octet-stream': ['.csv', '.ndjson', '.json', '.xml'] },
          },
        ],
      });
      setSaveHandle(handle);
    } catch (err) {
      console.error('Save file selection cancelled or failed:', err);
      setSaveHandle(null);
    }
  }

  // Handler to select a save file for a specific competitor
  async function handleSelectCompetitorFile(competitorName: string) {
    try {
      // @ts-ignore - showSaveFilePicker is not yet standard in TypeScript lib
      const handle = await (window as any).showSaveFilePicker({
        suggestedName: `${file.name}-${competitorName}.${outputFormat}`,
        types: [
          {
            description: `${outputFormat} file`,
            accept: { 'application/octet-stream': ['.csv', '.ndjson', '.json', '.xml'] },
          },
        ],
      });
      setCompetitorSaveHandles((prev) => ({
        ...prev,
        [competitorName]: handle,
      }));
    } catch (err) {
      console.error(`Competitor save file selection cancelled or failed:`, err);
    }
  }

  function handleStartStreamProcessing() {
    if (!saveHandle) {
      // When no save file selected, prompt the user
      void handleSelectSaveFile();
    }
    setIsStreamProcessing(true);
  }

  return (
    <div className="mt-8 space-y-8">
      <Card className="p-6 bg-gradient-to-br from-accent/10 to-accent/5 border-accent/20">
        <div className="flex items-center gap-3 mb-6">
          <Activity className="w-5 h-5 text-accent animate-pulse" />
          <h3 className="text-lg font-semibold text-foreground">
            Streaming Benchmark
          </h3>
          <div className="ml-auto flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => void handleSelectSaveFile()}>
              Select save file
            </Button>
            <Button size="sm" onClick={() => handleStartStreamProcessing()}>
              Start stream processing
            </Button>
          </div>
        </div>

        {/* Competitor output file selection */}
        {detectedFormat === "csv" && metrics.status === "idle" && (
          <div className="p-4 bg-secondary/30 rounded-lg border border-secondary/50 mb-4">
            <p className="text-xs font-medium text-foreground mb-3">
              Optional: Select output files for competitors to avoid disk conflicts
            </p>
            <div className="grid grid-cols-2 gap-2">
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => void handleSelectCompetitorFile('csv-parse')}
                className="text-xs"
              >
                {competitorSaveHandles['csv-parse'] ? '✓ csv-parse' : 'csv-parse output'}
              </Button>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => void handleSelectCompetitorFile('node-csv')}
                className="text-xs"
              >
                {competitorSaveHandles['node-csv'] ? '✓ Node.js' : 'Node.js output'}
              </Button>
            </div>
          </div>
        )}

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
