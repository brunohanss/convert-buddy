import React from 'react';
import SandpackExample from '@/components/mdx/Sandpack';

export default function Page() {
  return (
    <div>
      <h1>Detect format</h1>

      <p>Format detection inspects bytes and emits the most likely input format.</p>

      <h2>Minimal example</h2>

      <SandpackExample
        template="node"
        activeFile="/index.js"
        preview={false}
        enableFilePicker={true}
        files={{
          '/index.js': `
import { detectFormat } from "convert-buddy-js";

async function run() {
  const sampleData = "";
  
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
import { detectFormat } from "convert-buddy-js";

const fileUrl = "";

async function run() {
  const response = await fetch(fileUrl);
  const sampleData = await response.text();
  
  console.log("File preview:", sampleData.substring(0, 200));
  
  const format = await detectFormat(sampleData, { maxBytes: 1024 });
  console.log("Detected format:", format);
}

run().catch(console.error);
`,
        }}
      />
    </div>
  );
}
