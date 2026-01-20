import dynamic from 'next/dynamic';

import React from 'react';
import SandpackExample from '@/components/mdx/Sandpack';

export default function Page() {
  return (
    <div>
      <h1>ETL-style pipelines</h1>

      <p>Combine detection, transformation, and conversion in a deterministic pipeline.</p>

      <h2>Minimal example</h2>
      <SandpackExample
        template="node"
        activeFile="/index.js"
        preview={false}
        files={{
          '/index.js': `
import { convertToString, detectFormat } from "convert-buddy-js";

const input = ${JSON.stringify('name,age\nAda,36\nLinus,54')};

async function run() {
  const format = await detectFormat(input);
  console.log("detected format:", format);

  const output = await convertToString(input, {
    inputFormat: format === "unknown" ? "csv" : format,
    outputFormat: "json"
  });

  console.log("output:", output);
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
import { convertToString, detectFormat, detectStructure } from "convert-buddy-js";

const input = ${JSON.stringify('name,age\nAda,36\nLinus,54')};

async function run() {
  const format = await detectFormat(input);
  const structure = await detectStructure(input, format === "unknown" ? undefined : format);

  console.log("detected:", { format, structure });

  const csvConfig =
    structure && structure.format === "csv"
      ? { delimiter: structure.delimiter || ",", hasHeaders: true }
      : undefined;

  const output = await convertToString(input, {
    inputFormat: format === "unknown" ? "csv" : format,
    outputFormat: "json",
    csvConfig,
    transform: {
      mode: "augment",
      fields: [{ targetFieldName: "pipeline", defaultValue: "etl" }]
    }
  });

  console.log("output:", output);
}

run().catch(console.error);
`,
        }}
      />
    </div>
  );
}
