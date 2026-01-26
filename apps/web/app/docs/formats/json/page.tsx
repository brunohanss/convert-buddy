import React from 'react';
import PlaygroundExample from '@/components/mdx/Playground';

export default function JSONFormatPage() {
  return (
    <div>
      <h1>JSON Format</h1>

      <p>
        JSON (JavaScript Object Notation) is a lightweight data interchange format. Convert Buddy
        supports JSON arrays of objects as a source and target format, with streaming capabilities
        for efficient processing.
      </p>

      <h2>Supported Structure</h2>

      <p>
        Convert Buddy expects JSON input to be an <strong>array of objects</strong>, where each
        object represents a record:
      </p>

      <pre><code>{`[
  { "name": "Alice", "age": 30, "city": "New York" },
  { "name": "Bob", "age": 25, "city": "Los Angeles" },
  { "name": "Charlie", "age": 35, "city": "Chicago" }
]`}</code></pre>

      <p>
        This structure maps naturally to CSV rows, NDJSON lines, and XML records.
      </p>

      <h2>Basic Example</h2>

      <PlaygroundExample
        template="node"
        activeFile="/index.js"
        preview={true}
        enableFilePicker={true}
        files={{
          '/index.js': `import { convertToString } from "convert-buddy-js";

const jsonData = JSON.stringify([
  { name: "Alice", age: 30, city: "New York" },
  { name: "Bob", age: 25, city: "Los Angeles" },
  { name: "Charlie", age: 35, city: "Chicago" }
]);

async function run() {
  console.log("Input JSON:");
  console.log(jsonData);
  
  const csv = await convertToString(jsonData, {
    inputFormat: "json",
    outputFormat: "csv"
  });
  
  console.log("\nConverted to CSV:");
  console.log(csv);
}

run().catch(console.error);`,
        }}
      />

      <h2>Streaming Emission</h2>

      <p>
        When outputting JSON, Convert Buddy streams records as they're processed without buffering
        the entire output in memory. This enables converting multi-gigabyte files to JSON format.
      </p>

      <h2>Transform Compatibility</h2>

      <p>
        JSON works perfectly with transforms for reshaping, filtering, and computing fields:
      </p>

      <PlaygroundExample
        template="node"
        activeFile="/index.js"
        preview={true}
        files={{
          '/index.js': `import { convertToString } from "convert-buddy-js";

const jsonData = JSON.stringify([
  { firstName: "Alice", lastName: "Smith", age: 30, salary: 50000 },
  { firstName: "Bob", lastName: "Jones", age: 25, salary: 60000 }
]);

async function run() {
  const transformed = await convertToString(jsonData, {
    inputFormat: "json",
    outputFormat: "json",
    transform: {
      fieldMap: {
        firstName: "first_name",
        lastName: "last_name",
        age: true,
        salary: "annual_salary"
      },
      computedFields: {
        full_name: (record) => \`\${record.first_name} \${record.last_name}\`
      }
    }
  });
  
  console.log(transformed);
}

run().catch(console.error);`,
        }}
      />

      <h2>Performance</h2>

      <ul>
        <li><strong>Parsing:</strong> 100-300 MB/s with streaming, faster than JSON.parse() for large arrays</li>
        <li><strong>Emission:</strong> 30-80 MB/s (slower due to per-field escaping)</li>
        <li><strong>Memory:</strong> Constant usage regardless of file size</li>
      </ul>

      <p>
        For maximum output performance, consider NDJSON or CSV instead of JSON.
      </p>

      <h2>See Also</h2>

      <ul>
        <li><a href="/docs/formats/ndjson">NDJSON Format</a> - Line-delimited JSON alternative</li>
        <li><a href="/docs/detection/detecting-format">Format Detection</a> - How JSON is detected</li>
        <li><a href="/docs/performance/benchmarks">Performance Benchmarks</a> - Speed comparisons</li>
      </ul>
    </div>
  );
}
