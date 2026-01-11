import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { AlertCircle, Activity, Zap, Download } from "lucide-react";
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
    // Ensure a minimal Buffer shim exists in browsers so csv-parse's
    // module initialization doesn't throw when it references Buffer.
    // The shim provides `Buffer.from(...)` and `Buffer.isBuffer(...)` used
    // by some Node-targeted libraries; it intentionally returns Uint8Array
    // or lightweight wrappers sufficient for parsing text inputs.
    if (typeof (globalThis as any).Buffer === "undefined") {
      // Minimal Buffer shim backed by Uint8Array. This provides the small
      // subset of Buffer functionality used by some libraries: `from`,
      // `concat`, `isBuffer`, and `toString` on returned objects.
      class ShimBuffer extends Uint8Array {
        toString(encoding?: string) {
          // We only support utf-8 text decoding in the browser shim
          return new TextDecoder(encoding || "utf-8").decode(this);
        }
        static from(input: any, encoding?: string) {
          if (typeof input === "string") {
            const enc = new TextEncoder();
            return new ShimBuffer(enc.encode(input));
          }
          if (input instanceof Uint8Array) {
            return new ShimBuffer(input);
          }
          if (Array.isArray(input)) {
            return new ShimBuffer(new Uint8Array(input));
          }
          // Last resort
          const str = String(input ?? "");
          return ShimBuffer.from(str, encoding);
        }
        static concat(list: Uint8Array[]) {
          const total = list.reduce((sum, arr) => sum + arr.length, 0);
          const out = new ShimBuffer(new Uint8Array(total));
          let offset = 0;
          for (const arr of list) {
            out.set(arr, offset);
            offset += arr.length;
          }
          return out;
        }
        static compare(a: Uint8Array | ShimBuffer, b: Uint8Array | ShimBuffer) {
          // Return -1, 0, or 1 similar to Node's Buffer.compare
          const la = a.length;
          const lb = b.length;
          const len = Math.min(la, lb);
          for (let i = 0; i < len; i++) {
            const va = a[i];
            const vb = b[i];
            if (va !== vb) return va < vb ? -1 : 1;
          }
          if (la === lb) return 0;
          return la < lb ? -1 : 1;
        }
        static isBuffer(obj: any) {
          return obj instanceof Uint8Array || obj instanceof ShimBuffer;
        }
        static alloc(size: number, fill?: number) {
          const out = new ShimBuffer(new Uint8Array(size));
          if (typeof fill === 'number') out.fill(fill);
          return out;
        }
        static allocUnsafe(size: number) {
          // Return a buffer of the requested length. For safety in browsers
          // we initialize to zeros (allocUnsafe in Node returns uninitialized memory).
          return ShimBuffer.alloc(size, 0);
        }
      }

      (globalThis as any).Buffer = ShimBuffer as any;
    }

    // Try the browser-friendly ESM build first, then fall back to the sync entry
    let parse: any;
    try {
      const mod = await import("csv-parse/browser/esm");
      parse = (mod as any).parse as any;
    } catch {
      const csvParse = await import("csv-parse/sync");
      parse = csvParse.parse as any;
    }

    const startTime = performance.now();
    const text = new TextDecoder().decode(fileBytes);

    // Helper to invoke parse in multiple modes: direct return, callback-style,
    // or stream-like parser that emits 'data'/'readable'/'end' events.
    async function invokeParse(textInput: string, options: any) {
      // Try direct/callback/stream patterns
      // 1) direct: parse(text, opts) -> array or object
      // 2) callback: parse(text, opts, cb)
      // 3) stream-like: const p = parse(opts); p.on('data'...); p.write(text); p.end();

      // Try direct call first
      try {
        const maybe = parse(textInput, options);
        // If it returned a Promise, await it
        if (maybe && typeof maybe.then === 'function') {
          return await maybe;
        }

        // If it's an array or object, return it
        if (Array.isArray(maybe) || (maybe && typeof maybe === 'object' && !maybe.on)) {
          return maybe;
        }

        // If it's stream-like (has .on), collect data
        if (maybe && typeof maybe.on === 'function') {
          return await new Promise((resolve, reject) => {
            const out: any[] = [];
            maybe.on('readable', () => {
              try {
                let r;
                while ((r = maybe.read()) !== null) out.push(r);
              } catch (e) {
                // ignore
              }
            });
            maybe.on('data', (d: any) => out.push(d));
            maybe.on('end', () => resolve(out));
            maybe.on('error', (err: any) => reject(err));
            try {
              if (typeof maybe.write === 'function') {
                maybe.write(textInput);
                if (typeof maybe.end === 'function') maybe.end();
              }
            } catch (e) {
              // ignore
            }
          });
        }
      } catch (err) {
        // If parse supports callback form (parse(text, opts, cb))
        if (typeof parse === 'function' && parse.length >= 3) {
          return await new Promise((resolve, reject) => {
            try {
              parse(textInput, options, (err2: any, out: any) => {
                if (err2) return reject(err2);
                resolve(out);
              });
            } catch (e) {
              reject(e);
            }
          });
        }
        throw err;
      }

      // Fallback empty
      return [];
    }

    // Normalize into records array
    const normalizeRaw = (r: any) => {
      if (Array.isArray(r)) return r;
      if (r && typeof r === 'object') {
        if (Array.isArray(r.records)) return r.records;
        if (Array.isArray(r.data)) return r.data;
        try {
          if (typeof r[Symbol.iterator] === 'function') return Array.from(r as Iterable<any>);
        } catch {}
      }
      return [];
    };

    let raw: any = [];
    try {
      raw = await invokeParse(text, { columns: true, skip_empty_lines: true });
    } catch (err) {
      // If the parser threw 'Invalid Record Length' synchronously or asynchronously,
      // attempt relaxed strategies.
      const msg = err && err.message ? String(err.message) : String(err);
      if (msg.includes('Invalid Record Length') || msg.includes('Invalid Record')) {
        try {
          raw = await invokeParse(text, { columns: true, relax_column_count: true, skip_empty_lines: true });
        } catch (err2) {
          // final fallback: parse without columns to retrieve raw rows
          try {
            raw = await invokeParse(text, { columns: false, skip_empty_lines: true });
          } catch (err3) {
            console.error('csv-parse fallback attempts failed:', err, err2, err3);
            raw = [];
          }
        }
      } else {
        console.error('csv-parse initial parse error:', err);
        raw = [];
      }
    }

    let records: any[] = normalizeRaw(raw);

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

