import React from 'react';
import SandpackExample from '@/components/mdx/Sandpack';

export default function StreamingLargeInputsPage() {
  return (
    <div>
      <h1>Streaming Large Inputs</h1>

      <p>
        For files larger than available memory, use streaming conversion patterns.
        This page teaches scalable patterns that work with files of any size.
      </p>

      <h2>Why strings don't scale</h2>

      <p>
        Using <code>convertToString()</code> for large files can cause memory issues:
      </p>

      <pre><code>{`// ❌ Bad: Loads entire file into memory
const hugeFile = await readFile("100GB.csv", "utf-8"); // Out of memory!
const json = await convertToString(hugeFile, { outputFormat: "json" });

// ✅ Good: Stream the conversion
const converter = new Converter({ 
  inputFormat: "csv", 
  outputFormat: "json" 
});
const stream = createReadStream("100GB.csv");
// Process chunks one at a time...`}</code></pre>

      <p>
        Strings allocate memory for the entire content. Files over ~100MB should use streaming.
      </p>

      <h2>Stream-to-stream conversion basics</h2>

      <p>
        Use the <code>Converter</code> class with <code>push()</code> and <code>finish()</code>
        to process data in chunks:
      </p>

      <SandpackExample
        template="node"
        dependencyVersion="latest"
        activeFile="/index.js"
        preview={false}
        enableFilePicker={true}
        files={{
          '/index.js': `import { Converter } from "convert-buddy-js";

const fileUrl = "";

async function run() {
  const response = await fetch(fileUrl);
  const csvData = await response.text();
  
  // Create converter instance
  const converter = new Converter({
    inputFormat: 'csv',
    outputFormat: 'json'
  });
  
  // Simulate streaming by splitting data into chunks
  const chunkSize = 100;
  const chunks = [];
  for (let i = 0; i < csvData.length; i += chunkSize) {
    chunks.push(csvData.substring(i, i + chunkSize));
  }
  
  console.log(\`Processing \${chunks.length} chunks...\`);
  
  let output = '';
  
  // Process each chunk
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const result = converter.push(chunk);
    output += result;
    
    if (i % 10 === 0) {
      console.log(\`Processed chunk \${i + 1}/\${chunks.length}\`);
    }
  }
  
  // Finish and get remaining output
  const final = converter.finish();
  output += final;
  
  console.log('\\nConversion complete!');
  console.log('Output preview:', output.substring(0, 200) + '...');
  
  const parsed = JSON.parse(output);
  console.log(\`Total records: \${parsed.length}\`);
}

run().catch(console.error);`,
        }}
      />

      <h2>Real streaming with ReadableStream</h2>

      <p>
        For true streaming, use <code>ReadableStream</code> to process data as it arrives:
      </p>

      <SandpackExample
        template="node"
        dependencyVersion="latest"
        activeFile="/index.js"
        preview={false}
        enableFilePicker={true}
        files={{
          '/index.js': `import { Converter } from "convert-buddy-js";

const fileUrl = "";

async function run() {
  const response = await fetch(fileUrl);
  
  if (!response.body) {
    console.error('No response body available');
    return;
  }
  
  console.log('Starting streaming conversion...');
  
  const converter = new Converter({
    inputFormat: 'csv',
    outputFormat: 'json'
  });
  
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let output = '';
  let chunkCount = 0;
  
  try {
    while (true) {
      const { done, value } = await reader.read();
      
      if (done) break;
      
      // Decode chunk and push to converter
      const chunk = decoder.decode(value, { stream: true });
      const result = converter.push(chunk);
      output += result;
      
      chunkCount++;
      console.log(\`Processed chunk \${chunkCount}, size: \${value.length} bytes\`);
    }
    
    // Flush remaining data
    const final = converter.finish();
    output += final;
    
    console.log('\\nStreaming complete!');
    console.log('Total chunks:', chunkCount);
    
    const parsed = JSON.parse(output);
    console.log(\`Converted \${parsed.length} records\`);
    console.log('Preview:', JSON.stringify(parsed.slice(0, 2), null, 2));
    
  } finally {
    reader.releaseLock();
  }
}

run().catch(console.error);`,
        }}
      />

      <h2>Progress tracking during streaming</h2>

      <p>
        Add progress callbacks to show conversion progress for large files:
      </p>

      <SandpackExample
        template="node"
        dependencyVersion="latest"
        activeFile="/index.js"
        preview={false}
        enableFilePicker={true}
        files={{
          '/index.js': `import { Converter } from "convert-buddy-js";

const fileUrl = "";

async function run() {
  const response = await fetch(fileUrl);
  
  if (!response.body) {
    console.error('No response body');
    return;
  }
  
  const converter = new Converter({
    inputFormat: 'csv',
    outputFormat: 'json',
    progressIntervalBytes: 50, // Report every 50 bytes
    onProgress: (stats) => {
      console.log('Progress:', {
        bytesIn: stats.bytesIn,
        records: stats.recordsProcessed,
        throughput: stats.throughputMbPerSec.toFixed(2) + ' MB/s'
      });
    }
  });
  
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let output = '';
  
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      const chunk = decoder.decode(value, { stream: true });
      output += converter.push(chunk);
    }
    
    output += converter.finish();
    
    console.log('\\nConversion complete!');
    const parsed = JSON.parse(output);
    console.log(\`Total records: \${parsed.length}\`);
    
  } finally {
    reader.releaseLock();
  }
}

run().catch(console.error);`,
        }}
      />

      <h2>Avoid convertToString for large files</h2>

      <p>
        While <code>convertToString()</code> is convenient, it's not suitable for large files
        because it loads the entire result into memory:
      </p>

      <pre><code>{`// ❌ Bad: Loads entire output into memory
const bigJson = await convertToString(hugeFile, { outputFormat: "json" });
// Output string consumes memory equal to output size

// ✅ Good: Stream output to disk/network
const converter = new Converter({ outputFormat: "json" });
const writeStream = createWriteStream("output.json");

for await (const chunk of readStream) {
  const output = converter.push(chunk);
  writeStream.write(output); // Write incrementally
}

writeStream.write(converter.finish());
writeStream.end();`}</code></pre>

      <h2>Node.js file streaming example</h2>

      <p>
        Here's a complete example for Node.js that streams a file conversion without loading
        the entire file into memory:
      </p>

      <SandpackExample
        template="node"
        dependencyVersion="latest"
        activeFile="/index.js"
        preview={false}
        files={{
          '/index.js': `import { Converter } from "convert-buddy-js";

// Simulated Node.js streaming example
async function run() {
  console.log('Node.js streaming pattern:');
  console.log('');
  console.log('import { Converter } from "convert-buddy-js";');
  console.log('import { createReadStream, createWriteStream } from "fs";');
  console.log('');
  console.log('async function convertFile(input, output) {');
  console.log('  const converter = new Converter({');
  console.log('    inputFormat: "csv",');
  console.log('    outputFormat: "json",');
  console.log('    onProgress: (stats) => {');
  console.log('      console.log(\`Progress: \${stats.bytesIn} bytes\`);');
  console.log('    }');
  console.log('  });');
  console.log('');
  console.log('  const reader = createReadStream(input);');
  console.log('  const writer = createWriteStream(output);');
  console.log('');
  console.log('  for await (const chunk of reader) {');
  console.log('    const output = converter.push(chunk);');
  console.log('    if (output) writer.write(output);');
  console.log('  }');
  console.log('');
  console.log('  const final = converter.finish();');
  console.log('  if (final) writer.write(final);');
  console.log('  writer.end();');
  console.log('}');
  console.log('');
  console.log('// Convert large file efficiently');
  console.log('await convertFile("huge-file.csv", "output.json");');
  console.log('');
  console.log('This pattern:');
  console.log('✓ Handles files of any size');
  console.log('✓ Uses minimal memory (only chunk size)');
  console.log('✓ Shows progress during conversion');
  console.log('✓ Writes output incrementally');
}

run().catch(console.error);`,
        }}
      />

      <h2>Memory-efficient batch processing</h2>

      <p>
        For processing multiple large files, reuse converter instances to minimize memory:
      </p>

      <SandpackExample
        template="node"
        dependencyVersion="latest"
        activeFile="/index.js"
        preview={false}
        files={{
          '/index.js': `import { Converter } from "convert-buddy-js";

async function run() {
  // Simulate processing multiple files
  const files = [
    'File 1 content: name,age\\nAlice,30\\nBob,25',
    'File 2 content: name,age\\nCharlie,35\\nDiana,28',
    'File 3 content: name,age\\nEve,32\\nFrank,29'
  ];
  
  // Create one converter instance
  const converter = new Converter({
    inputFormat: 'csv',
    outputFormat: 'json'
  });
  
  console.log('Processing multiple files...');
  
  for (let i = 0; i < files.length; i++) {
    console.log(\`\\nProcessing file \${i + 1}...\`);
    
    // Process file
    let output = converter.push(files[i]);
    output += converter.finish();
    
    const parsed = JSON.parse(output);
    console.log(\`Converted \${parsed.length} records\`);
    console.log('Result:', JSON.stringify(parsed, null, 2));
    
    // Reset for next file
    converter.reset();
  }
  
  console.log('\\nAll files processed!');
}

run().catch(console.error);`,
        }}
      />

      <h2>Best practices</h2>

      <ul>
        <li><strong>Use streaming for files {'>'} 100MB</strong> - Avoids out-of-memory errors</li>
        <li><strong>Process in chunks</strong> - Use push()/finish() pattern</li>
        <li><strong>Write output incrementally</strong> - Don't accumulate in memory</li>
        <li><strong>Add progress callbacks</strong> - Show users conversion is working</li>
        <li><strong>Reuse converter instances</strong> - Call reset() between files</li>
        <li><strong>Handle backpressure</strong> - Pause input if output buffer fills</li>
      </ul>

      <h2>When to use streaming</h2>

      <table>
        <thead>
          <tr>
            <th>File Size</th>
            <th>Recommended API</th>
            <th>Reason</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>{'<'} 10MB</td>
            <td>convertToString()</td>
            <td>Simple, convenient, fast</td>
          </tr>
          <tr>
            <td>10-100MB</td>
            <td>Either works</td>
            <td>Depends on available memory</td>
          </tr>
          <tr>
            <td>{'>'} 100MB</td>
            <td>Converter + streaming</td>
            <td>Required for memory safety</td>
          </tr>
          <tr>
            <td>{'>'} 1GB</td>
            <td>Converter + streaming</td>
            <td>Essential, add progress tracking</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
