import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { AdBanner } from '@/components/AdBanner';
import { ConverterWidget } from '@/components/converter/ConverterWidget';
import { conversions } from '@/lib/conversions';
import { SectionHeading } from '@/components/ui/SectionHeading';

const conversionMap = new Map(conversions.map((conversion) => [conversion.slug, conversion]));
const conversionPairs = new Map(
  conversions.map((conversion) => [`${conversion.input}-${conversion.output}`.toLowerCase(), conversion.slug])
);

export async function generateStaticParams() {
  return conversions.map((conversion) => ({ conversion: conversion.slug }));
}

export async function generateMetadata({ params }: { params: { conversion: string } }): Promise<Metadata> {
  const conversion = conversionMap.get(params.conversion);
  if (!conversion) return {};
  return {
    title: `${conversion.label} · Convert Buddy`,
    description: `Stream ${conversion.input} to ${conversion.output} conversion in your browser with telemetry and transforms.`
  };
}

export default function ConversionPage({ params }: { params: { conversion: string } }) {
  const conversion = conversionMap.get(params.conversion);
  if (!conversion) {
    notFound();
  }

  const reverseKey = `${conversion.output}-${conversion.input}`.toLowerCase();
  const reverseSlug = conversionPairs.get(reverseKey);

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-16">
      <SectionHeading
        eyebrow="Live conversion"
        title={`${conversion.label} streaming converter`}
        subtitle={`Stream ${conversion.input} to ${conversion.output} with detection, transforms, and performance telemetry.`}
      />

      <div className="mt-10 space-y-8">
        <AdBanner position="top" />
        <ConverterWidget />
        <AdBanner position="mid" />
      </div>

      <div className="mt-12 space-y-8">
        <section className="space-y-3">
          <h2 className="text-2xl font-semibold text-ink-900">What this conversion does</h2>
          <p className="text-sm text-ink-600">
            Convert Buddy reads {conversion.input} records as a stream and emits {conversion.output} without loading the
            entire file into memory. This keeps conversion safe for multi-GB inputs.
          </p>
        </section>
        <section className="space-y-3">
          <h2 className="text-2xl font-semibold text-ink-900">Why convert {conversion.input} to {conversion.output}</h2>
          <p className="text-sm text-ink-600">
            {conversion.output} unlocks downstream analytics, APIs, and transformation pipelines while preserving
            structure. Streaming conversion lets you keep control of memory and throughput.
          </p>
        </section>
        <section className="space-y-3">
          <h2 className="text-2xl font-semibold text-ink-900">How it works</h2>
          <p className="text-sm text-ink-600">
            The Rust + WebAssembly core parses input in chunks, applies inline transforms, and emits telemetry at fixed
            intervals. Web Workers keep the UI responsive during conversion.
          </p>
        </section>
        <section className="space-y-3">
          <h2 className="text-2xl font-semibold text-ink-900">Privacy & performance guarantees</h2>
          <p className="text-sm text-ink-600">
            All processing runs locally in your browser. Ads stay outside the converter UI, and performance metrics are
            transparent and deterministic.
          </p>
        </section>
        <section className="space-y-3">
          <h2 className="text-2xl font-semibold text-ink-900">FAQ</h2>
          <div className="space-y-3 text-sm text-ink-600">
            <p>Can I override detected settings? Yes, open the advanced panel and tune the configuration.</p>
            <p>Does it work for large files? Streaming keeps memory usage low even for multi-GB inputs.</p>
            <p>Can I apply transforms? Yes, transformations are applied inline during conversion.</p>
          </div>
        </section>
        <section className="flex flex-wrap gap-4 text-sm text-ink-600">
          {reverseSlug ? (
            <Link href={`/convert/${reverseSlug}`} className="text-accent-500">
              Reverse conversion
            </Link>
          ) : null}
          <Link href="/convert/detect" className="text-accent-500">
            Detect format
          </Link>
          <Link href="/developers" className="text-accent-500">
            For developers
          </Link>
        </section>
        <AdBanner position="bottom" />
      </div>
    </div>
  );
}
