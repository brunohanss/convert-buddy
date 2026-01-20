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
        files={{
          '/index.js': `
import { detectFormat } from "convert-buddy-js";

const input = ${JSON.stringify('name,age\nAda,36\nLinus,54')};

async function run() {
  const format = await detectFormat(input);
  console.log("detected format:", format);
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
import { convertAnyToString, detectFormat, detectStructure } from "convert-buddy-js";

const input = ${JSON.stringify('name,age\nAda,36\nLinus,54')};

async function run() {
  const format = await detectFormat(input);
  const structure = await detectStructure(input, format === "unknown" ? undefined : format);
  console.log("detected:", { format, structure });

  const output = await convertAnyToString(input, { outputFormat: "json" });
  console.log("output:", output);
}

run().catch(console.error);
`,
        }}
      />
    </div>
  );
}
