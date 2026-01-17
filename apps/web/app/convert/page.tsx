import Link from 'next/link';

import { ConversionCard } from '@/components/converter/ConversionCard';
import { conversions } from '@/lib/conversions';
import { SectionHeading } from '@/components/ui/SectionHeading';

export default function ConvertHubPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-16">
      <SectionHeading
        eyebrow="Converter hub"
        title="Choose your conversion or inspect structure"
        subtitle="Convert Buddy streams data through detection, transformation, and conversion pipelines so you can convert massive files safely in the browser."
      />
      <div className="mt-10 grid gap-6 md:grid-cols-2">
        {conversions.map((conversion) => (
          <ConversionCard key={conversion.slug} conversion={conversion} />
        ))}
      </div>
      <div className="mt-8 rounded-xl border border-ink-100 bg-ink-50 px-6 py-5">
        <p className="text-sm font-semibold text-ink-800">Need format detection first?</p>
        <p className="text-sm text-ink-600">
          Inspect formats and structure without converting.{' '}
          <Link href="/convert/detect" className="text-accent-500">
            Go to detection
          </Link>
        </p>
      </div>
      <div className="mt-6 text-sm text-ink-500">
        <p>Capabilities include conversion, detection, transformation, and streaming telemetry.</p>
      </div>
    </div>
  );
}
