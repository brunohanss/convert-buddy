import React from 'react';
import SandpackExample from '@/components/mdx/Sandpack';

export default function Page() {
  return (
    <div>
      <h1>Telemetry</h1>
      <p>Information about telemetry and metrics.</p>

      <h2>Minimal example</h2>
      <SandpackExample
        template="node"
        activeFile="/index.js"
        preview={false}
        files={{
          '/index.js': `import { convertToString } from "convert-buddy-js";

const sampleData = "name,age\n" + Array.from({ length: 50 }, (_, i) => "row" + i + "," + (i + 20)).join("\\n");

async function run() {
  const output = await convertToString(sampleData, {
    inputFormat: "csv",
    outputFormat: "json",
    progressIntervalBytes: 64,
    onProgress: (stats) => {
      console.log("throughput:", stats.throughputMbPerSec.toFixed(2));
      console.log("records:", stats.recordsProcessed);
      console.log("bytes:", stats.bytesIn);
    }
  });

  console.log("output length:", output.length);
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

const sampleData = "name,age\n" + Array.from({ length: 100 }, (_, i) => "row" + i + "," + (i + 20)).join("\\n");

async function run() {
  const output = await convertToString(sampleData, {
    inputFormat: "csv",
    outputFormat: "json",
    progressIntervalBytes: 128,
    profile: true,
    onProgress: (stats) => {
      const mb = (stats.bytesIn / (1024 * 1024)).toFixed(2);
      console.log("processed MB:", mb);
    }
  });

  console.log("output length:", output.length);
}

run().catch(console.error);`,
        }}
      />
    </div>
  );
}
