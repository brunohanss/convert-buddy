'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { docsNavigation } from '@/lib/docs-navigation';
import { cn } from '@/lib/utils';

export function DocsSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-72 shrink-0 space-y-8 rounded-lg border border-border bg-surface px-6 py-6 lg:block">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">Documentation</p>
      {docsNavigation.map((section) => (
        <div key={section.section} className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">{section.section}</p>
          <ul className="space-y-2 text-sm">
            {section.links.map((link) => {
              const isActive = pathname === link.href;
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className={cn(
                      'block rounded-md px-2 py-1 text-text-secondary transition-colors hover:text-text-primary',
                      isActive && 'bg-elevated text-accent'
                    )}
                  >
                    {link.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </aside>
  );
}
