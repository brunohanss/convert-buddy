import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';

import { SiteFooter } from '@/components/SiteFooter';
import { SiteHeader } from '@/components/SiteHeader';

import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap'
});

const jetBrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains',
  display: 'swap'
});

export const metadata: Metadata = {
  title: 'Convert Buddy · Streaming data conversion',
  description:
    'Convert, transform, and inspect CSV, JSON, NDJSON, and XML with a high-performance Rust + WebAssembly engine.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${jetBrainsMono.variable} relative font-sans`}>
        <div className="grid-background" aria-hidden="true" />
        <SiteHeader />
        <main className="min-h-screen bg-transparent">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
