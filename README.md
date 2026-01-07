# Convert Buddy

Convert Buddy is a high-performance, streaming-first parser and converter for CSV, XML, NDJSON, and JSON. The core parser is implemented in Rust and compiled to WebAssembly (WASM), with a TypeScript wrapper that provides ergonomic APIs for Node.js and browsers.

## Why Convert Buddy

- **Streaming-first**: process files chunk-by-chunk instead of loading everything into memory.
- **Multi-format**: CSV, XML, NDJSON, JSON with a single API.
- **WASM performance**: Rust core with fast-path parsing and minimal allocations.
- **Multiple usage styles**: direct conversion, streaming APIs, and Transform streams.

## Installation

```bash
npm install convert-buddy-js
```

> The npm package is `convert-buddy-js`. The Rust core lives in `crates/convert-buddy` and is bundled as WASM in the JavaScript package.

## Quick Start

### Convert a string or buffer

```ts
import { convertToString } from "convert-buddy-js";

const csv = `name,age\nAda,36\nLinus,54`;

const output = await convertToString(csv, {
  inputFormat: "csv",
  outputFormat: "ndjson",
  profile: true,
});

console.log(output);
```

### Streaming API (manual chunks)

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

```ts
import { createNodeTransform } from "convert-buddy-js";
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

### Web Streams API

```ts
import { ConvertBuddyTransformStream } from "convert-buddy-js";

const transform = new ConvertBuddyTransformStream({
  inputFormat: "csv",
  outputFormat: "ndjson",
});

const response = await fetch("/data.csv");
const outputStream = response.body?.pipeThrough(transform);
```

## Configuration

### Supported formats

- **CSV** (`csv`)
- **XML** (`xml`)
- **NDJSON** (`ndjson`)
- **JSON** (`json`)

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

## How it’s built

Convert Buddy is a layered system:

1. **Rust core** (`crates/convert-buddy`)
   - Streaming parsers for CSV, XML, JSON, NDJSON
   - Performance stats and timing instrumentation
   - WASM bindings via `wasm-bindgen`
2. **WASM build outputs** (`packages/convert-buddy-js/wasm`)
   - `web/` bundle for browsers
   - `wasm-node.cjs` for Node.js
3. **TypeScript wrapper** (`packages/convert-buddy-js/src/index.ts`)
   - `ConvertBuddy` class for manual chunking
   - `convert`/`convertToString` utilities
   - Node.js Transform and Web Streams adapters

### Build steps (repo)

```bash
# from repo root
npm install
npm -w convert-buddy-js run build
```

The JS build runs:

- `npm run build:wasm` to compile Rust → WASM
- `tsup` to bundle TypeScript

### Build WASM only

```bash
npm -w convert-buddy-js run build:wasm
```

### Rust-only workflow

```bash
cd crates/convert-buddy
cargo build --release --target wasm32-unknown-unknown
```

## How Convert Buddy compares

Convert Buddy aims to be a single high-performance toolkit for multi-format parsing, while many existing libraries focus on one format (CSV-only or XML-only). The benchmark harness in `packages/convert-buddy-js/bench/` compares CSV throughput against popular parsers like PapaParse, `csv-parse`, and `fast-csv`.

### Strengths

- **Large dataset throughput**: WASM parsing with minimal allocations.
- **Streaming conversions**: process arbitrarily large files without buffering.
- **Multi-format conversions**: CSV ⇄ NDJSON/JSON, XML ⇄ NDJSON/JSON with a unified API.
- **Profiling hooks**: optional stats for monitoring throughput and latency.

### Trade-offs / When others may win

- **Small files**: JS-only parsers can be faster for tiny inputs where WASM setup overhead dominates.
- **API surface**: format-specific libraries may offer richer domain-specific features.
- **Ecosystem maturity**: CSV-only tools have longer histories and more third-party plugins.

### Benchmarks

Competitive benchmarks live at:

```
packages/convert-buddy-js/bench
```

Run them with:

```bash
npm -w convert-buddy-js run bench:competitors
```

The results intentionally include cases where Convert Buddy is slower to keep the comparison honest and help users decide when it’s the right tool.

## Project layout

```
crates/convert-buddy/           # Rust core
packages/convert-buddy-js/      # TypeScript wrapper & WASM bundles
apps/web/                       # Demo app
```

## License

MIT
