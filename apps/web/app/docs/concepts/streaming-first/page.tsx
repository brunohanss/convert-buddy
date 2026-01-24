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

      <h2>Backpressure handling</h2>

      <p>
        When processing large files, the producer (reader) can generate data faster than the consumer (your application) can handle it.
        This creates <strong>backpressure</strong>—a buildup of unprocessed data that can cause memory issues.
      </p>

      <p>
        Convert Buddy provides built-in mechanisms to handle backpressure:
      </p>

      <h3>1. Automatic backpressure (Web Streams API)</h3>
      <p>
        When using ReadableStream inputs/outputs, backpressure is handled automatically:
      </p>

      <pre><code>{`Reader produces faster than writer can consume:
├─► Reader PAUSES automatically
├─► Writer catches up
└─► Reader RESUMES

This prevents memory buildup while maintaining throughput.`}</code></pre>

      <h3>2. Manual backpressure control</h3>
      <p>
        Convert Buddy also exposes <code>pause()</code> and <code>resume()</code> methods for manual control.
        This is useful when your consumer needs time to process results (e.g., writing to disk, network calls, UI updates).
      </p>

      <SandpackExample
        template="node"
        dependencyVersion="latest"
        activeFile="/index.js"
        preview={false}
        enableFilePicker={false}
        files={{
          '/index.js': `import { ConvertBuddy } from "convert-buddy-js";

// Simulate a slow consumer (e.g., database writes, API calls)
async function slowConsumer(data, chunkNumber) {
  return new Promise(resolve => {
    console.log(\`📝 Processing chunk \${chunkNumber}...\`);
    // Simulate slow processing (500ms)
    setTimeout(() => {
      console.log(\`✅ Chunk \${chunkNumber} processed\`);
      resolve();
    }, 500);
  });
}

async function demonstrateBackpressure() {
  // Sample CSV data
  const csvData = \`name,show,role
Rick,Rick and Morty,Scientist
Morty,Rick and Morty,Student
Stan,American Dad,Agent
Roger,American Dad,Alien
Homer,The Simpsons,Father
Bart,The Simpsons,Son\`;

  const buddy = await ConvertBuddy.create({
    inputFormat: 'csv',
    outputFormat: 'json',
    profile: true,
    debug: false,
    onProgress: async (stats) => {
      console.log(\`Progress: \${stats.recordsProcessed} records\`);
    }
  });

  const encoder = new TextEncoder();
  
  // Process in small chunks to demonstrate backpressure
  const lines = csvData.split('\\n');
  let currentChunk = lines[0] + '\\n'; // header
  
  for (let i = 1; i < lines.length; i++) {
    currentChunk += lines[i] + '\\n';
    
    // Push chunk
    const chunk = encoder.encode(currentChunk);
    const output = buddy.push(chunk);
    
    // Simulate slow consumer - pause conversion
    if (output.length > 0) {
      buddy.pause();
      console.log('⏸️  Conversion paused - consumer is busy');
      
      await slowConsumer(output, i);
      
      console.log('▶️  Resuming conversion');
      buddy.resume();
    }
    
    currentChunk = '';
  }

  const finalOutput = buddy.finish();
  const decoder = new TextDecoder();
  const result = decoder.decode(finalOutput);
  
  console.log('\\n🎉 Final result:', result);
}

demonstrateBackpressure().catch(console.error);`,
        }}
      />

      <h3>Real-world example: Streaming with backpressure</h3>
      <p>
        Here's a practical example demonstrating streaming conversion with manual backpressure control.
        We'll simulate a slow consumer and show how pause/resume prevents overwhelming it:
      </p>

      <SandpackExample
        template="node"
        dependencyVersion="latest"
        activeFile="/index.js"
        preview={false}
        console={true}
        enableFilePicker={false}
        files={{
          '/index.js': `import { ConvertBuddy } from "convert-buddy-js";

// Generate sample CSV data (simulating a large dataset)
function generateSampleCSV(numRecords = 1000) {
  const shows = ['Rick and Morty', 'American Dad', 'The Simpsons', 'Family Guy', 'Futurama'];
  const roles = ['Protagonist', 'Antagonist', 'Supporting', 'Comic Relief', 'Villain'];
  
  let csv = 'id,name,show,role,age,power_level\\n';
  
  for (let i = 1; i <= numRecords; i++) {
    const show = shows[i % shows.length];
    const role = roles[i % roles.length];
    const name = \`Character\${i}\`;
    const age = 20 + (i % 60);
    const power = Math.floor(Math.random() * 10000);
    
    csv += \`\${i},\${name},\${show},\${role},\${age},\${power}\\n\`;
  }
  
  return csv;
}

// Create a ReadableStream from string data (simulating file chunks)
function createChunkedStream(data, chunkSize = 1024) {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(data);
  let offset = 0;
  
  return new ReadableStream({
    pull(controller) {
      if (offset >= bytes.length) {
        controller.close();
        return;
      }
      
      const chunk = bytes.slice(offset, offset + chunkSize);
      offset += chunkSize;
      controller.enqueue(chunk);
    }
  });
}

// Process with backpressure control
async function demonstrateStreamingWithBackpressure() {
  try {
    console.log('🚀 Starting streaming conversion with backpressure control\\n');
    
    // Generate sample data
    const csvData = generateSampleCSV(1000);
    console.log(\`📝 Generated \${csvData.split('\\n').length - 1} records\`);
    console.log(\`📦 Total size: \${(csvData.length / 1024).toFixed(1)}KB\`);
    console.log(\`📄 Sample: \${csvData.substring(0, 100)}...\\n\`);
    
    // Create streaming converter
    console.log('⏳ Initializing ConvertBuddy...');
    const buddy = await ConvertBuddy.create({
      inputFormat: 'csv',
      outputFormat: 'json',
      chunkTargetBytes: 1024, // Small chunks for demo
      profile: true,
      debug: false,
      onProgress: (stats) => {
        const sizeKB = (stats.bytesIn / 1024).toFixed(1);
        const memoryKB = (stats.maxBufferSize / 1024).toFixed(1);
        console.log(
          \`📊 \${sizeKB}KB | \${stats.recordsProcessed} records | Memory: \${memoryKB}KB\`
        );
      }
    });
    console.log('✅ ConvertBuddy initialized\\n');
  
  // Create chunked stream from data
  const stream = createChunkedStream(csvData, 512); // 512 byte chunks
  const reader = stream.getReader();
  
  let processedChunks = 0;
  const totalOutput = [];
  
  console.log('\\n▶️  Starting stream processing...\\n');
  
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    
    // Push chunk to converter
    const outputChunk = buddy.push(value);
    processedChunks++;
    
    // Simulate slow consumer every 5 chunks
    if (processedChunks % 5 === 0 && outputChunk.length > 0) {
      buddy.pause();
      console.log(\`⏸️  Chunk \${processedChunks}: PAUSED - consumer is busy...\`);
      
      // Simulate slow processing (database write, API call, etc.)
      await new Promise(resolve => setTimeout(resolve, 200));
      
      console.log(\`▶️  Chunk \${processedChunks}: RESUMED\\n\`);
      buddy.resume();
    }
    
    if (outputChunk.length > 0) {
      totalOutput.push(outputChunk);
    }
  }
  
  const finalChunk = buddy.finish();
  if (finalChunk.length > 0) {
    totalOutput.push(finalChunk);
  }
  
  console.log(\`\\n📦 Collected \${totalOutput.length} output chunks\`);
  
  // Get final statistics
  const stats = buddy.stats();
  
  console.log('\\n✅ Conversion complete!');
  console.log(\`📈 Total records: \${stats.recordsProcessed}\`);
  console.log(\`💾 Max memory: \${(stats.maxBufferSize / 1024).toFixed(1)}KB\`);
  console.log(\`⚡ Throughput: \${stats.throughputMbPerSec.toFixed(2)} MB/s\`);
  console.log(\`⏱️  Parse time: \${stats.parseTimeMs.toFixed(0)}ms\`);
  
  // Combine output
  const totalLength = totalOutput.reduce((sum, chunk) => sum + chunk.length, 0);
  console.log(\`\\n🔗 Combining \${totalLength} bytes from \${totalOutput.length} chunks...\`);
  
  const combined = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of totalOutput) {
    combined.set(chunk, offset);
    offset += chunk.length;
  }
  
  console.log(\`✅ Combined into \${combined.length} bytes\`);
  
  const decoder = new TextDecoder();
  const jsonResult = decoder.decode(combined);
  console.log(\`✅ Decoded to \${jsonResult.length} character string\`);
  
  const parsed = JSON.parse(jsonResult);
  console.log(\`✅ Parsed JSON array with \${parsed.length} items\`);
  
  console.log(\`\\n📦 Output size: \${(combined.length / 1024).toFixed(1)}KB\`);
  console.log(\`🎭 First 3 records:\`, parsed.slice(0, 3));
  
  console.log(\`\\n💡 Key insight: Memory stayed constant at ~\${(stats.maxBufferSize / 1024).toFixed(1)}KB\`);
  console.log('   even with pause/resume controlling the flow!');
  console.log('\\n✨ This demonstrates true streaming: constant memory');
  console.log('   regardless of input size, with manual backpressure control.');
  
  } catch (error) {
    console.error('❌ Error during streaming:', error);
    console.error('Stack:', error.stack);
  }
}

demonstrateStreamingWithBackpressure().catch((err) => {
  console.error('❌ Fatal error:', err);
  console.error('Stack:', err.stack);
});`,
        }}
      />
