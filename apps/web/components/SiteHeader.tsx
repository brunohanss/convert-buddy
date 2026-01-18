import Link from 'next/link';

import { Button } from '@/components/ui/Button';

const navItems = [
  { label: 'Convert', href: '/convert' },
  { label: 'Developers', href: '/developers' },
  { label: 'Docs', href: '/docs' },
  { label: 'Legal', href: '/legal' }
];

export function SiteHeader() {
  return (
    <header className="border-b border-border bg-surface">
      <div className="mx-auto flex w-full max-w-[1200px] items-center justify-between px-6 py-4">
        <div className="flex items-center gap-8">
          <Link href="/" className="text-sm font-semibold uppercase tracking-[0.2em] text-text-primary">
            Convert Buddy
          </Link>
          <nav className="hidden items-center gap-6 text-sm text-text-secondary md:flex">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href} className="transition-colors hover:text-text-primary">
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <Button href="/convert" variant="secondary" size="sm">
            Convert a file
          </Button>
          <Button href="/developers" size="sm">
            Use the library
          </Button>
        </div>
      </div>
    </header>
  );
}
