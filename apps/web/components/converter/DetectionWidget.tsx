'use client';

import { useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

import { detectStructure, type StructureDetection } from '@/lib/convert-buddy';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

const MAX_SAMPLE_BYTES = 256 * 1024;

export function DetectionWidget() {
  const router = useRouter();
  const [detection, setDetection] = useState<StructureDetection | null>(null);
  const [inputText, setInputText] = useState('');
  const [status, setStatus] = useState<'idle' | 'detecting' | 'ready' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const detectionJson = useMemo(() => (detection ? JSON.stringify(detection, null, 2) : ''), [detection]);

  const handleDetect = async (input: File | string) => {
    setStatus('detecting');
    setError(null);
    setDetection(null);

    try {
      const source = typeof input === 'string' ? input : input.stream();
      const result = await detectStructure(source, undefined, { maxBytes: MAX_SAMPLE_BYTES });
      if (!result) {
        setError('Unable to detect structure for this input.');
        setStatus('error');
        return;
      }
      setDetection(result);
      setStatus('ready');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Detection failed.');
      setStatus('error');
    }
  };

  const handleFileSelected = async (file: File) => {
    setFileName(file.name);
    await handleDetect(file);
  };

  const statusLabel = status === 'detecting' ? 'Detecting…' : status === 'ready' ? 'Detected' : 'Idle';

  return (
    <Card>
      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-text-primary">Inspect a file</h3>
          <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border bg-surface px-6 py-10 text-center">
            <p className="text-sm font-medium text-text-primary">Drop a file or stream input</p>
            <p className="text-xs text-text-muted">We detect format and structure instantly.</p>
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
                  handleFileSelected(file);
                }
              }}
            />
          </div>
          <textarea
            value={inputText}
            onChange={(event) => setInputText(event.target.value)}
            className="min-h-[120px] w-full rounded-lg border border-border bg-surface px-4 py-3 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none"
            placeholder="Paste raw data for format detection"
          />
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              onClick={() => handleDetect(inputText)}
              disabled={!inputText.trim()}
            >
              Detect pasted input
            </Button>
            <span className="text-xs text-text-muted">Status: {statusLabel}</span>
          </div>
        </div>
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-text-primary">Detection results</h3>
          <div className="rounded-lg border border-border bg-surface p-4 text-sm text-text-secondary">
            {detection ? (
              <>
                <p>Format: {detection.format.toUpperCase()}</p>
                {detection.recordElement ? <p>Record element: {detection.recordElement}</p> : null}
                {detection.delimiter ? <p>Delimiter: {detection.delimiter}</p> : null}
                <p>Fields: {detection.fields.join(', ') || 'None detected'}</p>
                <p className="text-xs text-text-muted">Input: {fileName ?? 'Pasted data'}</p>
              </>
            ) : (
              <p>No detection results yet. Upload a file or paste input to inspect.</p>
            )}
            {error ? <p className="mt-2 text-xs text-red-300">{error}</p> : null}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              onClick={async () => {
                if (!detectionJson) return;
                await navigator.clipboard.writeText(detectionJson);
              }}
              disabled={!detectionJson}
            >
              Copy detection JSON
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => router.push('/convert')}
            >
              Apply transform
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/convert')}
            >
              Continue to conversion
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
