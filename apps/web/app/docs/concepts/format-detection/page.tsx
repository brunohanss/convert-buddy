import React from 'react';
import PlaygroundExample from '@/components/mdx/Playground';
import { CodeBlock } from '@/components/mdx/CodeBlock';

export default function FormatDetectionPage() {
  return (
    <div>
      <h1>Format Detection</h1>

      <p>
        Convert Buddy can automatically detect input formats and extract their structure,
        eliminating the need for users to specify formats manually.
      </p>

      <h2>Format detection</h2>

      <p>
        The <code>detectFormat</code> function analyzes a sample of input data and returns the detected format:
      </p>

      <PlaygroundExample
        template="node"
        dependencyVersion="latest"
        activeFile="/index.js"
        preview={true}
        enableFilePicker={true}
        files={{
          '/index.js': `import { detectFormat } from "convert-buddy-js";

const fileUrl = "";

async function run() {
  const response = await fetch(fileUrl);
  const data = await response.text();
  
  const format = await detectFormat(data);
  console.log('Detected format:', format);
  
  // Returns: 'csv' | 'json' | 'ndjson' | 'xml' | 'unknown'
}

run().catch(console.error);`,
        }}
      />

      <p>
        Detection examines:
      </p>

      <ul>
        <li><strong>CSV</strong>: Comma/tab patterns, consistent row lengths</li>
        <li><strong>JSON</strong>: Opening <code>[</code> or <code>{'{'}</code> with balanced brackets</li>
        <li><strong>NDJSON</strong>: Multiple <code>{'{'}</code> lines without outer array</li>
        <li><strong>XML</strong>: <code>&lt;tag&gt;</code> patterns with closing tags</li>
      </ul>

      <h2>Structure detection</h2>

      <p>
        The <code>detectStructure</code> function goes deeper, extracting field names and configuration:
      </p>

      <PlaygroundExample
        template="node"
        dependencyVersion="latest"
        activeFile="/index.js"
        preview={true}
        enableFilePicker={true}
        files={{
          '/index.js': `import { detectStructure } from "convert-buddy-js";

const fileUrl = "";

async function run() {
  const response = await fetch(fileUrl);
  const data = await response.text();
  
  const structure = await detectStructure(data);
  
  console.log('Format:', structure.format);
  console.log('Fields:', structure.fields);
  
  if (structure.delimiter) {
    console.log('CSV delimiter:', structure.delimiter);
  }
  
  if (structure.recordElement) {
    console.log('XML record element:', structure.recordElement);
  }
}

run().catch(console.error);`,
        }}
      />

      <p>
        Structure detection returns:
      </p>

      <ul>
        <li><code>format</code>: The detected format type</li>
        <li><code>fields</code>: Array of field/column names</li>
        <li><code>delimiter</code>: For CSV (e.g., <code>","</code> or <code>"\t"</code>)</li>
        <li><code>recordElement</code>: For XML (e.g., <code>"item"</code>)</li>
      </ul>

      <h2>Auto-detection in conversions</h2>

      <p>
        By default, conversion functions auto-detect format:
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
  const data = await response.text();
  
  // inputFormat defaults to "auto"
  const json = await convertToString(data, {
    outputFormat: 'json'
  });
  
  console.log('Converted:', json);
}

run().catch(console.error);`,
        }}
      />

      <h2>Performance tradeoffs</h2>

      <h3>Detection overhead</h3>
      <ul>
        <li><strong>Time</strong>: 5-20ms for format detection, 10-50ms for structure detection</li>
        <li><strong>Data read</strong>: ~256KB sample (configurable via <code>maxBytes</code>)</li>
        <li><strong>Memory</strong>: Minimal—sample is discarded after detection</li>
      </ul>

      <h3>When to skip detection</h3>
      <p>
        If you know the input format in advance, specify it explicitly to save ~10-20ms:
      </p>

      <CodeBlock
        code={`// Skip detection, save ~10-20ms
const json = await convertToString(csvData, {
  inputFormat: 'csv',
  outputFormat: 'json'
});`}
        language="javascript"
      />

      <h3>When detection fails</h3>
      <p>
        Detection may return <code>"unknown"</code> for:
      </p>

      <ul>
        <li>Very small samples (&lt;100 bytes)</li>
        <li>Ambiguous formats (e.g., single JSON object could be NDJSON)</li>
        <li>Malformed data</li>
      </ul>

      <p>
        In these cases, explicitly specify <code>inputFormat</code>.
      </p>

      <h2>Detection limits</h2>

      <p>
        See <a href="/docs/detection/detection-limits">Detection Limits</a> for edge cases and failure modes.
      </p>

      <h2>Key takeaways</h2>

      <ul>
        <li>Auto-detection is enabled by default (<code>inputFormat: "auto"</code>)</li>
        <li>Use <code>detectFormat()</code> for format only, <code>detectStructure()</code> for fields + config</li>
        <li>Detection adds ~10-50ms overhead—skip if format is known</li>
        <li>Detection reads ~256KB sample, not entire input</li>
      </ul>
    </div>
  );
}
