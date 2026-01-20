import dynamic from 'next/dynamic';

import React from 'react';
import SandpackExample from '@/components/mdx/Sandpack';

export default function Page() {
  return (
    <div>
      <h1>Progress UI</h1>

      <p>Display throughput and memory usage to build user trust.</p>

      <h2>Minimal example</h2>
      <SandpackExample
        template="node"
        activeFile="/index.js"
        preview={false}
        files={{
          '/index.js': `
import { convertToString } from "convert-buddy-js";

const input = ${JSON.stringify('name,age\nAda,36\nLinus,54\nGrace,48\nAlan,41')};

async function run() {
  const output = await convertToString(input, {
    inputFormat: "csv",
    outputFormat: "json",
    progressIntervalBytes: 32,
    onProgress: (stats) => {
      console.log("progress", {
        bytesIn: stats.bytesIn,
        records: stats.recordsProcessed,
        throughputMbPerSec: stats.throughputMbPerSec.toFixed(2)
      });
    }
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

const input = ${JSON.stringify('name,age\nAda,36\nLinus,54\nGrace,48\nAlan,41\nMargaret,52\nKen,44')};
const totalBytes = new TextEncoder().encode(input).length;

function renderProgress(stats) {
  const percent = ((stats.bytesIn / totalBytes) * 100).toFixed(0);
  console.log("progress: " + percent + "%");
}

async function run() {
  const output = await convertToString(input, {
    inputFormat: "csv",
    outputFormat: "json",
    progressIntervalBytes: 24,
    onProgress: renderProgress
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
