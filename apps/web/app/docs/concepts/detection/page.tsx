import dynamic from 'next/dynamic';

import React from 'react';
import SandpackExample from '@/components/mdx/Sandpack';

export default function Page() {
  return (
    <div>
      <h1>Detection</h1>

      <p>
        Convert Buddy can infer format and structure before conversion. Detection
        runs on streams and returns JSON metadata.
      </p>

      <h2>Minimal example</h2>
      <SandpackExample
        template="node"
        activeFile="/index.ts"
        preview={false}
        files={{
          '/index.js': `
import { detectFormat, detectStructure } from "convert-buddy-js";

const format = await detectFormat(stream);
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
import { detectFormat, detectStructure } from "convert-buddy-js";

const format = await detectFormat(stream, { sampleBytes: 4_000_000 });
const structure = await detectStructure(stream, { maxRecords: 25_000 });
`,
        }}
      />
    </div>
  );
}
