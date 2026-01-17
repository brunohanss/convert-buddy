import Link from 'next/link';

import { docsNavigation } from '@/lib/docs-navigation';

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex w-full max-w-6xl gap-10 px-6 py-16">
      <aside className="hidden w-64 shrink-0 space-y-8 lg:block">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-400">Documentation</p>
        {docsNavigation.map((section) => (
          <div key={section.section} className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-400">{section.section}</p>
            <ul className="space-y-2 text-sm text-ink-600">
              {section.links.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="hover:text-ink-900">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </aside>
      <div className="min-w-0 flex-1">
        <div className="prose max-w-none prose-headings:text-ink-900 prose-p:text-ink-600">
          {children}
        </div>
      </div>
    </div>
  );
}
