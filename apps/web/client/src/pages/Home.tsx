import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, Github, Flame, Zap, Download, Loader2 } from "lucide-react";
import FileUploadZone from "@/components/FileUploadZone";
import StreamingProcessor from "@/components/StreamingProcessor";
import Footer from "@/components/Footer";
import BenchmarkSection from "@/components/BenchmarkSection";
import LiveBenchmarkSection from "@/components/LiveBenchmarkSection";
import { 
  convertFile, 
  detectCsvFieldsAndDelimiter, 
  detectXmlElements, 
  detectFormat, 
  getMimeType,
  type Format, 
  convertToString 
} from "convert-buddy-js/browser";

// Format bytes into human-readable string using GB / MB / KB as appropriate
function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  }
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }
  return `${(bytes / 1024).toFixed(2)} KB`;
}

/**
 * Design Philosophy: Kinetic Minimalism with Performance Visualization
 * - Swiss design principles with clear information hierarchy
 * - Animated performance bars and counters
 * - Teal (#0D7377) for stability, Coral (#FF6B35) for speed
 * - Poppins (display) + Inter (body) typography
 */

// Maximum file size for non-streaming operations (50 MB)
const MAX_NON_STREAMING_SIZE = 50 * 1024 * 1024;
const PREVIEW_BYTES = 5000;
const OUTPUT_FORMATS: Format[] = ["csv", "ndjson", "json", "xml"];

