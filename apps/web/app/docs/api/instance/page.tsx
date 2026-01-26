import React from 'react';
import PlaygroundExample from '@/components/mdx/Playground';

export default function Page() {
  return (
    <div>
      <h1>Instance API</h1>
      
      <p>
        The Instance API provides a reusable converter with lifecycle control.
        Use this when converting multiple files, when you need access to statistics,
        or when you want to configure once and reuse efficiently.
      </p>

      <h2>When to Use the Instance API</h2>

      <ul>
        <li>Converting multiple files with the same configuration</li>
        <li>Batch processing or ETL pipelines</li>
        <li>When you need access to detailed statistics</li>
        <li>Performance-critical applications (avoid repeated initialization)</li>
        <li>Applications that need profiling and debugging</li>
      </ul>

      <h2>Creating an Instance</h2>

      <h3>Constructor</h3>

      <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '4px', marginBottom: '1rem' }}>
        <pre style={{ margin: 0 }}>
{`const buddy = new ConvertBuddy(options?: {
  debug?: boolean;           // Enable debug logging
  profile?: boolean;         // Enable performance profiling
  inputFormat?: Format | "auto";
  outputFormat?: Format;
  chunkTargetBytes?: number; // Chunk size for processing
  parallelism?: number;      // Number of worker threads (Node only)
  maxMemoryMB?: number;      // Memory limit (future use)
  csvConfig?: CsvConfig;
  xmlConfig?: XmlConfig;
  transform?: TransformConfig;
  onProgress?: (stats: Stats) => void;
  progressIntervalBytes?: number; // Progress callback interval
});`}
        </pre>
      </div>

      <h4>Basic Instance Creation</h4>

      <PlaygroundExample
        template="node"
        dependencyVersion="latest"
        activeFile="/index.js"
        preview={true}
        enableFilePicker={true}
        files={{
          '/index.js': `import { ConvertBuddy } from "convert-buddy-js";

async function run() {
  // Create instance with global configuration
  const buddy = new ConvertBuddy({
    inputFormat: 'csv',
    outputFormat: 'json',
    debug: true
  });
  
  const csvData = "name,age\\nAda,36\\nAlan,42";
  
  const result = await buddy.convert(csvData, {
    outputFormat: 'json'
  });
  
  const decoder = new TextDecoder();
  console.log('Converted:', decoder.decode(result));
}

run().catch(console.error);`,
        }}
      />

      <h2>Global Configuration</h2>

      <p>
        Options passed to the constructor become defaults for all <code>convert()</code> calls.
        Individual calls can override these settings.
      </p>

      <h3>Debug Mode</h3>

      <PlaygroundExample
        template="node"
        dependencyVersion="latest"
        activeFile="/index.js"
        preview={true}
        enableFilePicker={true}
        files={{
          '/index.js': `import { ConvertBuddy } from "convert-buddy-js";

async function run() {
  // Enable debug logging
  const buddy = new ConvertBuddy({
    debug: true,
    outputFormat: 'json'
  });
  
  const csvData = "name,age\\nAda,36\\nAlan,42";
  const result = await buddy.convert(csvData, {
    outputFormat: 'json'
  });
  
  console.log('Conversion complete');
}

run().catch(console.error);`,
        }}
      />

      <h3>Profiling</h3>

      <PlaygroundExample
        template="node"
        dependencyVersion="latest"
        activeFile="/index.js"
        preview={true}
        enableFilePicker={true}
        files={{
          '/index.js': `import { ConvertBuddy } from "convert-buddy-js";

const fileUrl = "";

async function run() {
  // Enable performance profiling
  const buddy = new ConvertBuddy({
    profile: true,
    outputFormat: 'json'
  });
  
  const response = await fetch(fileUrl);
  const data = await response.text();
  
  const result = await buddy.convert(data, {
    outputFormat: 'json'
  });
  
  // Stats are automatically logged when profile=true
  const stats = buddy.stats();
  console.log('Performance:');
  console.log(\`  Parse time: \${stats.parseTimeMs}ms\`);
  console.log(\`  Write time: \${stats.writeTimeMs}ms\`);
  console.log(\`  Throughput: \${stats.throughputMbPerSec.toFixed(2)} MB/s\`);
}

run().catch(console.error);`,
        }}
      />

      <h3>Memory Limits</h3>

      <PlaygroundExample
        template="node"
        dependencyVersion="latest"
        activeFile="/index.js"
        preview={true}
        enableFilePicker={true}
        files={{
          '/index.js': `import { ConvertBuddy } from "convert-buddy-js";

async function run() {
  // Set memory limit (future use - currently advisory)
  const buddy = new ConvertBuddy({
    maxMemoryMB: 512,
    outputFormat: 'json'
  });
  
  const csvData = "name,age\\nAda,36\\nAlan,42";
  const result = await buddy.convert(csvData, {
    outputFormat: 'json'
  });
  
  console.log('Conversion with memory limit');
}

run().catch(console.error);`,
        }}
      />

      <h2>convert() Method</h2>

      <p>
        The <code>convert()</code> method accepts the same input types as the Simple API
        (strings, URLs, Files, Blobs, streams) but reuses the instance configuration.
      </p>

      <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '4px', marginBottom: '1rem' }}>
        <pre style={{ margin: 0 }}>
{`convert(
  input: string | Uint8Array | File | Blob | ReadableStream<Uint8Array>,
  options?: ConvertOptions
): Promise<Uint8Array>`}
        </pre>
      </div>

      <h3>Reusing One Instance</h3>

      <PlaygroundExample
        template="node"
        dependencyVersion="latest"
        activeFile="/index.js"
        preview={true}
        enableFilePicker={true}
        files={{
          '/index.js': `import { ConvertBuddy } from "convert-buddy-js";

async function run() {
  // Create once
  const buddy = new ConvertBuddy({
    inputFormat: 'csv',
    outputFormat: 'json'
  });
  
  const decoder = new TextDecoder();
  
  // Convert multiple datasets
  const data1 = "name,age\\nAda,36\\nAlan,42";
  const result1 = await buddy.convert(data1, { outputFormat: 'json' });
  console.log('Result 1:', decoder.decode(result1));
  
  const data2 = "name,age\\nGrace,85\\nMargaret,82";
  const result2 = await buddy.convert(data2, { outputFormat: 'json' });
  console.log('Result 2:', decoder.decode(result2));
  
  const data3 = "name,age\\nKatherine,101\\nDorothy,98";
  const result3 = await buddy.convert(data3, { outputFormat: 'json' });
  console.log('Result 3:', decoder.decode(result3));
  
  console.log('\\nAll conversions used the same instance!');
}

run().catch(console.error);`,
        }}
      />

      <h3>Overriding Global Config</h3>

      <PlaygroundExample
        template="node"
        dependencyVersion="latest"
        activeFile="/index.js"
        preview={true}
        enableFilePicker={true}
        files={{
          '/index.js': `import { ConvertBuddy } from "convert-buddy-js";

async function run() {
  // Global config: CSV to JSON
  const buddy = new ConvertBuddy({
    inputFormat: 'csv',
    outputFormat: 'json'
  });
  
  const decoder = new TextDecoder();
  const csvData = "name,age\\nAda,36";
  
  // Use global config
  const json = await buddy.convert(csvData, { outputFormat: 'json' });
  console.log('JSON:', decoder.decode(json));
  
  // Override output format for this call
  const xml = await buddy.convert(csvData, { 
    outputFormat: 'xml',
    xmlConfig: { recordElement: 'person' }
  });
  console.log('XML:', decoder.decode(xml));
  
  // Override input format too
  const jsonInput = '[{"name":"Grace","age":85}]';
  const csv = await buddy.convert(jsonInput, {
    inputFormat: 'json',
    outputFormat: 'csv'
  });
  console.log('CSV:', decoder.decode(csv));
}

run().catch(console.error);`,
        }}
      />

      <h2>Accessing Statistics</h2>

      <p>
        The <code>stats()</code> method returns detailed performance and processing metrics.
      </p>

      <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '4px', marginBottom: '1rem' }}>
        <pre style={{ margin: 0 }}>
{`stats(): Stats

interface Stats {
  bytesIn: number;              // Input bytes processed
  bytesOut: number;             // Output bytes generated
  chunksIn: number;             // Number of chunks processed
  recordsProcessed: number;     // Total records converted
  parseTimeMs: number;          // Time spent parsing
  transformTimeMs: number;      // Time spent transforming
  writeTimeMs: number;          // Time spent writing
  maxBufferSize: number;        // Peak buffer size
  currentPartialSize: number;   // Current partial record size
  throughputMbPerSec: number;   // Processing throughput
}`}
        </pre>
      </div>

      <h3>Statistics Example</h3>

      <PlaygroundExample
        template="node"
        dependencyVersion="latest"
        activeFile="/index.js"
        preview={true}
        enableFilePicker={true}
        files={{
          '/index.js': `import { ConvertBuddy } from "convert-buddy-js";

const fileUrl = "";

async function run() {
  const buddy = new ConvertBuddy({
    inputFormat: 'csv',
    outputFormat: 'json'
  });
  
  const response = await fetch(fileUrl);
  const data = await response.text();
  
  await buddy.convert(data, { outputFormat: 'json' });
  
  // Get detailed statistics
  const stats = buddy.stats();
  
  console.log('=== Conversion Statistics ===');
  console.log(\`Records processed: \${stats.recordsProcessed}\`);
  console.log(\`Input size: \${(stats.bytesIn / 1024).toFixed(2)} KB\`);
  console.log(\`Output size: \${(stats.bytesOut / 1024).toFixed(2)} KB\`);
  console.log(\`Chunks processed: \${stats.chunksIn}\`);
  console.log(\`\\nPerformance:\`);
  console.log(\`  Parse time: \${stats.parseTimeMs.toFixed(2)}ms\`);
  console.log(\`  Transform time: \${stats.transformTimeMs.toFixed(2)}ms\`);
  console.log(\`  Write time: \${stats.writeTimeMs.toFixed(2)}ms\`);
  console.log(\`  Total time: \${(stats.parseTimeMs + stats.transformTimeMs + stats.writeTimeMs).toFixed(2)}ms\`);
  console.log(\`  Throughput: \${stats.throughputMbPerSec.toFixed(2)} MB/s\`);
  console.log(\`\\nMemory:\`);
  console.log(\`  Max buffer: \${(stats.maxBufferSize / 1024).toFixed(2)} KB\`);
}

run().catch(console.error);`,
        }}
      />

      <h2>Batch Processing Pattern</h2>

      <p>
        Use instance reuse for efficient batch processing of multiple files.
      </p>

      <PlaygroundExample
        template="node"
        dependencyVersion="latest"
        activeFile="/index.js"
        preview={true}
        enableFilePicker={true}
        files={{
          '/index.js': `import { ConvertBuddy } from "convert-buddy-js";

async function batchConvert(files, outputFormat) {
  // Create instance once
  const buddy = new ConvertBuddy({
    outputFormat,
    profile: true
  });
  
  const results = [];
  
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    console.log(\`Processing file \${i + 1}/\${files.length}...\`);
    
    try {
      const result = await buddy.convert(file, { outputFormat });
      results.push({
        success: true,
        data: result
      });
      console.log(\`  ✓ Success\`);
    } catch (error) {
      results.push({
        success: false,
        error: error.message
      });
      console.log(\`  ✗ Failed: \${error.message}\`);
    }
  }
  
  // Final statistics
  const stats = buddy.stats();
  console.log(\`\\n=== Batch Complete ===\`);
  console.log(\`Total records: \${stats.recordsProcessed}\`);
  console.log(\`Success: \${results.filter(r => r.success).length}/\${files.length}\`);
  console.log(\`Avg throughput: \${stats.throughputMbPerSec.toFixed(2)} MB/s\`);
  
  return results;
}

// Example usage
const sampleFiles = [
  "name,age\\nAda,36",
  "name,age\\nGrace,85",
  "name,age\\nKatherine,101"
];

batchConvert(sampleFiles, 'json').catch(console.error);`,
        }}
      />

      <h2>Parallel Processing (Node.js)</h2>

      <p>
        In Node.js, enable parallel processing with worker threads for better performance
        on multi-core systems.
      </p>

      <PlaygroundExample
        template="node"
        dependencyVersion="latest"
        activeFile="/index.js"
        preview={true}
        files={{
          '/index.js': `import { ConvertBuddy } from "convert-buddy-js";

const fileUrl = "";

async function run() {
  // Enable parallel processing with 4 threads
  const buddy = new ConvertBuddy({
    parallelism: 4,  // Use 4 worker threads
    outputFormat: 'json',
    profile: true
  });
  
  const response = await fetch(fileUrl);
  const data = await response.text();
  
  console.log('Converting with parallel processing...');
  
  const result = await buddy.convert(data, { 
    outputFormat: 'json' 
  });
  
  const stats = buddy.stats();
  console.log(\`Processed \${stats.recordsProcessed} records\`);
  console.log(\`Throughput: \${stats.throughputMbPerSec.toFixed(2)} MB/s\`);
}

run().catch(console.error);`,
        }}
      />

      <h2>Progress Tracking</h2>

      <p>
        Track conversion progress with the <code>onProgress</code> callback.
      </p>

      <PlaygroundExample
        template="node"
        dependencyVersion="latest"
        activeFile="/index.js"
        preview={true}
        enableFilePicker={true}
        files={{
          '/index.js': `import { ConvertBuddy } from "convert-buddy-js";

const fileUrl = "";

async function run() {
  let lastUpdate = Date.now();
  
  const buddy = new ConvertBuddy({
    outputFormat: 'json',
    onProgress: (stats) => {
      const now = Date.now();
      const elapsed = now - lastUpdate;
      
      console.log(\`Progress Update (\${elapsed}ms):\`);
      console.log(\`  Records: \${stats.recordsProcessed}\`);
      console.log(\`  Bytes In: \${(stats.bytesIn / 1024).toFixed(2)} KB\`);
      console.log(\`  Throughput: \${stats.throughputMbPerSec.toFixed(2)} MB/s\`);
      
      lastUpdate = now;
    },
    progressIntervalBytes: 1024 * 256 // Every 256KB
  });
  
  const response = await fetch(fileUrl);
  const data = await response.text();
  
  await buddy.convert(data, { outputFormat: 'json' });
  
  console.log('\\nConversion complete!');
}

run().catch(console.error);`,
        }}
      />

      <h2>Comparison: Simple vs Instance API</h2>

      <h3>Simple API (creates new instance each call)</h3>

      <PlaygroundExample
        template="node"
        dependencyVersion="latest"
        activeFile="/index.js"
        preview={true}
        files={{
          '/index.js': `import { convertToString } from "convert-buddy-js";

async function processMultiple() {
  const files = [
    "name,age\\nAda,36",
    "name,age\\nGrace,85",
    "name,age\\nKatherine,101"
  ];
  
  console.time('Simple API');
  
  for (const data of files) {
    // Each call creates a new instance
    const json = await convertToString(data, {
      inputFormat: 'csv',
      outputFormat: 'json'
    });
    console.log('Converted:', json);
  }
  
  console.timeEnd('Simple API');
}

processMultiple().catch(console.error);`,
        }}
      />

      <h3>Instance API (reuses one instance)</h3>

      <PlaygroundExample
        template="node"
        dependencyVersion="latest"
        activeFile="/index.js"
        preview={true}
        files={{
          '/index.js': `import { ConvertBuddy } from "convert-buddy-js";

async function processMultiple() {
  const files = [
    "name,age\\nAda,36",
    "name,age\\nGrace,85",
    "name,age\\nKatherine,101"
  ];
  
  console.time('Instance API');
  
  // Create instance once
  const buddy = new ConvertBuddy({
    inputFormat: 'csv',
    outputFormat: 'json'
  });
  
  const decoder = new TextDecoder();
  
  for (const data of files) {
    // Reuses the same instance
    const result = await buddy.convert(data, { outputFormat: 'json' });
    console.log('Converted:', decoder.decode(result));
  }
  
  console.timeEnd('Instance API');
  
  const stats = buddy.stats();
  console.log(\`Total records: \${stats.recordsProcessed}\`);
}

processMultiple().catch(console.error);`,
        }}
      />

      <h2>Benefits of Instance API</h2>

      <ul>
        <li><strong>Performance:</strong> Avoid repeated WASM initialization for multiple conversions</li>
        <li><strong>Statistics:</strong> Access detailed metrics via <code>stats()</code></li>
        <li><strong>Configuration reuse:</strong> Set once, use many times</li>
        <li><strong>Memory efficiency:</strong> Internal buffers are reused</li>
        <li><strong>Progress tracking:</strong> Built-in progress callbacks</li>
        <li><strong>Profiling:</strong> Enable detailed performance profiling</li>
        <li><strong>Parallelism:</strong> Multi-threaded processing in Node.js</li>
      </ul>

      <h2>Next Steps</h2>

      <ul>
        <li>For manual chunk control: See <a href="/docs/api/streaming">Streaming API</a></li>
        <li>For simple one-off conversions: See <a href="/docs/api/simple">Simple API</a></li>
        <li>For browser integration: See <a href="/docs/api/browser-helpers">Browser Helpers</a></li>
      </ul>
    </div>
  );
}
