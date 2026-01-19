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
        activeFile="/index.ts"
        preview={false}
        files={{
          '/index.js': `
import { ConvertBuddyTransformStream } from "convert-buddy-js";

const transform = new ConvertBuddyTransformStream({ inputFormat: "csv", outputFormat: "json" });
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
import { ConvertBuddyTransformStream } from "convert-buddy-js";

const transform = new ConvertBuddyTransformStream({
  inputFormat: "csv",
  outputFormat: "json",
  transform: (r) => ({ ...r, normalized: true })
});

inputStream.pipeThrough(transform).pipeTo(outputStream);
`,
        }}
      />
    </div>
  );
}
