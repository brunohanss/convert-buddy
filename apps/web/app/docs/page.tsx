"use client";
import dynamic from 'next/dynamic';

const DocsContent = dynamic(() => import('./content.mdx'), { ssr: false });

export default function DocsPage() {
  return <DocsContent />;
}
