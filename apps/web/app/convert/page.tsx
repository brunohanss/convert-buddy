import Link from 'next/link';

import { ConversionCard } from '@/components/converter/ConversionCard';
import { conversions } from '@/lib/conversions';
import { SectionHeading } from '@/components/ui/SectionHeading';

export default function ConvertHubPage() {
  return (
    <div className="mx-auto w-full max-w-[1200px] px-6 py-16">
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
      <div className="mt-8 rounded-lg border border-border bg-surface px-6 py-5">
        <p className="text-sm font-semibold text-text-primary">Need format detection first?</p>
        <p className="text-sm text-text-secondary">
          Inspect formats and structure without converting.{' '}
          <Link href="/convert/detect" className="text-accent hover:text-accent-600">
            Go to detection
          </Link>
        </p>
      </div>
      <div className="mt-6 text-sm text-text-muted">
        <p>Capabilities include conversion, detection, transformation, and streaming telemetry.</p>
      </div>
    </div>
  );
}
