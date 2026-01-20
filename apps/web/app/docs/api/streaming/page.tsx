import React from 'react';
import SandpackExample from '@/components/mdx/Sandpack';

export default function Page() {
  return (
    <div>
      <h1>Streaming API</h1>

      <p>For full control, use the streaming API to attach to pipelines directly.</p>

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

  const buffers = [];
  await readable
    .pipeThrough(transform)
    .pipeTo(
      new WritableStream({
        write(chunk) {
          buffers.push(chunk);
        }
      })
    );

  const total = buffers.reduce((sum, chunk) => sum + chunk.length, 0);
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
