import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, Github, Code2, Zap, Flame, Search, Download } from "lucide-react";
import FileUploadZone from "@/components/FileUploadZone";
import ParserComparison from "@/components/ParserComparison";
import StreamingProcessor from "@/components/StreamingProcessor";
import Footer from "@/components/Footer";
import FormatDetection from "@/components/FormatDetection";
import { benchmarkAllParsers, detectFormat as detectFormatHeuristic } from "@/lib/benchmarkParsers";
import { convert, detectCsvFieldsAndDelimiter, detectFormat, type Format } from "convert-buddy-js";

/**
 * Design Philosophy: Kinetic Minimalism with Performance Visualization
 * - Swiss design principles with clear information hierarchy
 * - Animated performance bars and counters
 * - Teal (#0D7377) for stability, Coral (#FF6B35) for speed
 * - Poppins (display) + Inter (body) typography
 */

// Maximum file size for non-streaming operations (10 MB)
const MAX_NON_STREAMING_SIZE = 10 * 1024 * 1024;
const OUTPUT_FORMATS: Format[] = ["csv", "ndjson", "json", "xml"];

export default function Home() {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [mode, setMode] = useState<"upload" | "check" | "parse" | "stream" | "detect">("upload");
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [convertLoading, setConvertLoading] = useState(false);
  const [convertError, setConvertError] = useState<string | null>(null);
  const [outputFormat, setOutputFormat] = useState<Format>("ndjson");
  const [detectResult, setDetectResult] = useState<{
    format: string;
    csv: { delimiter: string; fields: string[] } | null;
  } | null>(null);
  const [detectLoading, setDetectLoading] = useState(false);
  const [detectError, setDetectError] = useState<string | null>(null);
  const isBusy = loading || detectLoading || convertLoading;
  const isFileTooLarge = uploadedFile ? uploadedFile.size > MAX_NON_STREAMING_SIZE : false;

  const handleFileUpload = (file: File) => {
    setUploadedFile(file);
    setMode("upload");
    setResults(null);
    setDetectResult(null);
    setDetectError(null);
    setDetectLoading(false);
    setConvertError(null);
    setConvertLoading(false);
  };

  const handleCheckFormat = async () => {
    if (!uploadedFile) return;
    setLoading(true);
    setMode("check");
    
    try {
      const fileContent = await uploadedFile.text();
      const detectedFormat = detectFormatHeuristic(uploadedFile.name, fileContent) as "csv" | "xml" | "unknown";
      
      // Run benchmarks
      const benchmarkResults = await benchmarkAllParsers(fileContent, detectedFormat);
      
      const results = {
        format: detectedFormat,
        fileSize: uploadedFile.size,
        parsers: benchmarkResults.map(result => ({
          name: result.parserName,
          supported: result.supported,
          speed: result.throughputMbPerSec,
          time: result.parseTimeMs,
          memoryUsage: result.memoryUsageMb,
          recordsProcessed: result.recordsProcessed,
          success: result.success,
        })),
        preview: fileContent.substring(0, 500),
      };
      
      setResults(results);
    } catch (error) {
      console.error("Error checking format:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleParse = async () => {
    if (!uploadedFile) return;
    setLoading(true);
    setMode("parse");
    
    try {
      const fileContent = await uploadedFile.text();
      const detectedFormat = detectFormatHeuristic(uploadedFile.name, fileContent) as "csv" | "xml" | "unknown";
      
      // Run benchmarks
      const benchmarkResults = await benchmarkAllParsers(fileContent, detectedFormat);
      
      const results = {
        format: detectedFormat,
        fileSize: uploadedFile.size,
        parsers: benchmarkResults.map(result => ({
          name: result.parserName,
          supported: result.supported,
          speed: result.throughputMbPerSec,
          time: result.parseTimeMs,
          memoryUsage: result.memoryUsageMb,
          recordsProcessed: result.recordsProcessed,
          success: result.success,
        })),
        preview: fileContent.substring(0, 500),
      };
      
      setResults(results);
    } catch (error) {
      console.error("Error parsing file:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDetect = async () => {
    if (!uploadedFile) return;
    setDetectLoading(true);
    setDetectError(null);
    setMode("detect");

    try {
      const format = await detectFormat(uploadedFile.stream());
      const csvInfo = format === "csv"
        ? await detectCsvFieldsAndDelimiter(uploadedFile.stream())
        : null;

      setDetectResult({
        format,
        csv: csvInfo,
      });
    } catch (error) {
      console.error("Error detecting format:", error);
      setDetectError("Unable to detect format. Please try a different file.");
    } finally {
      setDetectLoading(false);
    }
  };

  const handleConvertDownload = async () => {
    if (!uploadedFile) return;
    if (isFileTooLarge) {
      setConvertError(`File is larger than ${(MAX_NON_STREAMING_SIZE / (1024 * 1024)).toFixed(0)} MB. Use Stream Process for conversions.`);
      return;
    }

    setConvertLoading(true);
    setConvertError(null);

    try {
      const detectedFormat = await detectFormat(uploadedFile.stream());
      const buffer = await uploadedFile.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      const fallbackFormat = detectFormatHeuristic(uploadedFile.name, new TextDecoder().decode(bytes)) as Format | "unknown";
      const inputFormat = detectedFormat !== "unknown" ? detectedFormat : fallbackFormat;

      if (inputFormat === "unknown") {
        throw new Error("Unable to detect the input format. Please try a different file.");
      }

      const outputBytes = await convert(bytes, {
        inputFormat,
        outputFormat,
      });

      const mimeTypes: Record<Format, string> = {
        csv: "text/csv",
        ndjson: "application/x-ndjson",
        json: "application/json",
        xml: "application/xml",
      };

      const blob = new Blob([outputBytes], { type: mimeTypes[outputFormat] });
      const url = URL.createObjectURL(blob);
      const baseName = uploadedFile.name.replace(/\.[^/.]+$/, "");
      const downloadName = `${baseName}.${outputFormat}`;

      const link = document.createElement("a");
      link.href = url;
      link.download = downloadName;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to convert file.";
      setConvertError(message);
    } finally {
      setConvertLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Hero Section */}
      <section className="relative pt-20 pb-16 px-4 overflow-hidden">
        {/* Background Image */}
        <div 
          className="absolute inset-0 -z-10 opacity-40"
          style={{
            backgroundImage: 'url(/images/hero-abstract.jpg)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
        
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 mb-6 px-4 py-2 bg-white/80 rounded-full border border-border">
            <Zap className="w-4 h-4 text-accent" />
            <span className="text-sm font-medium text-foreground">Lightning-fast parsing</span>
          </div>
          
          <h1 className="text-5xl md:text-6xl font-bold mb-6 text-foreground" style={{ fontFamily: 'Poppins' }}>
            Next-Gen File Parser
          </h1>
          
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Convert Buddy outperforms traditional parsers. See the difference with real-time benchmarks on your files.
          </p>

          <div className="flex gap-4 justify-center flex-wrap">
            <Button 
              size="lg" 
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
              onClick={() => document.getElementById('upload-zone')?.scrollIntoView({ behavior: 'smooth' })}
            >
              <Upload className="w-5 h-5 mr-2" />
              Get Started
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              onClick={() => window.open('https://github.com/brunohanss/convert-buddy', '_blank')}
            >
              <Github className="w-5 h-5 mr-2" />
              View on GitHub
            </Button>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="flex-1 px-4 py-12">
        <div className="max-w-5xl mx-auto">
          {/* Upload Zone */}
          {!uploadedFile && (
            <div id="upload-zone" className="mb-12">
              <FileUploadZone onFileUpload={handleFileUpload} />
            </div>
          )}

          {/* File Info & Mode Selection */}
          {uploadedFile && (
            <div className="mb-12">
              <div className="bg-white rounded-lg p-6 border border-border mb-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      {uploadedFile.name}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {(uploadedFile.size / 1024).toFixed(2)} KB • {uploadedFile.type}
                    </p>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      setUploadedFile(null);
                      setMode("upload");
                      setResults(null);
                      setDetectResult(null);
                      setDetectError(null);
                      setDetectLoading(false);
                    }}
                  >
                    Change File
                  </Button>
                </div>

                {/* Mode Selection */}
                <div className="flex gap-4 flex-wrap">
                  <Button
                    onClick={handleCheckFormat}
                    disabled={isBusy || isFileTooLarge}
                    className={`${
                      mode === "check" 
                        ? "bg-primary text-primary-foreground" 
                        : "bg-secondary text-foreground hover:bg-secondary/80"
                    }`}
                  >
                    <Code2 className="w-4 h-4 mr-2" />
                    Check Format
                  </Button>
                  <Button
                    onClick={handleParse}
                    disabled={isBusy || isFileTooLarge}
                    className={`${
                      mode === "parse" 
                        ? "bg-accent text-accent-foreground" 
                        : "bg-secondary text-foreground hover:bg-secondary/80"
                    }`}
                  >
                    <Zap className="w-4 h-4 mr-2" />
                    Parse & Benchmark
                  </Button>
                  <Button
                    onClick={() => setMode("stream")}
                    disabled={isBusy}
                    className={`${
                      mode === "stream" 
                        ? "bg-destructive text-destructive-foreground" 
                        : "bg-secondary text-foreground hover:bg-secondary/80"
                    }`}
                  >
                    <Flame className="w-4 h-4 mr-2" />
                    Stream Process
                  </Button>
                  <Button
                    onClick={handleDetect}
                    disabled={isBusy}
                    className={`${
                      mode === "detect" 
                        ? "bg-primary text-primary-foreground" 
                        : "bg-secondary text-foreground hover:bg-secondary/80"
                    }`}
                  >
                    <Search className="w-4 h-4 mr-2" />
                    Detect Format & CSV
                  </Button>
                </div>
                {isFileTooLarge ? (
                  <p className="mt-4 text-xs text-amber-600 dark:text-amber-500 font-medium">
                    ⚠️ File is larger than {(MAX_NON_STREAMING_SIZE / (1024 * 1024)).toFixed(0)} MB. Please use Stream Process to avoid browser memory limits.
                  </p>
                ) : (
                  <p className="mt-4 text-xs text-muted-foreground">
                    Working with large files? Use Stream Process to avoid browser memory limits.
                  </p>
                )}
              </div>

              <div className="bg-white rounded-lg p-6 border border-border mb-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold text-foreground">Convert & Download</h3>
                    <p className="text-sm text-muted-foreground">
                      Select an output format and download the converted file to inspect it locally.
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="space-y-2 min-w-[180px]">
                      <Label htmlFor="output-format">Output format</Label>
                      <Select value={outputFormat} onValueChange={(value) => setOutputFormat(value as Format)}>
                        <SelectTrigger id="output-format" className="w-full">
                          <SelectValue placeholder="Choose format" />
                        </SelectTrigger>
                        <SelectContent>
                          {OUTPUT_FORMATS.map((format) => (
                            <SelectItem key={format} value={format}>
                              {format.toUpperCase()}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      onClick={handleConvertDownload}
                      disabled={isBusy || isFileTooLarge}
                      className="bg-primary hover:bg-primary/90 text-primary-foreground"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      {convertLoading ? "Converting..." : "Convert & Download"}
                    </Button>
                  </div>
                </div>
                {convertError && (
                  <p className="mt-4 text-sm text-destructive font-medium">
                    {convertError}
                  </p>
                )}
              </div>

              {/* Results */}
              {results && (mode === "check" || mode === "parse") && (
                <ParserComparison 
                  results={results} 
                  mode={mode}
                  loading={loading}
                />
              )}

              {/* Streaming Processor */}
              {mode === "stream" && (
                <StreamingProcessor 
                  file={uploadedFile}
                  outputFormat={outputFormat}
                  onComplete={() => {
                    setMode("upload");
                    setUploadedFile(null);
                    setDetectResult(null);
                    setDetectError(null);
                    setDetectLoading(false);
                  }}
                />
              )}

              {mode === "detect" && uploadedFile && (
                <FormatDetection
                  file={uploadedFile}
                  loading={detectLoading}
                  error={detectError}
                  result={detectResult}
                />
              )}
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  );
}
