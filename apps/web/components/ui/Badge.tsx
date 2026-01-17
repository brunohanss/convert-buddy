import { cn } from '@/lib/utils';

type BadgeProps = {
  className?: string;
  children: React.ReactNode;
};

export function Badge({ className, children }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border border-ink-200 bg-ink-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] text-ink-600',
        className
      )}
    >
      {children}
    </span>
  );
}
