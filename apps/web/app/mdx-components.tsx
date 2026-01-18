"use client";

import type { MDXComponents } from 'mdx/types';

import { mdxComponents } from '@/components/mdx/MDXComponents';

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return { ...components, ...mdxComponents };
}
