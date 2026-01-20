import dynamic from 'next/dynamic';

import React from 'react';
import SandpackExample from '@/components/mdx/Sandpack';

export default function Page() {
  return (
    <div>
      <h1>Instance API</h1>
      <p>Use the instance API when you need reuse, cancellation, and explicit control over configuration.</p>

      <h2>Minimal example</h2>
      <SandpackExample
        template="node"
        activeFile="/index.js"
        preview={false}
        files={{
          '/index.js': `
import { ConvertBuddy } from "convert-buddy-js";

const inputA = ${JSON.stringify('name,age\nAda,36\nLinus,54')};
const inputB = ${JSON.stringify('name,age\nGrace,48\nAlan,41')};

async function run() {
  const buddy = new ConvertBuddy({ inputFormat: "csv", outputFormat: "json" });
  const decoder = new TextDecoder();

  const outA = await buddy.convert(inputA, { outputFormat: "json" });
  const outB = await buddy.convert(inputB, { outputFormat: "json" });

  console.log("first:", decoder.decode(outA));
  console.log("second:", decoder.decode(outB));
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
import { ConvertBuddy } from "convert-buddy-js";

const chunks = ["name,age\\n", "Ada,36\\n", "Linus,54\\n"];

async function run() {
  const buddy = await ConvertBuddy.create({
    inputFormat: "csv",
    outputFormat: "json"
  });

  const encoder = new TextEncoder();
  const outputA = buddy.push(encoder.encode(chunks[0]));
  buddy.pause();
  console.log("paused after header");
  buddy.resume();
  const outputB = buddy.push(encoder.encode(chunks[1] + chunks[2]));
  const outputC = buddy.finish();

  const combined = new Uint8Array(outputA.length + outputB.length + outputC.length);
  combined.set(outputA, 0);
  combined.set(outputB, outputA.length);
  combined.set(outputC, outputA.length + outputB.length);

  console.log("output:", new TextDecoder().decode(combined));
}

run().catch(console.error);
`,
        }}
      />
    </div>
  );
}
