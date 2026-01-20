import React from 'react';
import SandpackExample from '@/components/mdx/Sandpack';

export default function Page() {
  return (
    <div>
      <h1>Memory</h1>
      <p>Memory considerations and guidance.</p>

      <h2>Minimal example</h2>
      <SandpackExample
        template="node"
        activeFile="/index.js"
        preview={false}
        files={{
          '/index.js': `import { convertToString } from "convert-buddy-js";

const rows = Array.from({ length: 100 }, (_, i) => "row" + i + "," + i).join("\\n");
const input = "name,value\\n" + rows;

async function run() {
  const output = await convertToString(input, {
    inputFormat: "csv",
    outputFormat: "json",
    maxMemoryMB: 128,
    progressIntervalBytes: 64,
    onProgress: (stats) => {
      console.log("max buffer bytes:", stats.maxBufferSize);
      console.log("current partial bytes:", stats.currentPartialSize);
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

const rows = Array.from({ length: 200 }, (_, i) => "row" + i + "," + i).join("\\n");
const input = "name,value\\n" + rows;

async function run() {
  const output = await convertToString(input, {
    inputFormat: "csv",
    outputFormat: "json",
    maxMemoryMB: 256,
    chunkTargetBytes: 32 * 1024,
    progressIntervalBytes: 128,
    onProgress: (stats) => {
      console.log("max buffer bytes:", stats.maxBufferSize);
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