// Benchmark fast-csv (not browser-friendly) - return explanatory error
async function benchmarkFastCsv(_fileBytes: Uint8Array): Promise<CompetitorBenchmark> {
  return {
    name: "fast-csv",
    throughputMbPerSec: 0,
    latencyMs: 0,
    error: "Only for node.js instead",
  };
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
  hasSelectedSavePath?: boolean;
}

// Constants for streaming
const STREAMING_THRESHOLD = 50 * 1024 * 1024; // 50 MB
const STREAM_CHUNK_SIZE = 5 * 1024 * 1024; // 5 MB chunks

export default function LiveBenchmarkSection({
  file,
  outputFormat,
  isProcessing,
  hasSelectedSavePath = false,
}: LiveBenchmarkSectionProps) {
  const [metrics, setMetrics] = useState<BenchmarkMetrics | null>(null);
  const [progress, setProgress] = useState(0);
  const [detectedFormat, setDetectedFormat] = useState<Format | null>(null);
  const [conversionResult, setConversionResult] = useState<Uint8Array | null>(null);
  const [hasStarted, setHasStarted] = useState(false);
  const [competitorResults, setCompetitorResults] = useState<CompetitorBenchmark[]>([]);
  const [savePathSelected, setSavePathSelected] = useState(false);
  const [saveFileHandle, setSaveFileHandle] = useState<any | null>(null);

  // Handler to select save file
  const handleSelectSaveFile = async () => {
    try {
      const handle = await (window as any).showSaveFilePicker({
        suggestedName: `converted.${detectedFormat || 'bin'}`,
        types: [
          {
            description: "Converted File",
            accept: {
              "application/json": [".json", ".ndjson"],
              "text/csv": [".csv"],
              "application/xml": [".xml"],
            },
          },
        ],
      });
      
      if (handle) {
        setSaveFileHandle(handle);
        setSavePathSelected(true);
      }
    } catch (err) {
      if ((err as any).name !== 'AbortError') {
        console.error('Save file selection error:', err);
      }
    }
  };

  useEffect(() => {
    // Auto-start benchmark when component is rendered
    // For large files, require explicit save file selection first
    // For small files, auto-start immediately
    if (!hasStarted && file) {
      const isLargeFile = file.size > STREAMING_THRESHOLD;
      const canStart = isLargeFile ? (hasSelectedSavePath || savePathSelected) : true;
      
      if (canStart) {
        setHasStarted(true);
      }
    }
  }, [file, hasStarted, hasSelectedSavePath, savePathSelected]);

  useEffect(() => {
    if (!hasStarted || !file) {
      return;
    }

    const runBenchmark = async () => {
      try {
        setProgress(0);
        const isLargeFile = file.size > STREAMING_THRESHOLD;

        // Detect format first (doesn't require loading entire file)
        setProgress(30);
        const detectedFmt = await detectFormat(file.stream());
        setDetectedFormat(detectedFmt as Format);

        // Only load entire file into memory if it's small
        let fileBytes: Uint8Array;
        if (isLargeFile) {
          // For large files, don't load into memory - will use streaming
          fileBytes = new Uint8Array(0); // Empty placeholder
        } else {
          // For small files, load entire file
          const arrayBuffer = await file.arrayBuffer();
          fileBytes = new Uint8Array(arrayBuffer);
        }

        const fileSizeMb = file.size / (1024 * 1024);

        // Convert to target format
        setProgress(50);
        const { ConvertBuddy } = await import("convert-buddy-js");

        // Capture memory RIGHT before conversion
        const initialMemory = (performance as any).memory?.usedJSHeapSize || 0;
        const startConvert = performance.now();
        
        // For benchmarking: use JSON output for fair comparison with competitor parsers
        // which all convert to JSON (arrays of objects)
        const benchmarkOutputFormat = detectedFmt === "csv" ? "json" : outputFormat;
        
        let result: Uint8Array;

        if (isLargeFile && saveFileHandle) {
          // Streaming mode for large files - write directly to file
          console.log(`[Streaming Benchmark] Starting streaming conversion for ${fileSizeMb.toFixed(2)}MB file`);
          
          const { ConvertBuddy } = await import("convert-buddy-js");
          console.log(`[Streaming Benchmark] Creating ConvertBuddy instance (${benchmarkOutputFormat})`);
          
          const buddy = await ConvertBuddy.create({
            outputFormat: benchmarkOutputFormat,
            inputFormat: detectedFmt as Format,
          });
          
          console.log(`[Streaming Benchmark] ConvertBuddy instance ready, starting to stream chunks`);

          let writable: any = null;
          let totalProcessedBytes = 0;
          let chunkCount = 0;
          
          try {
            writable = await saveFileHandle.createWritable();
            const reader = (file as any).stream().getReader();
            try {
              while (true) {
                const { value, done } = await reader.read();
                if (done) {
                  console.log(`[Streaming Benchmark] Finished reading all chunks (${chunkCount} total)`);
                  break;
                }

                chunkCount++;
                const chunk = value as Uint8Array;
                const chunkResult = buddy.push(chunk);
                if (chunkResult.length > 0) {
                  await writable.write(chunkResult);
                }
                totalProcessedBytes += chunk.length;
                
                // Update progress during streaming
                const progressPercent = 50 + ((totalProcessedBytes / file.size) * 30);
                setProgress(Math.min(progressPercent, 80));
                
                // Log every 10 chunks to track progress
                if (chunkCount % 10 === 0) {
                  console.log(`[Streaming Benchmark] Chunk ${chunkCount}: ${(totalProcessedBytes / 1024 / 1024).toFixed(2)}MB processed`);
                }
                
                // Yield to allow UI updates
                await new Promise(resolve => setTimeout(resolve, 0));
              }
            } finally {
              try {
                if ((reader as any).cancel) await (reader as any).cancel();
              } catch {}
            }

            // Finish the conversion to get any remaining output
            const finalResult = buddy.finish();
            if (finalResult.length > 0) {
              await writable.write(finalResult);
            }

            if (writable) {
              await writable.close();
            }

            console.log(`[Streaming Benchmark] Streaming complete: ${chunkCount} chunks, ${totalProcessedBytes} bytes processed`);

            // Return empty result - data was written to file
            result = new Uint8Array(0);
          } catch (streamError) {
            if (writable) {
              try {
                await writable.abort();
              } catch {}
            }
            throw streamError;
          }
        } else if (isLargeFile) {
          // Large file without save handle - shouldn't reach here
          result = new Uint8Array(0);
        } else {
          // Direct mode for small files
          const { ConvertBuddy } = await import("convert-buddy-js");
          const buddy = await ConvertBuddy.create({
            outputFormat: benchmarkOutputFormat,
            inputFormat: detectedFmt as Format,
          });
          
          const output = buddy.push(fileBytes);
          const finalResult = buddy.finish();
          
          // Combine outputs
          result = new Uint8Array(output.length + finalResult.length);
          result.set(output, 0);
          result.set(finalResult, output.length);
        }

        const endConvert = performance.now();

        // Capture memory BEFORE storing result (to exclude result object itself)
        const finalMemory = (performance as any).memory?.usedJSHeapSize || 0;
        const totalTime = (endConvert - startConvert) / 1000; // seconds
        const throughputMbps = fileSizeMb / totalTime;
        const latencyMs = endConvert - startConvert;
        const memoryEstimateMb = (finalMemory - initialMemory) / (1024 * 1024);

        // Store result after measurement
        setConversionResult(result);

        setProgress(80);

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

        // Benchmark competitors for CSV files - only on small files where we have fileBytes
        if (detectedFmt === "csv" && !isLargeFile && fileBytes.length > 0) {
          try {
            const competitorsToRun: Array<() => Promise<CompetitorBenchmark>> = [
              () => benchmarkCsvParse(fileBytes),
              () => benchmarkPapaparse(fileBytes),
              () => benchmarkFastCsv(fileBytes),
            ];

            const results: CompetitorBenchmark[] = [];
            for (const run of competitorsToRun) {
              try {
                // Each benchmark implementation handles its own try/catch and
                // returns an object with error populated on failure.
                const res = await run();
                results.push(res);
              } catch (err) {
                // Fallback if the function itself throws (shouldn't happen)
                console.error('Competitor benchmark threw:', err);
                results.push({
                  name: 'unknown',
                  throughputMbPerSec: 0,
                  latencyMs: 0,
                  error: err instanceof Error ? err.message : String(err),
                });
              }
            }

            // Only include measured results (throughput > 0) or errors to show why
            // a competitor couldn't be run in the current environment.
            setCompetitorResults(results);
          } catch (err) {
            console.error('Competitor benchmarking block error:', err);
            // Continue without competitor results
          }
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
    // For large files, show button to select save file before starting benchmark
    const isLargeFile = file && file.size > STREAMING_THRESHOLD;
    
    if (isLargeFile) {
      return (
        <Card className="p-6 bg-gradient-to-br from-accent/10 to-accent/5 border-accent/20 mt-8">
          <div className="flex items-center gap-3 mb-6">
            <Activity className="w-5 h-5 text-accent" />
            <h3 className="text-lg font-semibold text-foreground">Live Performance Benchmark</h3>
          </div>
          
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Click the button below to select a save path and start the benchmark. This will measure the performance of converting your file.
            </p>
            <Button 
              onClick={() => void handleSelectSaveFile()}
              size="lg"
              className="w-full sm:w-auto"
            >
              <Download className="w-4 h-4 mr-2" />
              Select Save File & Start Benchmark
            </Button>
          </div>
        </Card>
      );
    }
    
    // For small files, don't show anything while preparing
    return null;
  }

  // Use streaming benchmark for large files (> 50 MB)
  const isLargeFile = file.size > STREAMING_THRESHOLD;
  if (isLargeFile) {
    return <StreamingBenchmark file={file} outputFormat={outputFormat} isProcessing={hasStarted} />;
  }

  // Helper to normalize names for matching parser examples to measured competitors
  const normalizeName = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

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
              codeSnippet={getConvertBuddyCode(detectedFormat, detectedFormat === "csv" ? "json" : outputFormat)}
              outputPreview={getOutputPreview(conversionResult, detectedFormat === "csv" ? "json" : outputFormat)}
              outputFormat={detectedFormat === "csv" ? "json" : outputFormat}
            />
          </Card>

          {/* Benchmarked Competitors: render combined card with code + output preview */}
          {competitorResults.map((competitor) => {
            const parserExamples = detectedFormat ? getParsersForFormat(detectedFormat) : [];
            const matchedExample = parserExamples.find(
              (p) => normalizeName(p.name) === normalizeName(competitor.name) ||
                normalizeName(competitor.name).includes(normalizeName(p.name)) ||
                normalizeName(p.name).includes(normalizeName(competitor.name))
            );

            const codeSnippet = matchedExample?.code ?? `// Example code for ${competitor.name} not available.`;

            return (
              <Card key={competitor.name} className="p-6 border border-border opacity-90">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-lg font-semibold text-foreground">{competitor.name}</h3>
                  <p className="text-xs text-muted-foreground">
                    {competitor.error ? (
                      <span className="text-destructive">
                        {normalizeName(competitor.name) === 'fastcsv'
                          ? 'Only for Node.js envs'
                          : 'Error'}
                      </span>
                    ) : (
                      <>
                        {competitor.throughputMbPerSec.toFixed(1)} MB/s • {competitor.latencyMs.toFixed(0)} ms
                      </>
                    )}
                  </p>
                </div>

                <ParserDetailsCollapsible
                  parserName={competitor.name}
                  codeSnippet={codeSnippet}
                  outputPreview={
                    competitor.error
                      ? (normalizeName(competitor.name) === 'fastcsv' ? 'Only for Node.js envs' : competitor.error)
                      : (competitor.outputPreview ?? "")
                  }
                  outputFormat={outputFormat}
                />
              </Card>
            );
          })}

          {/* Other Parsers - Code examples only */}
          {getParsersForFormat(detectedFormat)
            .filter((parser) =>
              !competitorResults.some((c) => normalizeName(c.name) === normalizeName(parser.name))
            )
            .map((parser) => (
              <Card key={parser.name} className="p-6 border border-border opacity-75">
                <h3 className="text-lg font-semibold text-foreground mb-2">{parser.name}</h3>
                <p className="text-xs text-muted-foreground mb-4">{parser.note || "Parser information"}</p>
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
