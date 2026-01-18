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
      {eyebrow ? <p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">{eyebrow}</p> : null}
      <h2 className="text-[36px] font-semibold leading-tight text-text-primary">{title}</h2>
      {subtitle ? <p className="max-w-3xl text-base text-text-secondary">{subtitle}</p> : null}
    </div>
  );
}
