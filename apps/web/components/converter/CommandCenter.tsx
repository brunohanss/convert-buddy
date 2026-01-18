'use client';

import { useRef, useState, type DragEvent } from 'react';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { TransformEditor, type SchemaField } from '@/components/converter/TransformEditor';
import type { TransformConfig } from '@/lib/convert-buddy';

export type DetectionSummary = {
  format: string;
  structure: string;
  records: string;
  fields: number;
  delimiter?: string;
  recordElement?: string;
};

type CommandCenterProps = {
  conversionLabel?: string;
  inputFormat?: string;
  outputFormat?: string;
  fileName?: string | null;
  isDetecting: boolean;
  isDetected: boolean;
  detectionSummary: DetectionSummary;
  schema: SchemaField[];
  selectedOutput: string;
  onOutputChange: (value: string) => void;
  onFileSelected: (file: File) => void;
  onConvert: () => void;
  onTransformChange: (config: TransformConfig | null) => void;
  isConverting?: boolean;
  errorMessage?: string | null;
};

export function CommandCenter({
  conversionLabel,
  inputFormat,
  outputFormat,
  fileName,
  isDetecting,
  isDetected,
  detectionSummary,
  schema,
  selectedOutput,
  onOutputChange,
  onFileSelected,
  onConvert,
  onTransformChange,
  isConverting,
  errorMessage
}: CommandCenterProps) {
  const [transformOpen, setTransformOpen] = useState(true);
  const [dragActive, setDragActive] = useState(false);
  const conversionLocked = Boolean(outputFormat && inputFormat);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragActive(false);
    const file = event.dataTransfer.files[0];
    if (file) {
      onFileSelected(file);
    }
  };

  return (
    <Card className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">Command Center</p>
          <h2 className="text-2xl font-semibold text-text-primary">Detect → schema → convert</h2>
          <p className="text-sm text-text-secondary">
            Drop a file and watch Convert Buddy detect structure, preview fields, and convert instantly.
          </p>
        </div>
        {conversionLabel ? <Badge className="border-accent/40 text-accent">{conversionLabel}</Badge> : null}
      </div>

      <div
        className={`flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed px-6 py-12 text-center transition ${
          dragActive ? 'border-accent bg-accent/10' : 'border-border bg-surface'
        }`}
        onDragOver={(event) => {
          event.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
      >
        <p className="text-base font-semibold text-text-primary">Drop a file to detect + convert</p>
        <p className="text-xs text-text-muted">Supported formats: CSV, JSON, NDJSON, XML</p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
          >
            Choose file
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) {
                onFileSelected(file);
              }
            }}
          />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-surface p-4 text-sm text-text-secondary">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-semibold text-text-primary">Detection status</p>
              {isDetecting ? (
                <Badge className="border-accent/40 text-accent">Detecting</Badge>
              ) : isDetected ? (
                <Badge className="border-emerald-500/30 text-emerald-300">Detected</Badge>
              ) : (
                <Badge className="border-border/60 text-text-muted">Idle</Badge>
              )}
            </div>
            <div className="mt-3 space-y-1">
              <p>Format: {detectionSummary.format}</p>
              <p>Structure: {detectionSummary.structure}</p>
              <p>Fields: {detectionSummary.fields}</p>
              <p>Estimated records: {detectionSummary.records}</p>
              {detectionSummary.delimiter ? <p>Delimiter: {detectionSummary.delimiter}</p> : null}
              {detectionSummary.recordElement ? <p>Record element: {detectionSummary.recordElement}</p> : null}
              <p className="text-xs text-text-muted">Input: {fileName ?? 'Awaiting file'}</p>
            </div>
            {errorMessage ? <p className="mt-2 text-xs text-red-300">{errorMessage}</p> : null}
          </div>
          <div className="rounded-lg border border-border bg-surface p-4">
            <p className="text-sm font-semibold text-text-primary">Schema preview</p>
            <p className="text-xs text-text-muted">Detected fields with sample values.</p>
            <div className="mt-3 space-y-2">
              {schema.length ? (
                schema.map((field) => (
                  <div
                    key={field.name}
                    className="flex items-center justify-between rounded-md border border-border bg-canvas/70 px-3 py-2 text-sm"
                  >
                    <div>
                      <p className="font-medium text-text-primary">{field.name}</p>
                      <p className="text-xs text-text-muted">{field.type}</p>
                    </div>
                    <p className="text-xs text-text-secondary">{field.sample}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-text-muted">Drop a file to inspect the detected schema.</p>
              )}
            </div>
          </div>
        </div>
        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-surface p-4">
            <p className="text-sm font-semibold text-text-primary">Output format</p>
            <p className="text-xs text-text-muted">Choose your destination format.</p>
            <div className="mt-3">
              {conversionLocked ? (
                <div className="flex items-center justify-between rounded-md border border-border bg-canvas/70 px-3 py-2 text-sm text-text-primary">
                  <span>
                    {inputFormat} → {outputFormat}
                  </span>
                  <Badge className="border-border/60 text-text-muted">Locked</Badge>
                </div>
              ) : (
                <select
                  value={selectedOutput}
                  onChange={(event) => onOutputChange(event.target.value)}
                  className="w-full rounded-md border border-border bg-canvas px-3 py-2 text-sm text-text-primary"
                >
                  {['JSON', 'CSV', 'NDJSON', 'XML'].map((format) => (
                    <option key={format} value={format}>
                      {format}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>
          <div>
            <button
              className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted"
              onClick={() => setTransformOpen((prev) => !prev)}
              type="button"
            >
              {transformOpen ? 'Hide transform editor' : 'Open transform editor'}
            </button>
            {transformOpen ? <TransformEditor fields={schema} onChange={onTransformChange} /> : null}
          </div>
          <div className="flex flex-wrap gap-3">
            <Button onClick={onConvert} disabled={!fileName || isConverting}>
              {isConverting ? 'Converting…' : 'Convert file'}
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
