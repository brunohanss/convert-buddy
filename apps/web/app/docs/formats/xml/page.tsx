import { DynamicMdx } from '@/components/mdx/DynamicMdx';

export default function Page() {
  return <DynamicMdx loader={() => import('./content.mdx')} />;
}
