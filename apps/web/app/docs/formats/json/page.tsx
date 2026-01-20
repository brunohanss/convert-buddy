import dynamic from 'next/dynamic';

import React from 'react';
import SandpackExample from '@/components/mdx/Sandpack';

export default function Page() {
  return (
    <div>
      <h1>JSON</h1>

      <p>
        JSON inputs may be arrays or objects. Convert Buddy streams records
        without buffering the full file.
      </p>

      <h2>Minimal example</h2>
      <SandpackExample
        template="node"
        activeFile="/index.js"
        preview={false}
        files={{
          '/index.js': `
import { convertToString } from "convert-buddy-js";

const input = JSON.stringify([
  { name: "Ada", age: 36 },
  { name: "Linus", age: 54 }
]);

async function run() {
  const output = await convertToString(input, {
    inputFormat: "json",
    outputFormat: "csv"
  });
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
import { convertToString } from "convert-buddy-js";

const input = JSON.stringify(
  Array.from({ length: 50 }, (_, i) => ({ name: "User" + i, age: 20 + i }))
);

async function run() {
  const output = await convertToString(input, {
    inputFormat: "json",
    outputFormat: "csv",
    progressIntervalBytes: 128,
    profile: true,
    onProgress: (stats) => {
      console.log("records:", stats.recordsProcessed);
    }
  });
  console.log("output sample:", output.slice(0, 120) + "...");
}

run().catch(console.error);
`,
        }}
      />
    </div>
  );
}
