import React from 'react';
import SandpackExample from '@/components/mdx/Sandpack';

export default function NDJSONFormatPage() {
  return (
    <div>
      <h1>NDJSON Format</h1>

      <p>
        NDJSON (Newline Delimited JSON) is a format where each line is a valid JSON object.
        It's ideal for streaming data, logs, and large datasets because it can be processed
        line-by-line without loading the entire file into memory.
      </p>

      <h2>Format Explanation</h2>

      <p>
        Unlike standard JSON arrays, NDJSON stores one record per line:
      </p>

      <pre><code>{`{"name":"Alice","age":30,"city":"New York"}
{"name":"Bob","age":25,"city":"Los Angeles"}
{"name":"Charlie","age":35,"city":"Chicago"}`}</code></pre>

      <p>
        Each line is independent, making it perfect for streaming, appending new data,
        and parallel processing.
      </p>

      <h2>Basic Example</h2>

      <SandpackExample
        template="node"
        activeFile="/index.js"
        preview={false}
        enableFilePicker={true}
        files={{
          '/index.js': `import { convertToString } from "convert-buddy-js";

const ndjsonData = \`{"name":"Alice","age":30,"city":"New York"}
{"name":"Bob","age":25,"city":"Los Angeles"}
{"name":"Charlie","age":35,"city":"Chicago"}\`;

async function run() {
  console.log("Input NDJSON:");
  console.log(ndjsonData);
  
  const csv = await convertToString(ndjsonData, {
    inputFormat: "ndjson",
    outputFormat: "csv"
  });
  
  console.log("\nConverted to CSV:");
  console.log(csv);
}

run().catch(console.error);`,
        }}
      />

      <h2>Streaming Advantages</h2>

      <p>
        NDJSON excels at streaming scenarios:
      </p>

      <ul>
        <li><strong>Line-by-line processing:</strong> Each record is independent and can be processed immediately</li>
        <li><strong>Append-friendly:</strong> New records can be appended without modifying existing data</li>
        <li><strong>Resume capability:</strong> Processing can resume from any line after interruption</li>
        <li><strong>Parallel processing:</strong> File can be split at line boundaries for parallel workers</li>
        <li><strong>Constant memory:</strong> No need to load entire structure into memory</li>
      </ul>

      <SandpackExample
        template="node"
        activeFile="/index.js"
        preview={false}
        files={{
          '/index.js': `import { convertToString } from "convert-buddy-js";

// Simulate large NDJSON log file
const ndjsonData = Array.from({ length: 100 }, (_, i) => 
  JSON.stringify({ 
    timestamp: new Date(2024, 0, 1, 0, i).toISOString(),
    level: i % 3 === 0 ? "error" : "info",
    message: \`Log entry \${i}\`
  })
).join("\n");

async function run() {
  console.log(\`Processing \${ndjsonData.split("\n").length} NDJSON records\`);
  
  const csv = await convertToString(ndjsonData, {
    inputFormat: "ndjson",
    outputFormat: "csv",
    onProgress: (stats) => {
      if (stats.recordsProcessed % 25 === 0) {
        console.log(\`Processed \${stats.recordsProcessed} records\`);
      }
    }
  });
  
  console.log(\`\nConverted \${csv.split("\n").length - 1} rows\`);
}

run().catch(console.error);`,
        }}
      />

      <h2>Detection vs JSON Arrays</h2>

      <p>
        Convert Buddy distinguishes NDJSON from JSON arrays:
      </p>

      <ul>
        <li><strong>NDJSON:</strong> Detected when file starts with <code>{'{'}</code> (an object) followed by newlines</li>
        <li><strong>JSON:</strong> Detected when file starts with <code>[</code> (an array)</li>
      </ul>

      <SandpackExample
        template="node"
        activeFile="/index.js"
        preview={false}
        files={{
          '/index.js': `import { detectFormat } from "convert-buddy-js";

const ndjsonData = \`{"name":"Alice"}
{"name":"Bob"}\`;

const jsonData = '[{"name":"Alice"},{"name":"Bob"}]';

async function run() {
  const format1 = await detectFormat(ndjsonData);
  console.log("NDJSON format detected as:", format1);
  
  const format2 = await detectFormat(jsonData);
  console.log("JSON format detected as:", format2);
}

run().catch(console.error);`,
        }}
      />

      <h2>Transform Compatibility</h2>

      <p>
        NDJSON supports all transform operations:
      </p>

      <SandpackExample
        template="node"
        activeFile="/index.js"
        preview={false}
        files={{
          '/index.js': `import { convertToString } from "convert-buddy-js";

const ndjsonData = \`{"user_id":1,"name":"Alice","score":85}
{"user_id":2,"name":"Bob","score":92}
{"user_id":3,"name":"Charlie","score":78}\`;

async function run() {
  const transformed = await convertToString(ndjsonData, {
    inputFormat: "ndjson",
    outputFormat: "ndjson",
    transform: {
      fieldMap: {
        user_id: "id",
        name: true,
        score: true
      },
      filter: (record) => record.score >= 80,
      computedFields: {
        grade: (record) => record.score >= 90 ? "A" : "B"
      }
    }
  });
  
  console.log("Transformed NDJSON:");
  console.log(transformed);
}

run().catch(console.error);`,
        }}
      />

      <h2>Use Cases</h2>

      <h3>Log Files</h3>

      <p>
        NDJSON is perfect for structured log data:
      </p>

      <SandpackExample
        template="node"
        activeFile="/index.js"
        preview={false}
        files={{
          '/index.js': `import { convertToString } from "convert-buddy-js";

const logData = \`{"timestamp":"2024-01-01T10:00:00Z","level":"info","msg":"Server started"}
{"timestamp":"2024-01-01T10:01:00Z","level":"error","msg":"Connection failed"}
{"timestamp":"2024-01-01T10:02:00Z","level":"info","msg":"Retry successful"}\`;

async function run() {
  // Convert logs to CSV for analysis
  const csv = await convertToString(logData, {
    inputFormat: "ndjson",
    outputFormat: "csv",
    transform: {
      filter: (record) => record.level === "error"
    }
  });
  
  console.log("Error logs as CSV:");
  console.log(csv);
}

run().catch(console.error);`,
        }}
      />

      <h3>Large Datasets</h3>

      <p>
        NDJSON handles multi-gigabyte datasets efficiently:
      </p>

      <SandpackExample
        template="node"
        activeFile="/index.js"
        preview={false}
        files={{
          '/index.js': `import { convertToString } from "convert-buddy-js";

// Simulating large dataset
const largeNdjson = Array.from({ length: 500 }, (_, i) => 
  JSON.stringify({ 
    id: i, 
    value: Math.random() * 100,
    category: ['A', 'B', 'C'][i % 3]
  })
).join("\n");

async function run() {
  const result = await convertToString(largeNdjson, {
    inputFormat: "ndjson",
    outputFormat: "csv",
    maxMemoryMB: 128,
    onProgress: (stats) => {
      console.log(\`Progress: \${stats.recordsProcessed} records, \${stats.bytesIn} bytes in\`);
    }
  });
  
  console.log(\`\nConverted \${result.split("\n").length - 1} rows\`);
}

run().catch(console.error);`,
        }}
      />

      <h2>Performance</h2>

      <ul>
        <li><strong>Parsing:</strong> 80-200 MB/s, faster than JSON arrays</li>
        <li><strong>Emission:</strong> 100-250 MB/s, faster than JSON due to simpler structure</li>
        <li><strong>Memory:</strong> Constant, line-by-line processing</li>
        <li><strong>Best choice:</strong> For logs, streaming data, and append-heavy workloads</li>
      </ul>

      <h2>See Also</h2>

      <ul>
        <li><a href="/docs/formats/json">JSON Format</a> - Standard JSON array format</li>
        <li><a href="/docs/recipes/large-files">Large Files</a> - Handling multi-GB NDJSON files</li>
        <li><a href="/docs/performance/benchmarks">Performance Benchmarks</a> - NDJSON speed comparisons</li>
      </ul>
    </div>
  );
}
