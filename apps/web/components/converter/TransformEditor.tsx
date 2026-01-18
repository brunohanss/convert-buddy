'use client';

import { useMemo, useState } from 'react';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

export type SchemaField = {
  name: string;
  type: string;
  sample: string;
};

type FieldTransform = SchemaField & {
  include: boolean;
  rename?: string;
  cast?: string;
};

type TransformEditorProps = {
  fields: SchemaField[];
};

const castOptions = ['Keep', 'string', 'number', 'boolean', 'date'];

export function TransformEditor({ fields }: TransformEditorProps) {
  const initialTransforms = useMemo<FieldTransform[]>(
    () =>
      fields.map((field) => ({
        ...field,
        include: !['internal_id', 'session_token'].includes(field.name),
        rename: field.name === 'name' ? 'full_name' : '',
        cast: 'Keep'
      })),
    [fields]
  );
  const [transforms, setTransforms] = useState<FieldTransform[]>(initialTransforms);
  const [computedFields, setComputedFields] = useState([
    { name: 'is_adult', expression: 'age >= 18' },
    { name: 'source', expression: '"upload"' }
  ]);

  const updateField = (index: number, updates: Partial<FieldTransform>) => {
    setTransforms((prev) =>
      prev.map((field, idx) => (idx === index ? { ...field, ...updates } : field))
    );
  };

  const addComputedField = () => {
    setComputedFields((prev) => [
      ...prev,
      { name: `computed_${prev.length + 1}`, expression: '...' }
    ]);
  };

  return (
    <Card className="border-border/80 bg-surface">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">Transform editor</p>
            <h4 className="text-lg font-semibold text-text-primary">Shape your output</h4>
            <p className="text-sm text-text-secondary">
              Select, rename, cast, and compute fields before conversion.
            </p>
          </div>
          <Badge className="border-accent/40 text-accent">Optional</Badge>
        </div>
        <div className="space-y-3">
          {transforms.map((field, index) => (
            <div key={field.name} className="rounded-lg border border-border bg-canvas/70 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <label className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={field.include}
                    onChange={(event) => updateField(index, { include: event.target.checked })}
                    className="mt-1 h-4 w-4 rounded border-border bg-canvas"
                  />
                  <div>
                    <p className="text-sm font-semibold text-text-primary">{field.name}</p>
                    <p className="text-xs text-text-muted">
                      {field.type} • sample: {field.sample}
                    </p>
                  </div>
                </label>
                <Badge className="border-border/60 text-text-muted">Detected</Badge>
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <label className="text-xs text-text-muted">
                  Rename field
                  <input
                    value={field.rename ?? ''}
                    onChange={(event) => updateField(index, { rename: event.target.value })}
                    placeholder={field.name}
                    className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary"
                  />
                </label>
                <label className="text-xs text-text-muted">
                  Cast to
                  <select
                    value={field.cast}
                    onChange={(event) => updateField(index, { cast: event.target.value })}
                    className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary"
                  >
                    {castOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-lg border border-border bg-canvas/70 p-4">
            <p className="text-sm font-semibold text-text-primary">Computed fields</p>
            <p className="text-xs text-text-muted">Derive new fields using expressions.</p>
            <div className="mt-3 space-y-3">
              {computedFields.map((field) => (
                <div key={field.name} className="rounded-md border border-border bg-surface px-3 py-2">
                  <p className="text-xs text-text-muted">{field.name}</p>
                  <p className="text-sm font-mono text-text-primary">{field.expression}</p>
                </div>
              ))}
            </div>
            <Button variant="secondary" size="sm" className="mt-3" onClick={addComputedField}>
              Add computed field
            </Button>
          </div>
          <div className="rounded-lg border border-border bg-canvas/70 p-4">
            <p className="text-sm font-semibold text-text-primary">Validation + filters</p>
            <p className="text-xs text-text-muted">Drop rows or coerce values inline.</p>
            <div className="mt-3 space-y-2 text-sm text-text-secondary">
              <div className="flex items-center justify-between rounded-md border border-border bg-surface px-3 py-2">
                <span>Keep rows where age is present</span>
                <Badge className="border-border/60 text-text-muted">Rule</Badge>
              </div>
              <div className="flex items-center justify-between rounded-md border border-border bg-surface px-3 py-2">
                <span>Coerce created_at to ISO date</span>
                <Badge className="border-border/60 text-text-muted">Cast</Badge>
              </div>
              <div className="flex items-center justify-between rounded-md border border-border bg-surface px-3 py-2">
                <span>Trim whitespace in name</span>
                <Badge className="border-border/60 text-text-muted">Normalize</Badge>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
