import React from 'react';
import PlaygroundExample from '@/components/mdx/Playground';

export default function DetectingStructurePage() {
  return (
    <div>
      <h1>Detecting Structure</h1>

      <p>
        Beyond just identifying the format, <code>detectStructure()</code> provides deep analysis
        of your data's structure, including field names, types, delimiters, and format-specific
        configuration.
      </p>

      <h2>detectStructure() API</h2>

      <p>
        This function performs unified detection and returns comprehensive metadata:
      </p>

      <PlaygroundExample
        template="node"
        activeFile="/index.js"
        preview={true}
        files={{
          '/index.js': `import { detectStructure } from "convert-buddy-js";

const data = \`name,age\nAlice,30\nBob,25\`;

async function run() {
  const structure = await detectStructure(data);
  // Returns: { format, fields, delimiter?, recordElement? }
  console.log(JSON.stringify(structure, null, 2));
}

run().catch(console.error);`,
        }}
      />

      <PlaygroundExample
        template="node"
        activeFile="/index.js"
        preview={true}
        files={{
          '/index.js': `import { detectStructure } from "convert-buddy-js";

const csvData = \`name,age,city
Alice,30,New York
Bob,25,Los Angeles\`;

async function run() {
  const structure = await detectStructure(csvData);
  
  console.log("Format:", structure.format);
  console.log("\\nFields:");
  structure.fields.forEach(fieldName => {
    console.log(\`  - \${fieldName}\`);
  });
  
  console.log("\\nFull structure:");
  console.log(JSON.stringify(structure, null, 2));
}

run().catch(console.error);`,
        }}
      />

      <h2>Structure Object</h2>

      <p>
        The returned structure contains:
      </p>

      <table>
        <thead>
          <tr>
            <th>Field</th>
            <th>Type</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>format</code></td>
            <td>string</td>
            <td>Detected format: "csv", "json", "ndjson", "xml", or "unknown"</td>
          </tr>
          <tr>
            <td><code>fields</code></td>
            <td>string[]</td>
            <td>Array of detected field names</td>
          </tr>
          <tr>
            <td><code>delimiter</code></td>
            <td>string</td>
            <td>CSV delimiter character (comma, tab, pipe, semicolon)</td>
          </tr>
          <tr>
            <td><code>recordElement</code></td>
            <td>string</td>
            <td>XML record element name (for repeating elements)</td>
          </tr>
        </tbody>
      </table>

      <h2>Field Detection</h2>

      <p>
        <code>detectStructure()</code> identifies all field names from your data:
      </p>

      <PlaygroundExample
        template="node"
        activeFile="/index.js"
        preview={true}
        files={{
          '/index.js': `import { detectStructure } from "convert-buddy-js";

const data = \`name,age,salary,is_active,join_date
Alice,30,50000.50,true,2020-01-15
Bob,25,45000.00,false,2021-06-20\`;

async function run() {
  const structure = await detectStructure(data);
  
  console.log("Detected fields:");
  structure.fields.forEach((fieldName, index) => {
    console.log(\`  \${index + 1}. \${fieldName}\`);
  });
  
  console.log(\`\nTotal: \${structure.fields.length} fields\`);
  console.log(\`Delimiter: "\${structure.delimiter}"\`);
}

run().catch(console.error);`,
        }}
      />

      <h2>CSV Delimiter Detection</h2>

      <p>
        For CSV files, the structure includes detected delimiter information:
      </p>

      <PlaygroundExample
        template="node"
        activeFile="/index.js"
        preview={true}
        files={{
          '/index.js': `import { detectStructure } from "convert-buddy-js";

const pipeDelimited = \`name|age|city
Alice|30|New York
Bob|25|Los Angeles\`;

const tabDelimited = \`name\\tage\\tcity
Alice\\t30\\tNew York
Bob\\t25\\tLos Angeles\`;

async function run() {
  const struct1 = await detectStructure(pipeDelimited);
  console.log("Pipe-delimited:");
  console.log("  Delimiter:", struct1.delimiter);
  console.log("  Fields:", struct1.fields.join(", "));
  
  const struct2 = await detectStructure(tabDelimited);
  console.log("Tab-delimited:");
  console.log("  Delimiter:", struct2.delimiter === '\t' ? 'TAB' : struct2.delimiter);
  console.log("  Fields:", struct2.fields.join(", "));
}

run().catch(console.error);`,
        }}
      />

      <h2>XML Record Element Detection</h2>

      <p>
        For XML files, the structure reveals the detected record element:
      </p>

      <PlaygroundExample
        template="node"
        activeFile="/index.js"
        preview={true}
        files={{
          '/index.js': `import { detectStructure } from "convert-buddy-js";

const xmlData = \`<catalog>
  <book>
    <title>The Great Gatsby</title>
    <author>F. Scott Fitzgerald</author>
    <year>1925</year>
  </book>
  <book>
    <title>1984</title>
    <author>George Orwell</author>
    <year>1949</year>
  </book>
</catalog>\`;

async function run() {
  const structure = await detectStructure(xmlData);
  
  console.log("Format:", structure.format);
  console.log("Record element:", structure.recordElement);
  console.log("Detected elements:");
  structure.fields.forEach(fieldName => {
    console.log(\`  - \${fieldName}\`);
  });
}

run().catch(console.error);`,
        }}
      />

      <h2>Using Detection Results</h2>

      <p>
        Use the structure to configure conversions or build UI:
      </p>

      <PlaygroundExample
        template="node"
        activeFile="/index.js"
        preview={true}
        files={{
          '/index.js': `import { detectStructure, convertToString } from "convert-buddy-js";

async function smartConvert(data, outputFormat) {
  // Detect structure
  const structure = await detectStructure(data);
  
  console.log(\`Detected \${structure.format} with \${structure.fields.length} fields\`);
  
  // Build config from detection
  const config = {
    inputFormat: structure.format,
    outputFormat: outputFormat
  };
  
  // Add format-specific config if needed
  if (structure.delimiter) {
    config.csvConfig = {
      delimiter: structure.delimiter
    };
  }
  
  if (structure.recordElement) {
    config.xmlConfig = {
      recordElement: structure.recordElement
    };
  }
  
  // Perform conversion
  return await convertToString(data, config);
}

const csvData = "name|age\\nAlice|30\\nBob|25";

async function run() {
  const result = await smartConvert(csvData, "json");
  console.log("\\nResult:");
  console.log(result);
}

run().catch(console.error);`,
        }}
      />

      <h2>Building Data Previews</h2>

      <p>
        Use field information to generate previews:
      </p>

      <PlaygroundExample
        template="node"
        activeFile="/index.js"
        preview={true}
        files={{
          '/index.js': `import { detectStructure } from "convert-buddy-js";

async function generatePreview(data) {
  const structure = await detectStructure(data);
  
  console.log("=== DATA PREVIEW ===");
  console.log(\`Format: \${structure.format.toUpperCase()}\`);
  console.log(\`Fields: \${structure.fields.length}\`);
  
  console.log("Schema:");
  structure.fields.forEach((fieldName, i) => {
    console.log(\`  \${i + 1}. \${fieldName}\`);
  });
  
  if (structure.delimiter) {
    console.log(\`\\nDelimiter: "\${structure.delimiter}"\`);
  }
  
  if (structure.recordElement) {
    console.log(\`\\nRecord element: <\${structure.recordElement}>\`);
  }
}

const sampleData = \`product,price,stock
Widget,19.99,150
Gadget,29.99,75\`;

async function run() {
  await generatePreview(sampleData);
}

run().catch(console.error);`,
        }}
      />

      <h2>Comparing Formats</h2>

      <p>
        Analyze different formats side-by-side:
      </p>

      <PlaygroundExample
        template="node"
        activeFile="/index.js"
        preview={true}
        files={{
          '/index.js': `import { detectStructure } from "convert-buddy-js";

const formats = {
  csv: "name,age\\nAlice,30\\nBob,25",
  json: '[{"name":"Alice","age":30},{"name":"Bob","age":25}]',
  ndjson: '{"name":"Alice","age":30}\\n{"name":"Bob","age":25}',
  xml: "<items><item><name>Alice</name><age>30</age></item><item><name>Bob</name><age>25</age></item></items>"
};

async function run() {
  for (const [label, data] of Object.entries(formats)) {
    const structure = await detectStructure(data);
    console.log(\`\${label.toUpperCase()}:\`);
    console.log(\`  Detected as: \${structure.format}\`);
    console.log(\`  Fields: \${structure.fields.join(', ')}\`);
    console.log("");
  }
}

run().catch(console.error);`,
        }}
      />

      <h2>See Also</h2>

      <ul>
        <li><a href="/docs/detection/detecting-format">Detecting Format</a> - Simple format detection</li>
        <li><a href="/docs/detection/detection-limits">Detection Limits</a> - Understanding edge cases</li>
        <li><a href="/docs/recipes/auto-detect-pipelines">Auto-Detect Pipelines</a> - Building dynamic converters</li>
        <li><a href="/docs/reference/stats-objects">Stats Objects</a> - Runtime statistics</li>
      </ul>
    </div>
  );
}
