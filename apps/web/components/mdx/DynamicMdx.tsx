'use client';

export function DynamicMdx(): never {
  throw new Error(
    'DynamicMdx is removed — import dynamic from "next/dynamic" and use dynamic(() => import("./content.mdx"), { ssr: false }) instead.'
  );
}
