import dynamic from 'next/dynamic';

import React from 'react';
import SandpackExample from '@/components/mdx/Sandpack';

export default function Page() {

  return (
    <div>
      <h1>Detection</h1>

      <p>
        Convert Buddy can infer format and structure before conversion. Detection
        runs on streams and returns JSON metadata.
      </p>

      <h2>Minimal example</h2>
      <SandpackExample
        template="node"
        activeFile="/index.js"
        preview={false}
        enableFilePicker={true}
        files={{
          '/index.js': `
import { detectFormat, detectStructure } from "convert-buddy-js";

const fileUrl = "";

async function run() {
  const response = await fetch(fileUrl);
  const sampleData = await response.text();
  console.log("File preview:", sampleData.substring(0, 200));
  
  const format = await detectFormat(sampleData);
  const structure = await detectStructure(sampleData, format === "unknown" ? undefined : format);
  console.log("Detected format:", format);
  console.log("Detected structure:", structure);
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
import { detectFormat, detectStructure } from "convert-buddy-js";

const fileUrl = "";

async function run() {
  const response = await fetch(fileUrl);
  const sampleData = await response.text();
  console.log("File preview:", sampleData.substring(0, 200));
  
  const format = await detectFormat(sampleData, { maxBytes: 2048 });
  const structure = await detectStructure(sampleData, format === "unknown" ? undefined : format, {
    maxBytes: 2048,
    debug: true
  });
  console.log("Detected format:", format);
  console.log("Detected structure:", structure);
}

run().catch(console.error);
`,
        }}
      />
    </div>
  );
}
