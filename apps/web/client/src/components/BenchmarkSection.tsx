import { useMemo, useState } from "react";
import { TrendingUp } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";

interface BenchmarkResult {
  tool: string;
  conversion: string;
  size: string;
  dataset: string;
  throughputMbps: number;
  latencyMs: number;
  memoryMb: number;
  recordsPerSec: number;
}

// Import benchmark data
const benchmarkData: BenchmarkResult[] = [
  {
    tool: "convert-buddy",
    conversion: "CSV→NDJSON",
    size: "small",
    dataset: "0.12 MB",
    throughputMbps: 9.03,
    latencyMs: 12.87,
    memoryMb: 0.27,
    recordsPerSec: 77680,
  },
  {
    tool: "PapaParse",
    conversion: "CSV→NDJSON",
    size: "small",
    dataset: "0.12 MB",
    throughputMbps: 3.77,
    latencyMs: 30.82,
    memoryMb: 1.9,
    recordsPerSec: 32479,
  },
  {
    tool: "csv-parse",
    conversion: "CSV→NDJSON",
    size: "small",
    dataset: "0.12 MB",
    throughputMbps: 4.03,
    latencyMs: 28.87,
    memoryMb: 2.6,
    recordsPerSec: 34637,
  },
  {
    tool: "fast-csv",
    conversion: "CSV→NDJSON",
    size: "small",
    dataset: "0.12 MB",
    throughputMbps: 3.07,
    latencyMs: 37.81,
    memoryMb: 3.11,
    recordsPerSec: 26450,
  },
  {
    tool: "convert-buddy",
    conversion: "CSV→NDJSON",
    size: "medium",
    dataset: "1.26 MB",
    throughputMbps: 56.47,
    latencyMs: 22.26,
    memoryMb: 0.02,
    recordsPerSec: 449315,
  },
  {
    tool: "PapaParse",
    conversion: "CSV→NDJSON",
    size: "medium",
    dataset: "1.26 MB",
    throughputMbps: 7.29,
    latencyMs: 172.31,
    memoryMb: 39.77,
    recordsPerSec: 58041,
  },
  {
    tool: "csv-parse",
    conversion: "CSV→NDJSON",
    size: "medium",
    dataset: "1.26 MB",
    throughputMbps: 10.89,
    latencyMs: 115.39,
    memoryMb: 10.61,
    recordsPerSec: 86661,
  },
  {
    tool: "fast-csv",
    conversion: "CSV→NDJSON",
    size: "medium",
    dataset: "1.26 MB",
    throughputMbps: 8.43,
    latencyMs: 149.01,
    memoryMb: 5.35,
    recordsPerSec: 67108,
  },
  {
    tool: "convert-buddy",
    conversion: "CSV→NDJSON",
    size: "large",
    dataset: "13.52 MB",
    throughputMbps: 66.04,
    latencyMs: 204.73,
    memoryMb: -61.25,
    recordsPerSec: 488440,
  },
  {
    tool: "PapaParse",
    conversion: "CSV→NDJSON",
    size: "large",
    dataset: "13.52 MB",
    throughputMbps: 9.4,
    latencyMs: 1438.83,
    memoryMb: 112.58,
    recordsPerSec: 69502,
  },
  {
    tool: "csv-parse",
    conversion: "CSV→NDJSON",
    size: "large",
    dataset: "13.52 MB",
    throughputMbps: 19.71,
    latencyMs: 685.82,
    memoryMb: 70.99,
    recordsPerSec: 145812,
  },
  {
    tool: "fast-csv",
    conversion: "CSV→NDJSON",
    size: "large",
    dataset: "13.52 MB",
    throughputMbps: 13.41,
    latencyMs: 1007.84,
    memoryMb: 90.91,
    recordsPerSec: 99222,
  },
  {
    tool: "convert-buddy",
    conversion: "XML→NDJSON",
    size: "small",
    dataset: "0.36 MB",
    throughputMbps: 48.46,
    latencyMs: 7.49,
    memoryMb: 0.02,
    recordsPerSec: 133424,
  },
  {
    tool: "fast-xml-parser",
    conversion: "XML→NDJSON",
    size: "small",
    dataset: "0.36 MB",
    throughputMbps: 8.18,
    latencyMs: 44.4,
    memoryMb: 8.76,
    recordsPerSec: 22525,
  },
  {
    tool: "convert-buddy",
    conversion: "XML→NDJSON",
    size: "medium",
    dataset: "3.74 MB",
    throughputMbps: 82.18,
    latencyMs: 45.47,
    memoryMb: 0.06,
    recordsPerSec: 219940,
  },
  {
    tool: "fast-xml-parser",
    conversion: "XML→NDJSON",
    size: "medium",
    dataset: "3.74 MB",
    throughputMbps: 15.38,
    latencyMs: 242.93,
    memoryMb: 37.49,
    recordsPerSec: 41164,
  },
  {
    tool: "convert-buddy",
    conversion: "XML→NDJSON",
    size: "large",
    dataset: "38.41 MB",
    throughputMbps: 83.97,
    latencyMs: 457.43,
    memoryMb: -90.71,
    recordsPerSec: 218615,
  },
  {
    tool: "fast-xml-parser",
    conversion: "XML→NDJSON",
    size: "large",
    dataset: "38.41 MB",
    throughputMbps: 13.08,
    latencyMs: 2935.79,
    memoryMb: 403.79,
    recordsPerSec: 34062,
  },
];

