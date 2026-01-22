import dynamic from 'next/dynamic';

import React from 'react';
import SandpackExample from '@/components/mdx/Sandpack';

export default function Page() {
  return (
    <div>
      <h1>Detect structure</h1>

      <p>Structure detection extracts fields, record element names, and schema hints.</p>

      <h2>Minimal example</h2>

      <SandpackExample
        template="node"
        activeFile="/index.js"
        preview={false}
        enableFilePicker={true}
        files={{
          '/index.js': `
import { detectStructure } from "convert-buddy-js";

async function run() {
  const sampleData = "";
  
  console.log("File preview:", sampleData.substring(0, 200));
  
  const structure = await detectStructure(sampleData, "csv");
  console.log("Structure:", structure);
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
import { detectStructure } from "convert-buddy-js";

const fileUrl = "";

async function run() {
  const response = await fetch(fileUrl);
  const sampleData = await response.text();
  
  console.log("File preview:", sampleData.substring(0, 200));
  
  const structure = await detectStructure(sampleData, "csv", { maxBytes: 1024 });
  console.log("Structure:", structure);
}

run().catch(console.error);
`,
        }}
      />
    </div>
  );
}
