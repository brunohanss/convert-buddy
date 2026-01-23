import React from 'react';
import SandpackExample from '@/components/mdx/Sandpack';

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

      <pre><code>{`import { detectStructure } from "convert-buddy-js";

const structure = await detectStructure(data);
// Returns: { format, fields, csv?, xml?, ... }`}</code></pre>

      <SandpackExample
        template="node"
        activeFile="/index.js"
        preview={false}
        files={{
          '/index.js': `import { detectStructure } from "convert-buddy-js";

const csvData = \`name,age,city
Alice,30,New York
Bob,25,Los Angeles\`;

async function run() {
  const structure = await detectStructure(csvData);
  
  console.log("Format:", structure.format);
  console.log("\\nFields:");
  structure.fields.forEach(field => {
    console.log(\`  - \${field.name} (\${field.type})\`);
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
            <td>array</td>
            <td>List of detected fields with name and inferred type</td>
          </tr>
          <tr>
            <td><code>csv</code></td>
            <td>object</td>
            <td>CSV-specific info (delimiter, hasHeaders, quote)</td>
          </tr>
          <tr>
            <td><code>xml</code></td>
            <td>object</td>
            <td>XML-specific info (recordElement)</td>
          </tr>
        </tbody>
      </table>

      <h2>Field Extraction</h2>

      <p>
        <code>detectStructure()</code> identifies field names and infers their types:
      </p>

      <SandpackExample
        template="node"
        activeFile="/index.js"
        preview={false}
        files={{
          '/index.js': `import { detectStructure } from "convert-buddy-js";

const data = \`name,age,salary,is_active,join_date
Alice,30,50000.50,true,2020-01-15
Bob,25,45000.00,false,2021-06-20\`;

async function run() {
  const structure = await detectStructure(data);
  
  console.log("Detected fields:");
  structure.fields.forEach(field => {
    console.log(\`  \${field.name}:\`);
    console.log(\`    Type: \${field.type}\`);
    console.log(\`    Sample: \${field.sample || 'N/A'}\`);
  });
}

run().catch(console.error);`,
        }}
      />

      <h3>Type Inference</h3>

      <p>
        Types are inferred from sample values:
      </p>

      <ul>
        <li><code>string</code> - Text data</li>
        <li><code>number</code> - Integers or decimals</li>
        <li><code>boolean</code> - true/false values</li>
        <li><code>date</code> - ISO date strings</li>
        <li><code>null</code> - Empty or null values</li>
      </ul>

      <h2>CSV Delimiter Detection</h2>

      <p>
        For CSV files, the structure includes detected delimiter information:
      </p>

      <SandpackExample
        template="node"
        activeFile="/index.js"
        preview={false}
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
  console.log("  Delimiter:", struct1.csv?.delimiter);
  console.log("  Has headers:", struct1.csv?.hasHeaders);
  
  const struct2 = await detectStructure(tabDelimited);
  console.log("\\nTab-delimited:");
  console.log("  Delimiter:", struct2.csv?.delimiter === '\\t' ? 'TAB' : struct2.csv?.delimiter);
  console.log("  Has headers:", struct2.csv?.hasHeaders);
}

run().catch(console.error);`,
        }}
      />

      <h2>XML Record Element Detection</h2>

      <p>
        For XML files, the structure reveals the detected record element:
      </p>

      <SandpackExample
        template="node"
        activeFile="/index.js"
        preview={false}
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
  console.log("Record element:", structure.xml?.recordElement);
  console.log("\\nFields:");
  structure.fields.forEach(field => {
    console.log(\`  - \${field.name}\`);
  });
}

run().catch(console.error);`,
        }}
      />

      <h2>Using Detection Results</h2>

      <p>
        Use the structure to configure conversions or build UI:
      </p>

      <SandpackExample
        template="node"
        activeFile="/index.js"
        preview={false}
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
  if (structure.csv) {
    config.csvConfig = {
      delimiter: structure.csv.delimiter,
      hasHeaders: structure.csv.hasHeaders
    };
  }
  
  if (structure.xml) {
    config.xmlConfig = {
      recordElement: structure.xml.recordElement
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

      <SandpackExample
        template="node"
        activeFile="/index.js"
        preview={false}
        files={{
          '/index.js': `import { detectStructure } from "convert-buddy-js";

async function generatePreview(data) {
  const structure = await detectStructure(data);
  
  console.log("=== DATA PREVIEW ===");
  console.log(\`Format: \${structure.format.toUpperCase()}\`);
  console.log(\`Fields: \${structure.fields.length}\`);
  console.log("");
  
  console.log("Schema:");
  structure.fields.forEach((field, i) => {
    console.log(\`  \${i + 1}. \${field.name} (\${field.type})\`);
  });
  
  if (structure.csv) {
    console.log(\`\\nDelimiter: "\${structure.csv.delimiter}"\`);
    console.log(\`Headers: \${structure.csv.hasHeaders ? 'Yes' : 'No'}\`);
  }
  
  if (structure.xml) {
    console.log(\`\\nRecord element: <\${structure.xml.recordElement}>\`);
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

      <SandpackExample
        template="node"
        activeFile="/index.js"
        preview={false}
        files={{
          '/index.js': `import { detectStructure } from "convert-buddy-js";

const formats = {
  csv: "name,age\\nAlice,30",
  json: '[{"name":"Alice","age":30}]',
  ndjson: '{"name":"Alice","age":30}',
  xml: "<items><item><name>Alice</name><age>30</age></item></items>"
};

async function run() {
  for (const [label, data] of Object.entries(formats)) {
    const structure = await detectStructure(data);
    console.log(\`\${label.toUpperCase()}:\`);
    console.log(\`  Detected as: \${structure.format}\`);
    console.log(\`  Fields: \${structure.fields.map(f => f.name).join(', ')}\`);
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
