import React from 'react';
import SandpackExample from '@/components/mdx/Sandpack';

export default function DetectingFormatPage() {
  return (
    <div>
      <h1>Detecting Format</h1>

      <p>
        Convert Buddy can automatically detect the format of your data, eliminating the need to
        specify <code>inputFormat</code> explicitly. This is perfect for building format-agnostic
        tools and file importers.
      </p>

      <h2>detectFormat() API</h2>

      <p>
        The <code>detectFormat()</code> function analyzes a data sample and returns the most likely
        format:
      </p>

      <pre><code>{`import { detectFormat } from "convert-buddy-js";

const format = await detectFormat(data);
// Returns: "csv" | "json" | "ndjson" | "xml" | "unknown"`}</code></pre>

      <SandpackExample
        template="node"
        activeFile="/index.js"
        preview={false}
        files={{
          '/index.js': `import { detectFormat } from "convert-buddy-js";

const csvData = \`name,age,city
Alice,30,New York
Bob,25,Los Angeles\`;

const jsonData = '[{"name":"Alice","age":30}]';

const ndjsonData = \`{"name":"Alice","age":30}
{"name":"Bob","age":25}\`;

const xmlData = \`<people>
  <person><name>Alice</name></person>
</people>\`;

async function run() {
  console.log("CSV detected as:", await detectFormat(csvData));
  console.log("JSON detected as:", await detectFormat(jsonData));
  console.log("NDJSON detected as:", await detectFormat(ndjsonData));
  console.log("XML detected as:", await detectFormat(xmlData));
}

run().catch(console.error);`,
        }}
      />

      <h2>How It Works</h2>

      <p>
        Format detection uses pattern analysis on a sample of the input:
      </p>

      <ul>
        <li>
          <strong>XML:</strong> Looks for opening <code>&lt;</code> tag at the start
        </li>
        <li>
          <strong>JSON:</strong> Looks for opening <code>[</code> and validates JSON structure
        </li>
        <li>
          <strong>NDJSON:</strong> Looks for <code>{'{'}</code> followed by newlines with more JSON objects
        </li>
        <li>
          <strong>CSV:</strong> Default fallback, validates that lines have consistent field counts
        </li>
      </ul>

      <h3>Sample Size</h3>

      <p>
        Detection analyzes the first 8KB of data by default. This is usually sufficient for
        accurate detection, but very unusual files might need manual specification.
      </p>

      <h2>Confidence Levels</h2>

      <p>
        While <code>detectFormat()</code> returns the most likely format, you can use{' '}
        <code>detectStructure()</code> for more detailed information including confidence indicators:
      </p>

      <SandpackExample
        template="node"
        activeFile="/index.js"
        preview={false}
        enableFilePicker={true}
        files={{
          '/index.js': `import { detectStructure } from "convert-buddy-js";

const fileUrl = "";

async function run() {
  const response = await fetch(fileUrl);
  const ambiguousData = await response.text();
  
  const structure = await detectStructure(ambiguousData);
  
  console.log("Detected format:", structure.format);
  console.log("\\nFull structure:");
  console.log(JSON.stringify(structure, null, 2));
}

run().catch(console.error);`,
        }}
      />

      <h2>Automatic Detection in convertToString</h2>

      <p>
        You don't need to call <code>detectFormat()</code> explicitly. When{' '}
        <code>inputFormat</code> is omitted, <code>convertToString()</code> automatically detects it:
      </p>

      <SandpackExample
        template="node"
        activeFile="/index.js"
        preview={false}
        enableFilePicker={true}
        files={{
          '/index.js': `import { convertToString } from "convert-buddy-js";

const fileUrl = "";

async function run() {
  const response = await fetch(fileUrl);
  const unknownData = await response.text();
  
  // No inputFormat specified - auto-detected
  const json = await convertToString(unknownData, {
    outputFormat: "json"
  });
  
  console.log("Auto-detected and converted:");
  console.log(json);
}

run().catch(console.error);`,
        }}
      />

      <h2>Multi-Format File Processor</h2>

      <p>
        Build tools that handle any format:
      </p>

      <SandpackExample
        template="node"
        activeFile="/index.js"
        preview={false}
        files={{
          '/index.js': `import { detectFormat, convertToString } from "convert-buddy-js";

async function processFile(data) {
  const format = await detectFormat(data);
  console.log(\`Detected format: \${format}\`);
  
  if (format === "unknown") {
    throw new Error("Could not detect file format");
  }
  
  // Convert to JSON regardless of input format
  const json = await convertToString(data, {
    inputFormat: format,
    outputFormat: "json"
  });
  
  return JSON.parse(json);
}

// Test with different formats
const csvData = "name,value\\nAlice,100\\nBob,200";
const jsonData = '[{"name":"Alice","value":100}]';

async function run() {
  const result1 = await processFile(csvData);
  console.log("CSV processed:", result1);
  
  const result2 = await processFile(jsonData);
  console.log("JSON processed:", result2);
}

run().catch(console.error);`,
        }}
      />

      <h2>When Detection Can Fail</h2>

      <p>
        Format detection is very accurate but can struggle with:
      </p>

      <ul>
        <li><strong>Very small samples:</strong> Less than 100 bytes might not have enough information</li>
        <li><strong>Ambiguous formats:</strong> Single-line CSV vs JSON object</li>
        <li><strong>Malformed data:</strong> Invalid syntax confuses the detector</li>
        <li><strong>Binary data:</strong> Only text formats are supported</li>
      </ul>

      <p>
        For more details, see <a href="/docs/detection/detection-limits">Detection Limits</a>.
      </p>

      <h2>Best Practices</h2>

      <ul>
        <li>Use auto-detection for user-uploaded files where format is unknown</li>
        <li>Explicitly specify <code>inputFormat</code> when you know it (slightly faster)</li>
        <li>Always handle the "unknown" case in production code</li>
        <li>Provide fallback or ask user to specify format if detection fails</li>
      </ul>

      <h2>See Also</h2>

      <ul>
        <li><a href="/docs/detection/detecting-structure">Detecting Structure</a> - Deeper analysis of format details</li>
        <li><a href="/docs/detection/detection-limits">Detection Limits</a> - Edge cases and failure modes</li>
        <li><a href="/docs/recipes/auto-detect-pipelines">Auto-Detect Pipelines</a> - Building format-agnostic tools</li>
      </ul>
    </div>
  );
}
