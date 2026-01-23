import React from 'react';
import SandpackExample from '@/components/mdx/Sandpack';

export default function TransformPipelinePage() {
  return (
    <div>
      <h1>Transform Pipeline</h1>

      <p>
        Transforms let you reshape, filter, and compute fields during conversion—without loading
        the entire dataset into memory.
      </p>

      <h2>Transform basics</h2>

      <p>
        A transform is a configuration object that defines how to map input records to output records:
      </p>

      <SandpackExample
        template="node"
        dependencyVersion="latest"
        activeFile="/index.js"
        preview={false}
        enableFilePicker={true}
        files={{
          '/index.js': `import { convertToString } from "convert-buddy-js";

const fileUrl = "";

async function run() {
  const response = await fetch(fileUrl);
  const data = await response.text();
  
  const json = await convertToString(data, {
    outputFormat: 'json',
    transform: {
      mode: 'replace',
      fields: [
        { targetFieldName: 'name', originFieldName: 'name' },
        { targetFieldName: 'level', originFieldName: 'level', coerce: { type: 'i64' } }
      ]
    }
  });
  
  console.log('Transformed:', json);
}

run().catch(console.error);`,
        }}
      />

      <h2>Replace vs augment</h2>

      <h3>Replace mode (default)</h3>
      <p>
        Only fields in the transform config appear in output:
      </p>

      <pre><code>{`Input:  { name: "Gandalf", class: "Wizard", level: "20" }
Transform (replace): [{ targetFieldName: "name" }, { targetFieldName: "level" }]
Output: { name: "Gandalf", level: "20" }
        ↑ "class" field removed`}</code></pre>

      <h3>Augment mode</h3>
      <p>
        All input fields appear in output, plus transformed fields:
      </p>

      <pre><code>{`Input:  { name: "Gandalf", level: "20" }
Transform (augment): [{ targetFieldName: "levelNum", originFieldName: "level", coerce: { type: 'i64' } }]
Output: { name: "Gandalf", level: "20", levelNum: 20 }
        ↑ Original fields preserved, new field added`}</code></pre>

      <SandpackExample
        template="node"
        dependencyVersion="latest"
        activeFile="/index.js"
        preview={false}
        enableFilePicker={true}
        files={{
          '/index.js': `import { convertToString } from "convert-buddy-js";

const fileUrl = "";

async function run() {
  const response = await fetch(fileUrl);
  const data = await response.text();
  
  const json = await convertToString(data, {
    outputFormat: 'json',
    transform: {
      mode: 'augment', // Keep all original fields
      fields: [
        { 
          targetFieldName: 'isHighLevel', 
          originFieldName: 'level',
          coerce: { type: 'i64' },
          compute: 'level >= 15' 
        }
      ]
    }
  });
  
  console.log('Augmented:', json);
}

run().catch(console.error);`,
        }}
      />

      <h2>Field mapping</h2>

      <p>
        Each field mapping defines how to create one output field:
      </p>

      <pre><code>{`{
  targetFieldName: "output_name",    // Required: name in output
  originFieldName: "input_name",     // Optional: source field (defaults to targetFieldName)
  required: true,                    // Optional: error if missing
  defaultValue: null,                // Optional: value when missing
  coerce: { type: "i64" },          // Optional: type conversion
  compute: "age >= 18"               // Optional: computed expression
}`}</code></pre>

      <h2>Coercion & defaults</h2>

      <p>
        Coercion converts string values to typed data:
      </p>

      <table>
        <thead>
          <tr>
            <th>Type</th>
            <th>Description</th>
            <th>Example</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>string</code></td>
            <td>Keep as string</td>
            <td><code>"123"</code> → <code>"123"</code></td>
          </tr>
          <tr>
            <td><code>i64</code></td>
            <td>Parse as integer</td>
            <td><code>"123"</code> → <code>123</code></td>
          </tr>
          <tr>
            <td><code>f64</code></td>
            <td>Parse as float</td>
            <td><code>"12.5"</code> → <code>12.5</code></td>
          </tr>
          <tr>
            <td><code>bool</code></td>
            <td>Parse as boolean</td>
            <td><code>"true"</code> → <code>true</code></td>
          </tr>
          <tr>
            <td><code>timestamp_ms</code></td>
            <td>Parse as timestamp</td>
            <td><code>"2024-01-01"</code> → <code>1704067200000</code></td>
          </tr>
        </tbody>
      </table>

      <SandpackExample
        template="node"
        dependencyVersion="latest"
        activeFile="/index.js"
        preview={false}
        enableFilePicker={true}
        files={{
          '/index.js': `import { convertToString } from "convert-buddy-js";

const fileUrl = "";

async function run() {
  const response = await fetch(fileUrl);
  const data = await response.text();
  
  const json = await convertToString(data, {
    outputFormat: 'json',
    transform: {
      mode: 'replace',
      fields: [
        { targetFieldName: 'name' },
        { targetFieldName: 'level', coerce: { type: 'i64' } },
        { targetFieldName: 'isActive', defaultValue: true }
      ]
    }
  });
  
  console.log('With coercion:', json);
}

run().catch(console.error);`,
        }}
      />

      <h2>Computed fields</h2>

      <p>
        Computed fields use expressions to derive values from other fields:
      </p>

      <pre><code>{`// Simple computation
{ targetFieldName: "fullName", compute: "firstName + ' ' + lastName" }

// Conditional logic
{ targetFieldName: "tier", compute: "score >= 100 ? 'gold' : 'silver'" }

// Math operations
{ targetFieldName: "total", compute: "price * quantity" }`}</code></pre>

      <p>
        <strong>Note:</strong> Computed expressions are evaluated in Rust (not JavaScript).
        Supported operators: <code>+</code>, <code>-</code>, <code>*</code>, <code>/</code>, <code>==</code>, <code>!=</code>, <code>&lt;</code>, <code>&gt;</code>, <code>&lt;=</code>, <code>&gt;=</code>, <code>?:</code> (ternary)
      </p>

      <h2>Error handling</h2>

      <h3>Missing fields</h3>
      <pre><code>{`transform: {
  fields: [{ targetFieldName: "age" }],
  onMissingField: "null"  // "error" | "null" | "drop"
}`}</code></pre>

      <h3>Coercion errors</h3>
      <pre><code>{`transform: {
  fields: [{ targetFieldName: "age", coerce: { type: "i64" } }],
  onCoerceError: "null"  // "error" | "null" | "dropRecord"
}`}</code></pre>

      <h2>Before/after example</h2>

      <pre><code>{`Input CSV:
name,class,level,experience
Gandalf,Wizard,20,50000
Aragorn,Ranger,18,35000

Transform:
{
  mode: "replace",
  fields: [
    { targetFieldName: "hero", originFieldName: "name" },
    { targetFieldName: "level", coerce: { type: "i64" } },
    { targetFieldName: "isVeteran", compute: "level >= 15" }
  ]
}

Output JSON:
[
  { "hero": "Gandalf", "level": 20, "isVeteran": true },
  { "hero": "Aragorn", "level": 18, "isVeteran": true }
]`}</code></pre>

      <h2>Key takeaways</h2>

      <ul>
        <li><strong>Replace mode</strong> = Only mapped fields in output</li>
        <li><strong>Augment mode</strong> = All input fields + transformed fields</li>
        <li><strong>Coercion</strong> = Type conversion (string → int, etc.)</li>
        <li><strong>Computed fields</strong> = Derive values from other fields</li>
        <li>Transforms run streaming—no memory overhead</li>
      </ul>
    </div>
  );
}
