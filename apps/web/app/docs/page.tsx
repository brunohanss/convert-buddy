import React from 'react';
import SandpackExample from '@/components/mdx/Sandpack';

export default function DocsPage() {
  return (
    <div>
      <h1>Introduction</h1>

      <p>
        Convert Buddy is a streaming data processing engine that performs
        conversion, transformation, and detection with visible performance
        telemetry. It is built for non-developers converting data in the
        browser, and for developers embedding the engine in applications.
      </p>

      <h2>What you get</h2>
      <ul>
        <li>Browser-based conversion with deterministic memory usage.</li>
        <li>WebAssembly-powered streaming core.</li>
        <li>Telemetry emitted at fixed intervals.</li>
      </ul>

      <h2>Minimal example</h2>
<SandpackExample
  template="node"
  preview={false}
  console={true}
  files={{
    "/index.js": {
      code: `
console.log("Node sandbox started");

const sum = (a, b) => a + b;
console.log("Result:", sum(2, 3));
      `,
      active: true
    }
  }}
/>
      <SandpackExample
        template="node"
        dependencyVersion="latest"
        activeFile="/index.js"
        preview={false}
        files={{
          '/index.js': `
import { convertToString } from "convert-buddy-js";

const file = ${JSON.stringify('name,age\nAda,36\nLinus,54')};

async function run() {
  const out = await convertToString(file, { inputFormat: 'csv', outputFormat: 'json' });
  console.log('convertToString output:', out);
}

run().catch(console.error);
`,
        }}
      />

      <h2>Advanced example</h2>

      <SandpackExample
        template="node"
        dependencyVersion="latest"
        activeFile="/index.ts"
        preview={false}
        files={{
          '/index.js': `
import { ConvertBuddy } from "convert-buddy-js";

const buddy = new ConvertBuddy({
  inputFormat: "csv",
  outputFormat: "json",
  transform: (r) => ({ ...r, source: "browser" }),
  onProgress: (stats) => console.log(stats.throughputMbPerSec)
});
`,
        }}
      />
    </div>
  );
}
