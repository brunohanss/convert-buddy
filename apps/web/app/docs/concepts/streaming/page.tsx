import dynamic from 'next/dynamic';

import React from 'react';
import SandpackExample from '@/components/mdx/Sandpack';

export default function Page() {
  return (
    <div>
      <h1>Streaming</h1>

      <p>
        Streaming is the core of Convert Buddy. Inputs are read in chunks, parsed,
        transformed, and emitted continuously.
      </p>

      <h2>Minimal example</h2>
      <SandpackExample
        template="node"
        activeFile="/index.ts"
        preview={false}
        files={{
          '/index.js': `
import { ConvertBuddyTransformStream } from "convert-buddy-js";

const transform = new ConvertBuddyTransformStream({ inputFormat: "csv", outputFormat: "json" });
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
import { ConvertBuddyTransformStream } from "convert-buddy-js";

const transform = new ConvertBuddyTransformStream({
  inputFormat: "ndjson",
  outputFormat: "json",
  transform: (r) => ({ ...r, processed: true })
});
`,
        }}
      />
    </div>
  );
}
