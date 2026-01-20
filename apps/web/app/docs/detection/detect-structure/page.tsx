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
        files={{
          '/index.js': `
import { detectStructure } from "convert-buddy-js";

const input = ${JSON.stringify('name,age\nAda,36\nLinus,54')};

async function run() {
  const structure = await detectStructure(input, "csv");
  console.log("structure:", structure);
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
import { detectStructure } from "convert-buddy-js";

const input = ${JSON.stringify('name,age\nAda,36\nLinus,54\nGrace,48\nAlan,41')};

async function run() {
  const structure = await detectStructure(input, "csv", { maxBytes: 1024 });
  console.log("structure:", structure);
}

run().catch(console.error);
`,
        }}
      />
    </div>
  );
}
