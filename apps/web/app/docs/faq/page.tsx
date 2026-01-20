import React from 'react';
import SandpackExample from '@/components/mdx/Sandpack';

export default function Page() {
  return (
    <div>
      <h1>FAQ</h1>
      <p>Frequently asked questions about Convert Buddy.</p>

      <h2>Does Convert Buddy upload my files?</h2>
      <p>No. Conversion runs locally in the browser or in your Node process.</p>

      <h2>Can I see performance during conversion?</h2>
      <p>Yes. Telemetry emits throughput, memory, and elapsed time at fixed intervals.</p>

      <h2>Minimal example</h2>
      <SandpackExample
        template="node"
        activeFile="/index.js"
        preview={false}
        files={{
          '/index.js': `import { convertToString } from "convert-buddy-js";

const input = ${JSON.stringify('name,age\nAda,36\nLinus,54')};

async function run() {
  const output = await convertToString(input, {
    inputFormat: "csv",
    outputFormat: "json"
  });
  console.log("output:", output);
}

run().catch(console.error);`,
        }}
      />

      <h2>Advanced example</h2>
      <SandpackExample
        template="node"
        activeFile="/index.js"
        preview={false}
        files={{
          '/index.js': `import { convertToString } from "convert-buddy-js";

const input = ${JSON.stringify('name,age\nAda,36\nLinus,54\nGrace,48\nAlan,41')};

async function run() {
  const output = await convertToString(input, {
    inputFormat: "csv",
    outputFormat: "json",
    progressIntervalBytes: 32,
    onProgress: (stats) => console.log("throughput:", stats.throughputMbPerSec.toFixed(2))
  });
  console.log("output:", output);
}

run().catch(console.error);`,
        }}
      />
    </div>
  );
}
