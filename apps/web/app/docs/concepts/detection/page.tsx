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
        files={{
          '/index.js': `
import { detectFormat, detectStructure } from "convert-buddy-js";

const input = ${JSON.stringify('name,age\nAda,36\nLinus,54')};

async function run() {
  const format = await detectFormat(input);
  const structure = await detectStructure(input, format === "unknown" ? undefined : format);
  console.log("format:", format);
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
import { detectFormat, detectStructure } from "convert-buddy-js";

const input = ${JSON.stringify('name,age\nAda,36\nLinus,54\nGrace,48\nAlan,41')};

async function run() {
  const format = await detectFormat(input, { maxBytes: 2048 });
  const structure = await detectStructure(input, format === "unknown" ? undefined : format, {
    maxBytes: 2048,
    debug: true
  });
  console.log("format:", format);
  console.log("structure:", structure);
}

run().catch(console.error);
`,
        }}
      />
    </div>
  );
}
