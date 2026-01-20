import React from 'react';
import SandpackExample from '@/components/mdx/Sandpack';

export default function Page() {
  return (
    <div>
      <h1>Benchmarks</h1>
      <p>Benchmark results and methodology.</p>

      <h2>Minimal example</h2>
      <SandpackExample
        template="node"
        activeFile="/index.js"
        preview={false}
        files={{
          '/index.js': `
import { convertToString } from "convert-buddy-js";

const rows = Array.from({ length: 200 }, (_, i) => "row" + i + "," + i).join("\\n");
const input = "name,value\\n" + rows;

async function run() {
  console.time("csv->json");
  const output = await convertToString(input, {
    inputFormat: "csv",
    outputFormat: "json"
  });
  console.timeEnd("csv->json");
  console.log("output length:", output.length);
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

const rows = Array.from({ length: 1000 }, (_, i) => "row" + i + "," + i).join("\\n");
const input = "name,value\\n" + rows;

async function run() {
  console.time("csv->json (parallel)");
  const output = await convertToString(input, {
    inputFormat: "csv",
    outputFormat: "json",
    parallelism: 2,
    profile: true
  });
  console.timeEnd("csv->json (parallel)");
  console.log("output sample:", output.slice(0, 120) + "...");
}

run().catch(console.error);
`,
        }}
      />
    </div>
  );
}
