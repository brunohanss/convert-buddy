import dynamic from 'next/dynamic';

import React from 'react';
import SandpackExample from '@/components/mdx/Sandpack';

export default function Page() {
  return (
    <div>
      <h1>NDJSON</h1>

      <p>NDJSON is processed line-by-line for deterministic streaming conversion.</p>

      <h2>Minimal example</h2>
      <SandpackExample
        template="node"
        activeFile="/index.js"
        preview={false}
        files={{
          '/index.js': `
import { convertToString } from "convert-buddy-js";

const input = ${JSON.stringify('{"name":"Ada","age":36}\n{"name":"Linus","age":54}')};

async function run() {
  const output = await convertToString(input, {
    inputFormat: "ndjson",
    outputFormat: "json"
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

const input = ${JSON.stringify('{"name":"Ada","age":36}\n{"name":"Linus","age":54}')};

async function run() {
  const output = await convertToString(input, {
    inputFormat: "ndjson",
    outputFormat: "csv",
    csvConfig: {
      delimiter: ";",
      hasHeaders: true
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
