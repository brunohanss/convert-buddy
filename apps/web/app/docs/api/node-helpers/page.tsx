import React from 'react';
import SandpackExample from '@/components/mdx/Sandpack';

export default function NodeHelpersPage() {
  return (
    <div>
      <h1>Node.js Helpers</h1>

      <p>
        While Convert Buddy doesn't provide Node.js-specific helper functions,
        it integrates seamlessly with Node.js file I/O, streams, and command-line patterns.
        This guide shows best practices for using Convert Buddy in Node.js applications.
      </p>

      <h2>File Path Handling</h2>

      <p>
        Convert Buddy works with strings, Uint8Arrays, and streams. For file operations,
        use Node.js <code>fs</code> module to read files, then pass data to Convert Buddy.
      </p>

      <h3>Reading Files with fs/promises</h3>

      <SandpackExample
        template="node"
        dependencyVersion="latest"
        activeFile="/index.js"
        preview={false}
        files={{
          '/index.js': `import { convertToString } from "convert-buddy-js";

// Simulate reading a file
async function readAndConvert() {
  // In real Node.js, you would use:
  // const fs = require('fs/promises');
  // const data = await fs.readFile('input.csv', 'utf-8');
  
  // Simulated CSV data
  const data = "name,age\\nAda,36\\nAlan,42\\nGrace,85";
  
  console.log('Input data:', data);
  
  // Convert
  const json = await convertToString(data, {
    inputFormat: 'csv',
    outputFormat: 'json'
  });
  
  console.log('\\nConverted to JSON:', json);
  
  // In real Node.js, write output:
  // await fs.writeFile('output.json', json, 'utf-8');
  console.log('\\n(Would write to output.json)');
}

readAndConvert().catch(console.error);`,
        }}
      />

      <h3>Working with Buffers</h3>

      <SandpackExample
        template="node"
        dependencyVersion="latest"
        activeFile="/index.js"
        preview={false}
        files={{
          '/index.js': `import { convert } from "convert-buddy-js";

async function convertBuffer() {
  // In Node.js, fs.readFile returns a Buffer
  // const buffer = await fs.readFile('input.csv');
  
  // Simulate Buffer
  const csvData = "name,age\\nAda,36\\nAlan,42";
  const buffer = Buffer.from(csvData, 'utf-8');
  
  console.log('Input Buffer:', buffer.length, 'bytes');
  
  // Convert expects Uint8Array (Buffer is compatible)
  const result = await convert(buffer, {
    inputFormat: 'csv',
    outputFormat: 'json'
  });
  
  console.log('Output Uint8Array:', result.length, 'bytes');
  
  // Convert back to string
  const json = new TextDecoder().decode(result);
  console.log('\\nJSON output:', json);
  
  // Or convert Uint8Array to Buffer for writing
  const outputBuffer = Buffer.from(result);
  console.log('\\nOutput Buffer:', outputBuffer.length, 'bytes');
  
  // In real Node.js:
  // await fs.writeFile('output.json', outputBuffer);
}

convertBuffer().catch(console.error);`,
        }}
      />

      <h2>Stream Integration</h2>

      <p>
        Convert Buddy uses Web Streams API, which is available in Node.js 16.5+.
        For older Node.js versions or to integrate with traditional Node.js streams,
        you can bridge between stream types.
      </p>

      <h3>Using Web Streams in Node.js</h3>

      <SandpackExample
        template="node"
        dependencyVersion="latest"
        activeFile="/index.js"
        preview={false}
        files={{
          '/index.js': `import { ConvertBuddyTransformStream } from "convert-buddy-js";

async function webStreamsExample() {
  // Create a ReadableStream from data
  const csvData = "name,age\\nAda,36\\nAlan,42\\nGrace,85";
  const encoder = new TextEncoder();
  
  const inputStream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(csvData));
      controller.close();
    }
  });
  
  // Create converter
  const converter = new ConvertBuddyTransformStream({
    inputFormat: 'csv',
    outputFormat: 'json'
  });
  
  // Pipe through converter
  const outputStream = inputStream.pipeThrough(converter);
  
  // Read output
  const decoder = new TextDecoder();
  let output = '';
  
  for await (const chunk of outputStream) {
    output += decoder.decode(chunk, { stream: true });
  }
  
  console.log('Converted:', output);
  
  // In real Node.js, you could write to a file:
  // const fs = require('fs');
  // const writableStream = fs.createWriteStream('output.json');
  // await outputStream.pipeTo(Writable.toWeb(writableStream));
}

webStreamsExample().catch(console.error);`,
        }}
      />

      <h3>Processing Large Files in Chunks</h3>

      <SandpackExample
        template="node"
        dependencyVersion="latest"
        activeFile="/index.js"
        preview={false}
        files={{
          '/index.js': `import { ConvertBuddy } from "convert-buddy-js";

async function processLargeFile() {
  // Create converter
  const buddy = await ConvertBuddy.create({
    inputFormat: 'csv',
    outputFormat: 'json',
    chunkTargetBytes: 1024 * 64 // 64KB chunks
  });
  
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  
  // Simulate large file by chunks
  const chunks = [
    'name,age\\n',
    'Ada,36\\n',
    'Alan,42\\n',
    'Grace,85\\n',
    'Katherine,101\\n'
  ];
  
  let allOutput = '';
  
  console.log('Processing file in chunks...');
  
  for (let i = 0; i < chunks.length; i++) {
    // In real Node.js, read chunk from file:
    // const chunk = await readChunk(fileHandle, chunkSize);
    
    const chunk = encoder.encode(chunks[i]);
    const output = buddy.push(chunk);
    
    if (output.length > 0) {
      allOutput += decoder.decode(output);
      console.log(\`Chunk \${i + 1}: processed \${chunk.length} bytes\`);
    }
  }
  
  // Finish
  const final = buddy.finish();
  allOutput += decoder.decode(final);
  
  console.log('\\nFinal output:', allOutput);
  
  const stats = buddy.stats();
  console.log(\`\\nStats: \${stats.recordsProcessed} records, \${stats.bytesIn} bytes in\`);
}

processLargeFile().catch(console.error);`,
        }}
      />

      <h2>Command-Line Tool Patterns</h2>

      <h3>Simple CLI Converter</h3>

      <SandpackExample
        template="node"
        dependencyVersion="latest"
        activeFile="/index.js"
        preview={false}
        files={{
          '/index.js': `import { convertToString } from "convert-buddy-js";

// Simulate command-line arguments
const args = {
  input: 'data.csv',
  output: 'data.json',
  inputFormat: 'csv',
  outputFormat: 'json'
};

async function cliConvert() {
  console.log(\`Converting \${args.input} to \${args.output}...\`);
  
  // In real CLI:
  // const fs = require('fs/promises');
  // const input = await fs.readFile(args.input, 'utf-8');
  
  const input = "name,age\\nAda,36\\nAlan,42\\nGrace,85";
  
  try {
    const output = await convertToString(input, {
      inputFormat: args.inputFormat,
      outputFormat: args.outputFormat
    });
    
    console.log('✓ Conversion complete');
    console.log(\`  Input: \${input.length} bytes\`);
    console.log(\`  Output: \${output.length} bytes\`);
    
    // In real CLI:
    // await fs.writeFile(args.output, output, 'utf-8');
    console.log(\`  Saved to \${args.output}\`);
    
  } catch (err) {
    console.error('✗ Conversion failed:', err.message);
    process.exitCode = 1;
  }
}

cliConvert().catch(console.error);`,
        }}
      />

      <h3>Batch Processing CLI</h3>

      <SandpackExample
        template="node"
        dependencyVersion="latest"
        activeFile="/index.js"
        preview={false}
        files={{
          '/index.js': `import { ConvertBuddy } from "convert-buddy-js";

// Simulate file list
const files = [
  { input: 'data1.csv', output: 'data1.json' },
  { input: 'data2.csv', output: 'data2.json' },
  { input: 'data3.csv', output: 'data3.json' }
];

async function batchConvert() {
  console.log(\`Processing \${files.length} files...\n\`);
  
  // Create reusable converter
  const buddy = new ConvertBuddy({
    inputFormat: 'csv',
    outputFormat: 'json',
    profile: true
  });
  
  let successful = 0;
  let failed = 0;
  
  for (const file of files) {
    try {
      console.log(\`Converting \${file.input}...\`);
      
      // In real CLI:
      // const fs = require('fs/promises');
      // const input = await fs.readFile(file.input, 'utf-8');
      
      const input = \`name,age\\nUser\${successful + 1},30\`;
      
      const result = await buddy.convert(input, {
        outputFormat: 'json'
      });
      
      // In real CLI:
      // await fs.writeFile(file.output, result);
      
      console.log(\`  ✓ Saved to \${file.output}\`);
      successful++;
      
    } catch (err) {
      console.error(\`  ✗ Failed: \${err.message}\`);
      failed++;
    }
  }
  
  console.log(\`\\nResults:\`);
  console.log(\`  Successful: \${successful}\`);
  console.log(\`  Failed: \${failed}\`);
  
  const stats = buddy.stats();
  console.log(\`  Total records: \${stats.recordsProcessed}\`);
  console.log(\`  Throughput: \${stats.throughputMbPerSec.toFixed(2)} MB/s\`);
}

batchConvert().catch(console.error);`,
        }}
      />

      <h3>CLI with Progress Bar</h3>

      <SandpackExample
        template="node"
        dependencyVersion="latest"
        activeFile="/index.js"
        preview={false}
        files={{
          '/index.js': `import { convertToString } from "convert-buddy-js";

async function convertWithProgress() {
  // Simulate large file
  let csv = 'name,age\\n';
  for (let i = 0; i < 1000; i++) {
    csv += \`Person\${i},\${20 + (i % 60)}\\n\`;
  }
  
  console.log('Converting with progress tracking...\\n');
  
  let lastProgress = 0;
  
  const json = await convertToString(csv, {
    inputFormat: 'csv',
    outputFormat: 'json',
    onProgress: (stats) => {
      const percent = Math.floor((stats.bytesIn / csv.length) * 100);
      
      // Only log when percent changes
      if (percent !== lastProgress) {
        const bar = '█'.repeat(Math.floor(percent / 2));
        const empty = '░'.repeat(50 - Math.floor(percent / 2));
        console.log(\`[\${bar}\${empty}] \${percent}% - \${stats.recordsProcessed} records\`);
        lastProgress = percent;
      }
    },
    progressIntervalBytes: 1024 // Update every 1KB
  });
  
  console.log('\\n✓ Conversion complete!');
  
  const parsed = JSON.parse(json);
  console.log(\`Converted \${parsed.length} records\`);
}

convertWithProgress().catch(console.error);`,
        }}
      />

      <h2>Error Handling Patterns</h2>

      <h3>Graceful Error Handling</h3>

      <SandpackExample
        template="node"
        dependencyVersion="latest"
        activeFile="/index.js"
        preview={false}
        files={{
          '/index.js': `import { convertToString } from "convert-buddy-js";

async function robustConvert(inputPath, outputPath) {
  try {
    console.log(\`Converting \${inputPath}...\`);
    
    // In real Node.js:
    // const fs = require('fs/promises');
    // const input = await fs.readFile(inputPath, 'utf-8');
    
    const input = "name,age\\nAda,36\\nAlan,42";
    
    const output = await convertToString(input, {
      inputFormat: 'csv',
      outputFormat: 'json'
    });
    
    // In real Node.js:
    // await fs.writeFile(outputPath, output, 'utf-8');
    
    console.log(\`✓ Successfully converted to \${outputPath}\`);
    return true;
    
  } catch (err) {
    if (err.code === 'ENOENT') {
      console.error(\`✗ File not found: \${inputPath}\`);
    } else if (err.code === 'EACCES') {
      console.error(\`✗ Permission denied: \${inputPath}\`);
    } else if (err.message?.includes('parse')) {
      console.error(\`✗ Failed to parse input file\`);
    } else {
      console.error(\`✗ Conversion error: \${err.message}\`);
    }
    
    return false;
  }
}

// Test error handling
robustConvert('input.csv', 'output.json')
  .then(success => {
    process.exitCode = success ? 0 : 1;
  })
  .catch(console.error);`,
        }}
      />

      <h2>Working with Stdin/Stdout</h2>

      <h3>Pipe-able CLI Tool</h3>

      <SandpackExample
        template="node"
        dependencyVersion="latest"
        activeFile="/index.js"
        preview={false}
        files={{
          '/index.js': `import { convertToString } from "convert-buddy-js";

async function pipelineConvert() {
  console.log('Reading from stdin (simulated)...\\n');
  
  // In real Node.js:
  // const chunks = [];
  // for await (const chunk of process.stdin) {
  //   chunks.push(chunk);
  // }
  // const input = Buffer.concat(chunks).toString('utf-8');
  
  const input = "name,age\\nAda,36\\nAlan,42\\nGrace,85";
  
  try {
    const output = await convertToString(input, {
      inputFormat: 'csv',
      outputFormat: 'json'
    });
    
    // In real Node.js:
    // process.stdout.write(output);
    
    console.log('Output to stdout:');
    console.log(output);
    
  } catch (err) {
    // In real Node.js:
    // process.stderr.write(\`Error: \${err.message}\\n\`);
    console.error(\`Error: \${err.message}\`);
    process.exitCode = 1;
  }
}

// Usage: cat input.csv | node convert.js > output.json
pipelineConvert().catch(console.error);`,
        }}
      />

      <h2>Complete CLI Example</h2>

      <SandpackExample
        template="node"
        dependencyVersion="latest"
        activeFile="/index.js"
        preview={false}
        files={{
          '/index.js': `import { ConvertBuddy } from "convert-buddy-js";

// Simulated CLI arguments
const argv = {
  _: ['input.csv'],
  output: 'output.json',
  inputFormat: 'csv',
  outputFormat: 'json',
  verbose: true,
  stats: true
};

async function main() {
  if (argv._.length === 0) {
    console.error('Usage: convert <input> [options]');
    console.error('Options:');
    console.error('  --output, -o      Output file path');
    console.error('  --inputFormat     Input format (csv|json|xml|ndjson)');
    console.error('  --outputFormat    Output format (csv|json|xml|ndjson)');
    console.error('  --verbose, -v     Verbose output');
    console.error('  --stats           Show statistics');
    process.exitCode = 1;
    return;
  }
  
  const inputPath = argv._[0];
  const outputPath = argv.output || inputPath.replace(/\\.[^.]+$/, '.' + argv.outputFormat);
  
  if (argv.verbose) {
    console.log('Convert Buddy CLI');
    console.log('================');
    console.log(\`Input:  \${inputPath} (\${argv.inputFormat || 'auto'})\`);
    console.log(\`Output: \${outputPath} (\${argv.outputFormat})\`);
    console.log('');
  }
  
  try {
    const buddy = new ConvertBuddy({
      inputFormat: argv.inputFormat,
      outputFormat: argv.outputFormat,
      profile: argv.stats,
      onProgress: argv.verbose ? (stats) => {
        console.log(\`Progress: \${stats.recordsProcessed} records\`);
      } : undefined
    });
    
    // In real Node.js:
    // const fs = require('fs/promises');
    // const input = await fs.readFile(inputPath, 'utf-8');
    
    const input = "name,age\\nAda,36\\nAlan,42\\nGrace,85";
    
    const result = await buddy.convert(input, {
      outputFormat: argv.outputFormat
    });
    
    // In real Node.js:
    // await fs.writeFile(outputPath, result);
    
    if (argv.verbose) {
      console.log('\\n✓ Conversion complete');
    }
    
    if (argv.stats) {
      const stats = buddy.stats();
      console.log('\\nStatistics:');
      console.log(\`  Records:    \${stats.recordsProcessed}\`);
      console.log(\`  Input:      \${(stats.bytesIn / 1024).toFixed(2)} KB\`);
      console.log(\`  Output:     \${(stats.bytesOut / 1024).toFixed(2)} KB\`);
      console.log(\`  Parse time: \${stats.parseTimeMs.toFixed(2)}ms\`);
      console.log(\`  Write time: \${stats.writeTimeMs.toFixed(2)}ms\`);
      console.log(\`  Throughput: \${stats.throughputMbPerSec.toFixed(2)} MB/s\`);
    }
    
  } catch (err) {
    console.error(\`\\n✗ Error: \${err.message}\`);
    process.exitCode = 1;
  }
}

main().catch(console.error);`,
        }}
      />

      <h2>Environment Configuration</h2>

      <h3>Reading Config from Environment</h3>

      <SandpackExample
        template="node"
        dependencyVersion="latest"
        activeFile="/index.js"
        preview={false}
        files={{
          '/index.js': `import { ConvertBuddy } from "convert-buddy-js";

// Simulate environment variables
const env = {
  CONVERT_BUDDY_DEBUG: 'true',
  CONVERT_BUDDY_MAX_MEMORY: '512',
  CONVERT_BUDDY_PARALLELISM: '4'
};

async function convertWithEnvConfig() {
  // Read config from environment
  const config = {
    debug: env.CONVERT_BUDDY_DEBUG === 'true',
    maxMemoryMB: parseInt(env.CONVERT_BUDDY_MAX_MEMORY || '256'),
    parallelism: parseInt(env.CONVERT_BUDDY_PARALLELISM || '1'),
    profile: env.CONVERT_BUDDY_PROFILE === 'true'
  };
  
  console.log('Configuration from environment:');
  console.log(JSON.stringify(config, null, 2));
  console.log('');
  
  const buddy = new ConvertBuddy(config);
  
  const csvData = "name,age\\nAda,36\\nAlan,42";
  
  const result = await buddy.convert(csvData, {
    outputFormat: 'json'
  });
  
  const decoder = new TextDecoder();
  console.log('Result:', decoder.decode(result));
}

convertWithEnvConfig().catch(console.error);`,
        }}
      />

      <h2>Best Practices</h2>

      <ol>
        <li><strong>Use fs/promises:</strong> Async file operations are cleaner and non-blocking</li>
        <li><strong>Handle errors gracefully:</strong> Provide helpful error messages for users</li>
        <li><strong>Reuse instances:</strong> Create one ConvertBuddy instance for batch processing</li>
        <li><strong>Show progress:</strong> Use <code>onProgress</code> callback for long-running conversions</li>
        <li><strong>Stream large files:</strong> Use chunked processing to avoid loading entire files in memory</li>
        <li><strong>Validate inputs:</strong> Check file existence and format before conversion</li>
        <li><strong>Use exit codes:</strong> Set <code>process.exitCode</code> appropriately</li>
      </ol>

      <h2>Next Steps</h2>

      <ul>
        <li>For browser file handling: See <a href="/docs/api/browser-helpers">Browser Helpers</a></li>
        <li>For instance reuse: See <a href="/docs/api/instance">Instance API</a></li>
        <li>For streaming: See <a href="/docs/api/streaming">Streaming API</a></li>
        <li>For recipes: See <a href="/docs/recipes/large-files">Large Files Recipe</a></li>
      </ul>
    </div>
  );
}
