import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ParserDetailsCollapsibleProps {
  parserName: string;
  codeSnippet: string;
  outputPreview: string;
  outputFormat: string;
}

export default function ParserDetailsCollapsible({
  parserName,
  codeSnippet,
  outputPreview,
  outputFormat,
}: ParserDetailsCollapsibleProps) {
  const [expandedCode, setExpandedCode] = useState(false);
  const [expandedOutput, setExpandedOutput] = useState(false);

  return (
    <div className="space-y-4 mt-6 pt-6 border-t border-border">
      {/* Code Comparison Section */}
      <div>
        <Button
          variant="ghost"
          className="w-full justify-start text-left p-3 h-auto font-semibold text-foreground hover:bg-secondary/50"
          onClick={() => setExpandedCode(!expandedCode)}
        >
          <ChevronDown
            className={`w-5 h-5 mr-2 transition-transform ${
              expandedCode ? "rotate-180" : ""
            }`}
          />
          Code Executed ({parserName})
        </Button>
        {expandedCode && (
          <div className="mt-3 p-4 bg-secondary/30 rounded-lg border border-border">
            <p className="text-xs text-muted-foreground mb-3">
              Conversion code snippet - Same input to same output
            </p>
            <div className="bg-slate-900 dark:bg-slate-950 rounded p-4 overflow-auto max-h-60 text-xs font-mono text-green-400">
              <pre>{codeSnippet}</pre>
            </div>
          </div>
        )}
      </div>

      {/* Output Preview Section - Only show if preview exists */}
      {outputPreview && (
        <div>
          <Button
            variant="ghost"
            className="w-full justify-start text-left p-3 h-auto font-semibold text-foreground hover:bg-secondary/50"
            onClick={() => setExpandedOutput(!expandedOutput)}
          >
            <ChevronDown
              className={`w-5 h-5 mr-2 transition-transform ${
                expandedOutput ? "rotate-180" : ""
              }`}
            />
            Output Preview ({outputFormat.toUpperCase()})
          </Button>
          {expandedOutput && (
            <div className="mt-3 p-4 bg-secondary/30 rounded-lg border border-border">
              <p className="text-xs text-muted-foreground mb-3">
                First 500 characters of the converted output
              </p>
              <div className="bg-slate-50 dark:bg-slate-900/30 rounded p-4 overflow-auto max-h-60 text-xs font-mono text-foreground border border-border/50">
                <pre className="whitespace-pre-wrap break-words">
                  {outputPreview}
                </pre>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
