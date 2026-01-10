import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { AlertCircle, Activity, Zap } from "lucide-react";
import { detectFormat, type Format } from "convert-buddy-js";

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

export default function LiveBenchmarkSection({
  file,
  outputFormat,
  isProcessing,
}: LiveBenchmarkSectionProps) {
  const [metrics, setMetrics] = useState<BenchmarkMetrics | null>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!isProcessing || !file) {
      return;
    }

    const runBenchmark = async () => {
      try {
        setProgress(0);
        const startTime = performance.now();
        const initialMemory = (performance as any).memory?.usedJSHeapSize || 0;

        // Read file
        setProgress(10);
        const arrayBuffer = await file.arrayBuffer();
        const fileBytes = new Uint8Array(arrayBuffer);
        const fileSizeMb = file.size / (1024 * 1024);

        // Detect format
        setProgress(30);
        const detectedFormat = await detectFormat(file.stream());

        // Convert to target format
        setProgress(50);
        const { convert } = await import("convert-buddy-js");

        const startConvert = performance.now();
        const convertOptions: any = {
          outputFormat,
          inputFormat: detectedFormat as Format,
        };

        const result = await convert(fileBytes, convertOptions);
        const endConvert = performance.now();

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

        setProgress(100);
      } catch (error) {
        console.error("Benchmark error:", error);
        setMetrics((prev) => ({
          ...prev,
          isComplete: true,
          error: error instanceof Error ? error.message : "Unknown error",
        } as BenchmarkMetrics));
        setProgress(100);
      }
    };

    void runBenchmark();
  }, [isProcessing, file, outputFormat]);

  if (!isProcessing && !metrics) {
    return null;
  }

  return (
    <div className="mt-8">
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
                    Estimated Performance vs Common Libraries
                  </p>
                  <PerformanceComparison throughput={metrics.throughputMbps} />
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
}

function PerformanceComparison({ throughput }: PerformanceComparisonProps) {
  // Average throughput of common competitors
  const competitors = [
    { name: "PapaParse", avg: 6.8 },
    { name: "csv-parse", avg: 11.5 },
    { name: "fast-csv", avg: 8.3 },
    { name: "fast-xml-parser", avg: 12.2 },
  ];

  const maxThroughput = Math.max(throughput, ...competitors.map((c) => c.avg));

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

      {/* Competitors (estimated) */}
      <div className="space-y-2 mt-4">
        {competitors.map((competitor) => (
          <div key={competitor.name} className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground text-xs">{competitor.name}</span>
              <span className="text-muted-foreground text-xs">{competitor.avg.toFixed(1)} MB/s</span>
            </div>
            <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
              <div
                className="h-full bg-secondary-foreground/40 transition-all duration-500"
                style={{ width: `${(competitor.avg / maxThroughput) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
