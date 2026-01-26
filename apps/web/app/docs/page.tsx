import React from 'react';
import PlaygroundExample from '@/components/mdx/Playground';

export default function DocsPage() {
  return (
    <div>
      <h1>Introduction</h1>

      <p>
        Convert Buddy is a high-performance, streaming-first data conversion library powered by Rust and WebAssembly.
        It transforms data between CSV, JSON, NDJSON, and XML formats with deterministic memory usage and real-time performance telemetry.
      </p>

      <h2>What is Convert Buddy?</h2>
      
      <p>
        Convert Buddy is built for two audiences:
      </p>

      <ul>
        <li><strong>Non-developers</strong>: Convert data files directly in your browser without uploading to servers</li>
        <li><strong>Developers</strong>: Embed a battle-tested conversion engine in your applications with streaming support</li>
      </ul>

      <p>
        The library is powered by a Rust-based streaming parser compiled to WebAssembly, providing:
      </p>

      <ul>
        <li>Predictable memory usage regardless of input size</li>
        <li>Native-level performance in both browser and Node.js</li>
        <li>Real-time progress and performance telemetry</li>
        <li>Automatic format detection</li>
      </ul>

      <h2>Why streaming-first matters</h2>

      <p>
        Traditional conversion libraries load entire files into memory before processing. This approach:
      </p>

      <ul>
        <li>Crashes on large files (&gt;100MB)</li>
        <li>Provides no progress feedback</li>
        <li>Cannot be cancelled mid-operation</li>
      </ul>

      <p>
        Convert Buddy processes data in chunks, allowing you to:
      </p>

      <ul>
        <li>Convert multi-GB files with <strong>constant</strong> memory usage</li>
        <li>Show real-time progress to users</li>
        <li>Cancel conversions at any point</li>
        <li>Start processing output before input is fully read</li>
      </ul>

      <h2>Supported environments & formats</h2>

      <p><strong>Environments:</strong></p>
      <ul>
        <li>Modern browsers (Chrome, Firefox, Safari, Edge)</li>
        <li>Node.js (18+)</li>
        <li>Edge runtimes (Cloudflare Workers, Vercel Edge)</li>
      </ul>

      <p><strong>Formats:</strong></p>
      <ul>
        <li><strong>CSV</strong>: Configurable delimiters, quoted fields, headers</li>
        <li><strong>JSON</strong>: Array of objects with streaming emission</li>
        <li><strong>NDJSON</strong>: Newline-delimited JSON (one object per line)</li>
        <li><strong>XML</strong>: Configurable record elements, attributes support</li>
      </ul>

      <h2>Minimal example</h2>

      <p>
        The simplest way to use Convert Buddy is with the <code>convertToString</code> function.
        It automatically detects the input format and converts to your desired output:
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
  const data = await response.text();
  
  // Auto-detects input format, converts to CSV
  const csv = await convertToString(data, { 
    outputFormat: 'csv' 
  });
  
  console.log('Converted to CSV:');
  console.log(csv);
}

run().catch(console.error);`,
        }}
      />

      <p>
        Try clicking the format buttons (JSON, CSV, XML, NDJSON) above to see conversion from different input formats!
      </p>
    </div>
  );
}
