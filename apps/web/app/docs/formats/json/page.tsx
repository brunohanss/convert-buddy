import dynamic from 'next/dynamic';

import React from 'react';
import SandpackExample from '@/components/mdx/Sandpack';

export default function Page() {
  return (
    <div>
      <h1>JSON</h1>

      <p>
        JSON inputs may be arrays or objects. Convert Buddy streams records
        without buffering the full file.
      </p>

      <h2>Minimal example</h2>
      <SandpackExample
        template="node"
        activeFile="/index.ts"
        preview={false}
        files={{
          '/index.js': `
import { convertToString } from "convert-buddy-js";

const output = await convertToString(file, { inputFormat: "json", outputFormat: "csv" });
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
import { convertToString } from "convert-buddy-js";

const output = await convertToString(file, {
  inputFormat: "json",
  outputFormat: "csv",
  json: { recordPath: "items" }
});
`,
        }}
      />
    </div>
  );
}
