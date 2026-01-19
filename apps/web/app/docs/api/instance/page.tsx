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
        activeFile="/index.ts"
        preview={false}
        files={{
          '/index.js': `
import { ConvertBuddy } from "convert-buddy-js";

const buddy = new ConvertBuddy({ inputFormat: "csv", outputFormat: "json" });
const outputStream = await buddy.convert(file);
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
import { ConvertBuddy } from "convert-buddy-js";

const buddy = new ConvertBuddy({
  inputFormat: "json",
  outputFormat: "csv",
  transform: (r) => ({ ...r, exported_at: new Date().toISOString() })
});

const controller = new AbortController();
const outputStream = await buddy.convert(file, { signal: controller.signal });
`,
        }}
      />
    </div>
  );
}
