import React from 'react';
import SandpackExample from '@/components/mdx/Sandpack';

export default function CSVFormatPage() {
  return (
    <div>
      <h1>CSV Format</h1>

      <p>
        CSV (Comma-Separated Values) is a widely used text format for tabular data. Convert Buddy
        provides a high-performance streaming CSV parser with auto-detection of delimiters,
        headers, and data types.
      </p>

      <h2>Supported Features</h2>

      <p>Convert Buddy's CSV parser supports:</p>

      <ul>
        <li><strong>Multiple delimiters:</strong> Comma, tab, pipe, semicolon, and custom characters</li>
        <li><strong>Quoted fields:</strong> Double quotes with escape sequences</li>
        <li><strong>Header detection:</strong> Automatic identification of header rows</li>
        <li><strong>Whitespace trimming:</strong> Configurable trimming of leading/trailing spaces</li>
        <li><strong>Schema inference:</strong> Automatic detection of field names and types</li>
        <li><strong>Streaming processing:</strong> Constant memory usage regardless of file size</li>
      </ul>

      <h2>Basic Example</h2>

      <SandpackExample
        template="node"
        activeFile="/index.js"
        preview={false}
        enableFilePicker={true}
        files={{
          '/index.js': `import { convertToString } from "convert-buddy-js";

const csvData = \`name,age,city
Alice,30,New York
Bob,25,Los Angeles
Charlie,35,Chicago\`;

async function run() {
  const json = await convertToString(csvData, {
    inputFormat: "csv",
    outputFormat: "json"
  });
  
  const parsed = JSON.parse(json);
  console.log(\`✓ Converted \${parsed.length} records to JSON\`);
  console.log('\\nSample record:');
  console.log(JSON.stringify(parsed[0], null, 2));
}

run().catch(console.error);`,
        }}
      />

      <h2>CsvConfig Options</h2>

      <p>
        You can customize CSV parsing behavior using the <code>csvConfig</code> option:
      </p>

      <table>
        <thead>
          <tr>
            <th>Option</th>
            <th>Type</th>
            <th>Default</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>delimiter</code></td>
            <td>string</td>
            <td>Auto-detected</td>
            <td>Field delimiter character (comma, tab, pipe, etc.)</td>
          </tr>
          <tr>
            <td><code>quote</code></td>
            <td>string</td>
            <td><code>"</code></td>
            <td>Quote character for escaping delimiters in fields</td>
          </tr>
          <tr>
            <td><code>hasHeaders</code></td>
            <td>boolean</td>
            <td>Auto-detected</td>
            <td>Whether the first row contains column names</td>
          </tr>
          <tr>
            <td><code>trimWhitespace</code></td>
            <td>boolean</td>
            <td>true</td>
            <td>Remove leading/trailing whitespace from fields</td>
          </tr>
        </tbody>
      </table>

      <h2>Custom Delimiter Example</h2>

      <SandpackExample
        template="node"
        activeFile="/index.js"
        preview={false}
        files={{
          '/index.js': `import { convertToString } from "convert-buddy-js";

// Pipe-delimited CSV
const psvData = \`Product|Price|Stock
Widget|19.99|150
Gadget|29.99|75
Doohickey|9.99|200\`;

async function run() {
  const json = await convertToString(psvData, {
    inputFormat: "csv",
    outputFormat: "json",
    csvConfig: {
      delimiter: "|",
      hasHeaders: true,
      trimWhitespace: true
    }
  });
  
  const parsed = JSON.parse(json);
  console.log(\`✓ Pipe-delimited: \${parsed.length} records\`);
  console.log(JSON.stringify(parsed[0], null, 2));
}

run().catch(console.error);`,
        }}
      />

      <h2>Detection Quirks</h2>

      <p>
        Convert Buddy uses intelligent heuristics to detect CSV format:
      </p>

      <ul>
        <li>
          <strong>Delimiter detection:</strong> Analyzes the first few lines to identify the most
          likely delimiter. Tries comma, tab, pipe, and semicolon in order of probability.
        </li>
        <li>
          <strong>Header detection:</strong> Compares the first row to subsequent rows. If the
          first row contains mostly text while later rows contain numbers, it's likely a header.
        </li>
        <li>
          <strong>Quote handling:</strong> Automatically handles quoted fields containing delimiters
          or newlines.
        </li>
      </ul>

      <h2>Transform Compatibility</h2>

      <p>
        CSV works seamlessly with the transform pipeline. You can rename, filter, and coerce
        fields during conversion:
      </p>

      <SandpackExample
        template="node"
        activeFile="/index.js"
        preview={false}
        files={{
          '/index.js': `import { convertToString } from "convert-buddy-js";

const csvData = \`firstName,lastName,age,salary
John,Doe,30,50000
Jane,Smith,25,60000
Bob,Johnson,35,55000\`;

async function run() {
  const json = await convertToString(csvData, {
    inputFormat: "csv",
    outputFormat: "json",
    transform: {
      fieldMap: {
        firstName: "first_name",
        lastName: "last_name",
        age: true,  // Keep as-is
        salary: "annual_salary"
      },
      coerce: {
        age: "number",
        annual_salary: "number"
      },
      computedFields: {
        full_name: (record) => \`\${record.first_name} \${record.last_name}\`
      }
    }
  });
  
  const parsed = JSON.parse(json);
  console.log(✓ Transformed \${parsed.length} records`);
  console.log('\nSample:', JSON.stringify(parsed[0], null, 2));
}

run().catch(console.error);`,
        }}
      />

      <h2>Performance Notes</h2>

      <ul>
        <li>
          <strong>Streaming parser:</strong> CSV is parsed in chunks, maintaining constant memory
          usage even for multi-gigabyte files.
        </li>
        <li>
          <strong>Fast path:</strong> Simple CSV files (no quotes, no special characters) use an
          optimized fast path for maximum throughput.
        </li>
        <li>
          <strong>Parallel processing:</strong> With <code>parallelism &gt; 1</code>, CSV chunks
          can be processed in parallel for even faster conversion.
        </li>
        <li>
          <strong>Typical throughput:</strong> 50-150 MB/s for standard CSV, 200+ MB/s for simple
          files.
        </li>
      </ul>

      <h2>Common Patterns and Edge Cases</h2>

      <h3>Handling Missing Headers</h3>

      <p>
        If your CSV doesn't have headers, Convert Buddy generates column names:
      </p>

      <SandpackExample
        template="node"
        activeFile="/index.js"
        preview={false}
        files={{
          '/index.js': `import { convertToString } from "convert-buddy-js";

const csvWithoutHeaders = \`Alice,30,New York
Bob,25,Los Angeles
Charlie,35,Chicago\`;

async function run() {
  const json = await convertToString(csvWithoutHeaders, {
    inputFormat: "csv",
    outputFormat: "json",
    csvConfig: {
      hasHeaders: false
    }
  });
  
  const parsed = JSON.parse(json);
  console.log(✓ Auto-generated column names`);
  console.log(JSON.stringify(parsed[0], null, 2));
}

