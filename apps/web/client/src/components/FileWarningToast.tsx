import { toast } from "sonner";
import { AlertTriangle, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FileWarningData {
  fileName: string;
  message: string;
  suggestions?: string[];
}

export function showFileWarningToast(data: FileWarningData) {
  const toastId = toast.custom(
    (t) => (
      <div className="animate-in fade-in slide-in-from-bottom-5 duration-300 flex items-center gap-3 bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 rounded-lg p-4 shadow-xl max-w-sm hover:shadow-2xl transition-shadow">
        <div className="flex-shrink-0">
          <div className="flex items-center justify-center h-8 w-8 rounded-full bg-amber-100 dark:bg-amber-900/30">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">
            ⚠️ {data.fileName}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {data.message}
          </p>
          {data.suggestions && data.suggestions.length > 0 && (
            <div className="mt-2">
              <p className="text-xs text-amber-700 dark:text-amber-300 font-medium">
                Supported formats:
              </p>
              <p className="text-xs text-muted-foreground">
                {data.suggestions.join(", ")}
              </p>
            </div>
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
      duration: 6000, // 6 seconds for warnings (longer than success but not infinite)
    }
  );

  return toastId;
}