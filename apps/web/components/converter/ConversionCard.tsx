import Link from 'next/link';

import { Card } from '@/components/ui/Card';
import type { ConversionConfig } from '@/lib/conversions';

export function ConversionCard({ conversion }: { conversion: ConversionConfig }) {
  return (
    <Card>
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-400">Conversion</p>
        <h3 className="text-xl font-semibold text-ink-900">{conversion.label}</h3>
        <p className="text-sm text-ink-600">{conversion.description}</p>
        <Link href={`/convert/${conversion.slug}`} className="text-sm font-semibold text-accent-500">
          Open converter
        </Link>
      </div>
    </Card>
  );
}
