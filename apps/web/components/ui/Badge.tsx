import { cn } from '@/lib/utils';

type BadgeProps = {
  className?: string;
  children: React.ReactNode;
};

export function Badge({ className, children }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border border-border bg-surface px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] text-text-secondary',
        className
      )}
    >
      {children}
    </span>
  );
}
