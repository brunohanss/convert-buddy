import dynamic from 'next/dynamic';

import React from 'react';
import SandpackExample from '@/components/mdx/Sandpack';

export default function Page() {
  return (
    <div>
      <h1>Detect structure</h1>

      <p>Structure detection extracts fields, record element names, and schema hints.</p>

      <h2>Minimal example</h2>

      <SandpackExample
        template="node"
        activeFile="/index.ts"
        preview={false}
        files={{
          '/index.js': `
import { detectStructure } from "convert-buddy-js";

const structure = await detectStructure(stream);
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
import { detectStructure } from "convert-buddy-js";

const structure = await detectStructure(stream, { maxRecords: 5000 });
`,
        }}
      />
    </div>
  );
}
