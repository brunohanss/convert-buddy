import React from 'react';
import SandpackExample from '@/components/mdx/Sandpack';

export default function Page() {
  return (
    <div>
      <h1>Detect format</h1>

      <p>Format detection inspects bytes and emits the most likely input format.</p>

      <h2>Minimal example</h2>

      <SandpackExample
        template="node"
        activeFile="/index.ts"
        preview={false}
        files={{
          '/index.js': `
import { detectFormat } from "convert-buddy-js";

const format = await detectFormat(stream);
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
import { detectFormat } from "convert-buddy-js";

const format = await detectFormat(stream, { sampleBytes: 2_000_000 });
`,
        }}
      />
    </div>
  );
}
