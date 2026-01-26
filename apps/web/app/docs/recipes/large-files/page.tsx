import dynamic from 'next/dynamic';

import React from 'react';
import PlaygroundExample from '@/components/mdx/Playground';

export default function Page() {
  return (
    <div>
      <h1>Large files</h1>

      <p>For multi-GB inputs, rely on streaming and telemetry to keep memory predictable.</p>

      <h2>Streaming API with push/finish</h2>
      <p>Use <code>ConvertBuddy.create()</code> for chunk-by-chunk processing with real-time stats.</p>
      
      <PlaygroundExample
        template="node"
        activeFile="/index.js"
        preview={true}
        dependencyVersion="latest"
        files={{
          '/index.js': `import { ConvertBuddy } from "convert-buddy-js";

// Load sample data
const fileUrl = "";
const response = await fetch(fileUrl);
const data = await response.text();

// Create a streaming converter instance
const buddy = await ConvertBuddy.create({
  inputFormat: "csv",
  outputFormat: "csv",
  maxMemoryMB: 128,
  chunkTargetBytes: 64 * 1024,
  progressIntervalBytes: 512,
  profile: true,
  onProgress: (stats) => {
    console.log(
      \`Progress: \${stats.recordsProcessed} records, \` +
      \`\${stats.throughputMbPerSec.toFixed(1)} MB/s\`
    );
  }
});

// Stream data in chunks
const encoder = new TextEncoder();
const buffer = encoder.encode(data);
const chunkSize = 1024;

const outputs = [];
for (let i = 0; i < buffer.length; i += chunkSize) {
  const chunk = buffer.slice(i, Math.min(i + chunkSize, buffer.length));
  const output = buddy.push(chunk);
  if (output.length > 0) outputs.push(output);
}

const final = buddy.finish();
if (final.length > 0) outputs.push(final);

// Combine results
const totalLength = outputs.reduce((sum, arr) => sum + arr.length, 0);
const result = new Uint8Array(totalLength);
let offset = 0;
for (const output of outputs) {
  result.set(output, offset);
  offset += output.length;
}

const finalStats = buddy.stats();
console.log("\\nConversion complete!");
console.log("Total records:", finalStats.recordsProcessed);
console.log("Peak memory:", (finalStats.maxBufferSize / 1024 / 1024).toFixed(2), "MB");
console.log("Output size:", result.length, "bytes");

// Show first few lines of output
const decoder = new TextDecoder();
const output = decoder.decode(result);
const lines = output.split('\\n').slice(0, 3);
console.log("\\nFirst 3 lines of CSV output:");
lines.forEach(line => console.log(line));
`,
        }}
      />

      <h2>Advanced streaming with progress tracking</h2>
      <p>Monitor conversion progress, ETA, and performance metrics in real-time.</p>
      
      <PlaygroundExample
        template="node"
        activeFile="/index.js"
        preview={true}
        dependencyVersion="latest"
        files={{
          '/index.js': `import { ConvertBuddy } from "convert-buddy-js";

const fileUrl = "";
const response = await fetch(fileUrl);
const data = await response.text();

const startTime = Date.now();
const totalBytes = data.length;

const buddy = await ConvertBuddy.create({
  inputFormat: "csv",
  outputFormat: "ndjson",
  maxMemoryMB: 256,
  chunkTargetBytes: 128 * 1024,
  progressIntervalBytes: 256,
  profile: true,
  onProgress: (stats) => {
    const percentage = (stats.bytesIn / totalBytes) * 100;
    const elapsedSec = (Date.now() - startTime) / 1000;
    const bytesPerSec = stats.bytesIn / elapsedSec;
    const remainingBytes = totalBytes - stats.bytesIn;
    const etaSec = remainingBytes / bytesPerSec;
    
    console.log(
      \`\${percentage.toFixed(0)}% | \` +
      \`\${stats.recordsProcessed} records | \` +
      \`\${stats.throughputMbPerSec.toFixed(1)} MB/s | \` +
      \`ETA: \${Math.max(0, etaSec).toFixed(0)}s | \` +
      \`Mem: \${(stats.maxBufferSize / 1024 / 1024).toFixed(2)}MB\`
    );
  }
});

// Process in chunks
const encoder = new TextEncoder();
const buffer = encoder.encode(data);
const chunkSize = 512;

const outputs = [];
for (let i = 0; i < buffer.length; i += chunkSize) {
  const chunk = buffer.slice(i, Math.min(i + chunkSize, buffer.length));
  const output = buddy.push(chunk);
  if (output.length > 0) outputs.push(output);
}

const final = buddy.finish();
if (final.length > 0) outputs.push(final);

const stats = buddy.stats();
console.log("\\nPerformance breakdown:");
console.log("  Parse:    ", stats.parseTimeMs.toFixed(2), "ms");
console.log("  Transform:", stats.transformTimeMs.toFixed(2), "ms");
console.log("  Write:    ", stats.writeTimeMs.toFixed(2), "ms");
console.log("  Total throughput:", stats.throughputMbPerSec.toFixed(1), "MB/s");
console.log("  Records processed:", stats.recordsProcessed);
`,
        }}
      />

      <h2>Using stats() method for monitoring</h2>
      <p>Query stats at any point during conversion to track progress manually.</p>
      
      <PlaygroundExample
        template="node"
        activeFile="/index.js"
        preview={true}
        dependencyVersion="0.10.5"
        files={{
          '/index.js': `import { ConvertBuddy } from "convert-buddy-js";

const fileUrl = "";
const response = await fetch(fileUrl);
const data = await response.text();

const buddy = await ConvertBuddy.create({
  inputFormat: "csv",
  outputFormat: "json",
  profile: true
});

// Initial stats (all zeros)
console.log("Initial stats:", buddy.stats());

const encoder = new TextEncoder();
const buffer = encoder.encode(data);

// Process first third
const third = Math.floor(buffer.length / 3);
buddy.push(buffer.slice(0, third));
console.log("\\nAfter 1/3:", {
  bytesIn: buddy.stats().bytesIn,
  recordsProcessed: buddy.stats().recordsProcessed
});

// Process second third
buddy.push(buffer.slice(third, third * 2));
console.log("After 2/3:", {
  bytesIn: buddy.stats().bytesIn,
  recordsProcessed: buddy.stats().recordsProcessed
});

// Process final third
buddy.push(buffer.slice(third * 2));
buddy.finish();

const finalStats = buddy.stats();
console.log("\\nFinal stats:", {
  bytesIn: finalStats.bytesIn,
  bytesOut: finalStats.bytesOut,
  recordsProcessed: finalStats.recordsProcessed,
  throughputMbPerSec: finalStats.throughputMbPerSec.toFixed(2),
  parseTimeMs: finalStats.parseTimeMs.toFixed(2),
  maxBufferSize: (finalStats.maxBufferSize / 1024).toFixed(2) + " KB"
});
`,
        }}
      />
    </div>
  );
}
