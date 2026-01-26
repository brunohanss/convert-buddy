import dynamic from 'next/dynamic';

import React from 'react';
import PlaygroundExample from '@/components/mdx/Playground';

export default function Page() {
  return (
    <div>
      <h1>Cancellation</h1>

      <p>Conversion can be cancelled via AbortController.</p>

      <h2>Minimal example</h2>
      <PlaygroundExample
        template="node"
        activeFile="/index.js"
        preview={true}
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

  try {
    const output = buddy.push(encoder.encode(chunks[0] + chunks[1]));
    console.log("Chunk output bytes:", output.length);

    buddy.abort();
    buddy.push(encoder.encode(chunks[2]));
  } catch (err) {
    console.log("Conversion stopped:", err.message);
  }
}

run().catch(console.error);
`,
        }}
      />

      <h2>Advanced example</h2>
      <PlaygroundExample
        template="node"
        activeFile="/index.js"
        preview={true}
        files={{
          '/index.js': `
import { ConvertBuddy } from "convert-buddy-js";

const chunks = ["name,age\\n", "Ada,36\\n", "Linus,54\\n", "Grace,48\\n"];

async function run() {
  const buddy = await ConvertBuddy.create({
    inputFormat: "csv",
    outputFormat: "json"
  });

  const encoder = new TextEncoder();

  try {
    for (const chunk of chunks) {
      const output = buddy.push(encoder.encode(chunk));
      if (output.length > 0) {
        console.log("Chunk output bytes:", output.length);
      }

      if (buddy.stats().recordsProcessed >= 2) {
        console.log("Aborting after 2 records");
        buddy.abort();
      }
    }

    buddy.finish();
  } catch (err) {
    console.log("Conversion stopped:", err.message);
  }
}

run().catch(console.error);
`,
        }}
      />
    </div>
  );
}
