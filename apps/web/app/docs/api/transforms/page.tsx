import dynamic from 'next/dynamic';

import React from 'react';
import SandpackExample from '@/components/mdx/Sandpack';

export default function Page() {
  return (
    <div>
      <h1>Transforms API</h1>

      <p>Transforms provide record-level control over output and schema.</p>

      <h2>Minimal example</h2>
      <SandpackExample
        template="node"
        activeFile="/index.js"
        preview={false}
        files={{
          '/index.js': `
import { convertToString } from "convert-buddy-js";

const input = ${JSON.stringify('id,ts\n1,2024-05-02T10:30:00Z\n2,2024-05-03T12:15:00Z')};

async function run() {
  const output = await convertToString(input, {
    inputFormat: "csv",
    outputFormat: "json",
    transform: {
      mode: "replace",
      fields: [
        { targetFieldName: "id", originFieldName: "id", coerce: { type: "i64" } },
        { targetFieldName: "created_at", originFieldName: "ts" }
      ]
    }
  });
  console.log("output:", output);
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
        files={{
          '/index.js': `
import { convertToString } from "convert-buddy-js";

const input = ${JSON.stringify('id,score,ts\n1,0.91,2024-05-02T10:30:00Z\n2,0.42,2024-05-03T12:15:00Z')};

async function run() {
  const output = await convertToString(input, {
    inputFormat: "csv",
    outputFormat: "json",
    transform: {
      mode: "replace",
      fields: [
        { targetFieldName: "id", originFieldName: "id", coerce: { type: "i64" } },
        { targetFieldName: "score", originFieldName: "score", coerce: { type: "f64" } },
        { targetFieldName: "created_at", originFieldName: "ts" },
        { targetFieldName: "is_priority", defaultValue: false }
      ],
      onCoerceError: "null"
    }
  });
  console.log("output:", output);
}

run().catch(console.error);
`,
        }}
      />
    </div>
  );
}
