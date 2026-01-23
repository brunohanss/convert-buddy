import React from 'react';
import SandpackExample from '@/components/mdx/Sandpack';

export default function DetectionLimitsPage() {
  return (
    <div>
      <h1>Detection Limits and Edge Cases</h1>

      <p>
        While Convert Buddy's format detection is highly accurate, there are edge cases and
        limitations to be aware of. Understanding these helps you build robust applications and
        know when to skip auto-detection.
      </p>

      <h2>Ambiguous Formats</h2>

      <p>
        Some data can legitimately match multiple formats:
      </p>

      <h3>Single Line CSV vs Plain Text</h3>

      <SandpackExample
        template="node"
        activeFile="/index.js"
        preview={false}
        files={{
          '/index.js': `import { detectFormat } from "convert-buddy-js";

const singleLine = "Alice,30,New York";

async function run() {
  const format = await detectFormat(singleLine);
  console.log("Detected format:", format);
  console.log("\\nNote: Single-line data is ambiguous.");
  console.log("Could be CSV, or just plain text.");
  console.log("\\nBest practice: Require at least 2 lines for CSV detection.");
}

run().catch(console.error);`,
        }}
      />

      <h3>JSON-like Strings in CSV</h3>

      <SandpackExample
        template="node"
        activeFile="/index.js"
        preview={false}
        files={{
          '/index.js': `import { detectFormat } from "convert-buddy-js";

// This is CSV, but the data field contains JSON
const csvWithJson = \`user,data
alice,{"score":100}
bob,{"score":200}\`;

async function run() {
  const format = await detectFormat(csvWithJson);
  console.log("Detected format:", format);
  console.log("\\nThe CSV structure wins over the embedded JSON.");
}

run().catch(console.error);`,
        }}
      />

      <h2>Small Samples</h2>

      <p>
        Very small data samples might not have enough information for reliable detection:
      </p>

      <SandpackExample
        template="node"
        activeFile="/index.js"
        preview={false}
        files={{
          '/index.js': `import { detectFormat } from "convert-buddy-js";

const tinyData = "name";  // Just a header

async function run() {
  const format = await detectFormat(tinyData);
  console.log("Detected format:", format);
  console.log("\\nMinimum recommendations:");
  console.log("  - CSV: At least 2 lines (header + 1 data row)");
  console.log("  - JSON: Complete array with at least 1 object");
  console.log("  - NDJSON: At least 2 lines");
  console.log("  - XML: Opening and closing tags with 1 record");
}

run().catch(console.error);`,
        }}
      />

      <h2>Malformed Data</h2>

      <p>
        Invalid or corrupted data can confuse detection:
      </p>

      <SandpackExample
        template="node"
        activeFile="/index.js"
        preview={false}
        files={{
          '/index.js': `import { detectFormat } from "convert-buddy-js";

const malformed = \`[{"name":"Alice"
{"name":"Bob"}\`;  // Missing closing bracket, inconsistent format

async function run() {
  try {
    const format = await detectFormat(malformed);
    console.log("Detected format:", format);
    console.log("\\nMalformed data may be detected incorrectly.");
    console.log("Always validate data quality before conversion.");
  } catch (error) {
    console.error("Detection failed:", error.message);
  }
}

run().catch(console.error);`,
        }}
      />

      <h2>Binary and Non-Text Data</h2>

      <p>
        Convert Buddy only supports text formats. Binary data will fail detection:
      </p>

      <ul>
        <li><strong>Not supported:</strong> Excel (.xlsx), Parquet, Protocol Buffers, MessagePack</li>
        <li><strong>Supported:</strong> CSV, JSON, NDJSON, XML (all text-based)</li>
      </ul>

      <h2>When to Skip Detection</h2>

      <p>
        In these scenarios, explicitly specify the format:
      </p>

      <h3>Known Format</h3>

      <p>
        If you know the format, specifying it is faster and more reliable:
      </p>

      <SandpackExample
        template="node"
        activeFile="/index.js"
        preview={false}
        files={{
          '/index.js': `import { convertToString } from "convert-buddy-js";

const csvData = "name,age\\nAlice,30";

async function run() {
  // Good: Explicit format (slightly faster)
  const result = await convertToString(csvData, {
    inputFormat: "csv",
    outputFormat: "json"
  });
  
  console.log("Result:", result);
  console.log("\\nExplicit format skips detection overhead.");
}

run().catch(console.error);`,
        }}
      />

      <h3>Performance-Critical Paths</h3>

      <p>
        For high-throughput scenarios, skip detection to save ~1-2ms per conversion:
      </p>

      <SandpackExample
        template="node"
        activeFile="/index.js"
        preview={false}
        files={{
          '/index.js': `import { convertToString } from "convert-buddy-js";

async function processMany(files) {
  // All files are known to be CSV
  const results = await Promise.all(
    files.map(data => 
      convertToString(data, {
        inputFormat: "csv",  // Skip detection
        outputFormat: "json"
      })
    )
  );
  return results;
}

const sampleFiles = [
  "name,age\\nAlice,30",
  "product,price\\nWidget,19.99",
  "id,value\\n1,100"
];

async function run() {
  console.time("Processing");
  const results = await processMany(sampleFiles);
  console.timeEnd("Processing");
  console.log(\`Processed \${results.length} files\`);
}

run().catch(console.error);`,
        }}
      />

      <h3>User-Specified Format</h3>

      <p>
        Let users override detection if they know better:
      </p>

      <SandpackExample
        template="node"
        activeFile="/index.js"
        preview={false}
        files={{
          '/index.js': `import { detectFormat, convertToString } from "convert-buddy-js";

async function convert(data, userFormat = null) {
  // Use user's format if provided, otherwise detect
  const format = userFormat || await detectFormat(data);
  
  console.log(\`Using format: \${format} \${userFormat ? '(user-specified)' : '(auto-detected)'}\`);
  
  return await convertToString(data, {
    inputFormat: format,
    outputFormat: "json"
  });
}

const data = "name,age\\nAlice,30";

async function run() {
  // Let detection work
  await convert(data);
  
  // User knows it's CSV
  await convert(data, "csv");
}

run().catch(console.error);`,
        }}
      />

      <h2>Fallback Strategies</h2>

      <p>
        Handle detection failures gracefully:
      </p>

      <SandpackExample
        template="node"
        activeFile="/index.js"
        preview={false}
        files={{
          '/index.js': `import { detectFormat, convertToString } from "convert-buddy-js";

async function safeConvert(data, outputFormat) {
  let format = await detectFormat(data);
  
  if (format === "unknown") {
    console.log("Detection failed. Trying fallback strategies...");
    
    // Strategy 1: Try CSV as most common format
    try {
      return await convertToString(data, {
        inputFormat: "csv",
        outputFormat: outputFormat
      });
    } catch (e1) {
      console.log("CSV failed, trying JSON...");
      
      // Strategy 2: Try JSON
      try {
        return await convertToString(data, {
          inputFormat: "json",
          outputFormat: outputFormat
        });
      } catch (e2) {
        throw new Error("Could not parse data as any known format");
      }
    }
  }
  
  // Detection succeeded
  return await convertToString(data, {
    inputFormat: format,
    outputFormat: outputFormat
  });
}

async function run() {
  const data = "name,age\\nAlice,30";
  const result = await safeConvert(data, "json");
  console.log("Success:", result);
}

run().catch(console.error);`,
        }}
      />

      <h2>Validation After Detection</h2>

      <p>
        Always validate that conversion actually works:
      </p>

      <SandpackExample
        template="node"
        activeFile="/index.js"
        preview={false}
        files={{
          '/index.js': `import { detectFormat, convertToString } from "convert-buddy-js";

async function detectAndConvert(data) {
  const format = await detectFormat(data);
  
  if (format === "unknown") {
    throw new Error("Could not detect format. Please specify manually.");
  }
  
  console.log(\`Detected format: \${format}\`);
  
  try {
    const result = await convertToString(data, {
      inputFormat: format,
      outputFormat: "json"
    });
    
    // Validate result
    const parsed = JSON.parse(result);
    
    if (!Array.isArray(parsed) || parsed.length === 0) {
      throw new Error("Conversion produced empty or invalid result");
    }
    
    console.log(\`Successfully converted \${parsed.length} records\`);
    return result;
    
  } catch (error) {
    console.error(\`Conversion failed for format \${format}:\`, error.message);
    throw error;
  }
}

const validData = "name,age\\nAlice,30\\nBob,25";

async function run() {
  await detectAndConvert(validData);
}

run().catch(console.error);`,
        }}
      />

      <h2>Best Practices Summary</h2>

      <ul>
        <li>✅ Use detection for user-uploaded files with unknown formats</li>
        <li>✅ Provide manual format selection as a fallback option</li>
        <li>✅ Validate conversion results, don't just trust detection</li>
        <li>✅ Require minimum data size (100+ bytes) for reliable detection</li>
        <li>⚠️ Avoid detection for known formats in hot paths</li>
        <li>⚠️ Be cautious with single-line or very small samples</li>
        <li>❌ Don't use detection for binary or non-text formats</li>
      </ul>

      <h2>See Also</h2>

      <ul>
        <li><a href="/docs/detection/detecting-format">Detecting Format</a> - Basic format detection</li>
        <li><a href="/docs/detection/detecting-structure">Detecting Structure</a> - Detailed structure analysis</li>
        <li><a href="/docs/reference/error-handling">Error Handling</a> - Handling conversion errors</li>
        <li><a href="/docs/recipes/auto-detect-pipelines">Auto-Detect Pipelines</a> - Building robust detection flows</li>
      </ul>
    </div>
  );
}
