import dynamic from 'next/dynamic';

import React from 'react';
import SandpackExample from '@/components/mdx/Sandpack';

export default function Page() {

  return (
    <div>
      <h1>Browser API</h1>

      <p>
        The browser API provides streaming conversion with Web Workers and WASM
        loading on demand.
      </p>

      <h2>Minimal example</h2>

      <SandpackExample
        template="node"
        activeFile="/index.js"
        preview={false}
        enableFilePicker={true}
        files={{
          '/index.js': `
import { convertAnyToString } from "convert-buddy-js";

const fileUrl = "";

async function run() {
  const response = await fetch(fileUrl);
  const sampleData = await response.text();
  
  console.log("File preview:", sampleData.substring(0, 200));
  
  const output = await convertAnyToString(sampleData, { outputFormat: "json" });
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
import { ConvertBuddy } from "convert-buddy-js";

const fileUrl = "";

async function run() {
  const response = await fetch(fileUrl);
  const sampleData = await response.text();
  
  console.log("File preview:", sampleData.substring(0, 200));
  
  const buddy = new ConvertBuddy({
    inputFormat: "csv",
    outputFormat: "ndjson",
    progressIntervalBytes: 32,
    onProgress: (stats) => console.log("Records:", stats.recordsProcessed)
  });

  const output = await buddy.convert(sampleData, { outputFormat: "ndjson" });
  console.log("Output:", new TextDecoder().decode(output));
}

run().catch(console.error);
`,
        }}
      />
    </div>
  );
}
