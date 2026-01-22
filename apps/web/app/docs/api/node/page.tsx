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
    outputFormat: "json"
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
import { ConvertBuddy } from "convert-buddy-js";

const fileUrl = "";

async function run() {
  const response = await fetch(fileUrl);
  const sampleData = await response.text();
  
  console.log("File preview:", sampleData.substring(0, 200));
  
  const buddy = new ConvertBuddy({
    inputFormat: "csv",
    outputFormat: "json",
    parallelism: 2,
    profile: true,
    progressIntervalBytes: 64,
    onProgress: (stats) => console.log("Records:", stats.recordsProcessed)
  });

  const output = await buddy.convert(sampleData, { outputFormat: "json" });
  console.log("Output:", new TextDecoder().decode(output));
}

run().catch(console.error);
`,
        }}
      />
    </div>
  );
}
