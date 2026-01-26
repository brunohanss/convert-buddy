import React from 'react';
import PlaygroundExample from '@/components/mdx/Playground';

export default function HowConversionWorksPage() {
  return (
    <div>
      <h1>How Conversion Works</h1>

      <p>
        Understanding Convert Buddy's architecture helps you use it effectively and debug issues.
      </p>

      <h2>The conversion pipeline</h2>

      <p>
        Every conversion flows through four stages:
      </p>

      <ol>
        <li><strong>Input abstraction</strong>: Normalize various input types into a stream</li>
        <li><strong>Detection phase</strong> (optional): Identify format and structure</li>
        <li><strong>Streaming parse & transform</strong>: Process data in chunks</li>
        <li><strong>Output emission</strong>: Write results incrementally</li>
      </ol>

      <h2>1. Input abstraction</h2>

      <p>
        Convert Buddy accepts many input types and normalizes them into a unified stream:
      </p>

      <ul>
        <li><strong>String</strong>: Converted to bytes, processed in chunks</li>
        <li><strong>Uint8Array/Buffer</strong>: Processed directly</li>
        <li><strong>File/Blob</strong>: Streamed from disk/memory</li>
        <li><strong>URL</strong> (Node only): Fetched and streamed</li>
        <li><strong>ReadableStream</strong>: Consumed directly</li>
      </ul>

      <p>
        This abstraction means you write the same code regardless of input source:
      </p>

      <PlaygroundExample
        template="node"
        dependencyVersion="latest"
        activeFile="/index.js"
        preview={true}
        enableFilePicker={true}
        files={{
          '/index.js': `import { convertToString } from "convert-buddy-js";

// Same function works for any input type
async function convert(input) {
  return await convertToString(input, { outputFormat: 'json' });
}

// 1. String input - simplest form
const fromString = await convert('name,age\\nAlice,30');
console.log('Converted from string:', fromString);

// 2. URL/fetch input - data from network
const fileUrl = "";
const response = await fetch(fileUrl);
const data = await response.text();
const fromUrl = await convert(data);

// Parse and display nicely (avoid console display issues with long JSON strings)
const parsed = JSON.parse(fromUrl);
console.log(\`\\n✓ Converted from URL: \${parsed.length} records\`);
console.log('First record:', JSON.stringify(parsed[0], null, 2));
console.log('Last record:', JSON.stringify(parsed[parsed.length - 1], null, 2));

// 3. File object input - from file picker
const blob = await response.blob();
const fileInput = new File([blob], "data.csv", { type: "text/csv" });
const fromFileInput = await convert(fileInput);

const parsed2 = JSON.parse(fromFileInput);
console.log(\`\\n✓ Converted from File: \${parsed2.length} records\`);
console.log('First record:', JSON.stringify(parsed2[0], null, 2));`,
        }}
      />

      <h2>2. Detection phase</h2>

      <p>
        When <code>inputFormat: "auto"</code> (the default), Convert Buddy:
      </p>

      <ol>
        <li>Reads the first ~256KB of input</li>
        <li>Analyzes delimiters, brackets, tags to identify format</li>
        <li>Extracts structure (fields, elements, delimiters)</li>
        <li>Configures parser automatically</li>
      </ol>

      <p>
        Detection runs <em>once</em> at the start, adding ~5-20ms overhead.
        For known formats, skip detection by specifying <code>inputFormat</code> explicitly.
      </p>

      <h2>3. Streaming parse & transform</h2>

      <p>
        The core engine processes data in ~1MB chunks:
      </p>

      <pre><code>{`Input stream → Parse chunk → Transform records → Buffer output → Repeat`}</code></pre>

      <p>
        Each chunk flows through:
      </p>

      <ul>
        <li><strong>Parser</strong>: Extracts records from raw bytes (CSV rows, JSON objects, XML elements)</li>
        <li><strong>Transformer</strong> (optional): Maps, coerces, computes fields per record</li>
        <li><strong>Writer</strong>: Formats records in output format</li>
      </ul>

      <p>
        This streaming approach ensures constant memory usage regardless of input size.
      </p>

      <h2>4. Output emission</h2>

      <p>
        Output is emitted incrementally as chunks are processed:
      </p>

      <ul>
        <li><strong>String/Uint8Array output</strong>: Chunks accumulated into final result</li>
        <li><strong>Stream output</strong>: Chunks yielded immediately via ReadableStream</li>
      </ul>

      <p>
        For large outputs, prefer streaming to avoid buffering the entire result:
      </p>

      <PlaygroundExample
        template="node"
        dependencyVersion="latest"
        activeFile="/index.js"
        preview={true}
        files={{
          '/index.js': `import { ConvertBuddy } from "convert-buddy-js";

const fileUrl = "";

async function streamConversion() {
  const response = await fetch(fileUrl);
  const data = await response.text();
  
  const buddy = await ConvertBuddy.create({
    inputFormat: 'csv',
    outputFormat: 'json'
  });

  // Process in chunks
  const encoder = new TextEncoder();
  const chunk = encoder.encode(data);
  
  const outputChunk = buddy.push(chunk);
  const finalChunk = buddy.finish();
  
  const decoder = new TextDecoder();
  console.log('Output:', decoder.decode(outputChunk) + decoder.decode(finalChunk));
}

streamConversion().catch(console.error);`,
        }}
      />

      <h2>Visual flow</h2>

      <pre><code>{`┌──────────────────┐
│ Input (any type) │
└────────┬─────────┘
         │
         ├─► Normalize to stream
         │
┌────────▼─────────┐
│ Auto-detect      │ (optional, ~256KB sample)
│ format/structure │
└────────┬─────────┘
         │
         ├─► Configure parser
         │
┌────────▼─────────┐
│ Stream chunks    │ (~1MB each)
│ through pipeline │
└────────┬─────────┘
         │
         ├─► Parse → Transform → Write
         │   (constant memory)
         │
┌────────▼─────────┐
│ Emit output      │ (streaming or buffered)
└──────────────────┘`}</code></pre>

      <h2>Key insights</h2>

      <ul>
        <li><strong>Input abstraction</strong> = Write once, accept any source</li>
        <li><strong>Detection</strong> = Automatic but skippable (save 5-20ms)</li>
        <li><strong>Streaming</strong> = Constant memory, any input size</li>
        <li><strong>Output</strong> = Choose buffered (simple) or streaming (scalable)</li>
      </ul>
    </div>
  );
}
