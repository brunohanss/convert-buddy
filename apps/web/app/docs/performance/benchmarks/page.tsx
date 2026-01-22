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

const sampleData = "name,value\n" + Array.from({ length: 50 }, (_, i) => "row" + i + "," + i).join("\\n");

async function run() {
  console.time("csv->json");
  const output = await convertToString(sampleData, {
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

const sampleData = "name,value\n" + Array.from({ length: 100 }, (_, i) => "row" + i + "," + i).join("\\n");

async function run() {
  console.time("csv->json (parallel)");
  const output = await convertToString(sampleData, {
    inputFormat: "csv",
    outputFormat: "json",
    parallelism: 2,
    profile: true
  });
  console.timeEnd("csv->json (parallel)");
  console.log("output length:", output.length);
}

run().catch(console.error);
`,
        }}
      />
    </div>
  );
}
