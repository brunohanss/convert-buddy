import React from 'react';
import PlaygroundExample from '@/components/mdx/Playground';

export default function Page() {
  return (
    <div>
      <h1>Simple API</h1>

      <p>
        The Simple API provides the easiest way to convert data with minimal code.
        Perfect for one-off conversions, UI flows, and quick scripts where you don't need
        to reuse configuration or manage instance lifecycle.
      </p>

      <h2>When to Use the Simple API</h2>

      <ul>
        <li>Converting a single file or data source</li>
        <li>Quick prototyping and scripting</li>
        <li>UI flows where users upload/download files</li>
        <li>Auto-detection is desired (no need to specify input format)</li>
        <li>You want the simplest possible code</li>
      </ul>

      <h2>Core Functions</h2>

      <h3>convertToString()</h3>

      <p>
        The most common function - converts data and returns a string.
        Accepts <code>Uint8Array</code> or <code>string</code> input.
      </p>

      <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '4px', marginBottom: '1rem' }}>
        <pre style={{ margin: 0 }}>
{`convertToString(
  input: Uint8Array | string,
  options: {
    inputFormat?: Format | "auto",  // Auto-detects if omitted
    outputFormat: Format,            // Required: "json" | "csv" | "ndjson" | "xml"
    csvConfig?: CsvConfig,
    xmlConfig?: XmlConfig,
    transform?: TransformConfig,
    onProgress?: (stats: Stats) => void
  }
): Promise<string>`}
        </pre>
      </div>

      <h4>Basic Example - Auto-Detection</h4>

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
  
  // Auto-detect input format, convert to JSON
  const json = await convertToString(data, { 
    outputFormat: 'json' 
  });
  
  // Parse and display
  const parsed = JSON.parse(json);
  console.log(\`✓ Converted \${parsed.length} records\`);
  console.log('Sample:', JSON.stringify(parsed[0], null, 2));
}

run().catch(console.error);`,
        }}
      />

      <h4>Explicit Format Specification</h4>

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
  
  // Explicitly specify format (skips detection, faster)
  const xml = await convertToString(csvData, { 
    inputFormat: 'csv',
    outputFormat: 'xml',
    xmlConfig: {
      recordElement: 'record'
    }
  });
  
  console.log('Converted to XML:');
  console.log(xml);
}

