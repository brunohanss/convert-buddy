import React from 'react';

export default function ConfigurationPage() {
  return (
    <div>
      <h1>Configuration Reference</h1>

      <p>
        Complete reference for all configuration options in Convert Buddy.
      </p>

      <h2>ConvertBuddyOptions</h2>

      <p>
        Main configuration object for ConvertBuddy instances and conversion functions.
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
            <td><code>inputFormat</code></td>
            <td><code>"auto" | Format</code></td>
            <td><code>"auto"</code></td>
            <td>Input format. Use <code>"auto"</code> for detection or specify explicitly.</td>
          </tr>
          <tr>
            <td><code>outputFormat</code></td>
            <td><code>Format</code></td>
            <td>Required</td>
            <td>Output format: <code>"csv" | "json" | "ndjson" | "xml"</code></td>
          </tr>
          <tr>
            <td><code>csvConfig</code></td>
            <td><code>CsvConfig</code></td>
            <td><code>{'{}'}</code></td>
            <td>CSV-specific configuration (see below)</td>
          </tr>
          <tr>
            <td><code>xmlConfig</code></td>
            <td><code>XmlConfig</code></td>
            <td><code>{'{}'}</code></td>
            <td>XML-specific configuration (see below)</td>
          </tr>
          <tr>
            <td><code>transform</code></td>
            <td><code>TransformConfig</code></td>
            <td><code>undefined</code></td>
            <td>Transform configuration (see Transform reference)</td>
          </tr>
          <tr>
            <td><code>onProgress</code></td>
            <td><code>ProgressCallback</code></td>
            <td><code>undefined</code></td>
            <td>Callback for progress updates: <code>(stats: Stats) =&gt; void</code></td>
          </tr>
          <tr>
            <td><code>progressIntervalBytes</code></td>
            <td><code>number</code></td>
            <td><code>1048576</code></td>
            <td>Trigger progress callback every N bytes (default: 1MB)</td>
          </tr>
          <tr>
            <td><code>chunkTargetBytes</code></td>
            <td><code>number</code></td>
            <td><code>~1MB</code></td>
            <td>Target size for processing chunks</td>
          </tr>
          <tr>
            <td><code>parallelism</code></td>
            <td><code>number</code></td>
            <td><code>1</code></td>
            <td>Number of worker threads (Node.js only)</td>
          </tr>
          <tr>
            <td><code>maxMemoryMB</code></td>
            <td><code>number</code></td>
            <td><code>undefined</code></td>
            <td>Memory limit in megabytes (future use)</td>
          </tr>
          <tr>
            <td><code>debug</code></td>
            <td><code>boolean</code></td>
            <td><code>false</code></td>
            <td>Enable debug logging</td>
          </tr>
          <tr>
            <td><code>profile</code></td>
            <td><code>boolean</code></td>
            <td><code>false</code></td>
            <td>Enable performance profiling</td>
          </tr>
        </tbody>
      </table>

      <h2>CsvConfig</h2>

      <p>
        Configuration for CSV parsing and writing.
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
            <td><code>string</code></td>
            <td><code>","</code></td>
            <td>Field delimiter. Common: <code>","</code>, <code>"\t"</code>, <code>";"</code>, <code>"|"</code></td>
          </tr>
          <tr>
            <td><code>quote</code></td>
            <td><code>string</code></td>
            <td><code>"\""</code></td>
            <td>Quote character for escaping delimiters in values</td>
          </tr>
          <tr>
            <td><code>hasHeaders</code></td>
            <td><code>boolean</code></td>
            <td><code>true</code></td>
            <td>Whether first row contains column names</td>
          </tr>
          <tr>
            <td><code>trimWhitespace</code></td>
            <td><code>boolean</code></td>
            <td><code>false</code></td>
            <td>Trim leading/trailing whitespace from fields</td>
          </tr>
        </tbody>
      </table>

      <h3>Example</h3>
      <pre><code>{`const options = {
  outputFormat: 'json',
  csvConfig: {
    delimiter: '\\t',      // Tab-separated
    hasHeaders: true,
    trimWhitespace: true
  }
};`}</code></pre>

      <h2>XmlConfig</h2>

      <p>
        Configuration for XML parsing and writing.
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
            <td><code>recordElement</code></td>
            <td><code>string</code></td>
            <td>Auto-detected</td>
            <td>Name of repeating element treated as records (e.g., <code>"item"</code>)</td>
          </tr>
          <tr>
            <td><code>trimText</code></td>
            <td><code>boolean</code></td>
            <td><code>true</code></td>
            <td>Trim whitespace from text content</td>
          </tr>
          <tr>
            <td><code>includeAttributes</code></td>
            <td><code>boolean</code></td>
            <td><code>true</code></td>
            <td>Include XML attributes as fields</td>
          </tr>
          <tr>
            <td><code>expandEntities</code></td>
            <td><code>boolean</code></td>
            <td><code>true</code></td>
            <td>Expand HTML entities (<code>&amp;lt;</code> → <code>&lt;</code>)</td>
          </tr>
        </tbody>
      </table>

      <h3>Example</h3>
      <pre><code>{`const options = {
  outputFormat: 'json',
  xmlConfig: {
    recordElement: 'product',
    includeAttributes: true,
    trimText: true
  }
};`}</code></pre>

      <h2>DetectOptions</h2>

      <p>
        Options for format/structure detection.
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
            <td><code>maxBytes</code></td>
            <td><code>number</code></td>
            <td><code>262144</code></td>
            <td>Maximum bytes to read for detection (default: 256KB)</td>
          </tr>
          <tr>
            <td><code>debug</code></td>
            <td><code>boolean</code></td>
            <td><code>false</code></td>
            <td>Enable debug logging for detection</td>
          </tr>
        </tbody>
      </table>

      <h2>Usage examples</h2>

      <h3>Minimal configuration</h3>
      <pre><code>{`import { convertToString } from "convert-buddy-js";

// Just specify output format - everything else is auto
const json = await convertToString(csvData, {
  outputFormat: 'json'
});`}</code></pre>

      <h3>Full configuration</h3>
      <pre><code>{`import { ConvertBuddy } from "convert-buddy-js";

const buddy = new ConvertBuddy({
  inputFormat: 'csv',
  outputFormat: 'json',
  csvConfig: {
    delimiter: ',',
    hasHeaders: true,
    trimWhitespace: true
  },
  transform: {
    mode: 'replace',
    fields: [
      { targetFieldName: 'name' },
      { targetFieldName: 'age', coerce: { type: 'i64' } }
    ]
  },
  onProgress: (stats) => {
    console.log(\`Progress: \${stats.bytesIn} bytes\`);
  },
  progressIntervalBytes: 1024 * 1024, // 1MB
  chunkTargetBytes: 2 * 1024 * 1024,  // 2MB
  debug: false,
  profile: true
});`}</code></pre>

      <h2>See also</h2>
      <ul>
        <li><a href="/docs/reference/transform">Transform Reference</a> - Transform configuration</li>
        <li><a href="/docs/reference/stats-objects">Stats Objects</a> - Stats structure</li>
        <li><a href="/docs/reference/error-handling">Error Handling</a> - Error types</li>
      </ul>
    </div>
  );
}
