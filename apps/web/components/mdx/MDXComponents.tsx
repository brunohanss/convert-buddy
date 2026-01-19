import type { MDXComponents } from 'mdx/types';
import { Pre } from '@/components/mdx/Pre';
import SandpackExample from '@/components/mdx/Sandpack';

export const mdxComponents: MDXComponents = {
  pre: Pre as any,
  SandpackExample: SandpackExample as any,
};
