import dynamic from 'next/dynamic';

import React from 'react';
import SandpackExample from '@/components/mdx/Sandpack';

export default function Page() {

  return (
    <div>
      <h1>CSV</h1>

      <p>
        CSV is parsed with streaming delimiters, header detection, and schema
        inference.
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
import { convertToString } from "convert-buddy-js";

const fileUrl = "";

async function run() {
  const response = await fetch(fileUrl);
  const sampleData = await response.text();
  
  console.log("File preview:", sampleData.substring(0, 200));
  
  const output = await convertToString(sampleData, {
    inputFormat: "csv",
    outputFormat: "json",
    csvConfig: { hasHeaders: true, trimWhitespace: true }
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
