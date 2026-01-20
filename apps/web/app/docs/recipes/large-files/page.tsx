import dynamic from 'next/dynamic';

import React from 'react';
import SandpackExample from '@/components/mdx/Sandpack';

export default function Page() {
  return (
    <div>
      <h1>Large files</h1>

      <p>For multi-GB inputs, rely on streaming and telemetry to keep memory predictable.</p>

      <h2>Minimal example</h2>
      <SandpackExample
        template="node"
        activeFile="/index.js"
        preview={false}
        files={{
          '/index.js': `
import { convertToString } from "convert-buddy-js";

const rows = Array.from({ length: 200 }, (_, i) => "row" + i + "," + i).join("\\n");
const input = "name,value\\n" + rows;

async function run() {
  const output = await convertToString(input, {
    inputFormat: "csv",
    outputFormat: "json",
    maxMemoryMB: 128,
    chunkTargetBytes: 64 * 1024,
    progressIntervalBytes: 1024,
    onProgress: (stats) => {
      console.log("bytes in:", stats.bytesIn, "max buffer:", stats.maxBufferSize);
    }
  });

  console.log("output length:", output.length);
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

const rows = Array.from({ length: 1000 }, (_, i) => "row" + i + "," + (i * 2)).join("\\n");
const input = "name,value\\n" + rows;

async function run() {
  console.time("convert");
  const output = await convertToString(input, {
    inputFormat: "csv",
    outputFormat: "json",
    maxMemoryMB: 256,
    chunkTargetBytes: 128 * 1024,
    parallelism: 2,
    profile: true
  });
  console.timeEnd("convert");
  console.log("output sample:", output.slice(0, 120) + "...");
}

run().catch(console.error);
`,
        }}
      />
    </div>
  );
}
