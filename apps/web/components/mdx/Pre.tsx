'use client';

import { useMemo, useState } from 'react';

import { cn } from '@/lib/utils';

type PreProps = React.HTMLAttributes<HTMLPreElement> & {
  children: React.ReactNode;
};

export function Pre({ children, className, ...props }: PreProps) {
  const [copied, setCopied] = useState(false);
  const content = useMemo(() => {
    if (typeof children === 'string') return children;
    if (Array.isArray(children)) {
      return children.map((child) => (typeof child === 'string' ? child : '')).join('');
    }
    if (children && typeof children === 'object' && 'props' in children) {
      const propsChildren = (children as { props?: { children?: string } }).props?.children;
      return typeof propsChildren === 'string' ? propsChildren : '';
    }
    return '';
  }, [children]);

  const handleCopy = async () => {
    if (!content) return;
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="group relative">
      <button
        type="button"
        onClick={handleCopy}
        className="absolute right-3 top-3 rounded-md border border-ink-700 bg-ink-800 px-2 py-1 text-xs text-ink-100 opacity-0 transition group-hover:opacity-100"
      >
        {copied ? 'Copied' : 'Copy'}
      </button>
      <pre className={cn('overflow-x-auto p-5 text-sm leading-6', className)} {...props}>
        {children}
      </pre>
    </div>
  );
}
