import Link from 'next/link';

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-6 px-6 py-10 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-semibold text-text-primary">Convert Buddy</p>
          <p className="text-xs text-text-muted">
            Streaming data conversion for CSV, JSON, NDJSON, and XML with performance you can see.
          </p>
        </div>
        <div className="flex flex-wrap gap-4 text-xs text-text-secondary">
          <Link href="/convert" className="hover:text-text-primary">
            Convert
          </Link>
          <Link href="/developers" className="hover:text-text-primary">
            Developers
          </Link>
          <Link href="/docs" className="hover:text-text-primary">
            Docs
          </Link>
          <Link href="/legal" className="hover:text-text-primary">
            Legal
          </Link>
        </div>
      </div>
    </footer>
  );
}
