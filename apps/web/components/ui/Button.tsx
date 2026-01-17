import Link from 'next/link';

import { cn } from '@/lib/utils';

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  href?: string;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md';
  className?: string;
  children: React.ReactNode;
};

export function Button({
  href,
  variant = 'primary',
  size = 'md',
  className,
  children,
  ...props
}: ButtonProps) {
  const base =
    'inline-flex items-center justify-center rounded-md border px-4 font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-accent-500 focus:ring-offset-2';
  const variants = {
    primary: 'border-transparent bg-accent-500 text-white hover:bg-accent-600',
    secondary: 'border-ink-200 bg-white text-ink-700 hover:bg-ink-50',
    ghost: 'border-transparent bg-transparent text-ink-700 hover:bg-ink-50'
  };
  const sizes = {
    sm: 'h-9 text-sm',
    md: 'h-11 text-sm'
  };

  const classes = cn(base, variants[variant], sizes[size], className);

  if (href) {
    return (
      <Link className={classes} href={href}>
        {children}
      </Link>
    );
  }

  return (
    <button className={classes} {...props}>
      {children}
    </button>
  );
}
