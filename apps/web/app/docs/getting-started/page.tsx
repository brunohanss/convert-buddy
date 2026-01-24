import React from 'react';
import SandpackExample from '@/components/mdx/Sandpack';
import { CodeBlock } from '@/components/mdx/CodeBlock';

export default function GettingStartedPage() {
  return (
    <div>
      <h1>Getting Started (5 Minutes)</h1>

      <p>
        Get from installation to working conversion in under 5 minutes.
      </p>

      <h2>Installation</h2>

      <p>Install via npm, yarn, or pnpm:</p>

      <h3>npm</h3>
      <CodeBlock code="npm install convert-buddy-js" />

      <h3>yarn</h3>
      <CodeBlock code="yarn add convert-buddy-js" />

      <h3>pnpm</h3>
      <CodeBlock code="pnpm add convert-buddy-js" />

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

// This will be replaced with actual sample data
const fileUrl = "";

async function run() {
  const response = await fetch(fileUrl);
  const data = await response.text();
  
  // Convert to JSON - format is auto-detected
  const json = await convertToString(data, { 
    outputFormat: 'json' 
  });
  
  // Parse and display nicely
  const parsed = JSON.parse(json);
  console.log(\`✓ Successfully converted \${parsed.length} records to JSON\`);
  console.log('\\nFirst record:');
  console.log(JSON.stringify(parsed[0], null, 2));
  console.log('\\nLast record:');
  console.log(JSON.stringify(parsed[parsed.length - 1], null, 2));
}

run().catch(console.error);`,
        }}
      />

      <h2>Running in browser vs Node</h2>

      <p>
        Convert Buddy works identically in both environments, but input sources differ:
      </p>

      <h3>Browser example (with File object)</h3>

      <p>
        In the browser, you can use File objects from file inputs. 
        Try selecting a file using the picker button below:
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
  const blob = await response.blob();
  
  // In real browser code, you'd get this from:
  // <input type="file" onChange={handleFileSelect} />
  const file = new File([blob], "data.csv", { type: "text/csv" });
  
  console.log('Converting file:', file.name);
  console.log('File size:', file.size, 'bytes');
  
  // Convert File to JSON
  const json = await convertToString(file, {
    outputFormat: 'json'
  });
  
  // Parse and display nicely
  const parsed = JSON.parse(json);
  console.log(\`\n✓ Converted \${parsed.length} records to JSON\`);
  console.log('\nFirst record:');
  console.log(JSON.stringify(parsed[0], null, 2));
  console.log('\nLast record:');
  console.log(JSON.stringify(parsed[parsed.length - 1], null, 2));
}

run().catch(console.error);`,
        }}
      />

      <p className="mt-6 text-sm text-text-secondary">
        <strong>Browser example for reference:</strong>
      </p>
      <CodeBlock
        code={`function handleFileSelect(event) {
  const file = event.target.files[0];
  
  convertToString(file, { outputFormat: 'json' })
    .then(result => {
      console.log('Converted:', result);
    })
    .catch(err => {
      console.error('Conversion failed:', err);
    });
}`}
      />

      <h3>Node.js example (with file path)</h3>

      <p>
        In Node.js, you can use the filesystem API to read and write files. 
        The example below uses a virtual file system (not your local computer) - 
        the <code>input.csv</code> file is defined within the sandbox.
      </p>

      <SandpackExample
        template="node"
        dependencyVersion="latest"
        activeFile="/index.js"
        preview={false}
        files={{
          '/index.js': `import { convertToString } from "convert-buddy-js";
import { readFile, writeFile } from "fs/promises";

async function convertFile() {
  // Read input file (this is a virtual file in the sandbox, not on your computer)
  const csvData = await readFile("./input.csv", "utf-8");
  
  // Convert to JSON
  const json = await convertToString(csvData, {
    outputFormat: "json"
  });
  
  // Write output (also a virtual file in the sandbox)
  await writeFile("./output.json", json);
  
  console.log("Conversion complete!");
  console.log(\`Output: \${json.substring(0, 200)}...\`);
  
  // Let's also read and display the output file
  const outputData = await readFile("./output.json", "utf-8");
  console.log("\\nFull output from file:");
  console.log(outputData);
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
