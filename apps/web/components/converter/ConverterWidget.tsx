'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import { loadConvertBuddyWasm } from '@/lib/wasm';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { CommandCenter } from '@/components/converter/CommandCenter';

type TelemetryState = {
  throughput: number;
  recordsPerSec: number;
  memory: number;
  elapsedSec: number;
  bytesIn: number;
  bytesOut: number;
  transformCost: number;
};

type ConverterWidgetProps = {
  inputFormat?: string;
  outputFormat?: string;
  conversionLabel?: string;
};

export function ConverterWidget({ inputFormat, outputFormat, conversionLabel }: ConverterWidgetProps) {
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
      <CommandCenter
        conversionLabel={conversionLabel}
        inputFormat={inputFormat}
        outputFormat={outputFormat}
        isConverting={isConverting}
        onConvert={handleConvert}
      />
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
            <p className="mt-2 text-text-muted">
              Format: {inputFormat ?? 'Detected'} → {outputFormat ?? 'JSON'}
            </p>
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
