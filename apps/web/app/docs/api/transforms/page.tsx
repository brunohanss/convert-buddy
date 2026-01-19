import dynamic from 'next/dynamic';

import React from 'react';
import SandpackExample from '@/components/mdx/Sandpack';

export default function Page() {
  return (
    <div>
      <h1>Transforms API</h1>

      <p>Transforms provide record-level control over output and schema.</p>

      <h2>Minimal example</h2>
      <SandpackExample
        template="node"
        activeFile="/index.ts"
        preview={false}
        files={{
          '/index.js': `
import { ConvertBuddy } from "convert-buddy-js";

const buddy = new ConvertBuddy({
  transform: (r) => ({ id: r.id, created_at: new Date(r.ts).toISOString() })
});
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
import { ConvertBuddy } from "convert-buddy-js";

const buddy = new ConvertBuddy({
  transform: (r) => ({
    id: r.id,
    created_at: new Date(r.ts).toISOString(),
    is_priority: r.score > 0.8
  })
});
`,
        }}
      />
    </div>
  );
}
