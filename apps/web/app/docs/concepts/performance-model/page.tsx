import dynamic from 'next/dynamic';

import React from 'react';
import SandpackExample from '@/components/mdx/Sandpack';

export default function Page() {
  return (
    <div>
      <h1>Performance model</h1>

      <p>
        Performance is a first-class feature. Convert Buddy emits telemetry every
        interval so users can trust throughput, memory, and elapsed time.
      </p>

      <h2>Minimal example</h2>
      <SandpackExample
        template="node"
        activeFile="/index.ts"
        preview={false}
        files={{
          '/index.js': `
import { ConvertBuddy } from "convert-buddy-js";

const buddy = new ConvertBuddy({
  onProgress: (stats) => {
    console.log(stats.throughputMbPerSec);
    console.log(stats.memoryMb);
    console.log(stats.elapsedMs);
  }
});
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
  onProgress: (stats) => {
    if (stats.memoryMb > 256) {
      console.warn("Memory threshold exceeded");
    }
  },
  progressIntervalMs: 250
});
`,
        }}
      />
    </div>
  );
}
