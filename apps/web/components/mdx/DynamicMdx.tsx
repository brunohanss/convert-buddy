'use client';

import { useMemo } from 'react';
import dynamic from 'next/dynamic';

type MdxModule = { default: React.ComponentType };

type DynamicMdxProps = {
  loader: () => Promise<MdxModule>;
};

export function DynamicMdx({ loader }: DynamicMdxProps) {
  const Content = useMemo(() => dynamic(loader, { ssr: false }), [loader]);

  return <Content />;
}
