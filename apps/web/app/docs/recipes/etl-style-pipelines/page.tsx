import dynamic from 'next/dynamic';

import React from 'react';
import SandpackExample from '@/components/mdx/Sandpack';

export default function Page() {

  return (
    <div>
      <h1>ETL-style pipelines</h1>

      <p>Combine detection, transformation, and conversion in a deterministic pipeline.</p>

      <h2>Minimal example</h2>
      <SandpackExample
        template="node"
        activeFile="/index.js"
        preview={false}
        enableFilePicker={true}
        files={{
          '/index.js': `
import { convertToString, detectFormat } from "convert-buddy-js";

const fileUrl = "";

async function run() {
  const response = await fetch(fileUrl);
  const sampleData = await response.text();
  
  console.log("File preview:", sampleData.substring(0, 200));
  
  const format = await detectFormat(sampleData);
  console.log("Detected format:", format);

  const output = await convertToString(sampleData, {
    inputFormat: format === "unknown" ? "csv" : format,
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
import { convertToString, detectFormat, detectStructure } from "convert-buddy-js";

const fileUrl = "";

async function run() {
  const response = await fetch(fileUrl);
  const sampleData = await response.text();
  
  console.log("File preview:", sampleData.substring(0, 200));
  
  const format = await detectFormat(sampleData);
  const structure = await detectStructure(sampleData, format === "unknown" ? undefined : format);

  console.log("Detected:", { format, structure });

  const csvConfig =
    structure && structure.format === "csv"
      ? { delimiter: structure.delimiter || ",", hasHeaders: true }
      : undefined;

  const output = await convertToString(sampleData, {
    inputFormat: format === "unknown" ? "csv" : format,
    outputFormat: "json",
    csvConfig,
    transform: {
      mode: "augment",
      fields: [{ targetFieldName: "pipeline", defaultValue: "etl" }]
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
