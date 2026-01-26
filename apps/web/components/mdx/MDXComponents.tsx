import type { MDXComponents } from 'mdx/types';
import { Pre } from '@/components/mdx/Pre';
import PlaygroundExample from '@/components/mdx/Playground';

export const mdxComponents: MDXComponents = {
  pre: Pre as any,
  // New canonical name
  PlaygroundExample: PlaygroundExample as any,
  // Backcompat: map legacy `SandpackExample` to the new Playground
  SandpackExample: PlaygroundExample as any,
};
