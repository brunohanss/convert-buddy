import dynamic from 'next/dynamic';

import React from 'react';
import SandpackExample from '@/components/mdx/Sandpack';

export default function Page() {
  return (
    <div>
      <h1>Transform</h1>

      <p>
        Transforms run inline during streaming conversion, letting you enrich or
        filter data without loading the full dataset.
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

async function run() {
  const sampleData = "";
  
  console.log("File preview:", sampleData.substring(0, 200));
  
  const output = await convertToString(sampleData, {
    inputFormat: "json",
    outputFormat: "csv",
    transform: {
      mode: "replace",
      fields: [
        { targetFieldName: "id", originFieldName: "id", coerce: { type: "i64" } },
        { targetFieldName: "created_at", originFieldName: "ts" }
      ]
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
  
  const output = await convertToString(sampleData, {
    inputFormat: "json",
    outputFormat: "csv",
    transform: {
      mode: "replace",
      fields: [
        { targetFieldName: "id", originFieldName: "id", coerce: { type: "i64" } },
        { targetFieldName: "age", originFieldName: "age", coerce: { type: "i64" } },
        { targetFieldName: "segment", defaultValue: "customer" }
      ]
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
