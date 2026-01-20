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
import { detectFormat } from "convert-buddy-js";

const input = ${JSON.stringify('name,age\nAda,36\nLinus,54\nGrace,48\nAlan,41')};

async function run() {
  const format = await detectFormat(input, { maxBytes: 1024 });
  console.log("detected format:", format);
}

run().catch(console.error);
`,
        }}
      />
    </div>
  );
}
