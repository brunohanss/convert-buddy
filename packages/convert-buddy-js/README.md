# convert-buddy-js

A high-performance, streaming-first parser and converter for CSV, XML, NDJSON, and JSON. `convert-buddy-js` is a TypeScript wrapper around a Rust/WASM core, offering fast parsing and multiple usage styles for Node.js and browsers.

## Install

```bash
npm install convert-buddy-js
```

## Usage

### Convert a full string or buffer

```ts
import { convertToString } from "convert-buddy-js";

const csv = `name,age\nAda,36\nLinus,54`;

const output = await convertToString(csv, {
  inputFormat: "csv",
  outputFormat: "ndjson",
});

console.log(output);
```

### Manual streaming (chunked)

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

### Node.js Transform stream

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

### Web Streams

```ts
import { ConvertBuddyTransformStream } from "convert-buddy-js";

const transform = new ConvertBuddyTransformStream({
  inputFormat: "csv",
  outputFormat: "ndjson",
});

const response = await fetch("/data.csv");
const outputStream = response.body?.pipeThrough(transform);
```

### Detect format and CSV fields/delimiter

Use streaming inputs to keep detection fast on large files.

```ts
import {
  detectFormat,
  detectCsvFieldsAndDelimiter,
} from "convert-buddy-js";

const fileStream = (await fetch("/data")).body!;

const format = await detectFormat(fileStream, { maxBytes: 256 * 1024 });
console.log(format); // "csv" | "json" | "ndjson" | "xml" | "unknown"

const csvInfo = await detectCsvFieldsAndDelimiter(fileStream);
if (csvInfo) {
  console.log(csvInfo.delimiter);
  console.log(csvInfo.fields);
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
- **WASM bindings** are generated via `wasm-bindgen` and bundled into this package.
- **TypeScript wrapper** (`src/index.ts`) exposes the `ConvertBuddy` class and stream adapters.

### Build (repository)

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
