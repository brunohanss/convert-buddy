import React from 'react';
import PlaygroundExample from '@/components/mdx/Playground';

export default function BasicConversionPage() {
  return (
    <div>
      <h1>Basic Conversion</h1>

      <p>
        This page covers the most common conversion patterns that handle 80% of real-world use cases.
      </p>

      <h2>Auto-detected conversion</h2>

      <p>
        The simplest way to convert data is using <code>convertToString()</code> with auto-detection.
        Convert Buddy automatically detects the input format and converts to your desired output:
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
  
  // Auto-detect input format and convert to JSON
  const json = await convertToString(csvData, { 
    outputFormat: 'json' 
  });
  
  // Parse and display nicely
  const parsed = JSON.parse(json);
  console.log(\`✓ Auto-detected and converted \${parsed.length} records\`);
  console.log('\nSample record:');
  console.log(JSON.stringify(parsed[0], null, 2));
}

run().catch(console.error);`,
        }}
      />

      <h2>Explicit format hints</h2>

      <p>
        For better performance or when you know the input format, specify it explicitly
        using <code>inputFormat</code>. This skips auto-detection:
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
  
  // Explicitly specify input format (skips detection)
  const json = await convertToString(csvData, { 
    inputFormat: 'csv',
    outputFormat: 'json' 
  });
  
  const parsed = JSON.parse(json);
  console.log(\`CSV → JSON: \${parsed.length} records\`);
  console.log(JSON.stringify(parsed[0], null, 2));
  
  // Convert JSON back to CSV
  const csvOutput = await convertToString(json, {
    inputFormat: 'json',
    outputFormat: 'csv'
  });
  
  console.log('\nJSON → CSV (first 200 chars):');
  console.log(csvOutput.substring(0, 200) + '...');
}

run().catch(console.error);`,
        }}
      />

      <h2>Output as string vs bytes</h2>

      <p>
        Use <code>convertToString()</code> for text output (JSON, CSV, XML) and <code>convert()</code>
        for binary output (returns <code>Uint8Array</code>):
      </p>

      <PlaygroundExample
        template="node"
        dependencyVersion="latest"
        activeFile="/index.js"
        preview={true}
        enableFilePicker={true}
        files={{
          '/index.js': `import { convertToString, convert } from "convert-buddy-js";

const fileUrl = "";

async function run() {
  const response = await fetch(fileUrl);
  const csvData = await response.text();
  
  // String output - convenient for display
  const jsonString = await convertToString(csvData, { 
    inputFormat: 'csv',
    outputFormat: 'json' 
  });
  
  console.log('String output:');
  console.log(jsonString);
  console.log(\`Type: \${typeof jsonString}\`);
  console.log(\`Length: \${jsonString.length} characters\`);
  
  // Bytes output - efficient for further processing
  const jsonBytes = await convert(csvData, { 
    inputFormat: 'csv',
    outputFormat: 'json' 
  });
  
  console.log('\\nBytes output:');
  console.log(\`Type: \${jsonBytes.constructor.name}\`);
  console.log(\`Length: \${jsonBytes.length} bytes\`);
  
  // Convert bytes to string when needed
  const decoded = new TextDecoder().decode(jsonBytes);
  console.log('\\nDecoded from bytes:');
  console.log(decoded.substring(0, 100) + '...');
}

run().catch(console.error);`,
        }}
      />

      <h2>Common conversion patterns</h2>

      <p>
        Here are the most frequently used conversion patterns:
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
  
  // CSV to JSON (most common)
  const json = await convertToString(csvData, {
    inputFormat: 'csv',
    outputFormat: 'json'
  });
  console.log('CSV → JSON:');
  console.log(json.substring(0, 200) + '...');
  
  // CSV to NDJSON (for streaming/line-by-line processing)
  const ndjson = await convertToString(csvData, {
    inputFormat: 'csv',
    outputFormat: 'ndjson'
  });
  console.log('\\nCSV → NDJSON:');
  console.log(ndjson.substring(0, 200) + '...');
  
  // JSON to CSV (for Excel/spreadsheet export)
  const csv = await convertToString(json, {
    inputFormat: 'json',
    outputFormat: 'csv'
  });
  console.log('\\nJSON → CSV:');
  console.log(csv.substring(0, 200) + '...');
  
  // CSV to XML
  const xml = await convertToString(csvData, {
    inputFormat: 'csv',
    outputFormat: 'xml'
  });
  console.log('\\nCSV → XML:');
  console.log(xml.substring(0, 200) + '...');
}

run().catch(console.error);`,
        }}
      />

      <h2>Format-specific options</h2>

      <p>
        Each format supports specific options. For example, CSV supports custom delimiters and headers:
      </p>

      <PlaygroundExample
        template="node"
        dependencyVersion="latest"
        activeFile="/index.js"
        preview={true}
        enableFilePicker={true}
        files={{
          '/index.js': `import { convertToString } from "convert-buddy-js";

async function run() {
  const jsonData = JSON.stringify([
    { name: 'Alice', age: 30, city: 'New York' },
    { name: 'Bob', age: 25, city: 'San Francisco' }
  ]);
  
  // Default CSV output
  const csvDefault = await convertToString(jsonData, {
    inputFormat: 'json',
    outputFormat: 'csv'
  });
  console.log('Default CSV (comma-separated):');
  console.log(csvDefault);
  
  // Custom delimiter (tab-separated)
  const tsvOutput = await convertToString(jsonData, {
    inputFormat: 'json',
    outputFormat: 'csv',
    csvDelimiter: '\\t'
  });
  console.log('\\nTSV (tab-separated):');
  console.log(tsvOutput);
  
  // No header row
  const csvNoHeader = await convertToString(jsonData, {
    inputFormat: 'json',
    outputFormat: 'csv',
    csvHasHeader: false
  });
  console.log('\\nCSV without headers:');
  console.log(csvNoHeader);
}

run().catch(console.error);`,
        }}
      />

      <h2>Best practices</h2>

      <ul>
        <li><strong>Specify input format when known</strong> - Skips detection overhead</li>
        <li><strong>Use convertToString() for text formats</strong> - More convenient than convert()</li>
        <li><strong>Use convert() for binary data</strong> - More efficient for file I/O</li>
        <li><strong>Keep conversions simple</strong> - Let auto-detection handle edge cases</li>
        <li><strong>For large files</strong> - See the streaming documentation instead</li>
      </ul>
    </div>
  );
}
