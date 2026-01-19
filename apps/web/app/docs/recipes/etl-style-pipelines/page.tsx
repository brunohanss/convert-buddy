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
        activeFile="/index.ts"
        preview={false}
        files={{
          '/index.js': `
import { ConvertBuddy } from "convert-buddy-js";

const buddy = new ConvertBuddy({ inputFormat: "csv", outputFormat: "json" });
`,
        }}
      />

      <h2>Advanced example</h2>
      <SandpackExample
        template="node"
        activeFile="/index.ts"
        preview={false}
        files={{
          '/index.js': `
import { ConvertBuddy, detectFormat, detectStructure } from "convert-buddy-js";

const format = await detectFormat(stream);
const structure = await detectStructure(stream);
const buddy = new ConvertBuddy({
  inputFormat: format,
  outputFormat: "json",
  structure,
  transform: (r) => ({ ...r, normalized: true })
});
`,
        }}
      />
    </div>
  );
}
