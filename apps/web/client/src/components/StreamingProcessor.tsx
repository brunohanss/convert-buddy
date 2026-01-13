import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { AlertCircle, CheckCircle2, Zap } from "lucide-react";
import { isFileSystemAccessSupported, formatBytes, formatTime, type StreamingProgress, type StreamingResult } from "@/lib/streamingProcessor";
import { streamProcessFileInWorkerToWritable, autoDetectConfig } from "convert-buddy-js/browser";
import type { Format, XmlConfig } from "convert-buddy-js";
import { showFileCompletionToast } from "@/components/FileCompletionToast";

interface StreamingProcessorProps {
  file: File;
  outputFormat: Format;
  onComplete?: (result: StreamingResult) => void;
}

/**
 * StreamingProcessor Component
 * Design: Kinetic Minimalism - Real-time streaming progress with animated metrics
 * - Live throughput counter
 * - Animated progress bar
 * - Detailed metrics display
 * 
 * NOTE: Format changes are NOT allowed during or after streaming to prevent
 * accidental data corruption (writing different format to previous output file).
 * User must complete the flow (which resets state) before changing format.
 */

export default function StreamingProcessor({ file, outputFormat, onComplete }: StreamingProcessorProps) {
  const [progress, setProgress] = useState<StreamingProgress>({
    bytesRead: 0,
    bytesWritten: 0,
    totalBytes: file.size,
    percentComplete: 0,
    throughputMbPerSec: 0,
    elapsedSeconds: 0,
    estimatedSecondsRemaining: 0,
    recordsProcessed: 0,
    status: "idle",
  });

  const [result, setResult] = useState<StreamingResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasStartedProcessing, setHasStartedProcessing] = useState(false);
  const [saveHandle, setSaveHandle] = useState<any | null>(null);
  const [detectedFormat, setDetectedFormat] = useState<Format | null>(null);
  const [detectedXmlConfig, setDetectedXmlConfig] = useState<XmlConfig | null>(null);

  const handleStartProcessing = async () => {
    if (!isFileSystemAccessSupported()) {
      setProgress(prev => ({
        ...prev,
        status: "error",
        error: "File System Access API not supported in your browser. Please use Chrome, Edge, or Opera.",
      }));
      return;
    }

    // Prompt user for save file location if not already done
    let handle = saveHandle;
    if (!handle) {
      try {
        const nameWithoutExt = file.name.split(".").slice(0, -1).join(".");
        const suggestedName = `${nameWithoutExt}.${outputFormat}`;
        const types = [
          {
            description: `${outputFormat.toUpperCase()} files`,
            accept: {
              "text/plain": [`.${outputFormat}`],
            },
          },
        ];

        // @ts-ignore - showSaveFilePicker is not standard yet
        handle = await (window as any).showSaveFilePicker({
          suggestedName,
          types,
        });
        
        setSaveHandle(handle);
      } catch (err: any) {
        if (err?.name !== 'AbortError') {
          setProgress(prev => ({
            ...prev,
            status: "error",
            error: "Failed to select save location. Please try again.",
          }));
        }
        return;
      }
    }

    setIsProcessing(true);
    setHasStartedProcessing(true);
    setProgress({
      bytesRead: 0,
      bytesWritten: 0,
      totalBytes: file.size,
      percentComplete: 0,
      throughputMbPerSec: 0,
      elapsedSeconds: 0,
      estimatedSecondsRemaining: 0,
      recordsProcessed: 0,
      status: "reading",
    });

    // Detect input format and config BEFORE streaming
    // This is necessary because:
    // 1. The streaming worker needs the inputFormat to route to the correct parser
    // 2. XML files need the recordElement config to parse correctly
    // 3. Auto-detection in the worker works but may produce suboptimal results
    //    without full file context for complex formats like XML
    // By detecting upfront, we ensure accurate parsing on the first pass
    let startTime = performance.now();
    let totalBytes = file.size;
    let totalBytesWritten = 0;

    try {
      // Sample the file to detect format and config
      const chunk = file.slice(0, 8192); // 8KB sample
      const arrayBuffer = await chunk.arrayBuffer();
      const sample = new Uint8Array(arrayBuffer);
      
      const detected = await autoDetectConfig(sample);
      const inputFormat = (detected.format as Format) || "auto";
      const xmlConfig = detected.xmlConfig || null;
      
      setDetectedFormat(inputFormat);
      setDetectedXmlConfig(xmlConfig);

      // Create writable stream from file handle
      const writable = await handle.createWritable();

      try {
        await streamProcessFileInWorkerToWritable(
          file,
          writable,
          { 
            inputFormat,
            outputFormat,
            xmlConfig: xmlConfig || undefined
          },
          (progress) => {
            // Calculate throughput and elapsed/remaining time
            const now = performance.now();
            const elapsedSeconds = (now - startTime) / 1000;
            const bytesRead = progress.bytesRead;
            const throughputMbPerSec = (bytesRead / (1024 * 1024)) / Math.max(elapsedSeconds, 0.1);
            const percentComplete = (bytesRead / totalBytes) * 100;
            const estimatedSecondsRemaining =
              bytesRead > 0
                ? ((totalBytes - bytesRead) / (bytesRead / elapsedSeconds))
                : 0;
            totalBytesWritten = progress.bytesWritten;
            setProgress({
              bytesRead,
              bytesWritten: progress.bytesWritten,
              totalBytes,
              percentComplete,
              throughputMbPerSec,
              elapsedSeconds,
              estimatedSecondsRemaining,
              recordsProcessed: progress.recordsProcessed,
              status: percentComplete >= 100 ? "complete" : "processing",
            });
          }
        );
      } catch (error) {
        // Clean up writable if error occurs
        try {
          await writable.abort();
        } catch {}
        throw error;
      }

      // After completion, set result summary
      const totalTimeSeconds = (performance.now() - startTime) / 1000;
      const averageThroughputMbPerSec = (totalBytesWritten / (1024 * 1024)) / Math.max(totalTimeSeconds, 0.1);
      
      const nameWithoutExt = file.name.split(".").slice(0, -1).join(".");
      const outputFileName = `${nameWithoutExt}.${outputFormat}`;
      
      const resultData: StreamingResult = {
        success: true,
        totalBytesRead: file.size,
        totalBytesWritten,
        totalRecordsProcessed: progress.recordsProcessed,
        totalTimeSeconds,
        averageThroughputMbPerSec,
        outputFileName,
        outputFormat,
      };
      
      setResult(resultData);

      // Show file completion toast
      showFileCompletionToast({
        fileName: outputFileName,
        format: outputFormat,
        fileSize: totalBytesWritten,
        fileHandle: handle,
        showPath: true,
      });

      // Don't call onComplete here - let user manually click "Done" button
      // onComplete?.(resultData);
    } catch (error: any) {
      setProgress((prev) => ({
        ...prev,
        status: "error",
        error: error?.message || "Unknown error",
      }));
    } finally {
      setIsProcessing(false);
    }
  };

  const isSupported = isFileSystemAccessSupported();

  return (
    <div className="space-y-6">
      {/* File Info */}
      <div className="bg-white rounded-lg p-6 border border-border">
        <h3 className="text-lg font-semibold text-foreground mb-4">Stream Processing</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div>
            <p className="text-sm text-muted-foreground mb-1">File Name</p>
            <p className="font-medium text-foreground">{file.name}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-1">File Size</p>
            <p className="font-medium text-foreground">{formatBytes(file.size)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-1">Output Format</p>
            <p className="font-medium text-foreground uppercase">{outputFormat}</p>
          </div>
        </div>

        {/* Format Change Warning */}
        {hasStartedProcessing && (
          <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
            <p className="text-sm font-medium text-amber-900 dark:text-amber-100 mb-2">
              ⚠️ Format Locked
            </p>
            <p className="text-xs text-amber-700 dark:text-amber-200">
              The output format cannot be changed during or after streaming. To convert to a different format, please complete this process and upload the file again.
            </p>
          </div>
        )}

        {/* Browser Support Warning */}
        {!isSupported && (
          <div className="mb-6 p-4 bg-destructive/10 rounded-lg border border-destructive/20 flex gap-3">
            <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-destructive mb-1">Browser Not Supported</p>
              <p className="text-sm text-destructive/80">
                File System Access API is required. Please use Chrome, Edge, or Opera.
              </p>
            </div>
          </div>
        )}

        {/* Start Button */}
        {!isProcessing && !result && (
          <Button 
            onClick={handleStartProcessing}
            disabled={!isSupported}
            className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
          >
            <Zap className="w-4 h-4 mr-2" />
            Start Stream Processing
          </Button>
        )}
      </div>

      {/* Progress Display */}
      {(isProcessing || result) && (
        <div className="bg-white rounded-lg p-6 border border-border space-y-6">
          {/* Status Header */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-foreground">
                {progress.status === "complete" ? "Processing Complete" : "Processing..."}
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                {progress.status === "error" ? "An error occurred" : `${Math.round(progress.percentComplete)}% complete`}
              </p>
            </div>
            {progress.status === "complete" && (
              <CheckCircle2 className="w-8 h-8 text-green-500" />
            )}
            {progress.status === "error" && (
              <AlertCircle className="w-8 h-8 text-destructive" />
            )}
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <Progress value={progress.percentComplete} className="h-2" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{formatBytes(progress.bytesRead)}</span>
              <span>{formatBytes(progress.totalBytes)}</span>
            </div>
          </div>

          {/* Real-time Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-secondary/50 rounded-lg p-4">
              <p className="text-xs text-muted-foreground mb-1">Throughput</p>
              <p className="text-2xl font-bold text-accent" style={{ fontFamily: 'Poppins' }}>
                {Math.round(progress.throughputMbPerSec)}
              </p>
              <p className="text-xs text-muted-foreground">MB/s</p>
            </div>

            <div className="bg-secondary/50 rounded-lg p-4">
              <p className="text-xs text-muted-foreground mb-1">Elapsed</p>
              <p className="text-2xl font-bold text-primary" style={{ fontFamily: 'Poppins' }}>
                {formatTime(progress.elapsedSeconds)}
              </p>
            </div>

            <div className="bg-secondary/50 rounded-lg p-4">
              <p className="text-xs text-muted-foreground mb-1">Remaining</p>
              <p className="text-2xl font-bold text-foreground" style={{ fontFamily: 'Poppins' }}>
                {formatTime(progress.estimatedSecondsRemaining)}
              </p>
            </div>

            <div className="bg-secondary/50 rounded-lg p-4">
              <p className="text-xs text-muted-foreground mb-1">Records</p>
              <p className="text-2xl font-bold text-foreground" style={{ fontFamily: 'Poppins' }}>
                {progress.recordsProcessed.toLocaleString()}
              </p>
            </div>
          </div>

          {/* Detailed Stats */}
          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Bytes Read</p>
              <p className="font-medium text-foreground">{formatBytes(progress.bytesRead)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Bytes Written</p>
              <p className="font-medium text-foreground">{formatBytes(progress.bytesWritten)}</p>
            </div>
          </div>

          {/* Error Message */}
          {progress.error && (
            <div className="p-4 bg-destructive/10 rounded-lg border border-destructive/20">
              <p className="text-sm text-destructive font-medium">Error</p>
              <p className="text-sm text-destructive/80 mt-1">{progress.error}</p>
            </div>
          )}

          {/* Result Summary */}
          {result && (
            <div className="space-y-4 pt-4 border-t border-border">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Total Time</p>
                  <p className="font-medium text-foreground">{formatTime(result.totalTimeSeconds)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Average Throughput</p>
                  <p className="font-medium text-foreground">{Math.round(result.averageThroughputMbPerSec)} MB/s</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Total Records</p>
                  <p className="font-medium text-foreground">{result.totalRecordsProcessed.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Output File</p>
                  <p className="font-medium text-foreground truncate">{result.outputFileName}</p>
                </div>
              </div>

              {result.success && (
                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <p className="text-sm text-green-700 font-medium">✓ File processed successfully!</p>
                  <p className="text-xs text-green-600 mt-1">
                    {formatBytes(result.totalBytesRead)} converted to {formatBytes(result.totalBytesWritten)} in {formatTime(result.totalTimeSeconds)}
                  </p>
                  <p className="text-xs text-green-600 mt-2">
                    <strong>File:</strong> {result.outputFileName}
                  </p>
                  <p className="text-xs text-green-600 mt-1">
                    <strong>Average Throughput:</strong> {Math.round(result.averageThroughputMbPerSec)} MB/s
                  </p>
                  <div className="mt-4">
                    <Button
                      onClick={() => {
                        onComplete?.(result);
                      }}
                      className="w-full bg-green-600 hover:bg-green-700 text-white"
                    >
                      Done - Back to File Upload
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
