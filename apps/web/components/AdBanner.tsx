import { cn } from '@/lib/utils';

type AdBannerProps = {
  position: 'top' | 'mid' | 'bottom';
  className?: string;
};

export function AdBanner({ position, className }: AdBannerProps) {
  return (
    <div
      className={cn(
        'flex min-h-[96px] flex-col items-center justify-center gap-2 rounded-lg bg-[#0f1218] text-[11px] uppercase tracking-[0.3em] text-text-muted',
        className
      )}
      aria-label={`Advertisement banner ${position}`}
    >
      <span className="text-[10px] font-semibold text-text-secondary">Sponsored</span>
      <span>Ad placement · {position}</span>
    </div>
  );
}
