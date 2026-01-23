import React from 'react';
import SandpackExample from '@/components/mdx/Sandpack';

export default function Page() {
  return (
    <div>
      <h1>Streaming API</h1>

      <p>
        The Streaming API provides manual control over chunk processing for advanced use cases.
        Use this when you need precise control over memory usage, custom streaming pipelines,
        or integration with existing stream-based infrastructure.
      </p>

      <h2>When to Use Streaming API</h2>

      <ul>
        <li>Processing very large files that don't fit in memory</li>
        <li>Custom streaming pipelines with multiple transformations</li>
        <li>Integration with Web Streams API or Node.js streams</li>
        <li>Need to pause/resume processing</li>
        <li>Fine-grained control over chunk sizes and timing</li>
        <li>Real-time data processing as chunks arrive</li>
      </ul>

      <h2>Push/Finish Model</h2>

      <p>
        The core streaming model uses <code>push()</code> for incremental processing
        and <code>finish()</code> to complete the conversion.
      </p>

      <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '4px', marginBottom: '1rem' }}>
        <pre style={{ margin: 0 }}>
{`// Create a converter instance
const buddy = await ConvertBuddy.create(options);

// Push chunks incrementally
const output1 = buddy.push(chunk1);
const output2 = buddy.push(chunk2);
// ...

// Finish and get final output
const finalOutput = buddy.finish();`}
        </pre>
      </div>

      <h3>Basic Push/Finish Example</h3>

      <SandpackExample
        template="node"
        dependencyVersion="latest"
        activeFile="/index.js"
        preview={false}
        files={{
          '/index.js': `import { ConvertBuddy } from "convert-buddy-js";

async function run() {
  // Create converter with static method
  const buddy = await ConvertBuddy.create({
    inputFormat: 'csv',
    outputFormat: 'json'
  });
  
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  
  // Push header
  const header = encoder.encode('name,age\\n');
  const output1 = buddy.push(header);
  console.log('After header:', decoder.decode(output1));
  
  // Push first record
  const row1 = encoder.encode('Ada,36\\n');
  const output2 = buddy.push(row1);
  console.log('After row 1:', decoder.decode(output2));
  
  // Push second record
  const row2 = encoder.encode('Alan,42\\n');
  const output3 = buddy.push(row2);
  console.log('After row 2:', decoder.decode(output3));
  
  // Finish conversion
  const final = buddy.finish();
  console.log('Final:', decoder.decode(final));
}

run().catch(console.error);`,
        }}
      />

      <h3>Pause and Resume</h3>

      <SandpackExample
        template="node"
        dependencyVersion="latest"
        activeFile="/index.js"
        preview={false}
        files={{
          '/index.js': `import { ConvertBuddy } from "convert-buddy-js";

async function run() {
  const buddy = await ConvertBuddy.create({
    inputFormat: 'csv',
    outputFormat: 'json'
  });
  
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  
  // Process header
  const output1 = buddy.push(encoder.encode('name,age\\n'));
  console.log('Header processed');
  
  // Pause processing
  buddy.pause();
  console.log('Paused...');
  
  // Chunks pushed while paused are buffered
  const output2 = buddy.push(encoder.encode('Ada,36\\n'));
  console.log('Pushed while paused (buffered)');
  
  // Resume processing
  buddy.resume();
  console.log('Resumed');
  
  // Continue pushing
  const output3 = buddy.push(encoder.encode('Alan,42\\n'));
  const final = buddy.finish();
  
  console.log('Complete:', decoder.decode(final));
}

run().catch(console.error);`,
        }}
      />

      <h2>ConvertBuddyTransformStream</h2>

      <p>
        For Web Streams API integration, use <code>ConvertBuddyTransformStream</code>.
        This implements the TransformStream interface for seamless pipeline integration.
      </p>

      <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '4px', marginBottom: '1rem' }}>
        <pre style={{ margin: 0 }}>
{`const transformer = new ConvertBuddyTransformStream(options);

// Use with Web Streams
inputStream
  .pipeThrough(transformer)
  .pipeTo(outputStream);`}
        </pre>
      </div>

      <h3>Web Streams Integration</h3>

      <SandpackExample
        template="node"
        dependencyVersion="latest"
        activeFile="/index.js"
        preview={false}
        enableFilePicker={true}
        files={{
          '/index.js': `import { ConvertBuddyTransformStream } from "convert-buddy-js";

const fileUrl = "";

async function run() {
  if (!fileUrl) {
    console.log("Add a file URL to test streaming");
    return;
  }
  
  const response = await fetch(fileUrl);
  
  // Create transform stream
  const converter = new ConvertBuddyTransformStream({
    inputFormat: 'csv',
    outputFormat: 'json'
  });
  
  // Pipe through converter
  const outputStream = response.body
    .pipeThrough(converter);
  
  // Read converted output
  const decoder = new TextDecoder();
  let output = '';
  
  for await (const chunk of outputStream) {
    output += decoder.decode(chunk, { stream: true });
  }
  
  console.log('Converted:', output);
}

run().catch(console.error);`,
        }}
      />

      <h3>Pipeline with Progress Tracking</h3>

      <SandpackExample
        template="node"
        dependencyVersion="latest"
        activeFile="/index.js"
        preview={false}
        enableFilePicker={true}
        files={{
          '/index.js': `import { ConvertBuddyTransformStream } from "convert-buddy-js";

const fileUrl = "";

async function run() {
  if (!fileUrl) {
    console.log("Add a file URL to test pipeline");
    return;
  }
  
  const response = await fetch(fileUrl);
  
  // Create converter with progress tracking
  const converter = new ConvertBuddyTransformStream({
    inputFormat: 'csv',
    outputFormat: 'ndjson',
    onProgress: (stats) => {
      console.log(\`Progress: \${stats.recordsProcessed} records, \${(stats.bytesIn / 1024).toFixed(2)} KB\`);
    },
    progressIntervalBytes: 1024 * 64 // Report every 64KB
  });
  
  // Pipeline: fetch → convert
  const outputStream = response.body
    .pipeThrough(converter);
  
  const decoder = new TextDecoder();
  let output = '';
  
  for await (const chunk of outputStream) {
    output += decoder.decode(chunk, { stream: true });
  }
  
  console.log('\\nConversion complete!');
  console.log('Output preview:', output.substring(0, 200));
}

run().catch(console.error);`,
        }}
      />

      <h2>Manual Chunk Processing</h2>

      <p>
        Process data incrementally with full control over memory and timing.
      </p>

      <h3>Incremental File Processing</h3>

      <SandpackExample
        template="node"
        dependencyVersion="latest"
        activeFile="/index.js"
        preview={false}
        enableFilePicker={true}
        files={{
          '/index.js': `import { ConvertBuddy } from "convert-buddy-js";

const fileUrl = "";

async function processInChunks() {
  if (!fileUrl) {
    console.log("Add a file URL to test chunked processing");
    return;
  }
  
  const buddy = await ConvertBuddy.create({
    inputFormat: 'csv',
    outputFormat: 'json',
    chunkTargetBytes: 1024 * 64 // Process in 64KB chunks
  });
  
  const response = await fetch(fileUrl);
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  
  let chunkCount = 0;
  let totalOutput = '';
  
  try {
    while (true) {
      const { done, value } = await reader.read();
      
      if (done) break;
      
      chunkCount++;
      console.log(\`Processing chunk \${chunkCount}: \${value.length} bytes\`);
      
      // Push chunk to converter
      const output = buddy.push(value);
      totalOutput += decoder.decode(output, { stream: true });
      
      // Get stats
      const stats = buddy.stats();
      console.log(\`  Records so far: \${stats.recordsProcessed}\`);
    }
    
    // Finish conversion
    const final = buddy.finish();
    totalOutput += decoder.decode(final);
    
    console.log(\`\\nComplete! Processed \${chunkCount} chunks\`);
    console.log('Output preview:', totalOutput.substring(0, 200));
    
  } finally {
    reader.releaseLock();
  }
}

processInChunks().catch(console.error);`,
        }}
      />

      <h2>Node.js Transform Stream Pattern</h2>

      <p>
        While Convert Buddy uses Web Streams, you can integrate with Node.js patterns.
      </p>

      <SandpackExample
        template="node"
        dependencyVersion="latest"
        activeFile="/index.js"
        preview={false}
        files={{
          '/index.js': `import { ConvertBuddy } from "convert-buddy-js";

async function nodeStreamPattern() {
  const csvChunks = [
    'name,age\\n',
    'Ada,36\\n',
    'Alan,42\\n',
    'Grace,85\\n'
  ];
  
  const buddy = await ConvertBuddy.create({
    inputFormat: 'csv',
    outputFormat: 'json'
  });
  
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  
  console.log('Stream-style processing:');
  
  let allOutput = '';
  
  // Process each chunk
  for (const chunk of csvChunks) {
    const encoded = encoder.encode(chunk);
    const output = buddy.push(encoded);
    
    if (output.length > 0) {
      const text = decoder.decode(output);
      allOutput += text;
      console.log('Chunk output:', text.substring(0, 50));
    }
  }
  
  // Finish
  const final = buddy.finish();
  allOutput += decoder.decode(final);
  
  console.log('\\nFinal output:', allOutput);
}

nodeStreamPattern().catch(console.error);`,
        }}
      />

      <h2>Performance Tips</h2>

      <ol>
        <li><strong>Chunk size:</strong> 64KB-256KB chunks balance memory and throughput</li>
        <li><strong>Backpressure:</strong> Monitor <code>currentPartialSize</code> in stats</li>
        <li><strong>Pause/resume:</strong> Use strategically to avoid buffering too much data</li>
        <li><strong>Transform streams:</strong> Use for Web Streams API compatibility</li>
        <li><strong>Manual chunks:</strong> Use when you need exact control over processing timing</li>
      </ol>

      <h2>Next Steps</h2>

      <ul>
        <li>For simpler use cases: See <a href="/docs/api/simple">Simple API</a></li>
        <li>For instance reuse: See <a href="/docs/api/instance">Instance API</a></li>
        <li>For large file processing: See <a href="/docs/recipes/large-files">Large Files Recipe</a></li>
      </ul>
    </div>
  );
}
