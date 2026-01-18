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
    'inline-flex items-center justify-center rounded-md border px-4 font-medium transition-all focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-canvas';
  const variants = {
    primary: 'border-transparent bg-accent text-white hover:bg-accent-600 hover:shadow-glow',
    secondary: 'border-border bg-transparent text-text-secondary hover:border-accent/40 hover:text-text-primary',
    ghost: 'border-transparent bg-transparent text-text-secondary hover:text-text-primary'
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
