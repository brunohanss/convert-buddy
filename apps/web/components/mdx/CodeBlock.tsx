'use client';

import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import hljs from 'highlight.js';
import 'highlight.js/styles/atom-one-dark.css';

type CodeBlockProps = {
  code: string;
  language?: string;
  className?: string;
};

export function CodeBlock({ code, language = 'javascript', className }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const highlightedCode = useMemo(() => {
    try {
      return hljs.highlight(code, { language, ignoreIllegals: true }).value;
    } catch {
      return hljs.highlightAuto(code).value;
    }
  }, [code, language]);

  const handleCopy = async () => {
    if (!code) return;
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="group relative">
      <button
        type="button"
        onClick={handleCopy}
        className="absolute right-3 top-3 rounded-md border border-border bg-elevated px-2 py-1 text-xs text-text-secondary transition"
      >
        {copied ? 'Copied' : 'Copy'}
      </button>
      <pre className={cn('overflow-x-auto border border-border bg-surface p-5 text-sm leading-6', className)}>
        <code dangerouslySetInnerHTML={{ __html: highlightedCode }} />
      </pre>
    </div>
  );
}
