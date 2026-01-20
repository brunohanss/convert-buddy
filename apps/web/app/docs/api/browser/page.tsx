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
        activeFile="/index.js"
        preview={false}
        files={{
          '/index.js': `
import { convertAnyToString } from "convert-buddy-js";

const input = ${JSON.stringify('name,age\nAda,36\nLinus,54')};

async function run() {
  const output = await convertAnyToString(input, { outputFormat: "json" });
  console.log("output:", output);
}

run().catch(console.error);
`,
        }}
      />

      <h2>Advanced example</h2>

      <SandpackExample
        template="node"
        activeFile="/index.js"
        preview={false}
        files={{
          '/index.js': `
import { ConvertBuddy } from "convert-buddy-js";

const input = ${JSON.stringify('name,age\nAda,36\nLinus,54\nGrace,48')};

async function run() {
  const buddy = new ConvertBuddy({
    inputFormat: "csv",
    outputFormat: "ndjson",
    progressIntervalBytes: 32,
    onProgress: (stats) => console.log("records:", stats.recordsProcessed)
  });

  const output = await buddy.convert(input, { outputFormat: "ndjson" });
  console.log("output:", new TextDecoder().decode(output));
}

run().catch(console.error);
`,
        }}
      />
    </div>
  );
}
