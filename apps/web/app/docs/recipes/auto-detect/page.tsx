import dynamic from 'next/dynamic';

import React from 'react';
import SandpackExample from '@/components/mdx/Sandpack';

export default function Page() {

  return (
    <div>
      <h1>Auto detect</h1>

      <p>Auto detection chooses the best parser and schema before conversion.</p>

      <h2>Minimal example</h2>
      <SandpackExample
        template="node"
        activeFile="/index.js"
        preview={false}
        enableFilePicker={true}
        files={{
          '/index.js': `
import { detectFormat } from "convert-buddy-js";

const fileUrl = "";

async function run() {
  const response = await fetch(fileUrl);
  const sampleData = await response.text();
  
  console.log("File preview:", sampleData.substring(0, 200));
  
  const format = await detectFormat(sampleData);
  console.log("Detected format:", format);
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
import { convertAnyToString, detectFormat, detectStructure } from "convert-buddy-js";

const fileUrl = "";

async function run() {
  const response = await fetch(fileUrl);
  const sampleData = await response.text();
  
  console.log("File preview:", sampleData.substring(0, 200));
  
  const format = await detectFormat(sampleData);
  const structure = await detectStructure(sampleData, format === "unknown" ? undefined : format);
  console.log("Detected:", { format, structure });

  const output = await convertAnyToString(sampleData, { outputFormat: "json" });
  console.log("Output:", output);
}

run().catch(console.error);
`,
        }}
      />
    </div>
  );
}
