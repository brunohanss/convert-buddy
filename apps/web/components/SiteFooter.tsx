import Link from 'next/link';

export function SiteFooter() {
  return (
    <footer className="border-t border-ink-100 bg-ink-50">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-10 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-semibold text-ink-800">Convert Buddy</p>
          <p className="text-xs text-ink-500">
            Streaming data conversion for CSV, JSON, NDJSON, and XML with performance you can see.
          </p>
        </div>
        <div className="flex flex-wrap gap-4 text-xs text-ink-600">
          <Link href="/convert">Convert</Link>
          <Link href="/developers">Developers</Link>
          <Link href="/docs">Docs</Link>
          <Link href="/legal">Legal</Link>
        </div>
      </div>
    </footer>
  );
}
