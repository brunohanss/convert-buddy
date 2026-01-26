import React from 'react';
import PlaygroundExample from '@/components/mdx/Playground';

export default function MemoryModelPage() {
  return (
    <div>
      <h1>Memory Model</h1>

      <p>
        Convert Buddy guarantees constant memory usage regardless of input size. This page explains
        how the memory model works, how to configure it, and how to monitor memory consumption.
      </p>

      <h2>Constant Memory Guarantee</h2>

      <p>
        Unlike traditional converters that load entire files into memory, Convert Buddy processes
        data in streaming chunks:
      </p>

      <ul>
        <li><strong>Input buffering:</strong> Fixed-size chunks read from source</li>
        <li><strong>Processing:</strong> Records processed one at a time</li>
        <li><strong>Output buffering:</strong> Small buffers for formatted output</li>
        <li><strong>No accumulation:</strong> Processed data is immediately released</li>
      </ul>

      <p>
        This means a 10 GB file uses the same memory as a 10 MB file.
      </p>

      <h2>Memory Breakdown</h2>

      <p>
        Total memory usage comes from several components:
      </p>

      <table>
        <thead>
          <tr>
            <th>Component</th>
            <th>Typical Size</th>
            <th>Purpose</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Input buffer</td>
            <td>64-256 KB</td>
            <td>Holds raw input chunk being parsed</td>
          </tr>
          <tr>
            <td>Parser state</td>
            <td>1-10 KB</td>
            <td>Parser internal state (field buffers, etc.)</td>
          </tr>
          <tr>
            <td>Record buffer</td>
            <td>0.5-5 KB</td>
            <td>Current record being processed</td>
          </tr>
          <tr>
            <td>Transform state</td>
            <td>1-10 KB</td>
            <td>Transform pipeline state (if enabled)</td>
          </tr>
          <tr>
            <td>Output buffer</td>
            <td>64-256 KB</td>
            <td>Formatted output waiting to be emitted</td>
          </tr>
          <tr>
            <td>WASM overhead</td>
            <td>~2 MB</td>
            <td>WebAssembly runtime and module</td>
          </tr>
        </tbody>
      </table>

      <p>
        <strong>Total typical usage:</strong> 3-5 MB for most conversions
      </p>

      <h2>maxMemoryMB Configuration</h2>

      <p>
        Control maximum memory usage with the <code>maxMemoryMB</code> option:
      </p>

      <PlaygroundExample
        template="node"
        activeFile="/index.js"
        preview={true}
        files={{
          '/index.js': `import { convertToString } from "convert-buddy-js";

const data = "name,value\\n" + 
  Array.from({ length: 1000 }, (_, i) => 
    \`record\${i},\${i}\`
  ).join("\\n");

async function run() {
  // Limit memory to 10 MB
  const result = await convertToString(data, {
    inputFormat: "csv",
    outputFormat: "json",
    maxMemoryMB: 10,
    onProgress: (stats) => {
      const memoryMB = (stats.maxBufferSize / (1024 * 1024)).toFixed(2);
      console.log(\`Memory usage: \${memoryMB} MB\`);
    }
  });
  
  const stats = result.stats();
  const peakMB = (stats.maxBufferSize / (1024 * 1024)).toFixed(2);
  console.log(\`\\nPeak memory: \${peakMB} MB (limit: 10 MB)\`);
}

run().catch(console.error);`,
        }}
      />

      <h3>Default Limits</h3>

      <ul>
        <li><strong>Default maxMemoryMB:</strong> 512 MB</li>
        <li><strong>Minimum recommended:</strong> 8 MB</li>
        <li><strong>Maximum practical:</strong> Device-dependent (usually 1-2 GB)</li>
      </ul>

      <h2>Buffer Pool Mechanics</h2>

      <p>
        Convert Buddy uses a buffer pool to minimize allocations:
      </p>

      <ol>
        <li>Buffers are allocated from a reusable pool</li>
        <li>After processing, buffers are returned to the pool</li>
        <li>Pool size is capped by <code>maxMemoryMB</code></li>
        <li>Buffers are reused across chunks for efficiency</li>
      </ol>

      <PlaygroundExample
        template="node"
        activeFile="/index.js"
        preview={true}
        files={{
          '/index.js': `import { convertToString } from "convert-buddy-js";

async function demonstrateBufferReuse() {
  // Process multiple conversions in sequence
  const data = "name,value\\n" + 
    Array.from({ length: 100 }, (_, i) => \`row\${i},\${i}\`).join("\\n");
  
  for (let i = 0; i < 3; i++) {
    console.log(\`\\nConversion \${i + 1}:\`);
    
    const result = await convertToString(data, {
      inputFormat: "csv",
      outputFormat: "json",
      maxMemoryMB: 8
    });
    
    const stats = result.stats();
    const memoryKB = (stats.maxBufferSize / 1024).toFixed(1);
    console.log(\`  Peak memory: \${memoryKB} KB\`);
    console.log(\`  (Buffer pool reused across conversions)\`);
  }
}

demonstrateBufferReuse().catch(console.error);`,
        }}
      />

      <h2>Monitoring Memory Usage</h2>

      <p>
        Track memory consumption in real-time:
      </p>

      <PlaygroundExample
        template="node"
        activeFile="/index.js"
        preview={true}
        files={{
          '/index.js': `import { convertToString } from "convert-buddy-js";

class MemoryMonitor {
  constructor() {
    this.samples = [];
  }
  
  track(stats) {
    this.samples.push(stats.maxBufferSize);
  }
  
  report() {
    const max = Math.max(...this.samples);
    const avg = this.samples.reduce((a, b) => a + b, 0) / this.samples.length;
    const min = Math.min(...this.samples);
    
    console.log("\\n=== Memory Report ===");
    console.log(\`Samples: \${this.samples.length}\`);
    console.log(\`Max: \${(max / 1024).toFixed(1)} KB\`);
    console.log(\`Avg: \${(avg / 1024).toFixed(1)} KB\`);
    console.log(\`Min: \${(min / 1024).toFixed(1)} KB\`);
  }
}

async function run() {
  const monitor = new MemoryMonitor();
  
  const data = "name,value\\n" + 
    Array.from({ length: 500 }, (_, i) => \`row\${i},\${i}\`).join("\\n");
  
  await convertToString(data, {
    inputFormat: "csv",
    outputFormat: "json",
    progressIntervalBytes: 2048,
    onProgress: (stats) => monitor.track(stats)
  });
  
  monitor.report();
}

run().catch(console.error);`,
        }}
      />

      <h2>Memory vs Performance Trade-offs</h2>

      <p>
        Smaller memory limits can impact performance:
      </p>

      <table>
        <thead>
          <tr>
            <th>maxMemoryMB</th>
            <th>Chunk Size</th>
            <th>Performance Impact</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>4-8 MB</td>
            <td>Small</td>
            <td>More chunk processing overhead (~10-20% slower)</td>
          </tr>
          <tr>
            <td>16-64 MB</td>
            <td>Medium</td>
            <td>Good balance (recommended for most use cases)</td>
          </tr>
          <tr>
            <td>128-512 MB</td>
            <td>Large</td>
            <td>Maximum throughput (for high-memory environments)</td>
          </tr>
        </tbody>
      </table>

      <PlaygroundExample
        template="node"
        activeFile="/index.js"
        preview={true}
        files={{
          '/index.js': `import { convertToString } from "convert-buddy-js";

async function benchmarkMemoryLimit(maxMemoryMB) {
  const data = "name,value\\n" + 
    Array.from({ length: 300 }, (_, i) => \`row\${i},\${i}\`).join("\\n");
  
  const start = Date.now();
  
  const result = await convertToString(data, {
    inputFormat: "csv",
    outputFormat: "json",
    maxMemoryMB: maxMemoryMB
  });
  
  const duration = Date.now() - start;
  const stats = result.stats();
  const memoryKB = (stats.maxBufferSize / 1024).toFixed(1);
  
  console.log(\`maxMemoryMB=\${maxMemoryMB}: \${duration}ms, \${memoryKB}KB peak\`);
}

async function run() {
  console.log("Comparing memory limits:\\n");
  await benchmarkMemoryLimit(8);
  await benchmarkMemoryLimit(32);
  await benchmarkMemoryLimit(128);
}

run().catch(console.error);`,
        }}
      />

      <h2>Best Practices</h2>

      <ul>
        <li>
          <strong>Default (512 MB):</strong> Fine for most applications
        </li>
        <li>
          <strong>Memory-constrained (8-16 MB):</strong> Mobile devices, serverless functions
        </li>
        <li>
          <strong>High-performance (128-256 MB):</strong> Desktop apps, powerful servers
        </li>
        <li>
          <strong>Monitor in production:</strong> Use <code>onProgress</code> to track actual usage
        </li>
        <li>
          <strong>Test edge cases:</strong> Very large records, deep nesting, etc.
        </li>
      </ul>

      <h2>See Also</h2>

      <ul>
        <li><a href="/docs/performance/telemetry-and-stats">Telemetry and Stats</a> - Monitoring tools</li>
        <li><a href="/docs/performance/benchmarks">Benchmarks</a> - Performance data</li>
        <li><a href="/docs/recipes/large-files">Large Files</a> - Handling multi-GB files</li>
        <li><a href="/docs/reference/configuration">Configuration Reference</a> - All config options</li>
      </ul>
    </div>
  );
}
