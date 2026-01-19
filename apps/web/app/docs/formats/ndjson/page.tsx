import dynamic from 'next/dynamic';

import React from 'react';
import SandpackExample from '@/components/mdx/Sandpack';

export default function Page() {
  return (
    <div>
      <h1>NDJSON</h1>

      <p>NDJSON is processed line-by-line for deterministic streaming conversion.</p>

      <h2>Minimal example</h2>
      <SandpackExample
        template="node"
        activeFile="/index.ts"
        preview={false}
        files={{
          '/index.js': `
import { convertToString } from "convert-buddy-js";

const output = await convertToString(file, { inputFormat: "ndjson", outputFormat: "json" });
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
import { convertToString } from "convert-buddy-js";

const output = await convertToString(file, {
  inputFormat: "ndjson",
  outputFormat: "json",
  ndjson: { allowTrailingComma: true }
});
`,
        }}
      />
    </div>
  );
}
