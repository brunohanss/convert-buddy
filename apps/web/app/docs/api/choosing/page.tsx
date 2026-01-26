import React from 'react';
import PlaygroundExample from '@/components/mdx/Playground';

export default function ChoosingAPIPage() {
  return (
    <div>
      <h1>Choosing the Right API</h1>

      <p>
        Convert Buddy provides three different API styles to match your use case.
        This guide helps you select the right approach.
      </p>

      <h2>Quick Decision Table</h2>

      <table>
        <thead>
          <tr>
            <th>Use Case</th>
            <th>Recommended API</th>
            <th>Key Functions</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>One-off conversion, simplest code</td>
            <td><strong>Simple API</strong></td>
            <td><code>convertToString()</code>, <code>convertAny()</code></td>
          </tr>
          <tr>
            <td>Multiple conversions, reuse configuration</td>
            <td><strong>Instance API</strong></td>
            <td><code>new ConvertBuddy()</code>, <code>convert()</code></td>
          </tr>
          <tr>
            <td>Manual chunk control, custom streaming</td>
            <td><strong>Streaming API</strong></td>
            <td><code>push()</code>, <code>finish()</code>, <code>ConvertBuddyTransformStream</code></td>
          </tr>
          <tr>
            <td>Browser file downloads</td>
            <td><strong>Browser Helpers</strong></td>
            <td><code>getMimeType()</code>, <code>getSuggestedFilename()</code></td>
          </tr>
          <tr>
            <td>Node.js file I/O, CLI tools</td>
            <td><strong>Node Helpers</strong></td>
            <td>Stream integration with <code>fs</code></td>
          </tr>
        </tbody>
      </table>

      <h2>Decision Flowchart</h2>

      <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', marginBottom: '2rem' }}>
        <pre style={{ margin: 0, lineHeight: '1.8' }}>
{`┌─ Need to convert multiple files with same config?
│  ├─ YES → Use Instance API
│  └─ NO  → Continue
│
├─ Need manual control over chunks/streaming?
│  ├─ YES → Use Streaming API  
│  └─ NO  → Continue
│
├─ Browser file download?
│  ├─ YES → Use Simple API + Browser Helpers
│  └─ NO  → Continue
│
└─ Simple one-off conversion
   └─ Use Simple API (convertToString/convertAny)`}
        </pre>
      </div>

      <h2>API Comparison Examples</h2>

      <h3>Simple API - Minimal Code</h3>
      
      <p>
        Best for quick conversions where you don't need to reuse configuration.
        Auto-detects format and handles everything in one call.
      </p>

        <PlaygroundExample
        template="node"
        dependencyVersion="latest"
        activeFile="/index.js"
        preview={true}
        enableFilePicker={true}
        files={{
          '/index.js': `import { convertToString } from "convert-buddy-js";

const fileUrl = "";

async function run() {
  const response = await fetch(fileUrl);
  const csvData = await response.text();
  
  // Single function call - auto-detects CSV
  const json = await convertToString(csvData, { 
    outputFormat: 'json' 
  });
  
  console.log('Converted:', json);
}

run().catch(console.error);`,
        }}
      />

      <h3>Instance API - Reusable Configuration</h3>

      <p>
        Best when converting multiple files with the same settings.
        Creates one instance you can reuse, avoiding repeated initialization.
      </p>

        <PlaygroundExample
        template="node"
        dependencyVersion="latest"
        activeFile="/index.js"
        preview={true}
        enableFilePicker={true}
        files={{
          '/index.js': `import { ConvertBuddy } from "convert-buddy-js";

const fileUrls = ["", ""];

async function run() {
  // Create instance once with global config
  const buddy = new ConvertBuddy({
    inputFormat: 'csv',
    outputFormat: 'json',
    debug: true
  });
  
  // Reuse for multiple conversions
  for (const url of fileUrls) {
    if (!url) continue;
    
    const response = await fetch(url);
    const csvData = await response.text();
    
    const result = await buddy.convert(csvData, {
      outputFormat: 'json'
    });
    
    const decoder = new TextDecoder();
    console.log('Converted:', decoder.decode(result));
  }
  
  // Access statistics
  const stats = buddy.stats();
  console.log('Total processed:', stats.recordsProcessed, 'records');
}

run().catch(console.error);`,
        }}
      />

      <h3>Streaming API - Manual Control</h3>

      <p>
        Best when you need precise control over when chunks are processed,
        or when integrating with existing streaming pipelines.
      </p>

        <PlaygroundExample
        template="node"
        dependencyVersion="latest"
        activeFile="/index.js"
        preview={true}
        enableFilePicker={true}
        files={{
          '/index.js': `import { ConvertBuddy } from "convert-buddy-js";

async function run() {
  // Create converter instance
  const buddy = await ConvertBuddy.create({
    inputFormat: 'csv',
    outputFormat: 'json'
  });
  
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  
  // Manual chunk processing
  const header = encoder.encode('name,age\\n');
  const row1 = encoder.encode('Ada,36\\n');
  const row2 = encoder.encode('Alan,42\\n');
  
  const output1 = buddy.push(header);
  console.log('After header:', decoder.decode(output1));
  
  const output2 = buddy.push(row1);
  console.log('After row 1:', decoder.decode(output2));
  
  const output3 = buddy.push(row2);
  const final = buddy.finish();
  
  console.log('Final output:', decoder.decode(final));
}

run().catch(console.error);`,
        }}
      />

      <h2>Performance Considerations</h2>

      <table>
        <thead>
          <tr>
            <th>API</th>
            <th>Initialization Cost</th>
            <th>Memory Efficiency</th>
            <th>Best For</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Simple API</strong></td>
            <td>Medium (creates instance per call)</td>
            <td>Good (auto-manages)</td>
            <td>1-10 conversions</td>
          </tr>
          <tr>
            <td><strong>Instance API</strong></td>
            <td>Low (one-time setup)</td>
            <td>Excellent (reuses buffers)</td>
            <td>10+ conversions</td>
          </tr>
          <tr>
            <td><strong>Streaming API</strong></td>
            <td>Low (manual control)</td>
            <td>Excellent (incremental processing)</td>
            <td>Large files, custom pipelines</td>
          </tr>
        </tbody>
      </table>

      <h2>Tradeoffs Summary</h2>

      <h3>Simple API</h3>
      <ul>
        <li>✅ Easiest to use - minimal code</li>
        <li>✅ Auto-detection built-in</li>
        <li>✅ Handles URLs, Files, Blobs automatically</li>
        <li>❌ Creates new instance each call (overhead for multiple files)</li>
        <li>❌ Less control over streaming behavior</li>
      </ul>

      <h3>Instance API</h3>
      <ul>
        <li>✅ Efficient for multiple conversions</li>
        <li>✅ Reusable configuration</li>
        <li>✅ Access to statistics and profiling</li>
        <li>✅ Supports parallel processing</li>
        <li>❌ Slightly more verbose</li>
        <li>❌ Must manage instance lifecycle</li>
      </ul>

      <h3>Streaming API</h3>
      <ul>
        <li>✅ Maximum control over chunks</li>
        <li>✅ Integrates with Web Streams and Node streams</li>
        <li>✅ Best memory efficiency for huge files</li>
        <li>✅ Can pause/resume processing</li>
        <li>❌ Most verbose API</li>
        <li>❌ Requires understanding of streaming concepts</li>
      </ul>

      <h2>Recommended Patterns</h2>

      <h3>Web Application (UI)</h3>
      <p>
        Use <strong>Simple API</strong> with <strong>Browser Helpers</strong> for file upload/download flows:
      </p>

      <PlaygroundExample
        template="vanilla"
        dependencyVersion="latest"
        activeFile="/index.js"
        preview={true}
        enableFilePicker={true}
        files={{
          '/index.js': `import { convertAny, getSuggestedFilename, getMimeType } from "convert-buddy-js";

const fileUrl = "";

async function convertAndDownload() {
  const response = await fetch(fileUrl);
  const blob = await response.blob();
  
  // Simple conversion
  const result = await convertAny(blob, { 
    outputFormat: 'json' 
  });
  
  // Browser helpers for download
  const filename = getSuggestedFilename('data.csv', 'json');
  const mimeType = getMimeType('json');
  
  const downloadBlob = new Blob([result], { type: mimeType });
  const url = URL.createObjectURL(downloadBlob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  
  URL.revokeObjectURL(url);
  console.log('Downloaded:', filename);
}

convertAndDownload().catch(console.error);`,
        }}
      />

      <h3>Node.js CLI Tool</h3>
      <p>
        Use <strong>Instance API</strong> for processing multiple files efficiently:
      </p>

      <PlaygroundExample
        template="node"
        dependencyVersion="latest"
        activeFile="/index.js"
        preview={true}
        files={{
          '/index.js': `import { ConvertBuddy } from "convert-buddy-js";

async function processFiles(inputFiles, outputFormat) {
  // Create reusable converter
  const buddy = new ConvertBuddy({
    outputFormat,
    debug: false,
    profile: true
  });
  
  const results = [];
  
  for (const file of inputFiles) {
    try {
      const result = await buddy.convert(file, { 
        outputFormat 
      });
      results.push(result);
      console.log(\`✓ Converted: \${file}\`);
    } catch (err) {
      console.error(\`✗ Failed: \${file}\`, err);
    }
  }
  
  // Get final stats
  const stats = buddy.stats();
  console.log(\`
Processed: \${stats.recordsProcessed} records
Throughput: \${stats.throughputMbPerSec.toFixed(2)} MB/s
Total Time: \${stats.parseTimeMs + stats.writeTimeMs}ms
  \`);
  
  return results;
}

// Example usage
const files = ["data1.csv", "data2.csv", "data3.csv"];
processFiles(files, "json").catch(console.error);`,
        }}
      />

      <h3>ETL Pipeline / Data Processing</h3>
      <p>
        Use <strong>Streaming API</strong> for large-scale data transformation:
      </p>

      <PlaygroundExample
        template="node"
        dependencyVersion="latest"
        activeFile="/index.js"
        preview={true}
        files={{
          '/index.js': `import { ConvertBuddyTransformStream } from "convert-buddy-js";

async function streamingPipeline(inputStream) {
  // Create transform stream
  const converter = new ConvertBuddyTransformStream({
    inputFormat: 'csv',
    outputFormat: 'ndjson',
    onProgress: (stats) => {
      console.log(\`Progress: \${stats.recordsProcessed} records, \${stats.bytesIn} bytes\`);
    },
    progressIntervalBytes: 1024 * 1024 // Report every 1MB
  });
  
  // Pipe through converter
  const outputStream = inputStream
    .pipeThrough(converter);
  
  // Process output
  let totalRecords = 0;
  const decoder = new TextDecoder();
  
  for await (const chunk of outputStream) {
    const text = decoder.decode(chunk, { stream: true });
    const lines = text.split('\\n').filter(l => l.trim());
    totalRecords += lines.length;
  }
  
  console.log(\`Pipeline complete: \${totalRecords} records\`);
}

// Example: Process from fetch stream
const fileUrl = "";
if (fileUrl) {
  fetch(fileUrl)
    .then(r => r.body)
    .then(streamingPipeline)
    .catch(console.error);
} else {
  console.log("Add a file URL to run the pipeline");
}`,
        }}
      />
    </div>
  );
}