run().catch(console.error);`,
        }}
      />

      <h3>Quoted Fields with Delimiters</h3>

      <p>
        Fields containing delimiters must be quoted:
      </p>

      <SandpackExample
        template="node"
        activeFile="/index.js"
        preview={false}
        files={{
          '/index.js': `import { convertToString } from "convert-buddy-js";

const csvWithQuotes = \`name,description,price
Widget,"A small, useful device",19.99
Gadget,"Large gadget (with features)",29.99
"Premium Item","Top-tier product, best seller",49.99\`;

async function run() {
  const json = await convertToString(csvWithQuotes, {
    inputFormat: "csv",
    outputFormat: "json"
  });
  
  const parsed = JSON.parse(json);
  console.log(✓ Parsed \${parsed.length} records with quoted fields`);
  console.log(JSON.stringify(parsed[0], null, 2));
}

run().catch(console.error);`,
        }}
      />

      <h3>Tab-Delimited Files (TSV)</h3>

      <p>
        Tab-separated values are detected automatically:
      </p>

      <SandpackExample
        template="node"
        activeFile="/index.js"
        preview={false}
        files={{
          '/index.js': `import { convertToString } from "convert-buddy-js";

const tsvData = \`name\\tage\\tcity
Alice\\t30\\tNew York
Bob\\t25\\tLos Angeles
Charlie\\t35\\tChicago\`;

async function run() {
  const json = await convertToString(tsvData, {
    inputFormat: "csv",  // CSV format handles TSV too
    outputFormat: "json"
  });
  
  const parsed = JSON.parse(json);
  console.log(✓ Tab-delimited: \${parsed.length} records`);
  console.log(JSON.stringify(parsed[0], null, 2));
}

run().catch(console.error);`,
        }}
      />

      <h2>See Also</h2>

      <ul>
        <li><a href="/docs/detection/detecting-structure">Structure Detection</a> - Learn how CSV delimiters are auto-detected</li>
        <li><a href="/docs/reference/configuration">Configuration Reference</a> - Complete CsvConfig options</li>
        <li><a href="/docs/reference/transform">Transform Reference</a> - Advanced field transformations</li>
        <li><a href="/docs/performance/benchmarks">Performance Benchmarks</a> - CSV parsing speed comparisons</li>
      </ul>
    </div>
  );
}
