import { cn } from '@/lib/utils';

type SectionHeadingProps = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  className?: string;
};

export function SectionHeading({ eyebrow, title, subtitle, className }: SectionHeadingProps) {
  return (
    <div className={cn('space-y-3', className)}>
      {eyebrow ? <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-400">{eyebrow}</p> : null}
      <h2 className="text-3xl font-semibold text-ink-900">{title}</h2>
      {subtitle ? <p className="max-w-3xl text-base text-ink-600">{subtitle}</p> : null}
    </div>
  );
}
