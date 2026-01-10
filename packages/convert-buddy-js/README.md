# convert-buddy-js

A high-performance, streaming-first parser and converter for CSV, XML, NDJSON, and JSON. `convert-buddy-js` is a TypeScript wrapper around a Rust/WASM core, offering fast parsing and multiple usage styles for Node.js and browsers.

## Status & Quality

[![Known Vulnerabilities](https://snyk.io/test/github/brunohanss/convert-buddy/badge.svg)](https://snyk.io/test/github/brunohanss/convert-buddy)
[![CI/CD Pipeline](https://github.com/brunohanss/convert-buddy/actions/workflows/test.yml/badge.svg)](https://github.com/brunohanss/convert-buddy/actions)
[![Coverage Status](https://img.shields.io/codecov/c/github/brunohanss/convert-buddy?label=coverage)](https://codecov.io/gh/brunohanss/convert-buddy)
[![npm version](https://img.shields.io/npm/v/convert-buddy-js.svg)](https://www.npmjs.com/package/convert-buddy-js)
[![Bundle Size](https://img.shields.io/bundlephobia/minzip/convert-buddy-js.svg)](https://bundlephobia.com/package/convert-buddy-js)

## Install

```bash
npm install convert-buddy-js
```

## Quick Start

### Browser - Convert File Input

```ts
import { convertFileToString } from "convert-buddy-js/browser";

const fileInput = document.querySelector('input[type="file"]');
fileInput.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  const result = await convertFileToString(file, {
    inputFormat: "auto",
    outputFormat: "json"
  });
  console.log(result);
});
```

### Node.js - Convert File

```ts
import { convertFileToString } from "convert-buddy-js/node";

const result = await convertFileToString("input.csv", {
  inputFormat: "auto",
  outputFormat: "json"
});
console.log(result);
```

## Usage

### High-Level API (Recommended)

#### Browser Helpers

Simple file conversion without manual buffer handling:

```ts
import { 
  convertFileToString,
  convertFile,
  convertFileToFile,
  convertFileStream
} from "convert-buddy-js/browser";

// Convert to string
const json = await convertFileToString(file, {
  inputFormat: "csv",
  outputFormat: "json"
});

// Convert and download
await convertFileToFile(file, "output.json", {
  inputFormat: "csv",
  outputFormat: "json"
});

// Get streaming API
const stream = await convertFileStream(file, {
  inputFormat: "csv",
  outputFormat: "ndjson"
});
```

#### Node.js Helpers

Convenient file path and stream conversions:

```ts
import { 
  convertFileToString,
  convertFileToFile,
  convertBuffer,
  convertStream
} from "convert-buddy-js/node";

// File to string
const json = await convertFileToString("input.csv", {
  inputFormat: "csv",
  outputFormat: "json"
});

// File to file
await convertFileToFile("input.csv", "output.json", {
  inputFormat: "csv",
  outputFormat: "json"
});

// From stream (HTTP, stdin, etc.)
const result = await convertStream(inputStream, {
  inputFormat: "auto",
  outputFormat: "json"
});
```

#### Progress Tracking & Control

Monitor long-running conversions and allow cancellation:

```ts
const buddy = await ConvertBuddy.create({
  inputFormat: "csv",
  outputFormat: "json",
  onProgress: (stats) => {
    console.log(`${stats.recordsProcessed} records processed`);
    console.log(`${stats.throughputMbPerSec.toFixed(2)} MB/s`);
  },
  progressIntervalBytes: 1024 * 1024 // Every 1MB
});

// User cancels
cancelButton.addEventListener('click', () => buddy.abort());
```

#### Auto-Detection

Let the library detect format automatically:

```ts
const result = await convertFileToString(file, {
  inputFormat: "auto",    // Auto-detect CSV, JSON, NDJSON, XML
  outputFormat: "json",
  csvConfig: {            // Optional: still apply config
    delimiter: ","
  }
});
```

### Low-Level API

#### Convert a full string or buffer

```ts
import { convertToString } from "convert-buddy-js";

const csv = `name,age\nAda,36\nLinus,54`;

const output = await convertToString(csv, {
  inputFormat: "csv",
  outputFormat: "ndjson",
});

console.log(output);
```

#### Manual streaming (chunked)

```ts
import { ConvertBuddy } from "convert-buddy-js";

const buddy = await ConvertBuddy.create({
  inputFormat: "xml",
  outputFormat: "ndjson",
  xmlConfig: { recordElement: "row", includeAttributes: true },
});

const chunkOutput = buddy.push(new Uint8Array([/* bytes */]));
const finalOutput = buddy.finish();

console.log(buddy.stats());
```

#### Node.js Transform stream

Use the Node-specific entrypoint so bundlers keep `node:stream` out of the browser bundle.

```ts
import { createNodeTransform } from "convert-buddy-js/node";
import { createReadStream, createWriteStream } from "node:fs";

const transform = await createNodeTransform({
  inputFormat: "csv",
  outputFormat: "ndjson",
  csvConfig: { hasHeaders: true },
  profile: true,
});

createReadStream("input.csv")
  .pipe(transform)
  .pipe(createWriteStream("output.ndjson"));
```

#### Web Streams

```ts
import { ConvertBuddyTransformStream } from "convert-buddy-js";

const transform = new ConvertBuddyTransformStream({
  inputFormat: "csv",
  outputFormat: "ndjson",
});

const response = await fetch("/data.csv");
const outputStream = response.body?.pipeThrough(transform);
```

#### Detect format and CSV fields/delimiter

Use streaming inputs to keep detection fast on large files.

```ts
import {
  detectFormat,
  detectCsvFieldsAndDelimiter,
  detectXmlElements,
} from "convert-buddy-js";

const fileStream = (await fetch("/data")).body!;

const format = await detectFormat(fileStream, { maxBytes: 256 * 1024 });
console.log(format); // "csv" | "json" | "ndjson" | "xml" | "unknown"

// For CSV files, detect delimiter and field names
const csvInfo = await detectCsvFieldsAndDelimiter(fileStream);
if (csvInfo) {
  console.log(csvInfo.delimiter);    // ","
  console.log(csvInfo.fields);       // ["name", "age", "city"]
}

// For XML files, detect element names
const xmlInfo = await detectXmlElements(fileStream);
if (xmlInfo) {
  console.log(xmlInfo.elements);     // ["root", "record", "field", ...]
}
```

## Configuration

### Formats

- `csv`
- `xml`
- `ndjson`
- `json`

### CSV options

```ts
{
  csvConfig: {
    delimiter: ",",
    quote: '"',
    hasHeaders: true,
    trimWhitespace: false,
  }
}
```

### XML options

```ts
{
  xmlConfig: {
    recordElement: "row",
    trimText: true,
    includeAttributes: true,
  }
}
```

### Performance options

```ts
{
  chunkTargetBytes: 1024 * 1024,
  parallelism: 4,
  profile: true,
  debug: false,
}
```

## How it works

- **Rust core** (`crates/convert-buddy`) implements streaming parsers and stats tracking.
- **WASM bindings** are generated via `wasm-bindgen` and bundled into this package as prebuilt binaries.
- **TypeScript wrapper** (`src/index.ts`) exposes the `ConvertBuddy` class and stream adapters.

## Package contents (what ships)

The published npm package includes only the runtime artifacts needed to use Convert Buddy:

- Prebuilt WASM binaries (in `wasm/` plus `wasm-node.cjs` for Node.js).
- Compiled TypeScript output (in `dist/`).

The monorepo demo app, Rust sources, and build/benchmark tooling live in this repository but are **not** published with the npm package.

### Build (repository)

These steps are **only** for contributors working in this monorepo. If you install `convert-buddy-js` from npm, you do **not** need to run them.

```bash
npm install
npm -w convert-buddy-js run build
```

### Benchmarks (repository)

```bash
npm -w convert-buddy-js run bench:competitors
```

## Comparison to similar tools

Convert Buddy targets multi-format conversion with a unified, streaming API. Most existing libraries specialize:

- CSV-only parsers (e.g., PapaParse, `csv-parse`, `fast-csv`)
- XML-only parsers
- JSON/NDJSON-only utilities

**Where Convert Buddy shines**
- Large dataset throughput (WASM + fast-path parsing)
- Streaming conversions without loading full files into memory
- Unified API across CSV, XML, NDJSON, JSON

**Where others may be better**
- Tiny inputs (WASM setup overhead can dominate)
- Advanced format-specific features
- Long-tail ecosystem plugins

Benchmarks live in `packages/convert-buddy-js/bench/` and include honest cases where Convert Buddy is slower to help users choose the right tool.

## License

MIT
