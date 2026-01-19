import dynamic from 'next/dynamic';

import React from 'react';
import SandpackExample from '@/components/mdx/Sandpack';

export default function Page() {
  return (
    <div>
      <h1>Auto detect</h1>

      <p>Auto detection chooses the best parser and schema before conversion.</p>

      <h2>Minimal example</h2>
      <SandpackExample
        template="node"
        activeFile="/index.ts"
        preview={false}
        files={{
          '/index.js': `
import { detectFormat } from "convert-buddy-js";

const format = await detectFormat(stream);
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
const buddy = new ConvertBuddy({ inputFormat: format, outputFormat: "json", structure });
`,
        }}
      />
    </div>
  );
}
