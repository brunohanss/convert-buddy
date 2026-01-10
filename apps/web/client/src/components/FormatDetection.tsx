import { AlertCircle, CheckCircle2 } from "lucide-react";
import formatBytes from "@/lib/formatBytes";

interface CsvDetectionResult {
  delimiter: string;
  fields: string[];
}

interface FormatDetectionProps {
  file: File;
  loading: boolean;
  error: string | null;
  result: {
    format: string;
    csv: CsvDetectionResult | null;
  } | null;
}

export default function FormatDetection({ file, loading, error, result }: FormatDetectionProps) {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg p-6 border border-border">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h3 className="text-lg font-semibold text-foreground" style={{ fontFamily: "Poppins" }}>
              Format & CSV Detection
            </h3>
            <p className="text-sm text-muted-foreground">
              Powered by convert-buddy-js WASM detectors.
            </p>
          </div>
          {result && !loading && !error && (
            <div className="flex items-center gap-2 text-sm text-green-600">
              <CheckCircle2 className="w-4 h-4" />
              Detection complete
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-muted-foreground mb-1">File Name</p>
            <p className="font-medium text-foreground truncate" title={file.name}>
              {file.name}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">File Size</p>
            <p className="font-medium text-foreground">{formatBytes(file.size)}</p>
          </div>
        </div>

        {loading && (
          <div className="mt-6 p-4 bg-secondary/50 rounded-lg text-sm text-muted-foreground">
            Running detection on the file sample...
          </div>
        )}

        {error && (
          <div className="mt-6 p-4 bg-destructive/10 rounded-lg border border-destructive/20 flex gap-3">
            <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-destructive mb-1">Detection failed</p>
              <p className="text-sm text-destructive/80">{error}</p>
            </div>
          </div>
        )}

        {result && !loading && (
          <div className="mt-6 space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Detected Format</p>
                <p className="text-lg font-semibold text-foreground uppercase">
                  {result.format}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">CSV Delimiter</p>
                <p className="text-lg font-semibold text-foreground">
                  {result.csv?.delimiter ?? "—"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Fields Detected</p>
                <p className="text-lg font-semibold text-foreground">
                  {result.csv?.fields.length ?? 0}
                </p>
              </div>
            </div>

            <div className="rounded-lg border border-border bg-secondary/40 p-4">
              <p className="text-xs text-muted-foreground mb-3">Field Names</p>
              {result.csv?.fields.length ? (
                <div className="flex flex-wrap gap-2">
                  {result.csv.fields.map((field) => (
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
                  No CSV headers detected. Try a CSV file with a header row.
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
