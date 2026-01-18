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
          <h3 className="text-lg font-semibold text-text-primary">Inspect a file</h3>
          <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border bg-surface px-6 py-10 text-center">
            <p className="text-sm font-medium text-text-primary">Drop a file or stream input</p>
            <p className="text-xs text-text-muted">We detect format and structure instantly.</p>
            <Button variant="secondary" size="sm">
              Choose file
            </Button>
          </div>
          <textarea
            className="min-h-[120px] w-full rounded-lg border border-border bg-surface px-4 py-3 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none"
            placeholder="Paste raw data for format detection"
          />
        </div>
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-text-primary">Detection results</h3>
          <div className="rounded-lg border border-border bg-surface p-4 text-sm text-text-secondary">
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
