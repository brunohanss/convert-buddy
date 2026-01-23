import React from 'react';
import SandpackExample from '@/components/mdx/Sandpack';

export default function BrowserVsNodePage() {
  return (
    <div>
      <h1>Browser vs Node.js</h1>

      <p>
        Convert Buddy works seamlessly in both browser and Node.js environments,
        but there are important differences in how you use it on each platform.
      </p>

      <h2>Bundling considerations</h2>

      <p>
        The package automatically uses the correct build for your environment:
      </p>

      <h3>Browser (ESM)</h3>

      <pre><code>{`// Vite, Webpack, or other bundlers automatically use browser build
import { convertToString } from 'convert-buddy-js';

// WebAssembly is loaded automatically
// No special configuration needed!`}</code></pre>

      <h3>Node.js (CommonJS)</h3>

      <pre><code>{`// Node.js 14+ with ES modules support
import { convertToString } from 'convert-buddy-js';

// Or CommonJS
const { convertToString } = require('convert-buddy-js');

// WASM module is loaded from node_modules automatically`}</code></pre>

      <h3>Bundle size optimization</h3>

      <p>
        The WASM binary (~150KB gzipped) is loaded lazily by default.
        Configure your bundler to handle WASM files:
      </p>

      <pre><code>{`// Vite config example
export default {
  optimizeDeps: {
    exclude: ['convert-buddy-js']
  }
}

// Next.js already handles this automatically

// Webpack 5+ has built-in WASM support`}</code></pre>

      <h2>File system access differences</h2>

      <h3>Browser: No direct file system access</h3>

      <p>
        Browsers can't access files directly. Use File API from input elements:
      </p>

      <pre><code>{`import { convertToString } from 'convert-buddy-js';

// Browser: Use File objects from file inputs
function handleFileUpload(event) {
  const file = event.target.files[0];
  
  convertToString(file, { outputFormat: 'json' })
    .then(result => {
      console.log('Converted:', result);
      
      // Download result
      const blob = new Blob([result], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'output.json';
      a.click();
    });
}

// HTML
<input type="file" onChange={handleFileUpload} />`}</code></pre>

      <h3>Node.js: Full file system access</h3>

      <p>
        Node.js can read and write files directly:
      </p>

      <pre><code>{`import { convertToString } from 'convert-buddy-js';
import { readFile, writeFile } from 'fs/promises';

// Node.js: Direct file path access
async function convertFile() {
  // Read input file
  const csvData = await readFile('./input.csv', 'utf-8');
  
  // Convert
  const json = await convertToString(csvData, {
    inputFormat: 'csv',
    outputFormat: 'json'
  });
  
  // Write output file
  await writeFile('./output.json', json);
  console.log('Conversion complete!');
}

// Or use file paths directly (Node.js only)
const result = await convertToString('./input.csv', {
  outputFormat: 'json'
});`}</code></pre>

      <h2>Streaming API differences</h2>

      <h3>Browser: Web Streams API</h3>

      <p>
        Browsers use the Web Streams API (ReadableStream):
      </p>

      <pre><code>{`import { Converter } from 'convert-buddy-js';

// Browser: Fetch returns Web ReadableStream
async function streamConvert(url) {
  const response = await fetch(url);
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  
  const converter = new Converter({
    inputFormat: 'csv',
    outputFormat: 'json'
  });
  
  let result = '';
  
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    
    const chunk = decoder.decode(value, { stream: true });
    result += converter.push(chunk);
  }
  
  result += converter.finish();
  return result;
}`}</code></pre>

      <h3>Node.js: Node.js Streams</h3>

      <p>
        Node.js uses traditional Node streams:
      </p>

      <pre><code>{`import { Converter } from 'convert-buddy-js';
import { createReadStream, createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';
import { Transform } from 'stream';

// Node.js: Use Node streams
async function convertFile(inputPath, outputPath) {
  const converter = new Converter({
    inputFormat: 'csv',
    outputFormat: 'json'
  });
  
  // Create transform stream
  const transformStream = new Transform({
    transform(chunk, encoding, callback) {
      const output = converter.push(chunk.toString());
      callback(null, output);
    },
    flush(callback) {
      const final = converter.finish();
      callback(null, final);
    }
  });
  
  // Pipeline: read → convert → write
  await pipeline(
    createReadStream(inputPath),
    transformStream,
    createWriteStream(outputPath)
  );
}`}</code></pre>

      <h2>Side-by-side comparison</h2>

      <table>
        <thead>
          <tr>
            <th>Feature</th>
            <th>Browser</th>
            <th>Node.js</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Import</td>
            <td><code>import</code> (ESM)</td>
            <td><code>import</code> or <code>require</code></td>
          </tr>
          <tr>
            <td>File input</td>
            <td><code>File</code> objects from {'<input>'}</td>
            <td>File paths as strings</td>
          </tr>
          <tr>
            <td>File output</td>
            <td>Blob + download link</td>
            <td><code>fs.writeFile()</code></td>
          </tr>
          <tr>
            <td>Streaming</td>
            <td>Web Streams API</td>
            <td>Node.js Streams</td>
          </tr>
          <tr>
            <td>URL support</td>
            <td><code>fetch()</code> then convert</td>
            <td>Pass URL directly</td>
          </tr>
          <tr>
            <td>WASM loading</td>
            <td>Lazy loaded via bundler</td>
            <td>Loaded from node_modules</td>
          </tr>
          <tr>
            <td>Memory limits</td>
            <td>~2GB (browser heap)</td>
            <td>~16GB+ (Node.js heap)</td>
          </tr>
        </tbody>
      </table>

      <h2>Complete browser example</h2>

      <pre><code>{`import { convertToString } from 'convert-buddy-js';
import { useState } from 'react';

function FileConverter() {
  const [converting, setConverting] = useState(false);
  const [result, setResult] = useState(null);
  
  async function handleFile(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    setConverting(true);
    
    try {
      // Convert file to JSON
      const json = await convertToString(file, {
        outputFormat: 'json',
        onProgress: (stats) => {
          console.log(\`Progress: \${(stats.bytesIn / file.size * 100).toFixed(1)}%\`);
        }
      });
      
      setResult(json);
      
      // Offer download
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name.replace(/\\.[^.]+$/, '.json');
      a.click();
      URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error('Conversion failed:', error);
      alert('Conversion failed: ' + error.message);
    } finally {
      setConverting(false);
    }
  }
  
  return (
    <div>
      <input 
        type="file" 
        onChange={handleFile}
        accept=".csv,.json,.xml,.ndjson"
        disabled={converting}
      />
      {converting && <p>Converting...</p>}
      {result && <p>✓ Conversion complete!</p>}
    </div>
  );
}`}</code></pre>

      <h2>Complete Node.js example</h2>

      <pre><code>{`import { convertToString } from 'convert-buddy-js';
import { readFile, writeFile, readdir } from 'fs/promises';
import { join } from 'path';

async function convertDirectory(inputDir, outputDir) {
  // Get all CSV files
  const files = await readdir(inputDir);
  const csvFiles = files.filter(f => f.endsWith('.csv'));
  
  console.log(\`Found \${csvFiles.length} CSV files\`);
  
  // Convert each file
  for (const file of csvFiles) {
    const inputPath = join(inputDir, file);
    const outputPath = join(outputDir, file.replace('.csv', '.json'));
    
    console.log(\`Converting \${file}...\`);
    
    // Read input
    const csvData = await readFile(inputPath, 'utf-8');
    
    // Convert
    const json = await convertToString(csvData, {
      inputFormat: 'csv',
      outputFormat: 'json',
      onProgress: (stats) => {
        process.stdout.write(\`\\rProgress: \${stats.bytesIn} bytes\`);
      }
    });
    
    // Write output
    await writeFile(outputPath, json);
    
    console.log(\`\\n✓ \${file} → \${file.replace('.csv', '.json')}\`);
  }
  
  console.log(\`\\nConverted \${csvFiles.length} files!\`);
}

// Run conversion
convertDirectory('./data/input', './data/output')
  .catch(console.error);`}</code></pre>

      <h2>Platform detection</h2>

      <p>
        Detect the runtime environment if you need platform-specific logic:
      </p>

      <pre><code>{`// Detect environment
const isBrowser = typeof window !== 'undefined';
const isNode = typeof process !== 'undefined' && process.versions?.node;

if (isBrowser) {
  console.log('Running in browser');
  // Use File API, fetch, etc.
} else if (isNode) {
  console.log('Running in Node.js');
  // Use fs, path, etc.
}

// Or check for specific APIs
const hasFileSystem = typeof require !== 'undefined' && 
  typeof require('fs') !== 'undefined';`}</code></pre>

      <h2>Best practices</h2>

      <h3>For browser applications:</h3>

      <ul>
        <li>Use File objects from file inputs</li>
        <li>Provide progress feedback for large files</li>
        <li>Offer download links for converted files</li>
        <li>Handle memory limits (recommend streaming for {'>'}100MB)</li>
        <li>Show file size warnings</li>
      </ul>

      <h3>For Node.js applications:</h3>

      <ul>
        <li>Use file paths for better performance</li>
        <li>Stream large files to avoid memory issues</li>
        <li>Handle file system errors gracefully</li>
        <li>Process files in batches</li>
        <li>Log progress to console/file</li>
      </ul>

      <h3>For universal code:</h3>

      <ul>
        <li>Detect environment and adapt accordingly</li>
        <li>Use common APIs (fetch, ReadableStream) when possible</li>
        <li>Abstract file I/O behind interfaces</li>
        <li>Test in both environments</li>
        <li>Document platform-specific requirements</li>
      </ul>

      <h2>Common issues and solutions</h2>

      <h3>Issue: WASM loading errors in browser</h3>

      <pre><code>{`// Solution: Configure bundler correctly
// Vite: Add to vite.config.js
export default {
  optimizeDeps: {
    exclude: ['convert-buddy-js']
  }
}

// Webpack: Ensure WASM support is enabled (Webpack 5+)
// Next.js: Works out of the box`}</code></pre>

      <h3>Issue: Module not found in Node.js</h3>

      <pre><code>{`// Solution: Ensure package.json has "type": "module"
{
  "type": "module"
}

// Or use .mjs extension
// my-script.mjs

// Or use require for CommonJS
const { convertToString } = require('convert-buddy-js');`}</code></pre>

      <h3>Issue: File paths don't work in browser</h3>

      <pre><code>{`// ❌ Browser: Can't use file paths
const result = await convertToString('./data.csv', ...); // Error!

// ✅ Browser: Use File objects
const file = event.target.files[0];
const result = await convertToString(file, ...); // Works!`}</code></pre>

      <h3>Issue: File API doesn't work in Node.js</h3>

      <pre><code>{`// ❌ Node.js: No File constructor
const file = new File([data], 'data.csv'); // Error!

// ✅ Node.js: Use file paths or buffers
const result = await convertToString('./data.csv', ...); // Works!
const result = await convertToString(Buffer.from(data), ...); // Works!`}</code></pre>
    </div>
  );
}
