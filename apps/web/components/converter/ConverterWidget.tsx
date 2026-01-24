'use client';

import { useMemo, useRef, useState } from 'react';

import {
  convertAndSave,
  convertFile,
  detectStructure,
  getMimeType,
  getSuggestedFilename,
  isFileSystemAccessSupported,
  type Format,
  type Stats,
  type StructureDetection,
  type TransformConfig
} from '@/lib/convert-buddy';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { CommandCenter, type DetectionSummary } from '@/components/converter/CommandCenter';
import type { SchemaField } from '@/components/converter/TransformEditor';

const LARGE_FILE_BYTES = 25 * 1024 * 1024;
const MAX_PREVIEW_BYTES = 200_000;

const formatList: Format[] = ['csv', 'json', 'ndjson', 'xml'];

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

function toFormat(value?: string): Format | undefined {
  if (!value) return undefined;
  const normalized = value.toLowerCase();
  return formatList.includes(normalized as Format) ? (normalized as Format) : undefined;
}

function bytesToMb(value: number) {
  return value / (1024 * 1024);
}

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
  const [file, setFile] = useState<File | null>(null);
  const [schema, setSchema] = useState<SchemaField[]>([]);
  const [detection, setDetection] = useState<StructureDetection | null>(null);
  const [selectedOutput, setSelectedOutput] = useState(outputFormat ?? 'JSON');
  const [transformConfig, setTransformConfig] = useState<TransformConfig | null>(null);
  const [outputBytes, setOutputBytes] = useState<Uint8Array | null>(null);
  const [outputPreview, setOutputPreview] = useState<string>('');
  const [outputNote, setOutputNote] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const [isDetected, setIsDetected] = useState(false);
  const startTimeRef = useRef<number | null>(null);

  const resolvedInputFormat = useMemo<Format | 'auto'>(() => {
    const fromProp = toFormat(inputFormat);
    if (fromProp) return fromProp;
    if (detection?.format) return detection.format;
    return 'auto';
  }, [detection?.format, inputFormat]);

  const resolvedOutputFormat = useMemo<Format>(() => {
    const format = toFormat(outputFormat ?? selectedOutput) ?? 'json';
    return format;
  }, [outputFormat, selectedOutput]);

  const detectionSummary = useMemo<DetectionSummary>(() => {
    const formatLabel = detection?.format?.toUpperCase() ?? inputFormat ?? 'Unknown';
    let structureLabel = 'Awaiting detection.';
    if (detection?.format === 'csv' && detection.delimiter) {
      structureLabel = `CSV delimiter "${detection.delimiter}"`;
    } else if (detection?.format === 'xml' && detection.recordElement) {
      structureLabel = `XML record "${detection.recordElement}"`;
    } else if (detection?.format) {
      structureLabel = 'Field structure detected.';
    }

    return {
      format: formatLabel,
      structure: structureLabel,
      records: file ? 'Estimated during conversion' : '—',
      fields: detection?.fields?.length ?? 0,
      delimiter: detection?.delimiter,
      recordElement: detection?.recordElement
    };
  }, [detection, file, inputFormat]);

  const formattedTelemetry = useMemo(
    () => ({
      throughput: `${telemetry.throughput.toFixed(1)} MB/s`,
      records: `${telemetry.recordsPerSec.toLocaleString('en-US', { maximumFractionDigits: 0 })}`,
      memory: `${telemetry.memory.toFixed(1)} MB`,
      elapsed: new Date(telemetry.elapsedSec * 1000).toISOString().substring(14, 19),
      bytes: `${bytesToMb(telemetry.bytesIn).toFixed(1)} MB / ${bytesToMb(telemetry.bytesOut).toFixed(1)} MB`
    }),
    [telemetry]
  );

  const detectFile = async (nextFile: File) => {
    setIsDetecting(true);
    setIsDetected(false);
    setErrorMessage(null);
    setDetection(null);
    setSchema([]);
    try {
      const structure = await detectStructure(nextFile.stream(), undefined, { maxBytes: 256 * 1024 });
      if (!structure) {
        setErrorMessage('Unable to detect the structure for this file.');
        return;
      }
      if (inputFormat && structure.format.toLowerCase() !== inputFormat.toLowerCase()) {
        setErrorMessage(`Detected ${structure.format.toUpperCase()} but this converter expects ${inputFormat}.`);
      }
      setDetection(structure);
      setSchema(
        structure.fields.map((field) => ({
          name: field,
          type: 'string',
          sample: '—'
        }))
      );
      setIsDetected(true);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Detection failed.');
    } finally {
      setIsDetecting(false);
    }
  };

  const handleFileSelected = async (nextFile: File) => {
    setFile(nextFile);
    setOutputBytes(null);
    setOutputPreview('');
    setOutputNote('');
    await detectFile(nextFile);
  };

  const updateTelemetry = (stats: Stats) => {
    const elapsedSec = startTimeRef.current ? (Date.now() - startTimeRef.current) / 1000 : 0;
    const recordsPerSec = elapsedSec > 0 ? stats.recordsProcessed / elapsedSec : 0;
    setTelemetry({
      throughput: stats.throughputMbPerSec,
      recordsPerSec,
      memory: bytesToMb(stats.maxBufferSize),
      elapsedSec,
      bytesIn: stats.bytesIn,
      bytesOut: stats.bytesOut,
      transformCost: stats.transformTimeMs ? (stats.transformTimeMs / Math.max(stats.parseTimeMs + stats.transformTimeMs + stats.writeTimeMs, 1)) * 100 : 0
    });
    
    // Trigger grid animation based on records processed
    window.dispatchEvent(new CustomEvent('grid-animate-progress', {
      detail: { recordsProcessed: stats.recordsProcessed }
    }));
  };

  const handleConvert = async () => {
    if (!file) return;
    if (errorMessage) return;

    setIsConverting(true);
    setOutputBytes(null);
    setOutputPreview('');
    setOutputNote('');
    startTimeRef.current = Date.now();

    try {
      const suggestedName = getSuggestedFilename(file.name, resolvedOutputFormat);
      const options = {
        inputFormat: resolvedInputFormat,
        outputFormat: resolvedOutputFormat,
        transform: transformConfig ?? undefined,
        onProgress: updateTelemetry,
        progressIntervalBytes: 1024 * 1024
      };

      if (file.size >= LARGE_FILE_BYTES && isFileSystemAccessSupported()) {
        await convertAndSave(file, {
          ...options,
          suggestedName
        });
        setOutputNote('Saved to disk with streaming conversion.');
        return;
      }

      const result = await convertFile(file, options);
      setOutputBytes(result);

      const previewSlice = result.slice(0, MAX_PREVIEW_BYTES);
      const previewText = new TextDecoder().decode(previewSlice);
      setOutputPreview(previewText);
      setOutputNote(
        result.length > MAX_PREVIEW_BYTES
          ? `Showing the first ${MAX_PREVIEW_BYTES.toLocaleString()} bytes of output.`
          : 'Output ready for download.'
      );
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Conversion failed.');
    } finally {
      setIsConverting(false);
    }
  };

  const handleDownload = () => {
    if (!outputBytes) return;
    const blob = new Blob([outputBytes], { type: getMimeType(resolvedOutputFormat) ?? 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = getSuggestedFilename(file?.name ?? 'converted', resolvedOutputFormat);
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleCopy = async () => {
    if (!outputBytes) return;
    if (outputBytes.length > MAX_PREVIEW_BYTES) {
      setOutputNote('Output is large. Download the file to view the full conversion.');
      return;
    }
    const text = new TextDecoder().decode(outputBytes);
    await navigator.clipboard.writeText(text);
    setOutputNote('Output copied to clipboard.');
  };

  const fileName = file?.name ?? null;

  return (
    <div className="space-y-6">
      <CommandCenter
        conversionLabel={conversionLabel}
        inputFormat={inputFormat}
        outputFormat={outputFormat}
        fileName={fileName}
        isDetecting={isDetecting}
        isDetected={isDetected}
        detectionSummary={detectionSummary}
        schema={schema}
        selectedOutput={selectedOutput}
        onOutputChange={setSelectedOutput}
        onFileSelected={handleFileSelected}
        onTransformChange={setTransformConfig}
        onConvert={handleConvert}
        isConverting={isConverting}
        errorMessage={errorMessage}
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
              { label: 'Transform cost', value: `${telemetry.transformCost.toFixed(1)}%` }
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
            {outputPreview ? (
              <pre className="max-h-60 overflow-auto whitespace-pre-wrap text-xs text-text-primary">
                {outputPreview}
              </pre>
            ) : (
              <p>{outputNote || 'Output will appear here after conversion completes.'}</p>
            )}
            <p className="mt-2 text-text-muted">
              Format: {inputFormat ?? detectionSummary.format} → {outputFormat ?? selectedOutput}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button variant="secondary" onClick={handleDownload} disabled={!outputBytes}>
              Download output
            </Button>
            <Button variant="ghost" onClick={handleCopy} disabled={!outputBytes}>
              Copy output
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
