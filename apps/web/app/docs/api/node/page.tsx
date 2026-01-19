import dynamic from 'next/dynamic';

import React from 'react';
import SandpackExample from '@/components/mdx/Sandpack';

export default function Page() {
  return (
    <div>
      <h1>Node API</h1>

      <p>
        Use the Node API for ETL pipelines and backend processing with the same
        streaming engine.
      </p>

      <h2>Minimal example</h2>
      <SandpackExample
        template="node"
        activeFile="/index.ts"
        preview={false}
        files={{
          '/index.js': `
import { convertToString } from "convert-buddy-js";

const output = await convertToString(nodeStream, { outputFormat: "json" });
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
  inputFormat: "xml",
  outputFormat: "json",
  transform: (r) => ({ ...r, source: "node" })
});

await buddy.convert(nodeStream, { highWaterMark: 1024 * 1024 });
`,
        }}
      />
    </div>
  );
}
