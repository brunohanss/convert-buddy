import dynamic from 'next/dynamic';

import React from 'react';
import SandpackExample from '@/components/mdx/Sandpack';

export default function Page() {
  return (
    <div>
      <h1>Cancellation</h1>

      <p>Conversion can be cancelled via AbortController.</p>

      <h2>Minimal example</h2>
      <SandpackExample
        template="node"
        activeFile="/index.ts"
        preview={false}
        files={{
          '/index.js': `
const controller = new AbortController();
await buddy.convert(stream, { signal: controller.signal });
`,
        }}
      />

      <h2>Advanced example</h2>
      <SandpackExample
        template="node"
        activeFile="/index.ts"
        preview={false}
        files={{
          '/index.js': `
const controller = new AbortController();
const promise = buddy.convert(stream, { signal: controller.signal });
setTimeout(() => controller.abort(), 5000);
await promise;
`,
        }}
      />
    </div>
  );
}