```

      <h3>Using the 50MB file in your own environment</h3>
      <p>
        We've prepared a 50MB <code>cartoon_characters.csv</code> file with ~600K records for real-world testing.
        Here's how to use it outside of Sandpack (in your own browser or Node.js app):
      </p>

      <pre><code>{`// Browser example with fetch and streaming
import { ConvertBuddy } from "convert-buddy-js";

async function processLargeFile() {
  const fileUrl = "/samples/cartoon_characters.csv"; // 50MB file
  
  console.log('📥 Fetching 50MB file...');
  const response = await fetch(fileUrl);
  
  if (!response.ok || !response.body) {
    throw new Error(\\\`Failed to fetch: \\\${response.status}\\\`);
  }

  const buddy = await ConvertBuddy.create({
    inputFormat: 'csv',
    outputFormat: 'json',
    chunkTargetBytes: 512 * 1024, // 512KB chunks
    onProgress: (stats) => {
      const sizeMB = (stats.bytesIn / 1024 / 1024).toFixed(2);
      const memoryMB = (stats.maxBufferSize / 1024 / 1024).toFixed(2);
      console.log(\\\`📊 \\\${sizeMB}MB | \\\${stats.recordsProcessed.toLocaleString()} records | Memory: \\\${memoryMB}MB\\\`);
    }
  });

  const reader = response.body.getReader();
  let processedChunks = 0;
  const output = [];
  
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    
    const chunk = buddy.push(value);
    processedChunks++;
    
    // Simulate slow consumer (database write, API call, etc.)
    if (processedChunks % 10 === 0 && chunk.length > 0) {
      buddy.pause();
      console.log('⏸️  Pausing - consumer is busy...');
      
      await saveToDatabase(chunk); // Your slow operation
      
      console.log('▶️  Resuming');
      buddy.resume();
    }
    
    if (chunk.length > 0) {
      output.push(chunk);
    }
  }
  
  const final = buddy.finish();
  if (final.length > 0) output.push(final);
  
  const stats = buddy.stats();
  console.log(\\\`✅ Processed \\\${stats.recordsProcessed.toLocaleString()} records\\\`);
  console.log(\\\`💾 Peak memory: \\\${(stats.maxBufferSize / 1024 / 1024).toFixed(2)}MB\\\`);
  console.log(\\\`⚡ Throughput: \\\${stats.throughputMbPerSec.toFixed(2)} MB/s\\\`);
}

// The key: memory stays constant (~3-5MB) even with 50MB input
// and even when your consumer is slow!`}</code></pre>

      <blockquote>
        <strong>Why not in Sandpack?</strong> Sandpack's in-browser bundler has limitations with large files
        and complex WASM modules. The demo above uses generated data to work within those constraints,
        but the same code works perfectly with real files in your actual application.
      </blockquote>

      <h3>Key backpressure patterns</h3>

      <table>
        <thead>
          <tr>
            <th>Pattern</th>
            <th>When to use</th>
            <th>Implementation</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Automatic (Web Streams)</td>
            <td>Browser, simple streaming</td>
            <td>Use ReadableStream - backpressure is automatic</td>
          </tr>
          <tr>
            <td>Manual pause/resume</td>
            <td>Slow consumers (DB writes, API calls)</td>
            <td><code>buddy.pause()</code> → process → <code>buddy.resume()</code></td>
          </tr>
          <tr>
            <td>Chunk-based throttling</td>
            <td>Rate limiting, batch processing</td>
            <td>Pause every N chunks, resume after processing</td>
          </tr>
          <tr>
            <td>Memory-based throttling</td>
            <td>Memory-constrained environments</td>
            <td>Monitor <code>stats.maxBufferSize</code>, pause if threshold exceeded</td>
          </tr>
        </tbody>
      </table>

      <p>
        The key insight: <strong>Convert Buddy never forces you to consume data faster than you can handle it</strong>.
        Whether automatic or manual, backpressure keeps memory usage constant and your application stable.
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
