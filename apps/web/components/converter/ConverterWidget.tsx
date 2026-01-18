'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import { loadConvertBuddyWasm } from '@/lib/wasm';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

type DetectionState = {
  format: string;
  delimiter: string;
  headers: string;
  fields: string;
  estimatedRecords: string;
};

type TelemetryState = {
  throughput: number;
  recordsPerSec: number;
  memory: number;
  elapsedSec: number;
  bytesIn: number;
  bytesOut: number;
  transformCost: number;
};

const initialDetection: DetectionState = {
  format: 'CSV',
  delimiter: ',',
  headers: 'yes',
  fields: 'name, age, city',
  estimatedRecords: '~1.3M'
};

export function ConverterWidget() {
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [transformOpen, setTransformOpen] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [telemetry, setTelemetry] = useState<TelemetryState>({
    throughput: 0,
    recordsPerSec: 0,
    memory: 0,
    elapsedSec: 0,
    bytesIn: 0,
    bytesOut: 0,
    transformCost: 0
  });
  const [detection] = useState(initialDetection);
  const workerRef = useRef<Worker | null>(null);
  const startTimeRef = useRef<number | null>(null);

  useEffect(() => {
    loadConvertBuddyWasm();
  }, []);

  useEffect(() => {
    if (!workerRef.current) {
      workerRef.current = new Worker(new URL('../../app/workers/convert-worker.ts', import.meta.url), {
        type: 'module'
      });
    }
    const worker = workerRef.current;
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'progress') {
        const payload = event.data.payload as {
          throughput: number;
          recordsPerSec: number;
          memory: number;
        };
        const elapsedSec = startTimeRef.current ? (Date.now() - startTimeRef.current) / 1000 : 0;
        setTelemetry((prev) => ({
          ...prev,
          throughput: payload.throughput,
          recordsPerSec: payload.recordsPerSec,
          memory: payload.memory,
          elapsedSec,
          bytesIn: prev.bytesIn + payload.throughput * 0.6,
          bytesOut: prev.bytesOut + payload.throughput * 0.5,
          transformCost: 3
        }));
      }
      if (event.data.type === 'complete') {
        setIsConverting(false);
      }
    };
    worker.addEventListener('message', handleMessage);

    return () => {
      worker.removeEventListener('message', handleMessage);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
    };
  }, []);

  const formattedTelemetry = useMemo(
    () => ({
      throughput: `${telemetry.throughput.toFixed(0)} MB/s`,
      records: `${telemetry.recordsPerSec.toLocaleString('en-US', { maximumFractionDigits: 0 })}`,
      memory: `${telemetry.memory.toFixed(0)} MB`,
      elapsed: new Date(telemetry.elapsedSec * 1000).toISOString().substring(14, 19),
      bytes: `${telemetry.bytesIn.toFixed(1)} GB / ${telemetry.bytesOut.toFixed(1)} GB`
    }),
    [telemetry]
  );

  const handleConvert = () => {
    if (!workerRef.current) return;
    startTimeRef.current = Date.now();
    setIsConverting(true);
    setTelemetry({
      throughput: 185,
      recordsPerSec: 1240000,
      memory: 72,
      elapsedSec: 0,
      bytesIn: 3.8,
      bytesOut: 3.4,
      transformCost: 3
    });
    workerRef.current.postMessage({ type: 'start' });
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <div className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-text-primary">Input</h3>
              <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border bg-surface px-6 py-10 text-center">
                <p className="text-sm font-medium text-text-primary">Drag & drop a file</p>
                <p className="text-xs text-text-muted">CSV, JSON, NDJSON, or XML</p>
                <Button variant="secondary" size="sm">
                  Choose file
                </Button>
              </div>
              <textarea
                className="min-h-[120px] w-full rounded-lg border border-border bg-surface px-4 py-3 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none"
                placeholder="Paste raw data for quick conversion"
              />
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button onClick={handleConvert}>{isConverting ? 'Converting…' : 'Convert file'}</Button>
              <Button variant="secondary">Download output</Button>
              <Button variant="ghost">Copy output</Button>
            </div>
          </div>
        </Card>
        <Card>
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-text-primary">Detection</h3>
            <div className="rounded-lg border border-border bg-surface p-4 text-sm text-text-secondary">
              <p>Detected format: {detection.format}</p>
              <p>Delimiter: {detection.delimiter}</p>
              <p>Headers: {detection.headers}</p>
              <p>Fields: {detection.fields}</p>
              <p>Estimated records: {detection.estimatedRecords}</p>
            </div>
            <button
              className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted"
              onClick={() => setAdvancedOpen((prev) => !prev)}
              type="button"
            >
              {advancedOpen ? 'Hide detected config' : 'Show detected config'}
            </button>
            {advancedOpen ? (
              <div className="rounded-lg border border-border bg-surface p-4 text-sm text-text-secondary">
                <p className="font-medium text-text-primary">Override configuration</p>
                <div className="mt-3 grid gap-3">
                  <label className="text-xs text-text-muted">Delimiter</label>
                  <input
                    className="rounded-md border border-border bg-canvas px-3 py-2 text-sm text-text-primary"
                    defaultValue=","
                  />
                  <label className="text-xs text-text-muted">Header row</label>
                  <select className="rounded-md border border-border bg-canvas px-3 py-2 text-sm text-text-primary">
                    <option>Auto</option>
                    <option>Yes</option>
                    <option>No</option>
                  </select>
                </div>
              </div>
            ) : null}
            <div className="space-y-3">
              <button
                className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted"
                onClick={() => setTransformOpen((prev) => !prev)}
                type="button"
              >
                {transformOpen ? 'Hide transform editor' : 'Open transform editor'}
              </button>
              {transformOpen ? (
                <div className="space-y-4 rounded-lg border border-border bg-surface p-4 text-sm text-text-secondary">
                  <p className="text-sm font-semibold text-text-primary">Transform</p>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2">
                      <input type="checkbox" defaultChecked className="h-4 w-4 rounded border-border bg-canvas" />
                      <span>name → full_name</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" defaultChecked className="h-4 w-4 rounded border-border bg-canvas" />
                      <span>age</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" className="h-4 w-4 rounded border-border bg-canvas" />
                      <span>internal_id</span>
                    </label>
                  </div>
                  <div className="border-t border-border pt-3 font-mono text-[13px] text-text-primary">
                    + computed field
                    <div className="mt-2 text-text-secondary">is_adult = age &gt;= 18</div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </Card>
      </div>
      <Card>
        <div className="space-y-4 font-mono">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-text-primary">Performance telemetry</h3>
            <span className="text-xs uppercase tracking-[0.2em] text-text-muted">Live</span>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: 'Throughput', value: formattedTelemetry.throughput },
              { label: 'Records/sec', value: formattedTelemetry.records },
              { label: 'Memory', value: formattedTelemetry.memory },
              { label: 'Elapsed', value: formattedTelemetry.elapsed },
              { label: 'Bytes in/out', value: formattedTelemetry.bytes },
              { label: 'Transform cost', value: `${telemetry.transformCost}%` }
            ].map((item) => (
              <div key={item.label} className="space-y-1">
                <p className="text-[11px] uppercase tracking-[0.2em] text-text-muted">{item.label}</p>
                <p className="text-lg font-semibold text-accent transition-colors">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      </Card>
      <Card>
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-text-primary">Output</h3>
          <div className="rounded-lg border border-border bg-surface p-4 text-sm text-text-secondary">
            <p>Output ready for download after conversion completes.</p>
            <p className="mt-2 text-text-muted">Format: {detection.format} → JSON</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button variant="secondary">Download output</Button>
            <Button variant="ghost">Copy output</Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
