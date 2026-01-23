import React from 'react';
import SandpackExample from '@/components/mdx/Sandpack';

export default function TelemetryAndStatsPage() {
  return (
    <div>
      <h1>Telemetry and Stats</h1>

      <p>
        Convert Buddy provides comprehensive runtime statistics and progress tracking through
        the <code>stats()</code> method and <code>onProgress</code> callback. Use these to build
        progress bars, monitor performance, and debug issues.
      </p>

      <h2>Getting Stats</h2>

      <p>
        Every conversion returns a converter object with a <code>stats()</code> method:
      </p>

      <SandpackExample
        template="node"
        activeFile="/index.js"
        preview={false}
        files={{
          '/index.js': `import { convertToString } from "convert-buddy-js";

const csvData = "name,age\\n" + 
  Array.from({ length: 100 }, (_, i) => 
    \`Person\${i},\${20 + i % 50}\`
  ).join("\\n");

async function run() {
  const result = await convertToString(csvData, {
    inputFormat: "csv",
    outputFormat: "json"
  });
  
  // Get final stats
  const stats = result.stats();
  
  console.log("Conversion stats:");
  console.log(JSON.stringify(stats, null, 2));
}

run().catch(console.error);`,
        }}
      />

      <h2>Stats Fields Reference</h2>

      <p>
        The stats object contains the following fields:
      </p>

      <table>
        <thead>
          <tr>
            <th>Field</th>
            <th>Type</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>bytesIn</code></td>
            <td>number</td>
            <td>Total input bytes processed</td>
          </tr>
          <tr>
            <td><code>bytesOut</code></td>
            <td>number</td>
            <td>Total output bytes generated</td>
          </tr>
          <tr>
            <td><code>chunksIn</code></td>
            <td>number</td>
            <td>Number of input chunks processed</td>
          </tr>
          <tr>
            <td><code>chunksOut</code></td>
            <td>number</td>
            <td>Number of output chunks emitted</td>
          </tr>
          <tr>
            <td><code>recordsProcessed</code></td>
            <td>number</td>
            <td>Total records converted</td>
          </tr>
          <tr>
            <td><code>recordsFiltered</code></td>
            <td>number</td>
            <td>Records excluded by transform filter</td>
          </tr>
          <tr>
            <td><code>maxBufferSize</code></td>
            <td>number</td>
            <td>Peak memory usage in bytes</td>
          </tr>
          <tr>
            <td><code>durationMs</code></td>
            <td>number</td>
            <td>Total time elapsed in milliseconds</td>
          </tr>
          <tr>
            <td><code>throughputMBps</code></td>
            <td>number</td>
            <td>Processing speed in MB/s</td>
          </tr>
        </tbody>
      </table>

      <h2>Progress Tracking with onProgress</h2>

      <p>
        Use the <code>onProgress</code> callback to monitor conversion as it happens:
      </p>

      <SandpackExample
        template="node"
        activeFile="/index.js"
        preview={false}
        files={{
          '/index.js': `import { convertToString } from "convert-buddy-js";

const largeData = "name,value\\n" + 
  Array.from({ length: 500 }, (_, i) => 
    \`record\${i},\${i * 10}\`
  ).join("\\n");

async function run() {
  let lastProgress = 0;
  
  const result = await convertToString(largeData, {
    inputFormat: "csv",
    outputFormat: "json",
    progressIntervalBytes: 1024,  // Report every 1KB
    onProgress: (stats) => {
      const percent = Math.round((stats.bytesIn / largeData.length) * 100);
      if (percent !== lastProgress) {
        console.log(\`Progress: \${percent}% - \${stats.recordsProcessed} records\`);
        lastProgress = percent;
      }
    }
  });
  
  console.log("\\nConversion complete!");
  const finalStats = result.stats();
  console.log(\`Processed \${finalStats.recordsProcessed} records\`);
  console.log(\`Throughput: \${finalStats.throughputMBps.toFixed(2)} MB/s\`);
}

run().catch(console.error);`,
        }}
      />

      <h2>Progress Interval Configuration</h2>

      <p>
        Control how often <code>onProgress</code> is called:
      </p>

      <table>
        <thead>
          <tr>
            <th>Option</th>
            <th>Default</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>progressIntervalBytes</code></td>
            <td>1048576 (1MB)</td>
            <td>Report progress after processing this many input bytes</td>
          </tr>
        </tbody>
      </table>

      <SandpackExample
        template="node"
        activeFile="/index.js"
        preview={false}
        files={{
          '/index.js': `import { convertToString } from "convert-buddy-js";

const data = "name,value\\n" + 
  Array.from({ length: 200 }, (_, i) => \`row\${i},\${i}\`).join("\\n");

async function run() {
  console.log("Fine-grained progress (every 512 bytes):");
  await convertToString(data, {
    inputFormat: "csv",
    outputFormat: "json",
    progressIntervalBytes: 512,
    onProgress: (stats) => {
      console.log(\`  \${stats.bytesIn} bytes, \${stats.recordsProcessed} records\`);
    }
  });
  
  console.log("\\nCoarse progress (every 5KB):");
  await convertToString(data, {
    inputFormat: "csv",
    outputFormat: "json",
    progressIntervalBytes: 5120,
    onProgress: (stats) => {
      console.log(\`  \${stats.bytesIn} bytes, \${stats.recordsProcessed} records\`);
    }
  });
}

run().catch(console.error);`,
        }}
      />

      <h2>Building a Progress Monitor</h2>

      <p>
        Create a reusable progress monitor:
      </p>

      <SandpackExample
        template="node"
        activeFile="/index.js"
        preview={false}
        files={{
          '/index.js': `import { convertToString } from "convert-buddy-js";

class ProgressMonitor {
  constructor(totalBytes) {
    this.totalBytes = totalBytes;
    this.startTime = Date.now();
    this.lastUpdate = 0;
  }
  
  onProgress(stats) {
    const now = Date.now();
    
    // Throttle updates to once per 500ms
    if (now - this.lastUpdate < 500) return;
    this.lastUpdate = now;
    
    const percent = Math.round((stats.bytesIn / this.totalBytes) * 100);
    const elapsed = (now - this.startTime) / 1000;
    const rate = stats.throughputMBps.toFixed(2);
    
    console.log(\`[\${percent}%] \${stats.recordsProcessed} records | \${rate} MB/s | \${elapsed.toFixed(1)}s\`);
  }
}

async function run() {
  const data = "name,value\\n" + 
    Array.from({ length: 300 }, (_, i) => \`record\${i},\${i}\`).join("\\n");
  
  const monitor = new ProgressMonitor(data.length);
  
  const result = await convertToString(data, {
    inputFormat: "csv",
    outputFormat: "json",
    progressIntervalBytes: 1024,
    onProgress: (stats) => monitor.onProgress(stats)
  });
  
  console.log("\\nComplete!");
}

run().catch(console.error);`,
        }}
      />

      <h2>Tracking Filtered Records</h2>

      <p>
        Monitor how many records are filtered out:
      </p>

      <SandpackExample
        template="node"
        activeFile="/index.js"
        preview={false}
        files={{
          '/index.js': `import { convertToString } from "convert-buddy-js";

const data = "name,age,status\\n" + 
  Array.from({ length: 100 }, (_, i) => 
    \`Person\${i},\${20 + i % 50},\${i % 2 === 0 ? 'active' : 'inactive'}\`
  ).join("\\n");

async function run() {
  const result = await convertToString(data, {
    inputFormat: "csv",
    outputFormat: "json",
    transform: {
      filter: (record) => record.status === "active"
    },
    onProgress: (stats) => {
      if (stats.recordsProcessed % 25 === 0) {
        console.log(
          \`Processed: \${stats.recordsProcessed}, \` +
          \`Filtered: \${stats.recordsFiltered}, \` +
          \`Kept: \${stats.recordsProcessed - stats.recordsFiltered}\`
        );
      }
    }
  });
  
  const finalStats = result.stats();
  console.log(\`\\nFinal: \${finalStats.recordsProcessed - finalStats.recordsFiltered} of \${finalStats.recordsProcessed} records kept\`);
}

run().catch(console.error);`,
        }}
      />

      <h2>Memory Usage Monitoring</h2>

      <p>
        Track peak memory usage:
      </p>

      <SandpackExample
        template="node"
        activeFile="/index.js"
        preview={false}
        files={{
          '/index.js': `import { convertToString } from "convert-buddy-js";

const data = "name,data\\n" + 
  Array.from({ length: 200 }, (_, i) => 
    \`row\${i},${"X".repeat(100)}\`  // Large field
  ).join("\\n");

async function run() {
  let maxMemorySeen = 0;
  
  const result = await convertToString(data, {
    inputFormat: "csv",
    outputFormat: "json",
    progressIntervalBytes: 2048,
    onProgress: (stats) => {
      maxMemorySeen = Math.max(maxMemorySeen, stats.maxBufferSize);
      console.log(\`Current buffer: \${(stats.maxBufferSize / 1024).toFixed(1)} KB\`);
    }
  });
  
  console.log(\`\\nPeak memory: \${(maxMemorySeen / 1024).toFixed(1)} KB\`);
}

run().catch(console.error);`,
        }}
      />

      <h2>Throughput Analysis</h2>

      <p>
        Calculate and display processing speed:
      </p>

      <SandpackExample
        template="node"
        activeFile="/index.js"
        preview={false}
        files={{
          '/index.js': `import { convertToString } from "convert-buddy-js";

async function benchmarkConversion(data, label) {
  console.log(\`\\n=== \${label} ===\`);
  
  const result = await convertToString(data, {
    inputFormat: "csv",
    outputFormat: "json"
  });
  
  const stats = result.stats();
  
  console.log(\`Input: \${(stats.bytesIn / 1024).toFixed(1)} KB\`);
  console.log(\`Output: \${(stats.bytesOut / 1024).toFixed(1)} KB\`);
  console.log(\`Records: \${stats.recordsProcessed}\`);
  console.log(\`Duration: \${stats.durationMs.toFixed(1)} ms\`);
  console.log(\`Throughput: \${stats.throughputMBps.toFixed(2)} MB/s\`);
}

async function run() {
  const smallData = "name,value\\n" + 
    Array.from({ length: 50 }, (_, i) => \`row\${i},\${i}\`).join("\\n");
  
  const largeData = "name,value\\n" + 
    Array.from({ length: 500 }, (_, i) => \`row\${i},\${i}\`).join("\\n");
  
  await benchmarkConversion(smallData, "Small Dataset");
  await benchmarkConversion(largeData, "Large Dataset");
}

run().catch(console.error);`,
        }}
      />

      <h2>See Also</h2>

      <ul>
        <li><a href="/docs/performance/memory-model">Memory Model</a> - Understanding memory usage</li>
        <li><a href="/docs/performance/benchmarks">Benchmarks</a> - Performance comparisons</li>
        <li><a href="/docs/recipes/progress-ui">Progress UI</a> - Building progress interfaces</li>
        <li><a href="/docs/reference/stats-objects">Stats Objects Reference</a> - Complete stats documentation</li>
      </ul>
    </div>
  );
}
