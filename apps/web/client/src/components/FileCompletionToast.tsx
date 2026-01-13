import { toast } from "sonner";
import { FileCheck, FolderOpen, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FileCompletionData {
  fileName: string;
  format: string;
  fileSize: number;
  fileHandle?: any; // FileSystemFileHandle from File System Access API
  downloadBlob?: Blob; // For downloads without FSA support
  showPath?: boolean; // Show file path instead of open folder button
}

export function showFileCompletionToast(data: FileCompletionData) {
  const toastId = toast.custom(
    (t) => (
      <div className="animate-in fade-in slide-in-from-bottom-5 duration-300 flex items-center gap-3 bg-white dark:bg-slate-900 border border-green-300 dark:border-green-700 rounded-lg p-4 shadow-xl max-w-sm hover:shadow-2xl transition-shadow">
        <div className="flex-shrink-0">
          <div className="flex items-center justify-center h-8 w-8 rounded-full bg-green-100 dark:bg-green-900/30">
            <FileCheck className="w-5 h-5 text-green-600 dark:text-green-400" />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">
            ✓ {data.fileName}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {data.format.toUpperCase()} • {formatBytes(data.fileSize)} saved
          </p>
          {data.showPath && data.fileHandle && (
            <p className="text-xs text-muted-foreground mt-1 truncate">
              📁 Saved to your device
            </p>
          )}
        </div>
        <div className="flex gap-1 flex-shrink-0">
          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-slate-800 flex-shrink-0"
            onClick={() => toast.dismiss(t)}
            title="Dismiss"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </Button>
        </div>
      </div>
    ),
    {
      position: "bottom-right",
      duration: Infinity,
    }
  );

  return toastId;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}
