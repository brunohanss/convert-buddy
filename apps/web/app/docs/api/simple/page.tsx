import dynamic from 'next/dynamic';

import React from 'react';
import SandpackExample from '@/components/mdx/Sandpack';

export default function Page() {
  return (
    <div>
      <h1>Simple API</h1>

      <p>
        The simple API converts a file or stream in one call. It is ideal for UI
        flows and scripting.
      </p>

      <h2>Minimal example</h2>
      <SandpackExample
        template="node"
        activeFile="/index.ts"
        preview={false}
        files={{
          '/index.js': `
import { convertToString } from "convert-buddy-js";

const output = await convertToString(file, { outputFormat: "json" });
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
  inputFormat: "csv",
  outputFormat: "json",
  transform: (r) => ({ ...r, channel: "web" })
});
`,
        }}
      />
    </div>
  );
}
