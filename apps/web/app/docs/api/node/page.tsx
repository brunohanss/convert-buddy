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
import { ConvertBuddy } from "convert-buddy-js";

const input = ${JSON.stringify('name,age\nAda,36\nLinus,54\nGrace,48\nAlan,41')};

async function run() {
  const buddy = new ConvertBuddy({
    inputFormat: "csv",
    outputFormat: "json",
    parallelism: 2,
    profile: true,
    progressIntervalBytes: 64,
    onProgress: (stats) => console.log("records:", stats.recordsProcessed)
  });

  const output = await buddy.convert(input, { outputFormat: "json" });
  console.log("output:", new TextDecoder().decode(output));
}

run().catch(console.error);
`,
        }}
      />
    </div>
  );
}
