import type { Metadata } from 'next';

import { SiteFooter } from '@/components/SiteFooter';
import { SiteHeader } from '@/components/SiteHeader';

import './globals.css';

export const metadata: Metadata = {
  title: 'Convert Buddy · Streaming data conversion',
  description:
    'Convert, transform, and inspect CSV, JSON, NDJSON, and XML with a high-performance Rust + WebAssembly engine.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <SiteHeader />
        <main className="min-h-screen bg-white">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
