import Link from 'next/link';

import { Card } from '@/components/ui/Card';
import type { ConversionConfig } from '@/lib/conversions';

export function ConversionCard({ conversion }: { conversion: ConversionConfig }) {
  return (
    <Card>
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">Conversion</p>
        <h3 className="text-xl font-semibold text-text-primary">{conversion.label}</h3>
        <p className="text-sm text-text-secondary">{conversion.description}</p>
        <Link href={`/convert/${conversion.slug}`} className="text-sm font-semibold text-accent hover:text-accent-600">
          Open converter
        </Link>
      </div>
    </Card>
  );
}
