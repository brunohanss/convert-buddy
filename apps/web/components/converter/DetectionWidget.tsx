'use client';

import { useEffect, useState } from 'react';

import { loadConvertBuddyWasm } from '@/lib/wasm';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

export function DetectionWidget() {
  const [format, setFormat] = useState('XML');
  const [recordElement, setRecordElement] = useState('row');
  const [fields, setFields] = useState('id, name, created_at');
  const [records, setRecords] = useState('~9.2M');

  useEffect(() => {
    loadConvertBuddyWasm();
  }, []);

  return (
    <Card>
      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-ink-900">Inspect a file</h3>
          <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-ink-200 bg-ink-50 px-6 py-10 text-center">
            <p className="text-sm font-medium text-ink-700">Drop a file or stream input</p>
            <p className="text-xs text-ink-400">We detect format and structure instantly.</p>
            <Button variant="secondary" size="sm">
              Choose file
            </Button>
          </div>
          <textarea
            className="min-h-[120px] w-full rounded-lg border border-ink-200 px-4 py-3 text-sm focus:border-accent-500 focus:outline-none"
            placeholder="Paste raw data for format detection"
          />
        </div>
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-ink-900">Detection results</h3>
          <div className="rounded-lg border border-ink-100 bg-ink-50 p-4 text-sm text-ink-700">
            <p>Format: {format}</p>
            <p>Record element: {recordElement}</p>
            <p>Fields: {fields}</p>
            <p>Estimated records: {records}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm">Copy detection JSON</Button>
            <Button variant="secondary" size="sm">
              Apply transform
            </Button>
            <Button variant="ghost" size="sm">
              Continue to conversion
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
