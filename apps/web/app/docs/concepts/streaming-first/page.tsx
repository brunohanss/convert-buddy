import React from 'react';
import SandpackExample from '@/components/mdx/Sandpack';

export default function StreamingFirstPage() {
  return (
    <div>
      <h1>Streaming First</h1>

      <p>
        Convert Buddy is designed around streaming from the ground up. This isn't an optional feature—it's
        the foundation that enables everything else.
      </p>

      <h2>What is streaming?</h2>

      <p>
        Instead of loading an entire file into memory, streaming processes data in small chunks:
      </p>

      <pre><code>{`Traditional approach:
1. Read entire 5GB file into memory (💥 crash)
2. Parse all data
3. Write all output

Streaming approach:
1. Read 1MB chunk
2. Parse chunk → emit output
3. Read next 1MB chunk
4. Repeat (memory stays constant at ~10MB)`}</code></pre>

      <h2>Chunked processing</h2>

      <p>
        Convert Buddy processes data in configurable chunks (default: ~1MB). Each chunk flows through
        the parse → transform → write pipeline independently.
      </p>

      <SandpackExample
        template="node"
        dependencyVersion="latest"
        activeFile="/index.js"
        preview={false}
        enableFilePicker={true}
        files={{
          '/index.js': `import { ConvertBuddy } from "convert-buddy-js";

const fileUrl = "";

async function demonstrateChunking() {
  const response = await fetch(fileUrl);
  const data = await response.text();
  
  const buddy = await ConvertBuddy.create({
    inputFormat: 'csv',
    outputFormat: 'json',
    chunkTargetBytes: 512 * 1024, // 512KB chunks
    onProgress: (stats) => {
      console.log(\`Processed \${stats.chunksIn} chunks\`);
      console.log(\`Memory: \${stats.maxBufferSize} bytes\`);
      console.log(\`Records: \${stats.recordsProcessed}\`);
    }
  });
  
  const encoder = new TextEncoder();
  const inputChunk = encoder.encode(data);
  
  buddy.push(inputChunk);
  const output = buddy.finish();
  
  console.log('Conversion complete!');
}

demonstrateChunking().catch(console.error);`,
        }}
      />

      <h2>Backpressure</h2>

      <p>
        When using streams, backpressure ensures the producer (reader) doesn't overwhelm the consumer (writer).
        Convert Buddy automatically handles backpressure when using ReadableStream inputs/outputs:
      </p>

      <pre><code>{`Reader produces faster than writer can consume:
├─► Reader PAUSES automatically
├─► Writer catches up
└─► Reader RESUMES

This prevents memory buildup while maintaining throughput.`}</code></pre>

      <p>
        You don't need to implement backpressure manually—it's built into the Streams API and Convert Buddy respects it.
      </p>

      <h2>Memory guarantees</h2>

      <p>
        Convert Buddy guarantees constant memory usage:
      </p>

      <table>
        <thead>
          <tr>
            <th>Component</th>
            <th>Memory usage</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Input buffer</td>
            <td>~1MB (chunk size)</td>
          </tr>
          <tr>
            <td>Parser state</td>
            <td>&lt;1MB</td>
          </tr>
          <tr>
            <td>Transform records</td>
            <td>~100KB (batch size)</td>
          </tr>
          <tr>
            <td>Output buffer</td>
            <td>~1MB (chunk size)</td>
          </tr>
          <tr>
            <td><strong>Total</strong></td>
            <td><strong>~3-5MB constant</strong></td>
          </tr>
        </tbody>
      </table>

      <p>
        This means converting a 10GB file uses the same memory as converting a 10KB file.
      </p>

      <h2>When streaming matters</h2>

      <h3>✅ Use streaming for:</h3>
      <ul>
        <li>Files &gt;10MB (definitely &gt;100MB)</li>
        <li>Unknown/untrusted input sizes</li>
        <li>Browser environments with memory limits</li>
        <li>Real-time data processing</li>
        <li>Progress tracking during conversion</li>
      </ul>

      <h3>⚠️ Streaming less important for:</h3>
      <ul>
        <li>Small files (&lt;1MB) where buffering is fine</li>
        <li>Server environments with abundant memory</li>
        <li>One-time conversions without progress needs</li>
      </ul>

      <h2>Streaming vs buffered APIs</h2>

      <p>
        Convert Buddy offers both modes:
      </p>

      <h3>Buffered (simple, for small files)</h3>
      <pre><code>{`import { convertToString } from "convert-buddy-js";

// Entire result loaded into memory
const output = await convertToString(input, { 
  outputFormat: 'json' 
});`}</code></pre>

      <h3>Streaming (scalable, for large files)</h3>
      <pre><code>{`import { ConvertBuddy } from "convert-buddy-js";

const buddy = await ConvertBuddy.create({
  inputFormat: 'csv',
  outputFormat: 'json'
});

// Process chunks manually
for await (const chunk of inputStream) {
  const outputChunk = buddy.push(chunk);
  // Write outputChunk immediately
}

const finalChunk = buddy.finish();
// Write finalChunk`}</code></pre>

      <p>
        For most use cases, the simple API is fine. Use streaming when:
      </p>
      <ul>
        <li>Input size is unknown or large</li>
        <li>You need progress tracking</li>
        <li>Memory is constrained</li>
      </ul>

      <h2>Key takeaways</h2>

      <ul>
        <li>Streaming = constant memory regardless of input size</li>
        <li>Chunks flow through parse → transform → write pipeline</li>
        <li>Backpressure prevents memory buildup automatically</li>
        <li>Use simple API for small files, streaming API for large files</li>
      </ul>
    </div>
  );
}
