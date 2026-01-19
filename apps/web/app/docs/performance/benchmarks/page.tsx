import React from 'react';
import SandpackExample from '@/components/mdx/Sandpack';

export default function Page() {
  return (
    <div>
      <h1>Benchmarks</h1>
      <p>Benchmark results and methodology.</p>

      <h2>Minimal example</h2>
      <SandpackExample
        template="node"
        activeFile="/index.ts"
        preview={false}
        files={{
          '/index.js': `await runBenchmark({ inputFormat: "csv", outputFormat: "json" });`,
        }}
      />

      <h2>Advanced example</h2>
      <SandpackExample
        template="node"
        activeFile="/index.ts"
        preview={false}
        files={{
          '/index.js': `await runBenchmark({
  inputFormat: "xml",
  outputFormat: "json",
  sizeGb: 5,
  includeTransforms: true
});`,
        }}
      />
    </div>
  );
}
