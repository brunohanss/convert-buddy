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
        activeFile="/index.js"
        preview={false}
        files={{
          '/index.js': `
import { convertToString } from "convert-buddy-js";

const input = ${JSON.stringify('name,age\nAda,36\nLinus,54')};

async function run() {
  const output = await convertToString(input, {
    inputFormat: "csv",
    outputFormat: "json"
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
import { convertAnyToString } from "convert-buddy-js";

const input = ${JSON.stringify('name,age\nAda,36\nLinus,54')};

async function run() {
  const output = await convertAnyToString(input, {
    outputFormat: "json"
  });
  console.log("output:", output);
}

run().catch(console.error);
`,
        }}
      />
    </div>
  );
}
