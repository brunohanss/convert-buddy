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
        enableFilePicker={true}
        files={{
          '/index.js': `
import { convertToString } from "convert-buddy-js";

const fileUrl = "";

async function run() {
  const response = await fetch(fileUrl);
  const sampleData = await response.text();
  
  console.log("File preview:", sampleData.substring(0, 200));
  
  const output = await convertToString(sampleData, {
    inputFormat: "csv",
    outputFormat: "json",
    progressIntervalBytes: 32,
    onProgress: (stats) => {
      console.log("Progress:", {
        bytesIn: stats.bytesIn,
        records: stats.recordsProcessed,
        throughputMbPerSec: stats.throughputMbPerSec.toFixed(2)
      });
    }
  });

  console.log("Output:", output);
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
        enableFilePicker={true}
        files={{
          '/index.js': `
import { convertToString } from "convert-buddy-js";

const fileUrl = "";

async function run() {
  const response = await fetch(fileUrl);
  const sampleData = await response.text();
  
  console.log("File preview:", sampleData.substring(0, 200));
  
  const totalBytes = new TextEncoder().encode(sampleData).length;

  function renderProgress(stats) {
    const percent = ((stats.bytesIn / totalBytes) * 100).toFixed(0);
    console.log("Progress: " + percent + "%");
  }

  const output = await convertToString(sampleData, {
    inputFormat: "csv",
    outputFormat: "json",
    progressIntervalBytes: 24,
    onProgress: renderProgress
  });

  console.log("Output:", output);
}

run().catch(console.error);
`,
        }}
      />
    </div>
  );
}
