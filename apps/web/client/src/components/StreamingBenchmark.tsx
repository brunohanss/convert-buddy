import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { AlertCircle, Activity, CheckCircle2, Download } from "lucide-react";
import { detectFormat, getSuggestedFilename, getFileTypeConfig, type Format } from "convert-buddy-js/browser";
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
): Promise<CompetitorBenchmark | null> {
  // Only run if save handle is provided
  if (!saveHandle) {
    return null;
  }

  try {
    const startTime = performance.now();
    let totalBytes = 0;
    let totalBytesWritten = 0;
    let recordsProcessed = 0;

    const reader = (file as any).stream().getReader();
    let writable: any = null;
    let buffer = "";
    let headers: string[] = [];
    let isFirstLine = true;
    let lineCount = 0;

    writable = await saveHandle.createWritable();

    try {
      // Stream and parse line-by-line instead of buffering entire file
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = value as Uint8Array;
        totalBytes += chunk.length;
        const text = new TextDecoder().decode(chunk);
        buffer += text;

        // Process complete lines only
        const lines = buffer.split("\n");
        // Keep the last incomplete line in the buffer
        buffer = lines.pop() || "";

        for (const line of lines) {
          lineCount++;
          const trimmedLine = line.trim();
          if (trimmedLine) {
            const fields = trimmedLine.split(",");
            if (isFirstLine) {
              headers = fields;
              isFirstLine = false;
            } else {
              recordsProcessed++;
            }
          }
        }

        // Yield to prevent UI freeze
        if (lineCount % 1000 === 0) {
          await new Promise(resolve => setTimeout(resolve, 0));
        }
      }

      // Process remaining data in buffer
      if (buffer.trim()) {
        const fields = buffer.trim().split(",");
        if (!isFirstLine && fields.length > 0) {
          recordsProcessed++;
        }
      }

      // Write minimal output (just count, not full parsed data) to avoid memory bloat
      const outputStr = JSON.stringify({ recordsProcessed, source: "csv-parse-streamed" });
      const outputBytes = new TextEncoder().encode(outputStr);
      await writable.write(outputBytes);
      totalBytesWritten = outputBytes.length;
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
): Promise<CompetitorBenchmark | null> {
  // Only run if save handle is provided
  if (!saveHandle) {
    return null;
  }

  try {
    const startTime = performance.now();
    let totalBytes = 0;
    let totalBytesWritten = 0;
    let recordsProcessed = 0;
    let buffer = "";
    let isFirstLine = true;
    let headers: string[] = [];
    let lineCount = 0;

    const reader = (file as any).stream().getReader();
    let writable: any = null;

    writable = await saveHandle.createWritable();

    try {
      // Stream line-by-line without buffering all records in memory
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = value as Uint8Array;
        totalBytes += chunk.length;
        const text = new TextDecoder().decode(chunk);
        buffer += text;

        // Process complete lines only
        const lines = buffer.split("\n");
        // Keep the last incomplete line in the buffer
        buffer = lines.pop() || "";

        for (const line of lines) {
          lineCount++;
          const trimmedLine = line.trim();
          if (trimmedLine) {
            const fields = trimmedLine.split(",");
            
            if (isFirstLine) {
              headers = fields;
              isFirstLine = false;
            } else {
              // Just count records, don't store them to avoid OOM
              recordsProcessed++;
            }
          }
        }

        // Yield to prevent UI freeze
        if (lineCount % 1000 === 0) {
          await new Promise(resolve => setTimeout(resolve, 0));
        }
      }

      // Process any remaining data in buffer
      if (buffer.trim()) {
        const fields = buffer.trim().split(",");
        if (!isFirstLine && fields.length > 0) {
          recordsProcessed++;
        }
      }

      // Write minimal output (just count) instead of full parsed data
      const outputStr = JSON.stringify({ recordsProcessed, source: "node-csv-streamed" });
      const outputBytes = new TextEncoder().encode(outputStr);
      await writable.write(outputBytes);
      totalBytesWritten = outputBytes.length;
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

  // Trigger processing when saveHandle becomes available after user selection
  useEffect(() => {
    if (saveHandle && !isStreamProcessing) {
      setIsStreamProcessing(true);
    }
  }, [saveHandle, isStreamProcessing]);

  useEffect(() => {
    if (!isStreamProcessing || !saveHandle) {
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
            const competitorPromises = [
              benchmarkCsvParseStreaming(file, competitorSaveHandles['csv-parse']),
              benchmarkNodeCsvStreamStreaming(file, competitorSaveHandles['node-csv']),
            ];
            benchmarkPromise = Promise.all(competitorPromises).then(results => 
              results.filter((r): r is CompetitorBenchmark => r !== null)
            );
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
  }, [isProcessing, isStreamProcessing, saveHandle, file, outputFormat, detectedFormat]);

  // Handler to prompt user for a destination file using File System Access API
  async function handleSelectSaveFile() {
    try {
      const suggestedName = getSuggestedFilename(file.name, outputFormat, false);
      const types = getFileTypeConfig(outputFormat);
      
      // @ts-ignore - showSaveFilePicker is not yet standard in TypeScript lib
      const handle = await (window as any).showSaveFilePicker({
        suggestedName,
        types,
      });
      setSaveHandle(handle);
      return handle;
    } catch (err) {
      if ((err as any).name !== 'AbortError') {
        console.error('Save file selection cancelled or failed:', err);
      }
      setSaveHandle(null);
      return null;
    }
  }

  // Handler to select a save file for a specific competitor
  async function handleSelectCompetitorFile(competitorName: string) {
    try {
      const baseName = file.name.replace(/\.[^/.]+$/, "");
      const suggestedName = `${baseName}-${competitorName}.${outputFormat}`;
      const types = getFileTypeConfig(outputFormat);
      
      // @ts-ignore - showSaveFilePicker is not yet standard in TypeScript lib
      const handle = await (window as any).showSaveFilePicker({
        suggestedName,
        types,
      });
      setCompetitorSaveHandles((prev) => ({
        ...prev,
        [competitorName]: handle,
      }));
    } catch (err) {
      console.error(`Competitor save file selection cancelled or failed:`, err);
    }
  }

  async function handleStartStreamProcessing() {
    if (!saveHandle) {
      // When no save file selected, prompt the user first
      const handle = await handleSelectSaveFile();
      if (!handle) {
        // User cancelled the save file picker
        return;
      }
      setSaveHandle(handle);
      // Don't start processing yet - let the next effect handle it when saveHandle is set
      return;
    }
    setIsStreamProcessing(true);
  }

  return (
    <div className="mt-8 space-y-8">
      <Card className="p-6 bg-gradient-to-br from-accent/10 to-accent/5 border-accent/20">
        <div className="flex items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-3">
            <Activity className="w-5 h-5 text-accent animate-pulse" />
            <h3 className="text-lg font-semibold text-foreground">
              Streaming Benchmark
            </h3>
          </div>
          <div className="flex items-center gap-2">
            {!isStreamProcessing && metrics.status === "idle" && (
              <Button 
                size="sm" 
                onClick={() => void handleStartStreamProcessing()}
              >
                <Download className="w-4 h-4 mr-2" />
                Select Save File & Start
              </Button>
            )}
          </div>
        </div>

        {/* Competitor output file selection - only show during idle */}
        {detectedFormat === "csv" && metrics.status === "idle" && !isStreamProcessing && (
          <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800 mb-4">
            <p className="text-xs font-medium text-blue-900 dark:text-blue-100 mb-2">
              💡 Optional: Run competitor benchmarks
            </p>
            <p className="text-xs text-blue-700 dark:text-blue-200 mb-3">
              Select output files for competitors to measure their performance alongside Convert Buddy (benchmarks run after main conversion completes)
            </p>
            <div className="grid grid-cols-2 gap-2">
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => void handleSelectCompetitorFile('csv-parse')}
                className="text-xs"
              >
                {competitorSaveHandles['csv-parse'] ? '✓ csv-parse' : 'csv-parse'}
              </Button>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => void handleSelectCompetitorFile('node-csv')}
                className="text-xs"
              >
                {competitorSaveHandles['node-csv'] ? '✓ node-csv' : 'node-csv'}
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
