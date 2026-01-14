import { useState, useRef } from "react";
import { Upload } from "lucide-react";
import { showFileWarningToast } from "./FileWarningToast";

interface FileUploadZoneProps {
  onFileUpload: (file: File) => void;
}

/**
 * FileUploadZone Component
 * Design: Kinetic Minimalism - Clean, minimal upload area with clear affordance
 * - Full-width upload zone with dashed border
 * - Drag-and-drop support with visual feedback
 * - Supports CSV, XML, JSON, and NDJSON files
 */

export default function FileUploadZone({ onFileUpload }: FileUploadZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Supported file extensions
  const SUPPORTED_EXTENSIONS = ['.csv', '.xml', '.json', '.ndjson'];
  
  const isFileSupported = (fileName: string): boolean => {
    return SUPPORTED_EXTENSIONS.some(ext => fileName.toLowerCase().endsWith(ext));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (isFileSupported(file.name)) {
        onFileUpload(file);
      } else {
        showFileWarningToast({
          fileName: file.name,
          message: "File format not supported",
          suggestions: ["CSV (.csv)", "XML (.xml)", "JSON (.json)", "NDJSON (.ndjson)"]
        });
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.currentTarget.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (isFileSupported(file.name)) {
        onFileUpload(file);
      } else {
        showFileWarningToast({
          fileName: file.name,
          message: "File format not supported",
          suggestions: ["CSV (.csv)", "XML (.xml)", "JSON (.json)", "NDJSON (.ndjson)"]
        });
      }
    }
  };

  return (
    <div
      className={`
        relative border-2 border-dashed rounded-lg p-12 transition-all duration-300 cursor-pointer
        ${isDragOver 
          ? "border-accent bg-blue-50 scale-105" 
          : "border-primary hover:border-accent hover:bg-blue-50"
        }
      `}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => fileInputRef.current?.click()}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,.xml,.json,.ndjson"
        onChange={handleFileSelect}
        className="hidden"
      />

      <div className="text-center">
        <div className="mb-4 flex justify-center">
          <div className="p-4 bg-primary/10 rounded-lg">
            <Upload className="w-8 h-8 text-primary" />
          </div>
        </div>

        <h3 className="text-xl font-semibold text-foreground mb-2" style={{ fontFamily: 'Poppins' }}>
          Drop your file here
        </h3>

        <p className="text-muted-foreground mb-4">
          or click to browse
        </p>

        <p className="text-sm text-muted-foreground">
          Supports CSV, XML, JSON, and NDJSON files
        </p>
      </div>
    </div>
  );
}
