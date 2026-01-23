import React from 'react';

export default function TransformPage() {
  return (
    <div>
      <h1>Transform Reference</h1>

      <p>
        Complete reference for transformation configuration.
      </p>

      <h2>TransformConfig</h2>

      <p>
        Configuration object defining how to transform records during conversion.
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
            <td><code>mode</code></td>
            <td><code>"replace" | "augment"</code></td>
            <td><code>"replace"</code></td>
            <td>
              <code>"replace"</code>: Only mapped fields in output<br/>
              <code>"augment"</code>: All input fields + mapped fields in output
            </td>
          </tr>
          <tr>
            <td><code>fields</code></td>
            <td><code>FieldMap[]</code></td>
            <td>Required</td>
            <td>Array of field mapping definitions (see below)</td>
          </tr>
          <tr>
            <td><code>onMissingField</code></td>
            <td><code>"error" | "null" | "drop"</code></td>
            <td><code>"null"</code></td>
            <td>
              <code>"error"</code>: Throw error if field missing<br/>
              <code>"null"</code>: Use null for missing fields<br/>
              <code>"drop"</code>: Omit field from output
            </td>
          </tr>
          <tr>
            <td><code>onMissingRequired</code></td>
            <td><code>"error" | "abort"</code></td>
            <td><code>"error"</code></td>
            <td>
              <code>"error"</code>: Throw error<br/>
              <code>"abort"</code>: Stop conversion
            </td>
          </tr>
          <tr>
            <td><code>onCoerceError</code></td>
            <td><code>"error" | "null" | "dropRecord"</code></td>
            <td><code>"null"</code></td>
            <td>
              <code>"error"</code>: Throw error on coercion failure<br/>
              <code>"null"</code>: Use null for failed coercion<br/>
              <code>"dropRecord"</code>: Skip entire record
            </td>
          </tr>
        </tbody>
      </table>

      <h2>FieldMap</h2>

      <p>
        Definition for a single field transformation.
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
            <td><code>targetFieldName</code></td>
            <td><code>string</code></td>
            <td>Required</td>
            <td>Name of field in output</td>
          </tr>
          <tr>
            <td><code>originFieldName</code></td>
            <td><code>string</code></td>
            <td>Same as target</td>
            <td>Name of field in input (defaults to <code>targetFieldName</code>)</td>
          </tr>
          <tr>
            <td><code>required</code></td>
            <td><code>boolean</code></td>
            <td><code>false</code></td>
            <td>Whether field must exist in input</td>
          </tr>
          <tr>
            <td><code>defaultValue</code></td>
            <td><code>any</code></td>
            <td><code>undefined</code></td>
            <td>Value to use when field is missing</td>
          </tr>
          <tr>
            <td><code>coerce</code></td>
            <td><code>Coerce</code></td>
            <td><code>undefined</code></td>
            <td>Type coercion configuration (see below)</td>
          </tr>
          <tr>
            <td><code>compute</code></td>
            <td><code>string</code></td>
            <td><code>undefined</code></td>
            <td>Expression to compute field value</td>
          </tr>
        </tbody>
      </table>

      <h2>Coerce types</h2>

      <p>
        Type coercion options for converting string values to typed data.
      </p>

      <h3><code>{'{ type: "string" }'}</code></h3>
      <p>Keep value as string (no conversion).</p>
      <pre><code>{`{ coerce: { type: "string" } }`}</code></pre>

      <h3><code>{'{ type: "i64" }'}</code></h3>
      <p>Parse as 64-bit integer.</p>
      <pre><code>{`// "123" → 123
{ coerce: { type: "i64" } }`}</code></pre>

      <h3><code>{'{ type: "f64" }'}</code></h3>
      <p>Parse as 64-bit float.</p>
      <pre><code>{`// "12.5" → 12.5
{ coerce: { type: "f64" } }`}</code></pre>

      <h3><code>{'{ type: "bool" }'}</code></h3>
      <p>Parse as boolean.</p>
      <pre><code>{`// "true" → true
// "false" → false
// "1" → true
// "0" → false
{ coerce: { type: "bool" } }`}</code></pre>

      <h3><code>{'{ type: "timestamp_ms", format?: "iso8601" | "unix_ms" | "unix_s" }'}</code></h3>
      <p>Parse as timestamp in milliseconds.</p>
      <pre><code>{`// ISO 8601: "2024-01-01T00:00:00Z" → 1704067200000
{ coerce: { type: "timestamp_ms", format: "iso8601" } }

// Unix milliseconds: "1704067200000" → 1704067200000
{ coerce: { type: "timestamp_ms", format: "unix_ms" } }

// Unix seconds: "1704067200" → 1704067200000
{ coerce: { type: "timestamp_ms", format: "unix_s" } }`}</code></pre>

      <h2>Computed expressions</h2>

      <p>
        Compute field values using expressions evaluated in Rust.
      </p>

      <h3>Supported operators</h3>
      <ul>
        <li><strong>Arithmetic</strong>: <code>+</code>, <code>-</code>, <code>*</code>, <code>/</code>, <code>%</code></li>
        <li><strong>Comparison</strong>: <code>==</code>, <code>!=</code>, <code>&lt;</code>, <code>&gt;</code>, <code>&lt;=</code>, <code>&gt;=</code></li>
        <li><strong>Logical</strong>: <code>&&</code>, <code>||</code>, <code>!</code></li>
        <li><strong>Ternary</strong>: <code>condition ? true_value : false_value</code></li>
        <li><strong>String concat</strong>: <code>+</code></li>
      </ul>

      <h3>Examples</h3>
      <pre><code>{`// Simple arithmetic
{ targetFieldName: "total", compute: "price * quantity" }

// Conditional
{ targetFieldName: "tier", compute: "score >= 100 ? 'gold' : 'silver'" }

// String concatenation
{ targetFieldName: "fullName", compute: "firstName + ' ' + lastName" }

// Boolean expression
{ targetFieldName: "isValid", compute: "age >= 18 && verified == true" }

// Complex expression
{ 
  targetFieldName: "discount", 
  compute: "total > 1000 ? total * 0.1 : total * 0.05" 
}`}</code></pre>

      <h2>Complete example</h2>

      <pre><code>{`const transform = {
  mode: "replace",
  fields: [
    // Simple rename
    {
      targetFieldName: "userName",
      originFieldName: "name"
    },
    
    // Type coercion
    {
      targetFieldName: "age",
      coerce: { type: "i64" }
    },
    
    // Default value
    {
      targetFieldName: "status",
      defaultValue: "active"
    },
    
    // Required field
    {
      targetFieldName: "email",
      required: true
    },
    
    // Computed field
    {
      targetFieldName: "isAdult",
      compute: "age >= 18"
    },
    
    // Complex transformation
    {
      targetFieldName: "priceWithTax",
      originFieldName: "price",
      coerce: { type: "f64" },
      compute: "price * 1.2"
    }
  ],
  onMissingField: "null",
  onMissingRequired: "error",
  onCoerceError: "null"
};`}</code></pre>

      <h2>Error handling strategies</h2>

      <h3>Lenient (continue on errors)</h3>
      <pre><code>{`{
  onMissingField: "null",
  onMissingRequired: "error",
  onCoerceError: "null"
}`}</code></pre>

      <h3>Strict (fail fast)</h3>
      <pre><code>{`{
  onMissingField: "error",
  onMissingRequired: "error",
  onCoerceError: "error"
}`}</code></pre>

      <h3>Data quality (drop bad records)</h3>
      <pre><code>{`{
  onMissingField: "drop",
  onMissingRequired: "abort",
  onCoerceError: "dropRecord"
}`}</code></pre>

      <h2>See also</h2>
      <ul>
        <li><a href="/docs/concepts/transform-pipeline">Transform Pipeline</a> - Conceptual overview</li>
        <li><a href="/docs/reference/configuration">Configuration</a> - All config options</li>
        <li><a href="/docs/recipes/etl-pipelines">ETL Pipelines</a> - Real-world examples</li>
      </ul>
    </div>
  );
}
