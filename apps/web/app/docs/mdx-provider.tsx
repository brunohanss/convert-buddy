"use client";

import * as React from 'react';
import { MDXProvider } from '@mdx-js/react';

import { mdxComponents } from '@/components/mdx/MDXComponents';

export function MdxProvider({ children }: { children: React.ReactNode }) {
  return <MDXProvider components={mdxComponents}>{children}</MDXProvider>;
}
