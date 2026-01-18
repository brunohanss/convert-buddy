import { cn } from '@/lib/utils';

type CardProps = {
  className?: string;
  children: React.ReactNode;
};

export function Card({ className, children }: CardProps) {
  return (
    <div className={cn('rounded-lg border border-border bg-elevated p-6', className)}>
      {children}
    </div>
  );
}
