import dynamic from 'next/dynamic';

import React from 'react';
import SandpackExample from '@/components/mdx/Sandpack';

export default function Page() {
  return (
    <div>
      <h1>Browser API</h1>

      <p>
        The browser API provides streaming conversion with Web Workers and WASM
        loading on demand.
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
import { ConvertBuddy } from "convert-buddy-js";

const buddy = new ConvertBuddy({
  inputFormat: "csv",
  outputFormat: "ndjson",
  wasmUrl: "/wasm/convert-buddy.wasm"
});
`,
        }}
      />
    </div>
  );
}