export default function Home() {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [mode, setMode] = useState<"upload" | "check" | "stream" | "benchmark">("upload");
  const [checkResult, setCheckResult] = useState<{
    format: string;
    fileSize: number;
    preview: string;
    delimiter: string | null;
    fields: string[];
    sampled: boolean;
    xmlRecordElement?: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [outputFormat, setOutputFormat] = useState<Format>("ndjson");
  const [checkError, setCheckError] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const isBusy = loading || isDownloading;
  const isFileTooLarge = uploadedFile ? uploadedFile.size > MAX_NON_STREAMING_SIZE : false;

  const handleFileUpload = (file: File) => {
    setUploadedFile(file);
    setMode("check");
    setCheckResult(null);
    setCheckError(null);
    void handleCheckFormat(file);
  };

  const handleCheckFormat = async (file?: File) => {
    const targetFile = file ?? uploadedFile;
    if (!targetFile) return;
    setLoading(true);
    setMode("check");

    try {
      console.log("Detecting format for:", targetFile.name);
      const detectedFormat = await detectFormat(targetFile.stream());
      console.log("Detected format:", detectedFormat);
      
      if (!detectedFormat || detectedFormat === "unknown") {
        setCheckError("Unable to detect the file format. Please try a different file.");
        setLoading(false);
        return;
      }

      let csvInfo = null;
      let xmlElements: string[] = [];
      let xmlRecordElement: string | undefined;
      
      if (detectedFormat === "csv") {
        csvInfo = await detectCsvFieldsAndDelimiter(targetFile.stream());
      } else if (detectedFormat === "xml") {
        // Extract XML elements using the WASM function
        const xmlDetection = await detectXmlElements(targetFile.stream());
        console.log("XML Detection result:", xmlDetection);
        xmlElements = xmlDetection?.elements ?? [];
        xmlRecordElement = xmlDetection?.recordElement;
        console.log("Detected XML record element:", xmlRecordElement);
      }

      const previewBytes = await targetFile.slice(0, PREVIEW_BYTES).text();

      setCheckResult({
        format: detectedFormat,
        fileSize: targetFile.size,
        preview: previewBytes,
        delimiter: csvInfo?.delimiter ?? null,
        fields: csvInfo?.fields ?? xmlElements,
        sampled: targetFile.size > PREVIEW_BYTES,
        xmlRecordElement,
      });
      console.log("Check result set:", detectedFormat);
    } catch (error) {
      console.error("Error checking format:", error);
      setCheckError("Unable to detect the file format. Please try a different file.");
    } finally {
      setLoading(false);
    }
  };
  

  const handleDownload = async () => {
    if (!uploadedFile) return;

    // Ensure format has been detected
    if (!checkResult?.format) {
      alert("Please wait for format detection to complete before downloading.");
      return;
    }

    setIsDownloading(true);
    try {
      // Build conversion options - the library will auto-detect configs if not provided
      const convertOptions: Parameters<typeof convertFile>[1] = {
        outputFormat,
        inputFormat: checkResult.format as Format,
        profile: true, // Enable performance profiling
      };

      // Optionally pass detected configs for better performance (skips re-detection)
      // But if we don't pass them, the library will auto-detect on first chunk
      if (checkResult.format === "csv" && checkResult.delimiter) {
        convertOptions.csvConfig = {
          delimiter: checkResult.delimiter,
        };
      }

      if (checkResult.format === "xml" && checkResult.xmlRecordElement) {
        convertOptions.xmlConfig = {
          recordElement: checkResult.xmlRecordElement,
        };
      }

      console.log("Conversion options:", convertOptions);
      console.time("Conversion");
      
      // PERFORMANCE OPTIMIZATION: Use streaming convertFile instead of loading entire file into memory
      // This uses the browser's native ReadableStream API for chunk-by-chunk processing
      const convertedData = await convertFile(uploadedFile, convertOptions);
      
      console.timeEnd("Conversion");

      // Create a blob from Uint8Array - convert to proper type
      const blobPart: BlobPart = new Uint8Array(convertedData) as unknown as BlobPart;
      const mimeType = getMimeType(outputFormat);
      const blob = new Blob([blobPart], { type: mimeType });

      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const nameWithoutExt = uploadedFile.name.split(".").slice(0, -1).join(".");
      link.href = url;
      link.download = `${nameWithoutExt}.${outputFormat}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Download failed:", error);
      alert("Failed to convert and download the file. Please try again.");
    } finally {
      setIsDownloading(false);
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
                      {formatBytes(uploadedFile.size)} • {uploadedFile.type}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-3">
                  <div className="space-y-2 min-w-[200px] p-3 bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20 rounded-lg">
                      <Label htmlFor="target-format" className="font-semibold">🎯 Output Format</Label>
                      <p className="text-xs text-muted-foreground mb-2">{mode === "stream" ? "Locked during streaming" : "Choose before streaming"}</p>
                      <Select value={outputFormat} onValueChange={(value) => setOutputFormat(value as Format)} disabled={mode === "stream"}>
                        <SelectTrigger id="target-format" className="w-full font-medium" disabled={mode === "stream"}>
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
                    <div className="space-y-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          setUploadedFile(null);
                          setMode("upload");
                          setCheckResult(null);
                          setCheckError(null);
                        }}
                      >
                        Change File
                      </Button>
                    </div>
                    <div className="space-y-2">
                      <Button 
                        onClick={handleDownload}
                        disabled={isBusy || isFileTooLarge}
                        className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
                        title={isFileTooLarge ? "File is too large. Use Stream Process instead." : "Download converted file"}
                      >
                        {isDownloading ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Converting...
                          </>
                        ) : (
                          <>
                            <Download className="w-4 h-4 mr-2" />
                            Download
                          </>
                        )}
                      </Button>
                      {isFileTooLarge && (
                        <p className="text-xs text-amber-600 dark:text-amber-500 text-center">
                          Use Stream Process for large files
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Mode Selection */}
                <div className="space-y-4">
                  <div className="flex gap-4 flex-wrap">
                    <Button
                      onClick={() => void handleCheckFormat()}
                      disabled={isBusy}
                      className={`${
                        mode === "check" 
                          ? "bg-primary text-primary-foreground" 
                          : "bg-secondary text-foreground hover:bg-secondary/80"
                      }`}
                    >
                      Check Format
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
                      onClick={() => setMode("benchmark")}
                      disabled={isBusy}
                      className={`${
                        mode === "benchmark" 
                          ? "bg-orange-500 text-orange-foreground" 
                          : "bg-secondary text-foreground hover:bg-secondary/80"
                      }`}
                    >
                      <Flame className="w-4 h-4 mr-2" />
                      Benchmark
                    </Button>
                  </div>
                  {mode === "stream" && (
                    <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                      <p className="text-xs text-blue-700 dark:text-blue-200">
                        💡 <strong>Format is set to {outputFormat.toUpperCase()}</strong>. If you need a different format, change it above before selecting the output file.
                      </p>
                    </div>
                  )}
                </div>
                {isFileTooLarge ? (
                  <p className="mt-4 text-xs text-amber-600 dark:text-amber-500 font-medium">
                    ⚠️ File is larger than {(MAX_NON_STREAMING_SIZE / (1024 * 1024)).toFixed(0)} MB. We only sample the file for format detection. Benchmarking will use streaming mode.
                  </p>
                ) : (
                  <p className="mt-4 text-xs text-muted-foreground">
                    Files up to {(MAX_NON_STREAMING_SIZE / (1024 * 1024)).toFixed(0)} MB use direct processing. Larger files use streaming.
                  </p>
                )}
              </div>

              {/* Results */}
              {mode === "check" && (
                <div className="space-y-6">
                  <div className="bg-white rounded-lg p-6 border border-border">
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-foreground" style={{ fontFamily: "Poppins" }}>
                          Format Check
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          We sample the file to detect format, delimiter, and fields.
                        </p>
                      </div>
                      {checkResult && !loading && !checkError && (
                        <div className="text-sm text-green-600 font-medium">Ready</div>
                      )}
                    </div>

                    {loading && (
                      <div className="mt-6 p-4 bg-secondary/50 rounded-lg text-sm text-muted-foreground">
                        Checking the file sample...
                      </div>
                    )}

                    {checkError && (
                      <div className="mt-6 p-4 bg-destructive/10 rounded-lg border border-destructive/20 text-sm text-destructive">
                        {checkError}
                      </div>
                    )}

                    {checkResult && !loading && !checkError && (
                      <div className="space-y-6">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div>
                            <p className="text-sm text-muted-foreground">Format</p>
                            <p className="text-lg font-semibold text-foreground uppercase">{checkResult.format}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">File Size</p>
                            <p className="text-lg font-semibold text-foreground">
                              {(checkResult.fileSize / 1024).toFixed(2)} KB
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">
                              {checkResult.format === "csv" ? "CSV Delimiter" : "Record Element"}
                            </p>
                            <p className="text-lg font-semibold text-foreground">
                              {checkResult.delimiter ?? checkResult.xmlRecordElement ?? "—"}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">
                              {checkResult.format === "xml" ? "Elements" : "Fields"} Detected
                            </p>
                            <p className="text-lg font-semibold text-foreground">
                              {checkResult.fields.length}
                            </p>
                          </div>
                        </div>

                        {/* Format Override Option */}
                        {checkResult.fields.length === 0 && (
                          <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/30 p-4">
                            <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
                              ⚠️ Format detection returned no fields. Conversion may not work correctly.
                            </p>
                          </div>
                        )}

                        <div className="rounded-lg border border-border bg-secondary/40 p-4">
                          <p className="text-xs text-muted-foreground mb-3">
                            {checkResult.format === "xml" ? "XML Elements" : "Field Names"}
                          </p>
                          {checkResult.fields.length ? (
                            <div className="flex flex-wrap gap-2">
                              {checkResult.fields.map((field) => (
                                <span
                                  key={field}
                                  className="text-xs font-medium bg-white border border-border rounded-full px-3 py-1"
                                >
                                  {field}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground">
                              No {checkResult.format === "xml" ? "elements" : "field names"} detected.
                            </p>
                          )}
                        </div>

                        <div className="mt-6 pt-6 border-t border-border">
                          <p className="text-sm text-muted-foreground mb-3">
                            File Preview{checkResult.sampled ? " (sample)" : ""}
                          </p>
                          <div className="bg-secondary/50 rounded p-4 text-sm font-mono text-foreground overflow-auto max-h-40">
                            {checkResult.preview || "No preview available."}
                          </div>
                          {isFileTooLarge && (
                            <p className="mt-3 text-xs text-amber-600 dark:text-amber-500 font-medium">
                              Large file detected. Use Stream Process for full conversion without loading the entire file.
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Live Benchmark Section */}
              {mode === "benchmark" && uploadedFile && (
                <div className="space-y-4">
                  {uploadedFile.size > MAX_NON_STREAMING_SIZE && (
                    <div className="p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                      <p className="text-sm text-blue-800 dark:text-blue-300">
                        📊 File size exceeds {(MAX_NON_STREAMING_SIZE / (1024 * 1024)).toFixed(0)} MB - Using <strong>Streaming Benchmark</strong> mode for accurate performance metrics
                      </p>
                    </div>
                  )}
                  <LiveBenchmarkSection
                    file={uploadedFile}
                    outputFormat={outputFormat}
                    isProcessing={true}
                  />
                </div>
              )}

              {/* Streaming Processor */}
              {mode === "stream" && (
                <StreamingProcessor 
                  file={uploadedFile}
                  outputFormat={outputFormat}
                  onComplete={() => {
                    setMode("upload");
                    setUploadedFile(null);
                    setCheckResult(null);
                    setCheckError(null);
                  }}
                />
              )}
            </div>
          )}
        </div>
      </section>

      {/* Benchmark Section */}
      <section className="px-4 py-16">
        <div className="max-w-5xl mx-auto">
          <BenchmarkSection />
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  );
}
