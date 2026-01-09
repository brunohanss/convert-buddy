import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, Github, Flame, Zap, Download, Loader2 } from "lucide-react";
import FileUploadZone from "@/components/FileUploadZone";
import StreamingProcessor from "@/components/StreamingProcessor";
import Footer from "@/components/Footer";
import { convert, convertToString, detectCsvFieldsAndDelimiter, detectXmlElements, detectFormat, type Format } from "convert-buddy-js";

/**
 * Design Philosophy: Kinetic Minimalism with Performance Visualization
 * - Swiss design principles with clear information hierarchy
 * - Animated performance bars and counters
 * - Teal (#0D7377) for stability, Coral (#FF6B35) for speed
 * - Poppins (display) + Inter (body) typography
 */

// Maximum file size for non-streaming operations (10 MB)
const MAX_NON_STREAMING_SIZE = 10 * 1024 * 1024;
const PREVIEW_BYTES = 5000;
const OUTPUT_FORMATS: Format[] = ["csv", "ndjson", "json", "xml"];

export default function Home() {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [mode, setMode] = useState<"upload" | "check" | "stream">("upload");
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
  const testBuddy = async () => {
    const sampleXml = `<movies> <movie> <title>The Shawshank Redemption</title> <genre>Drama</genre> <year>1994</year> <cast> <actor> <name>Tim Robbins</name> <role>Andy Dufresne</role> </actor> <actor> <name>Morgan Freeman</name> <role>Ellis Boyd 'Red' Redding</role> </actor> </cast> </movie> <movie> <title>The Matrix</title> <genre>Sci-Fi</genre> <year>1999</year> <cast> <actor> <name>Keanu Reeves</name> <role>Neo</role> </actor> <actor> <name>Laurence Fishburne</name> <role>Morpheus</role> </actor> </cast> </movie> <movie> <title>Inception</title> <genre>Thriller</genre> <year>2010</year> <cast> <actor> <name>Leonardo DiCaprio</name> <role>Cobb</role> </actor> <actor> <name>Joseph Gordon-Levitt</name> <role>Arthur</role> </actor> </cast> </movie> </movies>`;
    
    console.log("=== Testing AUTO-DETECTION (no config provided) ===");
    // Test XML to JSON without providing xmlConfig - should auto-detect "movie" element
    const resultAutoJson = await convertToString(new TextEncoder().encode(sampleXml), {
      inputFormat: "xml",
      outputFormat: "json",
      // NO xmlConfig provided - library should auto-detect!
    });
    console.log("Auto-detected JSON result:", resultAutoJson);
    
    // Test XML to NDJSON without config
    const resultAutoNdjson = await convertToString(new TextEncoder().encode(sampleXml), {
      inputFormat: "xml",
      outputFormat: "ndjson",
      // NO xmlConfig provided - library should auto-detect!
    });
    console.log("Auto-detected NDJSON result:", resultAutoNdjson);
    
    console.log("=== Testing WITH explicit config (should match auto-detection) ===");
    // Test with explicit config to compare
    const resultExplicit = await convertToString(new TextEncoder().encode(sampleXml), {
      inputFormat: "xml",
      outputFormat: "json", 
      xmlConfig: {
        recordElement: "movie",
      },
    });
    console.log("Explicit config JSON result:", resultExplicit);
    
    // Test CSV auto-detection
    const sampleCsv = `title,genre,year,cast.actor.0.name,cast.actor.0.role,cast.actor.1.name,cast.actor.1.role
The Shawshank Redemption,Drama,1994,Tim Robbins,Andy Dufresne,Morgan Freeman,Ellis Boyd 'Red' Redding
The Matrix,Sci-Fi,1999,Keanu Reeves,Neo,Laurence Fishburne,Morpheus
Inception,Thriller,2010,Leonardo DiCaprio,Cobb,Joseph Gordon-Levitt,Arthur`;
    
    console.log("=== Testing CSV auto-detection ===");
    const csvResult = await convertToString(new TextEncoder().encode(sampleCsv), {
      inputFormat: "csv",
      outputFormat: "json",
      // NO csvConfig provided - library should auto-detect comma delimiter!
    });
    console.log("Auto-detected CSV to JSON:", csvResult);
  }

  const handleDownload = async () => {
    if (!uploadedFile) return;

    // Ensure format has been detected
    if (!checkResult?.format) {
      alert("Please wait for format detection to complete before downloading.");
      return;
    }

    setIsDownloading(true);
    try {
      // Read the file as ArrayBuffer
      const arrayBuffer = await uploadedFile.arrayBuffer();
      
      // Build conversion options - the library will auto-detect configs if not provided
      const convertOptions: Parameters<typeof convert>[1] = {
        outputFormat,
        inputFormat: checkResult.format as Format,
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
      
      // Convert using the WASM library
      const convertedData = await convert(new Uint8Array(arrayBuffer), convertOptions);

      // Create a blob from Uint8Array - convert to proper type
      const blobPart: BlobPart = new Uint8Array(convertedData) as unknown as BlobPart;
      const blob = new Blob([blobPart], {
        type: outputFormat === "json" 
          ? "application/json" 
          : outputFormat === "csv"
          ? "text/csv"
          : outputFormat === "xml"
          ? "application/xml"
          : "application/x-ndjson",
      });

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

          <button onClick={() => testBuddy()}>My test</button>
          
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
                  <div className="flex flex-col items-end gap-3">
                  <div className="space-y-2 min-w-[180px]">
                      <Label htmlFor="target-format">Target format</Label>
                      <Select value={outputFormat} onValueChange={(value) => setOutputFormat(value as Format)}>
                        <SelectTrigger id="target-format" className="w-full">
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
                </div>
                {isFileTooLarge ? (
                  <p className="mt-4 text-xs text-amber-600 dark:text-amber-500 font-medium">
                    ⚠️ File is larger than {(MAX_NON_STREAMING_SIZE / (1024 * 1024)).toFixed(0)} MB. We only sample the file for format detection. Use Stream Process for full conversion.
                  </p>
                ) : (
                  <p className="mt-4 text-xs text-muted-foreground">
                    Working with large files? Use Stream Process to avoid browser memory limits.
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

      {/* Footer */}
      <Footer />
    </div>
  );
}
