import React from 'react';
import SandpackExample from '@/components/mdx/Sandpack';

export default function Page() {
  return (
    <div>
      <h1>Memory</h1>
      <p>Memory considerations and guidance.</p>

      <h2>Minimal example</h2>
      <SandpackExample
        template="node"
        activeFile="/index.ts"
        preview={false}
        files={{
          '/index.js': `import { ConvertBuddy } from "convert-buddy-js";

const buddy = new ConvertBuddy({ memoryLimitMb: 128 });`,
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
  memoryLimitMb: 256,
  onProgress: (stats) => console.log(stats.memoryMb)
});`,
        }}
      />
    </div>
  );
}
