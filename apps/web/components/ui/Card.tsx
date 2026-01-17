import { cn } from '@/lib/utils';

type CardProps = {
  className?: string;
  children: React.ReactNode;
};

export function Card({ className, children }: CardProps) {
  return (
    <div className={cn('rounded-xl border border-ink-100 bg-white p-6 shadow-panel', className)}>
      {children}
    </div>
  );
}
