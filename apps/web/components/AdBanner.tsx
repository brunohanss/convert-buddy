import { cn } from '@/lib/utils';

type AdBannerProps = {
  position: 'top' | 'mid' | 'bottom';
  className?: string;
};

export function AdBanner({ position, className }: AdBannerProps) {
  return (
    <div
      className={cn(
        'flex min-h-[96px] items-center justify-center rounded-xl border border-dashed border-ink-200 bg-ink-50 text-xs uppercase tracking-[0.2em] text-ink-400',
        className
      )}
      aria-label={`Advertisement banner ${position}`}
    >
      Ad placement · {position}
    </div>
  );
}
