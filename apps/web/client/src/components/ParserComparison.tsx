import { useEffect, useState } from "react";
import formatBytes from "@/lib/formatBytes";
import { CheckCircle2, XCircle } from "lucide-react";

interface Parser {
  name: string;
  supported: boolean;
  speed: number;
  time: number;
  memoryUsage?: number;
  recordsProcessed?: number;
  success?: boolean;
}

interface ParserComparisonProps {
  results: {
    format: string;
    fileSize: number;
    parsers: Parser[];
    preview: string;
  };
  mode: "check" | "parse" | "upload";
  loading: boolean;
}

/**
 * ParserComparison Component
 * Design: Kinetic Minimalism - Animated performance bars with live counters
 * - Shows each parser's performance metrics
 * - Animated fill bars for visual impact
 * - Live number counters
 * - Red cards for unsupported formats
 */

export default function ParserComparison({ results, mode, loading }: ParserComparisonProps) {
  const [animatedValues, setAnimatedValues] = useState<{ [key: string]: number }>({});

  useEffect(() => {
    // Animate counter values
    const intervals: NodeJS.Timeout[] = [];
    
    results.parsers.forEach((parser, idx) => {
      const key = `${parser.name}-speed`;
      let current = 0;
      const target = parser.speed;
      const increment = target / 30; // Animate over ~30 frames
      
      const interval = setInterval(() => {
        current += increment;
        if (current >= target) {
          current = target;
          clearInterval(interval);
        }
        setAnimatedValues(prev => ({
          ...prev,
          [key]: Math.round(current)
        }));
      }, 16); // ~60fps
      
      intervals.push(interval);
    });

    return () => intervals.forEach(clearInterval);
  }, [results]);

  const maxSpeed = Math.max(...results.parsers.map(p => p.speed));

  return (
    <div className="space-y-6">
      {/* Format Info */}
      <div className="bg-white rounded-lg p-6 border border-border">
        <h3 className="text-lg font-semibold text-foreground mb-4" style={{ fontFamily: 'Poppins' }}>
          {mode === "check" ? "Format Check Results" : "Parsing Benchmark Results"}
        </h3>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div>
            <p className="text-sm text-muted-foreground">Format</p>
            <p className="text-lg font-semibold text-foreground uppercase">{results.format}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">File Size</p>
            <p className="text-lg font-semibold text-foreground">{formatBytes(results.fileSize)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Fastest Parser</p>
            <p className="text-lg font-semibold text-accent">
              {results.parsers.find(p => p.speed === maxSpeed)?.name}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Speed Advantage</p>
            <p className="text-lg font-semibold text-primary">
              {(maxSpeed / Math.min(...results.parsers.filter(p => p.supported).map(p => p.speed))).toFixed(1)}x
            </p>
          </div>
        </div>

        {/* Preview */}
        {mode === "check" && (
          <div className="mt-6 pt-6 border-t border-border">
            <p className="text-sm text-muted-foreground mb-3">File Preview</p>
            <div className="bg-secondary/50 rounded p-4 text-sm font-mono text-foreground overflow-auto max-h-40">
              {results.preview}
            </div>
          </div>
        )}
      </div>

      {/* Parser Cards */}
      <div className="grid gap-4">
        {results.parsers.map((parser) => {
          const speedPercentage = (parser.speed / maxSpeed) * 100;
          const animatedSpeed = animatedValues[`${parser.name}-speed`] ?? 0;

          return (
            <div
              key={parser.name}
              className={`
                bg-white rounded-lg p-6 border transition-all duration-300
                ${!parser.supported 
                  ? "opacity-60 border-destructive/50 relative" 
                  : "border-border hover:shadow-md"
                }
              `}
            >
              {/* Unsupported Badge */}
              {!parser.supported && (
                <div className="absolute top-3 right-3 flex items-center gap-1 text-xs font-semibold text-destructive bg-destructive/10 px-3 py-1 rounded">
                  <XCircle className="w-3 h-3" />
                  Not Supported
                </div>
              )}

              <div className="flex items-start justify-between mb-4">
                <div>
                  <h4 className="font-semibold text-foreground" style={{ fontFamily: 'Poppins' }}>
                    {parser.name}
                  </h4>
                  {parser.supported && (
                    <div className="flex items-center gap-1 mt-1 text-sm text-green-600">
                      <CheckCircle2 className="w-4 h-4" />
                      Format supported
                    </div>
                  )}
                </div>
              </div>

              {parser.supported ? (
                <>
                  {/* Performance Bar */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-muted-foreground">Throughput</span>
                      <span className="text-lg font-bold text-primary metric-counter">
                        {animatedSpeed} MB/s
                      </span>
                    </div>
                    <div className="h-8 bg-secondary rounded-sm overflow-hidden">
                      <div
                        className="h-full rounded-sm transition-all duration-500 ease-out"
                        style={{
                          width: `${speedPercentage}%`,
                          background: parser.name === "Convert Buddy" 
                            ? "linear-gradient(90deg, #0D7377 0%, #FF6B35 100%)"
                            : "linear-gradient(90deg, #0D7377 0%, #0D7377 100%)"
                        }}
                      />
                    </div>
                  </div>

                  {/* Metrics */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Parse Time</p>
                      <p className="font-semibold text-foreground">{parser.time}ms</p>
                    </div>
                    {parser.memoryUsage && (
                      <div>
                        <p className="text-muted-foreground">Memory</p>
                        <p className="font-semibold text-foreground">{parser.memoryUsage} MB</p>
                      </div>
                    )}
                    {parser.recordsProcessed && (
                      <div>
                        <p className="text-muted-foreground">Records</p>
                        <p className="font-semibold text-foreground">{parser.recordsProcessed.toLocaleString()}</p>
                      </div>
                    )}
                    {parser.name === "Convert Buddy" && (
                      <div>
                        <p className="text-muted-foreground">Advantage</p>
                        <p className="font-semibold text-accent">Best</p>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="text-center py-4">
                  <p className="text-muted-foreground text-sm">
                    This parser does not support {results.format.toUpperCase()} format
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Insight */}
      <div className="bg-accent/10 border border-accent/30 rounded-lg p-6">
        <h4 className="font-semibold text-foreground mb-2" style={{ fontFamily: 'Poppins' }}>
          Why Convert Buddy Wins
        </h4>
        <ul className="space-y-2 text-sm text-foreground">
          <li>✓ Optimized WASM core for maximum performance</li>
          <li>✓ Minimal memory footprint with smart buffering</li>
          <li>✓ Streaming architecture for large files</li>
          <li>✓ Zero-copy operations where possible</li>
        </ul>
      </div>
    </div>
  );
}
