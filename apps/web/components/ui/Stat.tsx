import { cn } from '@/lib/utils';

type StatProps = {
  label: string;
  value: string;
  className?: string;
};

export function Stat({ label, value, className }: StatProps) {
  return (
    <div className={cn('space-y-1', className)}>
      <p className="text-xs uppercase tracking-[0.2em] text-text-muted">{label}</p>
      <p className="text-lg font-semibold text-text-primary">{value}</p>
    </div>
  );
}
