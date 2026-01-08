import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { AlertCircle, CheckCircle2, Zap } from "lucide-react";
import { streamProcessFile, isFileSystemAccessSupported, formatBytes, formatTime, type StreamingProgress, type StreamingResult } from "@/lib/streamingProcessor";
import type { Format } from "convert-buddy-js";

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

  const handleStartProcessing = async () => {
    if (!isFileSystemAccessSupported()) {
      setProgress(prev => ({
        ...prev,
        status: "error",
        error: "File System Access API not supported in your browser. Please use Chrome, Edge, or Opera.",
      }));
      return;
    }

    setIsProcessing(true);
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

    const result = await streamProcessFile(
      file,
      (newProgress) => {
        setProgress(newProgress);
      },
      {
        outputFormat,
      }
    );

    setResult(result);
    setIsProcessing(false);
    onComplete?.(result);
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
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
