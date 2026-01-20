import dynamic from 'next/dynamic';

import React from 'react';
import SandpackExample from '@/components/mdx/Sandpack';

export default function Page() {
  return (
    <div>
      <h1>Streaming</h1>

      <p>
        Streaming is the core of Convert Buddy. Inputs are read in chunks, parsed,
        transformed, and emitted continuously.
      </p>

      <h2>Minimal example</h2>
      <SandpackExample
        template="node"
        activeFile="/index.js"
        preview={false}
        files={{
          '/index.js': `
import { ConvertBuddyTransformStream } from "convert-buddy-js";

const input = ${JSON.stringify('name,age\nAda,36\nLinus,54')};

async function run() {
  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(input));
      controller.close();
    }
  });

  const transform = new ConvertBuddyTransformStream({
    inputFormat: "csv",
    outputFormat: "json"
  });

  const reader = readable.pipeThrough(transform).getReader();
  const chunks = [];
  let total = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    total += value.length;
  }

  const output = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    output.set(chunk, offset);
    offset += chunk.length;
  }

  console.log("output:", new TextDecoder().decode(output));
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
import { ConvertBuddyTransformStream } from "convert-buddy-js";

const chunks = ["name,age\\n", "Ada,36\\n", "Linus,54\\n", "Grace,48\\n"];

async function run() {
  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(chunk));
      }
      controller.close();
    }
  });

  const transform = new ConvertBuddyTransformStream({
    inputFormat: "csv",
    outputFormat: "json",
    progressIntervalBytes: 16,
    onProgress: (stats) => console.log("records:", stats.recordsProcessed)
  });

  const reader = readable.pipeThrough(transform).getReader();
  const buffers = [];
  let total = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffers.push(value);
    total += value.length;
  }

  const output = new Uint8Array(total);
  let offset = 0;
  for (const chunk of buffers) {
    output.set(chunk, offset);
    offset += chunk.length;
  }

  console.log("output:", new TextDecoder().decode(output));
}

run().catch(console.error);
`,
        }}
      />
    </div>
  );
}
