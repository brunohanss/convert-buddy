import React from 'react';
import PlaygroundExample from '@/components/mdx/Playground';

export default function StatsObjectsPage() {
  return (
    <div>
      <h1>Stats Objects</h1>

      <p>
        Complete reference for the Stats object returned by Convert Buddy.
      </p>

      <h2>Stats interface</h2>

      <p>
        The Stats object provides real-time telemetry during conversion.
      </p>

      <table>
        <thead>
          <tr>
            <th>Field</th>
            <th>Type</th>
            <th>Units</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>bytesIn</code></td>
            <td><code>number</code></td>
            <td>bytes</td>
            <td>Total input bytes processed</td>
          </tr>
          <tr>
            <td><code>bytesOut</code></td>
            <td><code>number</code></td>
            <td>bytes</td>
            <td>Total output bytes produced</td>
          </tr>
          <tr>
            <td><code>chunksIn</code></td>
            <td><code>number</code></td>
            <td>count</td>
            <td>Number of input chunks processed</td>
          </tr>
          <tr>
            <td><code>recordsProcessed</code></td>
            <td><code>number</code></td>
            <td>count</td>
            <td>Number of records (rows, objects, elements) processed</td>
          </tr>
          <tr>
            <td><code>parseTimeMs</code></td>
            <td><code>number</code></td>
            <td>milliseconds</td>
            <td>Cumulative time spent parsing input</td>
          </tr>
          <tr>
            <td><code>transformTimeMs</code></td>
            <td><code>number</code></td>
            <td>milliseconds</td>
            <td>Cumulative time spent transforming records</td>
          </tr>
          <tr>
            <td><code>writeTimeMs</code></td>
            <td><code>number</code></td>
            <td>milliseconds</td>
            <td>Cumulative time spent writing output</td>
          </tr>
          <tr>
            <td><code>maxBufferSize</code></td>
            <td><code>number</code></td>
            <td>bytes</td>
            <td>Peak memory usage for buffers</td>
          </tr>
          <tr>
            <td><code>currentPartialSize</code></td>
            <td><code>number</code></td>
            <td>bytes</td>
            <td>Current size of partial (incomplete) record buffer</td>
          </tr>
          <tr>
            <td><code>throughputMbPerSec</code></td>
            <td><code>number</code></td>
            <td>MB/s</td>
            <td>Current throughput in megabytes per second</td>
          </tr>
        </tbody>
      </table>

      <h2>Accessing stats</h2>

      <h3>Via onProgress callback</h3>
      <PlaygroundExample
        template="node"
        activeFile="/index.js"
        preview={true}
        files={{
          '/index.js': `
import { ConvertBuddy } from "convert-buddy-js";

async function run() {
  const fileUrl = "";  // Will be replaced with sample data
  const response = await fetch(fileUrl);
  const data = await response.text();
  
  const buddy = await ConvertBuddy.create({
    inputFormat: "csv",
    outputFormat: "json",
    progressIntervalBytes: 256,  // Report frequently for demo
    onProgress: (stats) => {
      console.log('Progress:', {
        bytesIn: stats.bytesIn,
        recordsProcessed: stats.recordsProcessed,
        throughputMbPerSec: stats.throughputMbPerSec.toFixed(2)
      });
    }
  });
  
  // Process in chunks
  const encoder = new TextEncoder();
  const buffer = encoder.encode(data);
  const chunkSize = 512;
  
  for (let i = 0; i < buffer.length; i += chunkSize) {
    const chunk = buffer.slice(i, Math.min(i + chunkSize, buffer.length));
    buddy.push(chunk);
  }
  
  buddy.finish();
  console.log('Conversion complete!');
}

run().catch(console.error);
`,
        }}
      />

      <h3>Via stats() method</h3>
      <PlaygroundExample
        template="node"
        activeFile="/index.js"
        preview={true}
        files={{
          '/index.js': `
import { ConvertBuddy } from "convert-buddy-js";

async function run() {
  const fileUrl = "";  // Will be replaced with sample data
  const response = await fetch(fileUrl);
  const data = await response.text();
  
  const buddy = await ConvertBuddy.create({
    inputFormat: "csv",
    outputFormat: "json"
  });

  const encoder = new TextEncoder();
  const buffer = encoder.encode(data);
  
  // Process first half
  const midpoint = Math.floor(buffer.length / 2);
  buddy.push(buffer.slice(0, midpoint));
  const stats1 = buddy.stats();
  console.log('After first half:', stats1);

  // Process second half
  buddy.push(buffer.slice(midpoint));
  const stats2 = buddy.stats();
  console.log('After second half:', stats2);

  buddy.finish();
  const finalStats = buddy.stats();
  console.log('Final stats:', finalStats);
}

run().catch(console.error);
`,
        }}
      />

      <h2>Common calculations</h2>

      <h3>Progress percentage</h3>
      <PlaygroundExample
        template="node"
        activeFile="/index.js"
        preview={true}
        files={{
          '/index.js': `
import { ConvertBuddy } from "convert-buddy-js";

async function run() {
  const fileUrl = "";  // Will be replaced with sample data
  const response = await fetch(fileUrl);
  const data = await response.text();
  const totalBytes = data.length;

  const buddy = await ConvertBuddy.create({
    inputFormat: "csv",
    outputFormat: "json",
    progressIntervalBytes: 200,
    onProgress: (stats) => {
      const percentage = (stats.bytesIn / totalBytes) * 100;
      console.log(\`Progress: \${percentage.toFixed(1)}%\`);
    }
  });
  
  const encoder = new TextEncoder();
  const buffer = encoder.encode(data);
  const chunkSize = 400;
  
  for (let i = 0; i < buffer.length; i += chunkSize) {
    const chunk = buffer.slice(i, Math.min(i + chunkSize, buffer.length));
    buddy.push(chunk);
  }
  
  buddy.finish();
}

run().catch(console.error);
`,
        }}
      />

      <h3>Compression ratio</h3>
      <PlaygroundExample
        template="node"
        activeFile="/index.js"
        preview={true}
        files={{
          '/index.js': `
import { ConvertBuddy } from "convert-buddy-js";

async function run() {
  const fileUrl = "";  // Will be replaced with sample data
  const response = await fetch(fileUrl);
  const csvData = await response.text();
  
  const buddy = await ConvertBuddy.create({
    inputFormat: "csv",
    outputFormat: "json",
    onProgress: (stats) => {
      const ratio = stats.bytesOut / stats.bytesIn;
      console.log(\`Compression ratio: \${ratio.toFixed(2)}x\`);
      
      // CSV to JSON is typically 1.5-2x larger
      // JSON to CSV is typically 0.5-0.7x smaller
    }
  });
  
  const encoder = new TextEncoder();
  const buffer = encoder.encode(csvData);
  buddy.push(buffer);
  buddy.finish();
  
  const finalStats = buddy.stats();
  console.log(\`Final: \${finalStats.bytesIn} bytes ΓåÆ \${finalStats.bytesOut} bytes\`);
}

run().catch(console.error);
`,
        }}
      />

      <h3>Processing rate (records per second)</h3>
      <PlaygroundExample
        template="node"
        activeFile="/index.js"
        preview={true}
        files={{
          '/index.js': `
import { ConvertBuddy } from "convert-buddy-js";

async function run() {
  const fileUrl = "";  // Will be replaced with sample data
  const response = await fetch(fileUrl);
  const data = await response.text();
  
  const startTime = Date.now();

  const buddy = await ConvertBuddy.create({
    inputFormat: "csv",
    outputFormat: "json",
    progressIntervalBytes: 256,
    onProgress: (stats) => {
      const elapsedSec = (Date.now() - startTime) / 1000;
      const recordsPerSec = stats.recordsProcessed / elapsedSec;
      
      console.log(\`Processing: \${recordsPerSec.toFixed(0)} records/sec\`);
    }
  });
  
  const encoder = new TextEncoder();
  const buffer = encoder.encode(data);
  const chunkSize = 512;
  
  for (let i = 0; i < buffer.length; i += chunkSize) {
    const chunk = buffer.slice(i, Math.min(i + chunkSize, buffer.length));
    buddy.push(chunk);
  }
  
  buddy.finish();
}

run().catch(console.error);
`,
        }}
      />

      <h2>Performance analysis</h2>

      <h3>Time breakdown</h3>
      <PlaygroundExample
        template="node"
        activeFile="/index.js"
        preview={true}
        files={{
          '/index.js': `
import { ConvertBuddy } from "convert-buddy-js";

async function run() {
  const fileUrl = "";  // Will be replaced with sample data
  const response = await fetch(fileUrl);
  const data = await response.text();
  
  const buddy = await ConvertBuddy.create({
    inputFormat: "csv",
    outputFormat: "json",
    profile: true  // Enable detailed timing
  });

  const encoder = new TextEncoder();
  buddy.push(encoder.encode(data));
  buddy.finish();

  // After conversion
  const stats = buddy.stats();

  const totalTime = stats.parseTimeMs + stats.transformTimeMs + stats.writeTimeMs;
  console.log('Time breakdown:');
  console.log(\`  Parse:     \${stats.parseTimeMs}ms (\${(stats.parseTimeMs/totalTime*100).toFixed(1)}%)\`);
  console.log(\`  Transform: \${stats.transformTimeMs}ms (\${(stats.transformTimeMs/totalTime*100).toFixed(1)}%)\`);
  console.log(\`  Write:     \${stats.writeTimeMs}ms (\${(stats.writeTimeMs/totalTime*100).toFixed(1)}%)\`);

  // If transform time is high, simplify transform config
  // If parse time is high, check input format complexity
  // If write time is high, output format may be expensive (e.g., XML)
}

run().catch(console.error);
`,
        }}
      />

      <h3>Memory usage</h3>
      <PlaygroundExample
        template="node"
        activeFile="/index.js"
        preview={true}
        files={{
          '/index.js': `
import { ConvertBuddy } from "convert-buddy-js";

async function run() {
  const fileUrl = "";  // Will be replaced with sample data
  const response = await fetch(fileUrl);
  const data = await response.text();
  
  const buddy = await ConvertBuddy.create({
    inputFormat: "csv",
    outputFormat: "json",
    progressIntervalBytes: 128,
    onProgress: (stats) => {
      console.log(\`Peak memory: \${(stats.maxBufferSize / 1024 / 1024).toFixed(2)}MB\`);
      console.log(\`Current partial: \${(stats.currentPartialSize / 1024).toFixed(2)}KB\`);
      
      // If maxBufferSize grows unbounded, there may be a memory leak
      // currentPartialSize shows size of incomplete record (useful for debugging)
    }
  });
  
  const encoder = new TextEncoder();
  const buffer = encoder.encode(data);
  const chunkSize = 256;
  
  for (let i = 0; i < buffer.length; i += chunkSize) {
    const chunk = buffer.slice(i, Math.min(i + chunkSize, buffer.length));
    buddy.push(chunk);
  }
  
  buddy.finish();
}

run().catch(console.error);
`,
        }}
      />

      <h2>Understanding throughput</h2>

      <p>
        <code>throughputMbPerSec</code> is calculated as:
      </p>

      <pre><code>{`throughputMbPerSec = (bytesIn / 1024 / 1024) / (totalTimeMs / 1000)`}</code></pre>

      <p>
        Where <code>totalTimeMs = parseTimeMs + transformTimeMs + writeTimeMs</code>.
      </p>

      <p>
        Typical values:
      </p>

      <ul>
        <li><strong>50-150 MB/s</strong>: Normal throughput for most conversions</li>
        <li><strong>&lt;20 MB/s</strong>: Slow—check for complex transforms or XML parsing</li>
        <li><strong>&gt;200 MB/s</strong>: Fast—simple conversion, good CPU, SIMD enabled</li>
      </ul>

      <h2>Stats lifecycle</h2>

      <ol>
        <li><strong>Initial</strong>: All values are 0</li>
        <li><strong>During conversion</strong>: Values increment as chunks are processed</li>
        <li><strong>After finish()</strong>: Final cumulative values</li>
      </ol>

      <PlaygroundExample
        template="node"
        activeFile="/index.js"
        preview={true}
        files={{
          '/index.js': `
import { ConvertBuddy } from "convert-buddy-js";

async function run() {
  const fileUrl = "";  // Will be replaced with sample data
  const response = await fetch(fileUrl);
  const data = await response.text();
  
  const buddy = await ConvertBuddy.create({
    inputFormat: "csv",
    outputFormat: "json"
  });

  // Initial: all zeros
  console.log('Initial bytesIn:', buddy.stats().bytesIn);  // 0

  const encoder = new TextEncoder();
  const buffer = encoder.encode(data);
  
  // During: incrementing
  const chunk1 = buffer.slice(0, Math.floor(buffer.length / 2));
  buddy.push(chunk1);
  console.log('After chunk 1 bytesIn:', buddy.stats().bytesIn);  // chunk1.length

  const chunk2 = buffer.slice(Math.floor(buffer.length / 2));
  buddy.push(chunk2);
  console.log('After chunk 2 bytesIn:', buddy.stats().bytesIn);  // chunk1.length + chunk2.length

  // Final: cumulative
  buddy.finish();
  const final = buddy.stats();
  console.log('Final stats:', final);  // Complete stats for entire conversion
}

run().catch(console.error);
`,
        }}
      />

      <h2>See also</h2>
      <ul>
        <li><a href="/docs/performance/telemetry-and-stats">Telemetry & Stats</a> - Using stats in practice</li>
        <li><a href="/docs/using/progress-and-cancellation">Progress & Cancellation</a> - Progress tracking guide</li>
        <li><a href="/docs/recipes/progress-ui">Progress UI</a> - Building progress interfaces</li>
      </ul>
    </div>
  );
}
