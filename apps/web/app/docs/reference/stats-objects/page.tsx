import React from 'react';

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
      <pre><code>{`const buddy = new ConvertBuddy({
  outputFormat: 'json',
  onProgress: (stats) => {
    console.log('Progress:', {
      bytesIn: stats.bytesIn,
      recordsProcessed: stats.recordsProcessed,
      throughputMbPerSec: stats.throughputMbPerSec
    });
  }
});`}</code></pre>

      <h3>Via stats() method</h3>
      <pre><code>{`const buddy = await ConvertBuddy.create({
  outputFormat: 'json'
});

buddy.push(chunk1);
const stats1 = buddy.stats();

buddy.push(chunk2);
const stats2 = buddy.stats();

buddy.finish();
const finalStats = buddy.stats();

console.log('Final stats:', finalStats);`}</code></pre>

      <h2>Common calculations</h2>

      <h3>Progress percentage</h3>
      <pre><code>{`const totalBytes = 10000000; // Known total size

const buddy = new ConvertBuddy({
  outputFormat: 'json',
  onProgress: (stats) => {
    const percentage = (stats.bytesIn / totalBytes) * 100;
    console.log(\`Progress: \${percentage.toFixed(1)}%\`);
  }
});`}</code></pre>

      <h3>Estimated time remaining (ETA)</h3>
      <pre><code>{`const startTime = Date.now();
const totalBytes = 10000000;

const buddy = new ConvertBuddy({
  outputFormat: 'json',
  onProgress: (stats) => {
    const elapsedMs = Date.now() - startTime;
    const bytesPerMs = stats.bytesIn / elapsedMs;
    const remainingBytes = totalBytes - stats.bytesIn;
    const etaMs = remainingBytes / bytesPerMs;
    
    console.log(\`ETA: \${(etaMs / 1000).toFixed(0)} seconds\`);
  }
});`}</code></pre>

      <h3>Compression ratio</h3>
      <pre><code>{`const buddy = new ConvertBuddy({
  outputFormat: 'json',
  onProgress: (stats) => {
    const ratio = stats.bytesOut / stats.bytesIn;
    console.log(\`Compression ratio: \${ratio.toFixed(2)}x\`);
    
    // CSV to JSON is typically 1.5-2x larger
    // JSON to CSV is typically 0.5-0.7x smaller
  }
});`}</code></pre>

      <h3>Processing rate (records per second)</h3>
      <pre><code>{`const startTime = Date.now();

const buddy = new ConvertBuddy({
  outputFormat: 'json',
  onProgress: (stats) => {
    const elapsedSec = (Date.now() - startTime) / 1000;
    const recordsPerSec = stats.recordsProcessed / elapsedSec;
    
    console.log(\`Processing: \${recordsPerSec.toFixed(0)} records/sec\`);
  }
});`}</code></pre>

      <h2>Performance analysis</h2>

      <h3>Time breakdown</h3>
      <pre><code>{`const buddy = new ConvertBuddy({
  outputFormat: 'json',
  profile: true  // Enable detailed timing
});

// After conversion
const stats = buddy.stats();

const totalTime = stats.parseTimeMs + stats.transformTimeMs + stats.writeTimeMs;
console.log('Time breakdown:');
console.log(\`  Parse:     \${stats.parseTimeMs}ms (\${(stats.parseTimeMs/totalTime*100).toFixed(1)}%)\`);
console.log(\`  Transform: \${stats.transformTimeMs}ms (\${(stats.transformTimeMs/totalTime*100).toFixed(1)}%)\`);
console.log(\`  Write:     \${stats.writeTimeMs}ms (\${(stats.writeTimeMs/totalTime*100).toFixed(1)}%)\`);

// If transform time is high, simplify transform config
// If parse time is high, check input format complexity
// If write time is high, output format may be expensive (e.g., XML)`}</code></pre>

      <h3>Memory usage</h3>
      <pre><code>{`const buddy = new ConvertBuddy({
  outputFormat: 'json',
  onProgress: (stats) => {
    console.log(\`Peak memory: \${(stats.maxBufferSize / 1024 / 1024).toFixed(2)}MB\`);
    console.log(\`Current partial: \${(stats.currentPartialSize / 1024).toFixed(2)}KB\`);
    
    // If maxBufferSize grows unbounded, there may be a memory leak
    // currentPartialSize shows size of incomplete record (useful for debugging)
  }
});`}</code></pre>

      <h2>Building progress UIs</h2>

      <h3>Complete progress display</h3>
      <pre><code>{`const startTime = Date.now();
const totalBytes = 10000000;

const buddy = new ConvertBuddy({
  outputFormat: 'json',
  progressIntervalBytes: 1024 * 1024,  // Update every 1MB
  onProgress: (stats) => {
    const percentage = (stats.bytesIn / totalBytes) * 100;
    const elapsedSec = (Date.now() - startTime) / 1000;
    const mbProcessed = stats.bytesIn / 1024 / 1024;
    
    console.log([
      \`Progress: \${percentage.toFixed(1)}%\`,
      \`Processed: \${mbProcessed.toFixed(1)}MB\`,
      \`Records: \${stats.recordsProcessed}\`,
      \`Throughput: \${stats.throughputMbPerSec.toFixed(1)} MB/s\`,
      \`Elapsed: \${elapsedSec.toFixed(1)}s\`
    ].join(' | '));
  }
});`}</code></pre>

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

      <pre><code>{`const buddy = await ConvertBuddy.create({ outputFormat: 'json' });

// Initial: all zeros
console.log(buddy.stats().bytesIn);  // 0

// During: incrementing
buddy.push(chunk1);
console.log(buddy.stats().bytesIn);  // chunk1.length

buddy.push(chunk2);
console.log(buddy.stats().bytesIn);  // chunk1.length + chunk2.length

// Final: cumulative
buddy.finish();
const final = buddy.stats();
console.log(final);  // Complete stats for entire conversion`}</code></pre>

      <h2>See also</h2>
      <ul>
        <li><a href="/docs/performance/telemetry-and-stats">Telemetry & Stats</a> - Using stats in practice</li>
        <li><a href="/docs/using/progress-and-cancellation">Progress & Cancellation</a> - Progress tracking guide</li>
        <li><a href="/docs/recipes/progress-ui">Progress UI</a> - Building progress interfaces</li>
      </ul>
    </div>
  );
}
