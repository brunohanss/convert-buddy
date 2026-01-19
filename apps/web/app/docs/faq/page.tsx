import React from 'react';
import SandpackExample from '@/components/mdx/Sandpack';

export default function Page() {
  return (
    <div>
      <h1>FAQ</h1>
      <p>Frequently asked questions about Convert Buddy.</p>

      <h2>Does Convert Buddy upload my files?</h2>
      <p>No. Conversion runs locally in the browser or in your Node process.</p>

      <h2>Can I see performance during conversion?</h2>
      <p>Yes. Telemetry emits throughput, memory, and elapsed time at fixed intervals.</p>

      <h2>Minimal example</h2>
      <SandpackExample
        template="node"
        activeFile="/index.ts"
        preview={false}
        files={{
          '/index.js': `import { convertToString } from "convert-buddy-js";

await convertToString(file, { outputFormat: "json" });`,
        }}
      />

      <h2>Advanced example</h2>
      <SandpackExample
        template="node"
        activeFile="/index.ts"
        preview={false}
        files={{
          '/index.js': `import { ConvertBuddy } from "convert-buddy-js";

const buddy = new ConvertBuddy({
  onProgress: (stats) => console.log(stats.throughputMbPerSec)
});`,
        }}
      />
    </div>
  );
}