run().catch(console.error);`,
        }}
      />

      <h4>With Progress Callback</h4>

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
  
  const ndjson = await convertToString(data, { 
    inputFormat: 'csv',
    outputFormat: 'ndjson',
    onProgress: (stats) => {
      console.log(\`Progress: \${stats.recordsProcessed} records, \${stats.bytesIn} bytes\`);
      console.log(\`  Throughput: \${stats.throughputMbPerSec.toFixed(2)} MB/s\`);
    },
    progressIntervalBytes: 1024 * 512 // Report every 512KB
  });
  
  console.log('Conversion complete!');
  console.log('Output:', ndjson.substring(0, 200));
}

run().catch(console.error);`,
        }}
      />

      <h3>convertAny()</h3>

      <p>
        The most flexible function - accepts any input type and returns <code>Uint8Array</code>.
        Handles URLs, Files, Blobs, and ReadableStreams automatically.
      </p>

      <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '4px', marginBottom: '1rem' }}>
        <pre style={{ margin: 0 }}>
{`convertAny(
  input: string | Uint8Array | File | Blob | ReadableStream<Uint8Array>,
  options: {
    inputFormat?: Format | "auto",
    outputFormat: Format,
    csvConfig?: CsvConfig,
    xmlConfig?: XmlConfig,
    transform?: TransformConfig,
    onProgress?: (stats: Stats) => void
  }
): Promise<Uint8Array>`}
        </pre>
      </div>

      <h4>From URL</h4>

      <PlaygroundExample
        template="node"
        dependencyVersion="latest"
        activeFile="/index.js"
        preview={true}
        enableFilePicker={true}
        files={{
          '/index.js': `import { convertAny } from "convert-buddy-js";

async function run() {
  const url = "";
  
  if (!url) {
    console.log("Add a file URL to test URL conversion");
    return;
  }
  
  // Pass URL directly - convertAny handles fetching
  const result = await convertAny(url, { 
    outputFormat: 'json' 
  });
  
  const decoder = new TextDecoder();
  const json = decoder.decode(result);
  
  console.log('Converted from URL:');
  console.log(json);
}

run().catch(console.error);`,
        }}
      />

      <h4>From File (Browser)</h4>

      <PlaygroundExample
        template="vanilla"
        dependencyVersion="latest"
        activeFile="/index.js"
        preview={true}
        enableFilePicker={true}
        files={{
          '/index.js': `import { convertAny } from "convert-buddy-js";

// Simulate file input
const fileUrl = "";

async function convertFile() {
  if (!fileUrl) {
    console.log("Add a file URL to test file conversion");
    return;
  }
  
  // Fetch and create a blob (simulating File object)
  const response = await fetch(fileUrl);
  const blob = await response.blob();
  
  // convertAny handles File/Blob directly
  const result = await convertAny(blob, { 
    inputFormat: 'csv',
    outputFormat: 'json' 
  });
  
  const decoder = new TextDecoder();
  console.log('Converted from blob:');
  console.log(decoder.decode(result));
}

convertFile().catch(console.error);`,
        }}
      />

      <h4>From Stream</h4>

      <PlaygroundExample
        template="node"
        dependencyVersion="latest"
        activeFile="/index.js"
        preview={true}
        enableFilePicker={true}
        files={{
          '/index.js': `import { convertAny } from "convert-buddy-js";

const fileUrl = "";

async function run() {
  const response = await fetch(fileUrl);
  
  // Pass ReadableStream directly
  const result = await convertAny(response.body, { 
    inputFormat: 'csv',
    outputFormat: 'ndjson' 
  });
  
  const decoder = new TextDecoder();
  const ndjson = decoder.decode(result);
  
  console.log('Converted from stream:');
  console.log(ndjson.substring(0, 300));
}

run().catch(console.error);`,
        }}
      />

      <h3>convertAnyToString()</h3>

      <p>
        Combines <code>convertAny()</code> with automatic string decoding.
        The ultimate convenience function - accepts any input, returns a string.
      </p>

      <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '4px', marginBottom: '1rem' }}>
        <pre style={{ margin: 0 }}>
{`convertAnyToString(
  input: string | Uint8Array | File | Blob | ReadableStream<Uint8Array>,
  options: ConvertOptions
): Promise<string>`}
        </pre>
      </div>

      <h4>One-Line Conversion</h4>

      <PlaygroundExample
        template="node"
        dependencyVersion="latest"
        activeFile="/index.js"
        preview={true}
        enableFilePicker={true}
        files={{
          '/index.js': `import { convertAnyToString } from "convert-buddy-js";

const fileUrl = "";

async function run() {
  if (!fileUrl) {
    console.log("Add a file URL to test");
    return;
  }
  
  // Ultra-simple: URL to JSON string in one line
  const json = await convertAnyToString(fileUrl, { 
    outputFormat: 'json' 
  });
  
  console.log('Converted JSON:');
  console.log(json);
  
  const data = JSON.parse(json);
  console.log(\`Records: \${data.length}\`);
}

run().catch(console.error);`,
        }}
      />

      <h4>Browser File Upload Flow</h4>

      <PlaygroundExample
        template="vanilla"
        dependencyVersion="latest"
        activeFile="/index.js"
        preview={true}
        enableFilePicker={true}
        files={{
          '/index.js': `import { convertAnyToString } from "convert-buddy-js";

const fileUrl = "";

async function handleFileUpload() {
  if (!fileUrl) {
    console.log("Add a file URL to test upload flow");
    return;
  }
  
  const response = await fetch(fileUrl);
  const file = await response.blob();
  
  // Convert uploaded file to JSON
  const json = await convertAnyToString(file, { 
    outputFormat: 'json' 
  });
  
  // Display preview
  const data = JSON.parse(json);
  console.log('File converted successfully!');
  console.log(\`Records: \${data.length}\`);
  console.log('Preview:', JSON.stringify(data.slice(0, 3), null, 2));
}

handleFileUpload().catch(console.error);`,
        }}
      />

      <h2>Configuration Options</h2>

      <h3>CSV Configuration</h3>

      <PlaygroundExample
        template="node"
        dependencyVersion="latest"
        activeFile="/index.js"
        preview={true}
        enableFilePicker={true}
        files={{
          '/index.js': `import { convertToString } from "convert-buddy-js";

const tsvData = "name\\tage\\tcity\\nAda\\t36\\tLondon\\nAlan\\t42\\tManchester";

async function run() {
  const json = await convertToString(tsvData, { 
    inputFormat: 'csv',
    outputFormat: 'json',
    csvConfig: {
      delimiter: '\\t',        // Tab-separated
      hasHeaders: true,       // First row is headers
      trimWhitespace: true,   // Trim spaces from values
      quote: '"'              // Quote character
    }
  });
  
  console.log('TSV to JSON:');
  console.log(json);
}

run().catch(console.error);`,
        }}
      />

      <h3>XML Configuration</h3>

      <PlaygroundExample
        template="node"
        dependencyVersion="latest"
        activeFile="/index.js"
        preview={true}
        enableFilePicker={true}
        files={{
          '/index.js': `import { convertToString } from "convert-buddy-js";

const jsonData = JSON.stringify([
  { name: "Ada", age: 36 },
  { name: "Alan", age: 42 }
]);

async function run() {
  const xml = await convertToString(jsonData, { 
    inputFormat: 'json',
    outputFormat: 'xml',
    xmlConfig: {
      recordElement: 'person',     // Wrap each record in <person>
      includeAttributes: false,    // Use elements, not attributes
      trimText: true               // Trim whitespace in text
    }
  });
  
  console.log('JSON to XML:');
  console.log(xml);
}

run().catch(console.error);`,
        }}
      />

      <h2>Limitations</h2>

      <p>
        The Simple API is designed for convenience, but has some tradeoffs:
      </p>

      <ul>
        <li><strong>No instance reuse:</strong> Each call creates a new converter instance. For multiple conversions, use the Instance API instead.</li>
        <li><strong>Limited streaming control:</strong> Automatic streaming behavior. For manual chunk control, use the Streaming API.</li>
        <li><strong>No pause/resume:</strong> Cannot pause processing mid-conversion.</li>
        <li><strong>Auto-detection overhead:</strong> If you know the input format, specifying <code>inputFormat</code> is faster.</li>
      </ul>

      <h2>Performance Tips</h2>

      <ol>
        <li><strong>Specify inputFormat when known:</strong> Skips auto-detection for better performance</li>
        <li><strong>Use convertToString over convertAny + decode:</strong> One less step, same result</li>
        <li><strong>For multiple files:</strong> Switch to Instance API to avoid repeated initialization</li>
        <li><strong>Large files:</strong> Consider Streaming API for better memory efficiency</li>
      </ol>

      <h2>Complete Example - File Converter</h2>

      <PlaygroundExample
        template="vanilla"
        dependencyVersion="latest"
        activeFile="/index.js"
        preview={true}
        enableFilePicker={true}
        files={{
          '/index.js': `import { convertAnyToString, getSuggestedFilename, getMimeType } from "convert-buddy-js";

const fileUrl = "";

async function convertAndDownload() {
  if (!fileUrl) {
    console.log("Add a file URL to test the complete flow");
    return;
  }
  
  console.log('Starting conversion...');
  
  const response = await fetch(fileUrl);
  const blob = await response.blob();
  
  // Convert with progress tracking
  const json = await convertAnyToString(blob, { 
    outputFormat: 'json',
    onProgress: (stats) => {
      console.log(\`  Progress: \${stats.recordsProcessed} records\`);
    }
  });
  
  console.log('Conversion complete!');
  
  // Parse and show stats
  const data = JSON.parse(json);
  console.log(\`Converted \${data.length} records\`);
  console.log('Preview:', JSON.stringify(data.slice(0, 2), null, 2));
  
  // Create download
  const filename = getSuggestedFilename('data.csv', 'json');
  const mimeType = getMimeType('json');
  const downloadBlob = new Blob([json], { type: mimeType });
  
  console.log(\`Download ready: \${filename}\`);
}

convertAndDownload().catch(console.error);`,
        }}
      />

      <h2>Next Steps</h2>

      <ul>
        <li>For multiple conversions: See <a href="/docs/api/instance">Instance API</a></li>
        <li>For manual streaming: See <a href="/docs/api/streaming">Streaming API</a></li>
        <li>For browser integration: See <a href="/docs/api/browser-helpers">Browser Helpers</a></li>
        <li>For Node.js file I/O: See <a href="/docs/api/node-helpers">Node Helpers</a></li>
      </ul>
    </div>
  );
}
