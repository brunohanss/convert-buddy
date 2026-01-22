import dynamic from 'next/dynamic';

import React from 'react';
import SandpackExample from '@/components/mdx/Sandpack';

export default function Page() {

  return (
    <div>
      <h1>JSON</h1>

      <p>
        JSON inputs may be arrays or objects. Convert Buddy streams records
        without buffering the full file.
      </p>

      <h2>Minimal example</h2>
      <SandpackExample
        template="node"
        activeFile="/index.js"
        preview={false}
        enableFilePicker={true}
        sampleDataUrl={sampleDataUrls.json}
        files={{
          '/index.js': `
import { convertToString } from "convert-buddy-js";

const fileUrl = "";

async function run() {
  const response = await fetch(fileUrl);
  const sampleData = await response.text();
  
  console.log("File preview:", sampleData.substring(0, 200));
  
  const output = await convertToString(sampleData, {
    inputFormat: "json",
    outputFormat: "csv"
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
        sampleDataUrl={sampleDataUrls.json}
        files={{
          '/index.js': `
import { convertToString } from "convert-buddy-js";

const fileUrl = "";

async function run() {
  const response = await fetch(fileUrl);
  const sampleData = await response.text();
  
  console.log("File preview:", sampleData.substring(0, 200));
  
  const output = await convertToString(sampleData, {
    inputFormat: "json",
    outputFormat: "csv",
    progressIntervalBytes: 128,
    profile: true,
    onProgress: (stats) => {
      console.log("Records processed:", stats.recordsProcessed);
    }
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
