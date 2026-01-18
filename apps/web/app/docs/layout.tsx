import { DocsSidebar } from '@/components/mdx/DocsSidebar';
import { MdxProvider } from '@/app/docs/mdx-provider';

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return (
    <MdxProvider>
      <div className="mx-auto flex w-full max-w-[1200px] gap-10 px-6 py-16">
        <DocsSidebar />
        <div className="min-w-0 flex-1">
          <div className="prose max-w-none prose-invert prose-headings:text-text-primary prose-p:text-text-secondary prose-li:text-text-secondary">
            {children}
          </div>
        </div>
      </div>
    </MdxProvider>
  );
}
