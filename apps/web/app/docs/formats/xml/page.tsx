import dynamic from 'next/dynamic';

import React from 'react';
import SandpackExample from '@/components/mdx/Sandpack';

export default function Page() {
  return (
    <div>
      <h1>XML</h1>

      <p>XML is parsed with record element detection and streaming node extraction.</p>

      <h2>Minimal example</h2>
      <SandpackExample
        template="node"
        activeFile="/index.js"
        preview={false}
        files={{
          '/index.js': `
import { convertToString } from "convert-buddy-js";

const input = ${JSON.stringify('<rows><row><name>Ada</name><age>36</age></row><row><name>Linus</name><age>54</age></row></rows>')};

async function run() {
  const output = await convertToString(input, {
    inputFormat: "xml",
    outputFormat: "json"
  });
  console.log("output:", output);
}

run().catch(console.error);
`,
        }}
      />

      <h2>Advanced example</h2>
      <SandpackExample
        template="node"
        activeFile="/index.js"
        preview={false}
        files={{
          '/index.js': `
import { convertToString } from "convert-buddy-js";

const input = ${JSON.stringify('<rows><row id="1"><name>Ada</name><age>36</age></row><row id="2"><name>Linus</name><age>54</age></row></rows>')};

async function run() {
  const output = await convertToString(input, {
    inputFormat: "xml",
    outputFormat: "json",
    xmlConfig: {
      recordElement: "row",
      includeAttributes: true,
      trimText: true
    }
  });
  console.log("output:", output);
}

run().catch(console.error);
`,
        }}
      />
    </div>
  );
}
