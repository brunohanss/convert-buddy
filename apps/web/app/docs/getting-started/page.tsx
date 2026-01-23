import React from 'react';
import SandpackExample from '@/components/mdx/Sandpack';

export default function GettingStartedPage() {
  return (
    <div>
      <h1>Getting Started (5 Minutes)</h1>

      <p>
        Get from installation to working conversion in under 5 minutes.
      </p>

      <h2>Installation</h2>

      <p>Install via npm, yarn, or pnpm:</p>

      <pre><code>npm install convert-buddy-js</code></pre>

      <p>
        Convert Buddy works in both browser and Node.js environments with zero configuration.
        The package automatically uses the appropriate build for your platform.
      </p>

      <h2>Your first conversion</h2>

      <p>
        The simplest API is <code>convertToString()</code>. It takes any input (string, File, URL, stream)
        and returns converted output as a string:
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
  const csvData = await response.text();
  
  // Convert CSV to JSON - format is auto-detected
  const json = await convertToString(csvData, { 
    outputFormat: 'json' 
  });
  
  console.log('Converted to JSON:');
  console.log(json);
  
  // Parse and inspect the result
  const parsed = JSON.parse(json);
  console.log(\`Converted \${parsed.length} records\`);
}

run().catch(console.error);`,
        }}
      />

      <h2>Running in browser vs Node</h2>

      <p>
        Convert Buddy works identically in both environments, but input sources differ:
      </p>

      <h3>Browser example (with File object)</h3>

      <pre><code>{`import { convertToString } from "convert-buddy-js";

// In a file input handler
async function handleFile(file) {
  const result = await convertToString(file, {
    outputFormat: "json"
  });
  console.log(result);
}`}</code></pre>

      <h3>Node.js example (with file path)</h3>

      <SandpackExample
        template="node"
        dependencyVersion="latest"
        activeFile="/index.js"
        preview={false}
        files={{
          '/index.js': `import { convertToString } from "convert-buddy-js";
import { readFile, writeFile } from "fs/promises";

async function convertFile() {
  // Read input file
  const csvData = await readFile("./input.csv", "utf-8");
  
  // Convert to JSON
  const json = await convertToString(csvData, {
    outputFormat: "json"
  });
  
  // Write output
  await writeFile("./output.json", json);
  
  console.log("Conversion complete!");
  console.log(\`Output: \${json.substring(0, 200)}...\`);
}

convertFile().catch(console.error);`,
          '/input.csv': `name,class,level
Gandalf,Wizard,20
Aragorn,Ranger,18
Legolas,Ranger,17`,
        }}
      />

      <h2>Key takeaways</h2>

      <ul>
        <li><code>convertToString()</code> handles any input type and auto-detects format</li>
        <li>Just specify <code>outputFormat</code> - everything else is automatic</li>
        <li>Works identically in browser and Node.js</li>
        <li>No configuration needed for basic conversions</li>
      </ul>

      <p>
        <strong>Next:</strong> Learn about <a href="/docs/what-it-is">what Convert Buddy is (and isn't)</a> to understand when to use it.
      </p>
    </div>
  );
}
