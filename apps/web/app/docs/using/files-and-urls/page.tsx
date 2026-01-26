import React from 'react';
import PlaygroundExample from '@/components/mdx/Playground';

export default function FilesAndUrlsPage() {
  return (
    <div>
      <h1>Files and URLs</h1>

      <p>
        Convert Buddy accepts multiple input types: strings, File objects, file paths, and URLs.
        This page shows how to work with each input type.
      </p>

      <h2>Browser File inputs</h2>

      <p>
        In the browser, use the <code>File</code> object from file input elements.
        Convert Buddy automatically streams the file without loading it entirely into memory:
      </p>

      <PlaygroundExample
        template="node"
        dependencyVersion="latest"
        activeFile="/index.js"
        preview={true}
        enableFilePicker={true}
        files={{
          '/index.js': `import { convertToString } from "convert-buddy-js";

// Simulate browser File object with fetch
const fileUrl = "";

async function run() {
  const response = await fetch(fileUrl);
  const blob = await response.blob();
  
  // In real browser code, you'd get this from:
  // <input type="file" onChange={handleFileSelect} />
  const file = new File([blob], "data.csv", { type: "text/csv" });
  
  console.log('Converting file:', file.name);
  console.log('File size:', file.size, 'bytes');
  console.log('File type:', file.type);
  
  // Convert File to JSON
  const json = await convertToString(file, {
    outputFormat: 'json'
  });
  
  // Parse and display
  const parsed = JSON.parse(json);
  console.log(\`\n✓ Converted \${parsed.length} records\`);
  console.log('First record:', JSON.stringify(parsed[0], null, 2));
}

run().catch(console.error);

// Browser example for reference:
/*
function handleFileSelect(event) {
  const file = event.target.files[0];
  
  convertToString(file, { outputFormat: 'json' })
    .then(result => {
      console.log('Converted:', result);
    })
    .catch(err => {
      console.error('Conversion failed:', err);
    });
}
*/`,
        }}
      />

      <h2>Node.js file paths</h2>

      <p>
        In Node.js, you can pass file paths directly as strings. Convert Buddy uses streaming
        file I/O to handle files of any size efficiently:
      </p>

      <PlaygroundExample
        template="node"
        dependencyVersion="latest"
        activeFile="/index.js"
        preview={true}
        files={{
          '/index.js': `import { convertToString } from "convert-buddy-js";
import { writeFile } from "fs/promises";

async function run() {
  // Note: In real Node.js, you can pass a file path directly:
  // const result = await convertToString("./data/input.csv", {
  //   outputFormat: "json"
  // });
  
  // For this example, we'll simulate with string data
  const csvData = \`name,age,city
Alice,30,New York
Bob,25,San Francisco
Charlie,35,Seattle\`;
  
  // Convert and get result as string
  const json = await convertToString(csvData, {
    inputFormat: 'csv',
    outputFormat: 'json'
  });
  
  const parsed = JSON.parse(json);
  console.log(\`✓ Converted \${parsed.length} records to JSON\`);
  console.log('Sample:', JSON.stringify(parsed[0], null, 2));
  
  // In Node.js, you could write the output to a file:
  // await writeFile('./output.json', json);
  console.log('\\nOutput saved (simulated)');
}

run().catch(console.error);

// Real Node.js example for reference:
/*
import { convertToString } from "convert-buddy-js";
import { writeFile } from "fs/promises";

async function convertFile(inputPath, outputPath) {
  // Convert file directly by path
  const result = await convertToString(inputPath, {
    outputFormat: "json"
  });
  
  // Write to output file
  await writeFile(outputPath, result);
  console.log(\`Converted \${inputPath} to \${outputPath}\`);
}

convertFile("./data.csv", "./output.json");
*/`,
        }}
      />

      <h2>Remote URLs (Node.js only)</h2>

      <p>
        In Node.js environments, you can fetch and convert remote files by passing URLs.
        This works with HTTP/HTTPS URLs:
      </p>

      <PlaygroundExample
        template="node"
        dependencyVersion="latest"
        activeFile="/index.js"
        preview={true}
        files={{
          '/index.js': `import { convertToString } from "convert-buddy-js";

const fileUrl = "";

async function run() {
  // Method 1: Fetch then convert (works in both browser and Node)
  const response = await fetch(fileUrl);
  const csvData = await response.text();
  
  const json = await convertToString(csvData, {
    outputFormat: 'json'
  });
  
  const parsed = JSON.parse(json);
  console.log(✓ Fetched and converted \${parsed.length} records`);
  console.log('Sample:', JSON.stringify(parsed[0], null, 2));
  
  // Method 2: In Node.js only, you can pass URL directly
  // (Note: This requires Node.js fetch or a URL polyfill)
  /*
  const jsonDirect = await convertToString(fileUrl, {
    outputFormat: 'json'
  });
  console.log('Direct URL conversion:', jsonDirect);
  */
  
  // For large remote files, use streaming approach
  console.log('\\nFor large files, consider streaming instead');
}

run().catch(console.error);`,
        }}
      />

      <h2>ReadableStream inputs</h2>

      <p>
        Both browser and Node.js support <code>ReadableStream</code> inputs for streaming data:
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
  // Fetch returns a Response with a readable stream
  const response = await fetch(fileUrl);
  
  console.log('Response type:', typeof response.body);
  console.log('Has stream:', !!response.body);
  
  // Convert directly from stream
  const json = await convertToString(response.body, {
    outputFormat: 'json'
  });
  
  const parsed = JSON.parse(json);
  console.log(\`\n✓ Stream conversion: \${parsed.length} records\`);
  console.log('Sample:', JSON.stringify(parsed[0], null, 2));
}

run().catch(console.error);`,
        }}
      />

      <h2>Blob and ArrayBuffer inputs</h2>

      <p>
        Convert Buddy also accepts <code>Blob</code>, <code>ArrayBuffer</code>, and <code>Uint8Array</code> inputs:
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
  
  // Convert from Blob
  const blob = await response.blob();
  const jsonFromBlob = await convertToString(blob, {
    outputFormat: 'json'
  });
  console.log('From Blob:', jsonFromBlob.substring(0, 100) + '...');
  
  // Convert from ArrayBuffer
  const arrayBuffer = await response.arrayBuffer();
  const jsonFromBuffer = await convertToString(arrayBuffer, {
    outputFormat: 'json'
  });
  console.log('\\nFrom ArrayBuffer:', jsonFromBuffer.substring(0, 100) + '...');
  
  // Convert from Uint8Array
  const uint8Array = new Uint8Array(arrayBuffer);
  const jsonFromUint8 = await convertToString(uint8Array, {
    outputFormat: 'json'
  });
  console.log('\\nFrom Uint8Array:', jsonFromUint8.substring(0, 100) + '...');
  
  console.log('\\nAll inputs produce identical output!');
}

