import React from 'react';
import SandpackExample from '@/components/mdx/Sandpack';

export default function Page() {
  return (
    <div>
      <h1>Telemetry</h1>
      <p>Information about telemetry and metrics.</p>

      <h2>Minimal example</h2>
      <SandpackExample
        template="node"
        activeFile="/index.ts"
        preview={false}
        files={{
          '/index.js': `import { ConvertBuddy } from "convert-buddy-js";

const buddy = new ConvertBuddy({
  onProgress: (stats) => {
    console.log(stats.throughputMbPerSec);
    console.log(stats.memoryMb);
    console.log(stats.elapsedMs);
  }
});`,
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
  onProgress: (stats) => {
    analytics.track("throughput", stats.throughputMbPerSec);
  },
  progressIntervalMs: 500
});`,
        }}
      />
    </div>
  );
}
