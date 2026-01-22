import dynamic from 'next/dynamic';

import React from 'react';
import SandpackExample from '@/components/mdx/Sandpack';

export default function Page() {
  return (
    <div>
      <h1>Performance model</h1>

      <p>
        Performance is a first-class feature. Convert Buddy emits telemetry every
        interval so users can trust throughput, memory, and elapsed time.
      </p>

      <h2>Minimal example</h2>
      <SandpackExample
        template="node"
        activeFile="/index.js"
        preview={false}
        files={{
          '/index.js': `
import { convertToString } from "convert-buddy-js";

const sampleData = "name,value\n" + Array.from({ length: 50 }, (_, i) => "row" + i + "," + i).join("\\n");

async function run() {
  const output = await convertToString(sampleData, {
    inputFormat: "csv",
    outputFormat: "json",
    progressIntervalBytes: 64,
    onProgress: (stats) => {
      console.log("throughput:", stats.throughputMbPerSec.toFixed(2));
      console.log("bytes in:", stats.bytesIn);
      console.log("records:", stats.recordsProcessed);
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

const sampleData = "name,value\n" + Array.from({ length: 100 }, (_, i) => "row" + i + "," + i).join("\\n");

async function run() {
  const output = await convertToString(sampleData, {
    inputFormat: "csv",
    outputFormat: "json",
    progressIntervalBytes: 96,
    onProgress: (stats) => {
      if (stats.maxBufferSize > 256 * 1024) {
        console.warn("Buffer threshold exceeded");
      }
    }
  });

  console.log("output length:", output.length);
}

run().catch(console.error);
`,
        }}
      />
    </div>
  );
}