run().catch(console.error);`,
        }}
      />

      <h2>Best practices</h2>

      <ul>
        <li><strong>Browser:</strong> Use File objects from file inputs - they stream automatically</li>
        <li><strong>Node.js:</strong> Use file paths for local files - more efficient than reading into memory</li>
        <li><strong>Remote files:</strong> Fetch first, then convert (works everywhere)</li>
        <li><strong>Large files:</strong> Prefer streams over loading entire file into memory</li>
        <li><strong>Binary data:</strong> Use ArrayBuffer or Uint8Array for binary sources</li>
      </ul>

      <h2>Input type summary</h2>

      <table>
        <thead>
          <tr>
            <th>Input Type</th>
            <th>Browser</th>
            <th>Node.js</th>
            <th>Use Case</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>String</td>
            <td>✓</td>
            <td>✓</td>
            <td>Small in-memory data</td>
          </tr>
          <tr>
            <td>File</td>
            <td>✓</td>
            <td>✗</td>
            <td>Browser file uploads</td>
          </tr>
          <tr>
            <td>File path</td>
            <td>✗</td>
            <td>✓</td>
            <td>Node.js local files</td>
          </tr>
          <tr>
            <td>URL</td>
            <td>✗</td>
            <td>✓</td>
            <td>Remote files (Node only)</td>
          </tr>
          <tr>
            <td>ReadableStream</td>
            <td>✓</td>
            <td>✓</td>
            <td>Large files, streaming</td>
          </tr>
          <tr>
            <td>Blob</td>
            <td>✓</td>
            <td>✓</td>
            <td>Browser binary data</td>
          </tr>
          <tr>
            <td>ArrayBuffer</td>
            <td>✓</td>
            <td>✓</td>
            <td>Binary data in memory</td>
          </tr>
          <tr>
            <td>Uint8Array</td>
            <td>✓</td>
            <td>✓</td>
            <td>Typed binary arrays</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
