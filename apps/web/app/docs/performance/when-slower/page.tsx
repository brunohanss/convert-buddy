import React from 'react';
import PlaygroundExample from '@/components/mdx/Playground';

export default function WhenSlowerPage() {
  return (
    <div>
      <h1>When Convert Buddy Is Slower</h1>

      <p>
        Convert Buddy is optimized for large files and streaming scenarios. However, for certain
        use cases, native JavaScript parsers or specialized libraries may be faster. This page
        provides honest guidance on when to use alternatives.
      </p>

      <h2>Small File Overhead</h2>

      <p>
        For very small files (&lt;100 KB), Convert Buddy's initialization overhead can make it
        slower than simple alternatives:
      </p>

      <PlaygroundExample
        template="node"
        activeFile="/index.js"
        preview={true}
        files={{
          '/index.js': `import { convertToString } from "convert-buddy-js";

// Small CSV file (< 1 KB)
const smallCsv = \`name,age,city
Alice,30,New York
Bob,25,Los Angeles\`;

async function run() {
  console.log("Convert Buddy approach:");
  console.time("ConvertBuddy");
  const result = await convertToString(smallCsv, {
    inputFormat: "csv",
    outputFormat: "json"
  });
  console.timeEnd("ConvertBuddy");
  
  console.log("\\nNative approach:");
  console.time("Native");
  const lines = smallCsv.split('\\n');
  const headers = lines[0].split(',');
  const native = lines.slice(1).map(line => {
    const values = line.split(',');
    return Object.fromEntries(headers.map((h, i) => [h, values[i]]));
  });
  const nativeResult = JSON.stringify(native);
  console.timeEnd("Native");
  
  console.log("\\nFor files < 100 KB, native code may be faster.");
}

run().catch(console.error);`,
        }}
      />

      <h3>Overhead Breakdown</h3>

      <ul>
        <li><strong>WASM initialization:</strong> ~2-5ms first call (cached after)</li>
        <li><strong>Buffer setup:</strong> ~1-2ms per conversion</li>
        <li><strong>Streaming overhead:</strong> ~0.5ms for chunking logic</li>
      </ul>

      <p>
        <strong>Total overhead:</strong> ~3-8ms for small files
      </p>

      <h2>When Native Parsers Win</h2>

      <h3>1. Tiny JSON Files</h3>

      <p>
        For small JSON (under 50 KB), <code>JSON.parse()</code> is faster:
      </p>

      <PlaygroundExample
        template="node"
        activeFile="/index.js"
        preview={true}
        files={{
          '/index.js': `const smallJson = JSON.stringify([
  { name: "Alice", age: 30 },
  { name: "Bob", age: 25 }
]);

async function run() {
  console.log("Native JSON.parse() is faster for small JSON.");
  console.log("Use Convert Buddy when:");
  console.log("  - File is > 1 MB");
  console.log("  - Converting between formats (not just parsing)");
  console.log("  - Need streaming (can't load entire file)");
  console.log("  - Want consistent API across formats");
}

run().catch(console.error);`,
        }}
      />

      <h3>2. Simple CSV with Known Structure</h3>

      <p>
        If your CSV is simple and you know the exact structure, a basic splitter is faster:
      </p>

      <PlaygroundExample
        template="node"
        activeFile="/index.js"
        preview={true}
        files={{
          '/index.js': `// For this specific case, a simple parser is faster
const simpleCsv = \`id,value
1,100
2,200
3,300\`;

function fastParse(csv) {
  const [header, ...rows] = csv.split('\\n');
  const keys = header.split(',');
  return rows.map(row => {
    const values = row.split(',');
    return Object.fromEntries(keys.map((k, i) => [k, values[i]]));
  });
}

async function run() {
  console.time("Simple parser");
  const result = fastParse(simpleCsv);
  console.timeEnd("Simple parser");
  console.log("Result:", result);
  
  console.log("\\nBUT simple parsers fail when CSV has:");
  console.log("  - Quoted fields with commas");
  console.log("  - Different delimiters");
  console.log("  - Multi-line fields");
  console.log("  - Large size (memory issues)");
}

run().catch(console.error);`,
        }}
      />

      <h2>Breakeven Point Analysis</h2>

      <p>
        Convert Buddy becomes faster than alternatives at these thresholds:
      </p>

      <table>
        <thead>
          <tr>
            <th>Format</th>
            <th>Breakeven Size</th>
            <th>Reason</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>JSON</td>
            <td>~1 MB</td>
            <td>JSON.parse() blocks event loop; Convert Buddy streams</td>
          </tr>
          <tr>
            <td>CSV (simple)</td>
            <td>~500 KB</td>
            <td>Streaming and optimized parser outweigh overhead</td>
          </tr>
          <tr>
            <td>CSV (complex)</td>
            <td>~50 KB</td>
            <td>Robust quote/delimiter handling worth the overhead</td>
          </tr>
          <tr>
            <td>XML</td>
            <td>~100 KB</td>
            <td>Native XML parsers are slow; streaming helps earlier</td>
          </tr>
          <tr>
            <td>NDJSON</td>
            <td>~200 KB</td>
            <td>Line-by-line native parsing is competitive</td>
          </tr>
        </tbody>
      </table>

      <h2>Use Cases Where Alternatives Are Better</h2>

      <h3>Configuration Files</h3>

      <p>
        Small config files (&lt;10 KB) that are parsed once at startup:
      </p>

      <pre><code>{`// For config.json, just use native
const config = JSON.parse(await fs.readFile('config.json', 'utf-8'));

// Don't use Convert Buddy for this - overkill`}</code></pre>

      <h3>API Responses</h3>

      <p>
        Typical API responses (1-100 KB JSON) are better with native parsing:
      </p>

      <pre><code>{`// API response handling
const response = await fetch('/api/users');
const users = await response.json();  // Native is fine here

// Convert Buddy is overkill unless response is > 1 MB`}</code></pre>

      <h3>In-Memory Transformations</h3>

      <p>
        If data is already in memory as objects, native operations are faster:
      </p>

      <pre><code>{`// Data already parsed
const users = [{ name: "Alice", age: 30 }, ...];

// Native is faster
const filtered = users.filter(u => u.age > 25);

// Don't convert to JSON just to filter`}</code></pre>

      <h2>When Convert Buddy Shines</h2>

      <p>
        Use Convert Buddy for these scenarios (it's faster or necessary):
      </p>

      <ul>
        <li><strong>Files &gt; 1 MB:</strong> Streaming and memory efficiency matter</li>
        <li><strong>Format conversion:</strong> CSV ↔ JSON ↔ XML ↔ NDJSON</li>
        <li><strong>Unknown formats:</strong> Auto-detection simplifies code</li>
        <li><strong>Complex CSV:</strong> Quotes, escapes, custom delimiters</li>
        <li><strong>Progress tracking:</strong> Need UI updates during processing</li>
        <li><strong>Memory constraints:</strong> Can't load entire file</li>
        <li><strong>Transform pipelines:</strong> Field mapping, filtering, coercion</li>
      </ul>

      <h2>Recommendations</h2>

      <table>
        <thead>
          <tr>
            <th>File Size</th>
            <th>Recommendation</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>&lt; 50 KB</td>
            <td>Use native parsers (JSON.parse, simple CSV splitters)</td>
          </tr>
          <tr>
            <td>50 KB - 500 KB</td>
            <td>Either works; Convert Buddy if you need features (transforms, format detection)</td>
          </tr>
          <tr>
            <td>500 KB - 10 MB</td>
            <td>Convert Buddy recommended for better performance</td>
          </tr>
          <tr>
            <td>&gt; 10 MB</td>
            <td>Convert Buddy strongly recommended (streaming essential)</td>
          </tr>
        </tbody>
      </table>

      <h2>See Also</h2>

      <ul>
        <li><a href="/docs/performance/benchmarks">Benchmarks</a> - Detailed performance data</li>
        <li><a href="/docs/performance/memory-model">Memory Model</a> - Memory efficiency details</li>
        <li><a href="/docs/recipes/large-files">Large Files</a> - Handling multi-GB files</li>
      </ul>
    </div>
  );
}