type MetricType = "throughputMbps" | "latencyMs" | "memoryMb" | "recordsPerSec";

interface MetricConfig {
  key: MetricType;
  label: string;
  unit: string;
  format: (value: number) => string;
  isHigherBetter: boolean;
}

const metricConfigs: Record<MetricType, MetricConfig> = {
  throughputMbps: {
    key: "throughputMbps",
    label: "Throughput",
    unit: "MB/s",
    format: (v) => v.toFixed(2),
    isHigherBetter: true,
  },
  latencyMs: {
    key: "latencyMs",
    label: "Latency",
    unit: "ms",
    format: (v) => v.toFixed(2),
    isHigherBetter: false,
  },
  memoryMb: {
    key: "memoryMb",
    label: "Memory",
    unit: "MB",
    format: (v) => v.toFixed(2),
    isHigherBetter: false,
  },
  recordsPerSec: {
    key: "recordsPerSec",
    label: "Records/sec",
    unit: "records/s",
    format: (v) => (v === 0 ? "N/A" : v.toFixed(0)),
    isHigherBetter: true,
  },
};

export default function BenchmarkSection() {
  const [selectedConversion, setSelectedConversion] = useState<string>("CSV→NDJSON");
  const [selectedSize, setSelectedSize] = useState<string>("medium");
  const [selectedMetric, setSelectedMetric] = useState<MetricType>("throughputMbps");

  // Get unique conversions and sizes
  const conversions = useMemo(
    () => Array.from(new Set(benchmarkData.map((b) => b.conversion))),
    []
  );
  const sizes = useMemo(
    () =>
      Array.from(
        new Set(
          benchmarkData
            .filter((b) => b.conversion === selectedConversion)
            .map((b) => b.size)
        )
      ).sort((a, b) => {
        const order = { small: 0, medium: 1, large: 2 };
        return (order[a as keyof typeof order] || 0) - (order[b as keyof typeof order] || 0);
      }),
    [selectedConversion]
  );

  // Filter data for current selection
  const filteredData = useMemo(
    () =>
      benchmarkData.filter(
        (b) =>
          b.conversion === selectedConversion &&
          b.size === selectedSize
      ),
    [selectedConversion, selectedSize]
  );

  // Get min/max for the selected metric
  const metricConfig = metricConfigs[selectedMetric];
  const metricValues = filteredData.map((d) => d[selectedMetric]);
  const minValue = Math.min(...metricValues);
  const maxValue = Math.max(...metricValues);
  const range = maxValue - minValue || 1;

  // Get bar width based on value
  const getBarWidth = (value: number): number => {
    if (metricConfig.isHigherBetter) {
      return ((value - minValue) / range) * 100;
    } else {
      return ((maxValue - value) / range) * 100;
    }
  };

  const getBarColor = (tool: string): string => {
    if (tool === "convert-buddy") return "bg-accent";
    return "bg-secondary";
  };

  return (
    <section className="py-16 px-4 bg-secondary/30 rounded-lg">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-12 text-center">
          <div className="inline-flex items-center gap-2 mb-4 px-4 py-2 bg-white/80 rounded-full border border-border">
            <TrendingUp className="w-4 h-4 text-accent" />
            <span className="text-sm font-medium text-foreground">Performance Benchmarks</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-foreground" style={{ fontFamily: 'Poppins' }}>
            Speed Comparison
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            See how Convert Buddy compares against popular JavaScript parsing libraries
          </p>
        </div>

        {/* Controls */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Conversion
            </label>
            <Select value={selectedConversion} onValueChange={setSelectedConversion}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {conversions.map((conversion) => (
                  <SelectItem key={conversion} value={conversion}>
                    {conversion}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              File Size
            </label>
            <Select value={selectedSize} onValueChange={setSelectedSize}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {sizes.map((size) => (
                  <SelectItem key={size} value={size}>
                    {size.charAt(0).toUpperCase() + size.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Metric
            </label>
            <Select value={selectedMetric} onValueChange={(value) => setSelectedMetric(value as MetricType)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(metricConfigs).map(([key, config]) => (
                  <SelectItem key={key} value={key}>
                    {config.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Results */}
        <Card className="p-8">
          <div className="space-y-6">
            {filteredData.map((result) => {
              const isConvertBuddy = result.tool === "convert-buddy";
              const barWidth = getBarWidth(result[selectedMetric]);
              const metricValue = result[selectedMetric];
              const formattedValue = metricConfig.format(metricValue);

              return (
                <div key={`${result.tool}-${result.size}`} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className={`text-sm font-medium ${isConvertBuddy ? 'text-accent font-bold' : 'text-foreground'}`}>
                      {result.tool}
                    </span>
                    <span className="text-sm font-semibold text-foreground">
                      {formattedValue} {metricConfig.unit}
                    </span>
                  </div>
                  <div className="w-full h-8 bg-secondary rounded-lg overflow-hidden">
                    <div
                      className={`h-full rounded-lg flex items-center px-2 transition-all duration-300 ${getBarColor(result.tool)}`}
                      style={{ width: `${Math.max(barWidth, 5)}%` }}
                    >
                      {barWidth > 20 && (
                        <span className="text-xs font-bold text-white whitespace-nowrap">
                          {isConvertBuddy ? "✓" : ""}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Dataset Info */}
          <div className="mt-8 pt-6 border-t border-border">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground mb-1">Conversion Type</p>
                <p className="font-semibold text-foreground">{selectedConversion}</p>
              </div>
              <div>
                <p className="text-muted-foreground mb-1">File Size Category</p>
                <p className="font-semibold text-foreground capitalize">{selectedSize}</p>
              </div>
              <div>
                <p className="text-muted-foreground mb-1">Dataset</p>
                <p className="font-semibold text-foreground">
                  {filteredData[0]?.dataset || "—"}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground mb-1">Libraries Tested</p>
                <p className="font-semibold text-foreground">{filteredData.length}</p>
              </div>
            </div>
          </div>
        </Card>

        {/* Legend */}
        <div className="mt-6 flex flex-wrap gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-accent"></div>
            <span className="text-muted-foreground">Convert Buddy</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-secondary"></div>
            <span className="text-muted-foreground">Competitors</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">
              {metricConfig.isHigherBetter ? "Higher is better" : "Lower is better"}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
