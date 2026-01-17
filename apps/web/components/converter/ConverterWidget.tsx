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
      <Card>
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-ink-900">Input</h3>
              <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-ink-200 bg-ink-50 px-6 py-10 text-center">
                <p className="text-sm font-medium text-ink-700">Drag & drop a file</p>
                <p className="text-xs text-ink-400">CSV, JSON, NDJSON, or XML</p>
                <Button variant="secondary" size="sm">
                  Choose file
                </Button>
              </div>
              <textarea
                className="min-h-[120px] w-full rounded-lg border border-ink-200 px-4 py-3 text-sm focus:border-accent-500 focus:outline-none"
                placeholder="Paste raw data for quick conversion"
              />
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button onClick={handleConvert}>{isConverting ? 'Converting…' : 'Convert'}</Button>
              <Button variant="secondary">Download output</Button>
              <Button variant="ghost">Copy to clipboard</Button>
            </div>
          </div>
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-ink-900">Detection</h3>
            <div className="rounded-lg border border-ink-100 bg-ink-50 p-4 text-sm text-ink-700">
              <p>Detected format: {detection.format}</p>
              <p>Delimiter: {detection.delimiter}</p>
              <p>Headers: {detection.headers}</p>
              <p>Fields: {detection.fields}</p>
              <p>Estimated records: {detection.estimatedRecords}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-400"
                onClick={() => setAdvancedOpen((prev) => !prev)}
                type="button"
              >
                {advancedOpen ? 'Hide detected config' : 'Show detected config'}
              </button>
            </div>
            {advancedOpen ? (
              <div className="rounded-lg border border-ink-100 bg-white p-4 text-sm">
                <p className="font-medium text-ink-700">Override configuration</p>
                <div className="mt-3 grid gap-3">
                  <label className="text-xs text-ink-500">Delimiter</label>
                  <input className="rounded-md border border-ink-200 px-3 py-2 text-sm" defaultValue="," />
                  <label className="text-xs text-ink-500">Header row</label>
                  <select className="rounded-md border border-ink-200 px-3 py-2 text-sm">
                    <option>Auto</option>
                    <option>Yes</option>
                    <option>No</option>
                  </select>
                </div>
              </div>
            ) : null}
            <button
              className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-400"
              onClick={() => setTransformOpen((prev) => !prev)}
              type="button"
            >
              {transformOpen ? 'Hide transform editor' : 'Open transform editor'}
            </button>
          </div>
        </div>
      </Card>
      {transformOpen ? (
        <Card>
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-ink-900">Transform</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2 text-sm text-ink-600">
                <p className="font-medium text-ink-800">Field selection</p>
                <ul className="list-disc pl-4">
                  <li>Include: name, age, city</li>
                  <li>Exclude: internal_id</li>
                </ul>
              </div>
              <div className="space-y-2 text-sm text-ink-600">
                <p className="font-medium text-ink-800">Computed fields</p>
                <ul className="list-disc pl-4">
                  <li>age_group = age &gt; 50 ? "senior" : "adult"</li>
                  <li>source = "upload"</li>
                </ul>
              </div>
            </div>
            <div className="rounded-lg border border-ink-100 bg-ink-50 p-4 text-sm text-ink-700">
              <p className="font-medium text-ink-900">Output schema preview</p>
              <p>name · age · city · age_group · source</p>
            </div>
          </div>
        </Card>
      ) : null}
      <Card>
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-ink-900">Performance telemetry</h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-ink-400">Throughput</p>
              <p className="text-lg font-semibold text-ink-900">{formattedTelemetry.throughput}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-ink-400">Records/sec</p>
              <p className="text-lg font-semibold text-ink-900">{formattedTelemetry.records}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-ink-400">Memory usage</p>
              <p className="text-lg font-semibold text-ink-900">{formattedTelemetry.memory}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-ink-400">Elapsed</p>
              <p className="text-lg font-semibold text-ink-900">{formattedTelemetry.elapsed}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-ink-400">Bytes in/out</p>
              <p className="text-lg font-semibold text-ink-900">{formattedTelemetry.bytes}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-ink-400">Transform cost</p>
              <p className="text-lg font-semibold text-ink-900">{telemetry.transformCost}%</p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
