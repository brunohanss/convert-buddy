import React from 'react';

export default function WhatItIsPage() {
  return (
    <div>
      <h1>What Convert Buddy Is (and Is Not)</h1>

      <p>
        Understanding what Convert Buddy excels at—and what it doesn't—will help you use it effectively.
      </p>

      <h2>What it excels at</h2>

      <h3>Large file conversion</h3>
      <p>
        Convert Buddy shines when converting files that are too large to fit comfortably in memory.
        Thanks to streaming, you can process multi-GB files with constant ~10MB memory usage.
      </p>

      <ul>
        <li><strong>Use Convert Buddy:</strong> Converting a 2GB CSV to JSON</li>
        <li><strong>Don't use:</strong> Converting a 5KB JSON snippet (overhead dominates)</li>
      </ul>

      <h3>Browser-based data conversion</h3>
      <p>
        Process sensitive data entirely client-side. No uploads, no servers, complete privacy.
      </p>

      <ul>
        <li><strong>Use Convert Buddy:</strong> HIPAA-compliant medical record conversion in browser</li>
        <li><strong>Don't use:</strong> Server-side batch processing (native tools are faster)</li>
      </ul>

      <h3>Progress & cancellation</h3>
      <p>
        Real-time telemetry and abort support enable responsive UIs for long-running operations.
      </p>

      <ul>
        <li><strong>Use Convert Buddy:</strong> File converter with progress bar and cancel button</li>
        <li><strong>Don't use:</strong> Fire-and-forget background jobs</li>
      </ul>

      <h3>Format-agnostic pipelines</h3>
      <p>
        Auto-detection lets you build tools that accept "any data file" without format-specific code.
      </p>

      <ul>
        <li><strong>Use Convert Buddy:</strong> Universal data import wizard</li>
        <li><strong>Don't use:</strong> When you always know the exact format upfront</li>
      </ul>

      <h2>When not to use it</h2>

      <h3>Tiny inputs (&lt;10KB)</h3>
      <p>
        WASM initialization overhead (~10-50ms) makes Convert Buddy slower than native JavaScript parsers
        for small inputs. If all your data is under 100KB, use format-specific libraries:
      </p>

      <ul>
        <li>CSV: <code>papaparse</code></li>
        <li>JSON: <code>JSON.parse()</code></li>
        <li>XML: <code>fast-xml-parser</code></li>
      </ul>

      <h3>Complex XML schemas</h3>
      <p>
        Convert Buddy treats XML as "records with fields," suitable for data-oriented XML.
        For document-oriented XML with mixed content, namespaces, or complex schemas, use specialized tools.
      </p>

      <h3>In-place data manipulation</h3>
      <p>
        Convert Buddy converts <em>between</em> formats but doesn't edit data within a single format.
        For tasks like "sort CSV by column" or "filter JSON by field," use format-specific tools.
      </p>

      <h3>Server-side ETL at scale</h3>
      <p>
        While Convert Buddy works in Node.js, native CLI tools (e.g., <code>jq</code>, <code>csvkit</code>, <code>xsv</code>)
        are faster for server-side batch processing. Use Convert Buddy when you need:
      </p>

      <ul>
        <li>Unified API across browser and Node.js</li>
        <li>Format auto-detection</li>
        <li>Progress telemetry</li>
      </ul>

      <h2>How it compares to single-format parsers</h2>

      <table>
        <thead>
          <tr>
            <th>Feature</th>
            <th>Convert Buddy</th>
            <th>Single-format parsers</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Streaming</strong></td>
            <td>✅ Always</td>
            <td>⚠️ Sometimes (papaparse has streaming, others don't)</td>
          </tr>
          <tr>
            <td><strong>Memory usage</strong></td>
            <td>✅ Constant (~10MB)</td>
            <td>❌ Grows with input size</td>
          </tr>
          <tr>
            <td><strong>Performance (small files)</strong></td>
            <td>❌ Slower (WASM overhead)</td>
            <td>✅ Faster (native JS)</td>
          </tr>
          <tr>
            <td><strong>Performance (large files)</strong></td>
            <td>✅ Faster (SIMD, Rust)</td>
            <td>❌ Slower or crashes</td>
          </tr>
          <tr>
            <td><strong>Format detection</strong></td>
            <td>✅ Built-in</td>
            <td>❌ Manual</td>
          </tr>
          <tr>
            <td><strong>Progress tracking</strong></td>
            <td>✅ Real-time stats</td>
            <td>❌ Usually not available</td>
          </tr>
          <tr>
            <td><strong>Multiple formats</strong></td>
            <td>✅ 4 formats, any-to-any</td>
            <td>❌ One format only</td>
          </tr>
        </tbody>
      </table>

      <h2>Decision guide</h2>

      <p><strong>Use Convert Buddy if:</strong></p>
      <ul>
        <li>Files are typically &gt;1MB</li>
        <li>You need browser-based conversion</li>
        <li>You want to show progress to users</li>
        <li>Input format varies (auto-detection needed)</li>
        <li>You're converting <em>between</em> formats</li>
      </ul>

      <p><strong>Don't use Convert Buddy if:</strong></p>
      <ul>
        <li>All inputs are &lt;100KB</li>
        <li>You're only parsing (not converting)</li>
        <li>You need format-specific features (e.g., XML namespaces)</li>
        <li>You're doing server-side batch processing where native tools suffice</li>
      </ul>
    </div>
  );
}
