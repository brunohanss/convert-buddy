> ⚠️ **Experimental / In Development**  
> This project is under active development and may introduce breaking changes without notice.

# convert-buddy-js

A **high-performance, streaming-first** parser and converter for **CSV, XML, NDJSON, and JSON**.  
`convert-buddy-js` is a **TypeScript wrapper around a Rust → WASM core**, designed for throughput and low memory overhead on large files, with unified APIs for **Node.js and modern browsers**.

---

## Status & Quality

[![Known Vulnerabilities](https://snyk.io/test/github/brunohanss/convert-buddy/badge.svg)](https://snyk.io/test/github/brunohanss/convert-buddy)
[![CI/CD Pipeline](https://github.com/brunohanss/convert-buddy/actions/workflows/test.yml/badge.svg)](https://github.com/brunohanss/convert-buddy/actions)
[![Coverage Status](https://img.shields.io/codecov/c/github/brunohanss/convert-buddy?label=coverage)](https://codecov.io/gh/brunohanss/convert-buddy)
[![npm version](https://img.shields.io/npm/v/convert-buddy-js.svg)](https://www.npmjs.com/package/convert-buddy-js)
[![Bundle Size](https://img.shields.io/bundlephobia/minzip/convert-buddy-js.svg)](https://bundlephobia.com/package/convert-buddy-js)

---

## Why Convert Buddy

**What it optimizes for**
- Performance: Rust/WASM fast-path parsing and conversion
- Streaming-first: convert without loading entire inputs into memory
- Unified multi-format API: one interface for CSV / XML / NDJSON / JSON
- Cross-platform: Node.js and modern browsers

**When you might not want it**
- Tiny inputs where WASM initialization overhead dominates
- Highly specialized format features
- Environments where WASM is restricted

---

## Install

```bash
npm install convert-buddy-js
```

## Quick Start

The simplest way: auto-detect input type + format

```ts
import { convert, convertToString } from "convert-buddy-js";

// From URL
const json = await convertToString("https://example.com/data.csv", {
  outputFormat: "json",
});

// From File (browser)
const file = fileInput.files![0];
const ndjson = await convertToString(file, { outputFormat: "ndjson" });

// From string data
const csv = "name,age\nAda,36";
const out = await convertToString(csv, { outputFormat: "json" });

// Returns Uint8Array instead of string
const bytes = await convert(file, { outputFormat: "json" });
```

### Instance-based API (reuse global config)

```ts
import { ConvertBuddy } from "convert-buddy-js";

const buddy = new ConvertBuddy({
  debug: true,
  maxMemoryMB: 512,
  onProgress: (stats) =>
    console.log(`${stats.recordsProcessed} records processed`),
});

const result = await buddy.convert("https://example.com/data.csv", {
  outputFormat: "json",
});
```

### Platform entrypoints (recommended)

**Browser**

```ts
import { convertFileToString } from "convert-buddy-js/browser";

const file =
  document.querySelector<HTMLInputElement>('input[type="file"]')!
    .files![0];

const json = await convertFileToString(file, {
  inputFormat: "auto",
  outputFormat: "json",
});
```

**Node.js**

```ts
import { convertToString } from "convert-buddy-js/node";

const json = await convertToString("input.csv", {
  outputFormat: "json",
});
```

---

## API Overview

Convert Buddy offers four layers of control, from one-liners to fully manual streaming.

1. Ultra-simple API

```ts
import { convert, convertToString } from "convert-buddy-js";

const json = await convertToString(input, { outputFormat: "json" });
```

Supported input types

- URLs
- Browser `File`
- `Uint8Array` / Node `Buffer`
- Raw strings
- `ReadableStream<Uint8Array>`
- Node file paths

2. Instance-based API

```ts
import { ConvertBuddy } from "convert-buddy-js";

const buddy = new ConvertBuddy({
  profile: true,
  progressIntervalBytes: 1024 * 1024,
  onProgress: (s) => console.log(s.throughputMbPerSec),
});

const out = await buddy.convert(file, { outputFormat: "ndjson" });
```

3. High-level helpers

**Browser helpers**

```ts
import {
  convertFileToString,
  convertFileToFile,
  convertAndSave,
  convertFileStream,
  convertStreamToWritable,
  autoConvertStream,
  isFileSystemAccessSupported,
  getMimeType,
  getExtension,
  getSuggestedFilename,
} from "convert-buddy-js/browser";

const json = await convertFileToString(file, { outputFormat: "json" });
```

**Node helpers**

```ts
import {
  convertFileToString,
  convertFileToFile,
  convertStream,
} from "convert-buddy-js/node";

const json = await convertFileToString("input.csv", {
  inputFormat: "csv",
  outputFormat: "json",
});
```

4. Low-level API

Manual chunked streaming

```ts
import { ConvertBuddy } from "convert-buddy-js";

const converter = await ConvertBuddy.create({
  inputFormat: "xml",
  outputFormat: "ndjson",
  xmlConfig: { recordElement: "row", includeAttributes: true },
});

converter.push(new Uint8Array([/* bytes */]));
converter.push(new Uint8Array([/* bytes */]));

const final = converter.finish();
console.log(converter.stats());
```

Node.js Transform stream

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

Web Streams

```ts
import { ConvertBuddyTransformStream } from "convert-buddy-js";

const transform = new ConvertBuddyTransformStream({
  inputFormat: "csv",
  outputFormat: "ndjson",
});

const response = await fetch("/data.csv");
const output = response.body?.pipeThrough(transform);
```

---

## Formats

Supported

- `csv`
- `xml`
- `ndjson`
- `json`
- `auto`

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

---

## Transformations & Field Mapping

Convert Buddy supports field-level transformations during conversion via the `transform` option. Example:

```ts
const out = await buddy.convert(csvString, {
  outputFormat: "json",
  transform: {
    mode: "augment",
    fields: [
      { targetFieldName: "full_name", compute: "concat(first, ' ', last)" },
      { targetFieldName: "age", coerce: { type: "i64" }, defaultValue: 0 },
    ],
    onMissingField: "null",
    onCoerceError: "null",
  },
});
```

Runtime compute helpers depend on the Rust/WASM core build. For complex transforms consider pre/post-processing in JS.

---

## Auto-detection & inspection

Detect format

```ts
import { detectFormat } from "convert-buddy-js";

const format = await detectFormat(stream, { maxBytes: 256 * 1024 });
```

Detect structure

```ts
import { detectStructure } from "convert-buddy-js";

const structure = await detectStructure(stream);
```

---

## How it works

- Rust core implements streaming parsers and conversion
- WASM bindings generated via `wasm-bindgen`
- TypeScript wrapper exposes high-level APIs and stream adapters

## What ships in the npm package

- Prebuilt WASM binaries
- Compiled JS / TypeScript output

Rust sources, demos, and benchmarks live in the repository but are not published in the npm package.

---

## Benchmarks (repository)

```bash
cd packages/convert-buddy-js
npm run bench
npm run bench:check
npm run bench:competitors
```

---

## License

MIT
> ⚠️ **In Development** - This project is currently under active development and subject to breaking changes. Experimental state, could change heavily.

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

### The Simplest Way - Auto-Detect Everything

```
```ts
import { convert, convertToString } from "convert-buddy-js";

// From URL (auto-detects format)
const result = await convertToString("https://example.com/data.csv", {
  outputFormat: "json"
});

// From File (browser)
const file = fileInput.files[0];
const json = await convertToString(file, { outputFormat: "json" });

// From string data
const csv = "name,age\nAda,36";
const ndjson = await convertToString(csv, { outputFormat: "ndjson" });

// Returns Uint8Array instead of string
const bytes = await convert(file, { outputFormat: "json" });
```

### Instance-Based API with Global Config

```ts
import { ConvertBuddy } from "convert-buddy-js";

// Create a buddy with global settings
const buddy = new ConvertBuddy({
  maxMemoryMB: 512,
  debug: true,
  onProgress: (stats) => console.log(`${stats.recordsProcessed} records`)
});

// Convert anything - URL, File, Buffer, string, stream
const result = await buddy.convert("https://example.com/data.csv", {
  outputFormat: "json"
});

const result2 = await buddy.convert(file, {
  inputFormat: "csv", // optional, auto-detected if omitted
  outputFormat: "ndjson"
});
```

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
import { convert } from "convert-buddy-js/node";

// From file path (auto-detects format)
const result = await convert("input.csv", {
  outputFormat: "json"
});

// From URL
const result2 = await convert("https://api.example.com/data.csv", {
  outputFormat: "ndjson"
});
```

## Usage

Convert Buddy offers three API styles, from simplest to most powerful:

### 1. Ultra-Simple API (Recommended for Most Use Cases)

The easiest way to convert data. Just pass anything and specify the output format:

```ts
import { convert, convertToString } from "convert-buddy-js";
// Or platform-specific: "convert-buddy-js/browser" or "convert-buddy-js/node"

// Auto-detects input type AND format
const json = await convertToString(input, { outputFormat: "json" });

// Works with:
// - URLs: "https://example.com/data.csv"
// - Files: file from <input type="file">
// - Buffers: Uint8Array or Buffer
// - Strings: raw CSV, JSON, XML, NDJSON data
// - Streams: ReadableStream<Uint8Array>
// - File paths (Node.js): "path/to/data.csv"
```

**Examples:**

```ts
// From URL
const json = await convertToString("https://example.com/data.csv", {
  outputFormat: "json"
});

// From file upload (browser)
const file = document.querySelector('input[type="file"]').files[0];
const ndjson = await convertToString(file, { outputFormat: "ndjson" });

// From file path (Node.js)
import { convertToString } from "convert-buddy-js/node";
const result = await convertToString("./data.csv", { outputFormat: "json" });

// From string data
const csvString = "name,age\nAda,36\nLinus,54";
const json = await convertToString(csvString, { outputFormat: "json" });
```

### 2. Instance-Based API (For Reusable Configuration)

Create a ConvertBuddy instance with global settings, then convert multiple inputs:

```ts
import { ConvertBuddy } from "convert-buddy-js";

const buddy = new ConvertBuddy({
  maxMemoryMB: 512,        // Future: memory limits
  debug: true,             // Enable debug logging
  profile: true,           // Show performance stats
  onProgress: (stats) => {
    console.log(`${stats.recordsProcessed} records processed`);
    console.log(`${stats.throughputMbPerSec.toFixed(2)} MB/s`);
  }
});

// Convert different inputs with the same config
const result1 = await buddy.convert("https://example.com/data.csv", {
  outputFormat: "json"
});

const result2 = await buddy.convert(file, {
  outputFormat: "ndjson",
  csvConfig: { delimiter: ";" } // Override per-conversion
});

// Decode to string
const jsonString = new TextDecoder().decode(result1);
```

### 3. High-Level API (Platform-Specific Helpers)

Platform-specific helpers for common use cases:

#### Browser Helpers

Simple file conversion without manual buffer handling:

```ts
import { 
  convertFileToString,
  convertFile,
  convertFileToFile,
  convertFileStream,
  convertAndSave,
  convertStreamToWritable,
  autoConvertStream,
  isFileSystemAccessSupported,
  getMimeType,
  getExtension,
  getSuggestedFilename
} from "convert-buddy-js/browser";

// Convert to string
const json = await convertFileToString(file, {
  inputFormat: "csv",
  outputFormat: "json"
});

// Convert and download (legacy browser support)
await convertFileToFile(file, "output.json", {
  inputFormat: "csv",
  outputFormat: "json"
});

// Convert and save with File System Access API (better UX)
// User chooses save location, no automatic downloads
await convertAndSave(file, {
  inputFormat: "csv",
  outputFormat: "json",
  suggestedName: "output.json"
});

// Auto-detect format and convert
const stream = await autoConvertStream(file, {
  outputFormat: "json"
});

// Stream to File System Access API writable
if (isFileSystemAccessSupported()) {
  const handle = await window.showSaveFilePicker({
    suggestedName: "output.json"
  });
  const writable = await handle.createWritable();
  
  await convertStreamToWritable(file, writable, {
    inputFormat: "csv",
    outputFormat: "json",
    onProgress: (stats) => console.log(`${stats.bytesIn} bytes processed`)
  });
}

// Get streaming API
const stream = await convertFileStream(file, {
  inputFormat: "csv",
  outputFormat: "ndjson"
});

// Format helpers
const mimeType = getMimeType("json"); // "application/json"
const extension = getExtension("csv"); // "csv"
const filename = getSuggestedFilename("data.csv", "json"); // "data.json"

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

### 4. Low-Level API (Advanced Use Cases)

For maximum control over the conversion process:

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

---

### Additional Features

#### Progress Tracking & Control

Monitor long-running conversions and allow cancellation:

```ts
import { ConvertBuddy } from "convert-buddy-js";

const buddy = new ConvertBuddy({
  onProgress: (stats) => {
    console.log(`${stats.recordsProcessed} records processed`);
    console.log(`${stats.throughputMbPerSec.toFixed(2)} MB/s`);
  },
  progressIntervalBytes: 1024 * 1024 // Every 1MB
});

const result = await buddy.convert(largeFile, { outputFormat: "json" });

// Or with the low-level API
const converter = await ConvertBuddy.create({
  inputFormat: "csv",
  outputFormat: "json",
  onProgress: (stats) => {
    console.log(`${stats.recordsProcessed} records processed`);
    console.log(`${stats.throughputMbPerSec.toFixed(2)} MB/s`);
  },
  progressIntervalBytes: 1024 * 1024
});

// User cancels
cancelButton.addEventListener('click', () => converter.abort());
```

#### Format Utilities

Helper functions for working with file formats, MIME types, and extensions:

```ts
import { 
  getMimeType, 
  getExtension, 
  getSuggestedFilename,
  getFileTypeConfig 
} from "convert-buddy-js";

// Get MIME type for a format
const mimeType = getMimeType("json"); // "application/json"

// Get file extension
const ext = getExtension("ndjson"); // "ndjson"

// Generate output filename
const filename = getSuggestedFilename("data.csv", "json"); 
// "data.json"

const timestamped = getSuggestedFilename("data.csv", "json", true);
// "data_converted_1234567890.json"

// Get File System Access API config
const types = getFileTypeConfig("json");
// [{ description: "JSON Files", accept: { "application/json": [".json"] } }]

const handle = await window.showSaveFilePicker({
  suggestedName: "output.json",
  types
});
```

---

### Transformations & Field Mapping

Convert Buddy supports field-level transformations during conversion via the `transform` option. This lets you rename fields, provide defaults, coerce types, compute derived values, and choose whether to replace or augment existing records.

Key concepts:
- **`TransformConfig`**: top-level transform config with `mode` (`"replace" | "augment"`) and a `fields` array.
- **`FieldMap`**: maps one output field to an input field and supports `required`, `defaultValue`, `coerce`, and `compute`.
- **`Coerce`**: supported coercions include `string`, `i64`, `f64`, `bool`, and `timestamp_ms` (with formats `iso8601`, `unix_ms`, `unix_s`).
- **Error handling**: control missing/invalid data with `onMissingField`, `onMissingRequired`, and `onCoerceError`.

Computed fields let you derive values from other fields or runtime data. The `compute` property is a short expression string evaluated by the conversion runtime (WASM core). Below are common usage patterns; actual available functions/operators depend on the runtime build.

Basic examples:

```ts
// Derive a full name from first/last
{ targetFieldName: "full_name", compute: "concat(first, ' ', last)" }

// Current epoch milliseconds
{ targetFieldName: "ingest_ts", compute: "now()" }

// Multiply numeric fields
{ targetFieldName: "total_price", compute: "price * quantity", coerce: { type: "f64" } }

// Safe lookup with default (example expression syntax may vary)
{ targetFieldName: "country", compute: "coalesce(country, 'unknown')" }
```

Runtime helpers & guidance:

- `compute` expression availability depends on the Rust/WASM core compiled into the package. Check the package `wasm/` runtime docs or the project `crates/convert-buddy` README for the exact helper list.
- Typical helpers you may find in supported builds: `now()`, `concat()`, `coalesce()`, basic arithmetic and string functions, and simple date parsing/formatting helpers.
- If a compute expression is not supported by the runtime, the conversion will follow the `onCoerceError` / `onMissingField` policy you configured (e.g., return `null`, drop the record, or error).
- For complex transformations that are not available in-WASM, you can:
  - Preprocess input with a small JS step to add computed fields before passing to `convert`, or
  - Post-process the converted output in JS (useful when runtime compute helpers are intentionally minimal for performance/size).

Example - `augment` mode with computed field and default handling:

```ts
const out = await buddy.convert(csvString, {
  outputFormat: "json",
  transform: {
    mode: "augment",
    fields: [
      { targetFieldName: "full_name", compute: "concat(first, ' ', last)" },
      { targetFieldName: "age", coerce: { type: "i64" }, defaultValue: 0 }
    ],
    onMissingField: "null",
    onCoerceError: "null"
  }
});
```


#### Advanced Browser Streaming

For maximum efficiency with large files, use streaming APIs to avoid loading entire files into memory:

```ts
import { 
  convertStreamToWritable,
  autoConvertStream,
  isFileSystemAccessSupported 
} from "convert-buddy-js/browser";

// Auto-detect and stream conversion
const outputStream = await autoConvertStream(file, {
  outputFormat: "json",
  onProgress: (stats) => {
    console.log(`Progress: ${stats.bytesIn} bytes in, ${stats.bytesOut} bytes out`);
    console.log(`Throughput: ${stats.throughputMbPerSec.toFixed(2)} MB/s`);
  }
});

// Stream directly to File System Access API writable
if (isFileSystemAccessSupported()) {
  const fileHandle = await window.showSaveFilePicker({
    suggestedName: "output.json",
    types: [{ 
      description: "JSON Files", 
      accept: { "application/json": [".json"] } 
    }]
  });
  
  const writable = await fileHandle.createWritable();
  
  await convertStreamToWritable(file, writable, {
    inputFormat: "csv",
    outputFormat: "json"
  });
  
  console.log("Conversion complete!");
}

// Or pipe to any WritableStream
const customWritable = new WritableStream({
  write(chunk) {
    // Process each output chunk
    console.log("Received chunk:", chunk);
  }
});

await convertStreamToWritable(file, customWritable, {
  inputFormat: "auto",
  outputFormat: "ndjson"
});
```

#### Auto-Detection

Auto-detection is enabled by default with the new API. You can also use it explicitly:

```ts
import { convert } from "convert-buddy-js";

// Automatic (default)
const result = await convert(input, { outputFormat: "json" });

// Explicit auto-detection
const result2 = await convert(input, {
  inputFormat: "auto",
  outputFormat: "json",
  csvConfig: { delimiter: "," } // Optional: still apply config
});

// Or specify the format
const result3 = await convert(input, {
  inputFormat: "csv",
  outputFormat: "json"
});
```

#### Detect format and structure

Use streaming inputs to keep detection fast on large files.

```ts
import {
  detectFormat,
  detectStructure,
} from "convert-buddy-js";

const fileStream = (await fetch("/data")).body!;

// Detect format only
const format = await detectFormat(fileStream, { maxBytes: 256 * 1024 });
console.log(format); // "csv" | "json" | "ndjson" | "xml" | "unknown"

// Detect structure (fields/elements) - auto-detects format if not provided
const structure = await detectStructure(fileStream);
console.log(structure?.format);    // "csv"
console.log(structure?.fields);    // ["name", "age", "city"]
console.log(structure?.delimiter); // "," (for CSV)

// Or provide format hint for efficiency
const structure2 = await detectStructure(fileStream, "csv");
console.log(structure2?.fields);       // ["name", "age", "city"]
console.log(structure2?.delimiter);    // ","

// For XML files, get elements and record element
const xmlStructure = await detectStructure(xmlStream, "xml");
console.log(xmlStructure?.fields);       // ["root", "record", "field", ...]
console.log(xmlStructure?.recordElement); // "record"
```

**Backward compatibility functions** (still available but deprecated):
```ts
// These now use detectStructure internally
const csvInfo = await detectCsvFieldsAndDelimiter(fileStream);
const xmlInfo = await detectXmlElements(fileStream);

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

Run benchmarks and compare against performance targets:

```bash
cd packages/convert-buddy-js

# Run benchmarks
npm run bench

# Check against performance targets
npm run bench:check

# Compare with competitors
npm run bench:competitors
```

See [bench/PERFORMANCE.md](bench/PERFORMANCE.md) for details on performance guardrails, CI integration, and regression detection.

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
