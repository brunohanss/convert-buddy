import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    "index": "src/index.ts",
    "node": "src/node.ts",
    "browser": "src/browser.ts",
    "nodejs-thread-pool": "src/nodejs-thread-pool.ts",
    "thread-pool": "src/thread-pool.ts",
    "streaming-worker": "src/streaming-worker.js",
    "bench/runner": "bench/runner.ts",
    "bench/runner-with-competitors": "bench/runner-with-competitors.ts",
    "bench/datasets": "bench/datasets.ts",
    "bench/multi-thread": "bench/multi-thread.ts",
    "bench/single-thread": "bench/single-thread.ts",
    "bench/compare-threads": "bench/compare-threads.ts",
    "bench/runner-competitors-comprehensive": "bench/runner-competitors-comprehensive.ts",
    "bench/run-all-use-cases": "bench/run-all-use-cases.ts",
    "bench/compare-benchmarks": "bench/compare-benchmarks.ts",
    "bench/ci-runner": "bench/ci-runner.ts",
    "bench/large-file-competitors": "bench/large-file-competitors.ts",
    "bench/use-cases/csv-to-json": "bench/use-cases/csv-to-json.ts",
    "bench/use-cases/ndjson-conversions": "bench/use-cases/ndjson-conversions.ts",
    "bench/use-cases/json-conversions": "bench/use-cases/json-conversions.ts",
    "bench/use-cases/xml-conversions": "bench/use-cases/xml-conversions.ts",
    "tests/edge-cases/csv-edge-cases.test": "tests/edge-cases/csv-edge-cases.test.ts",
    "tests/edge-cases/error-handling.test": "tests/edge-cases/error-handling.test.ts",
    "tests/edge-cases/ndjson-edge-cases.test": "tests/edge-cases/ndjson-edge-cases.test.ts",
    "tests/edge-cases/detection.test": "tests/edge-cases/detection.test.ts",
    "tests/edge-cases/control-features.test": "tests/edge-cases/control-features.test.ts",
    "tests/edge-cases/node-helpers.test": "tests/edge-cases/node-helpers.test.ts",
    "tests/edge-cases/roundtrip.test": "tests/edge-cases/roundtrip.test.ts",
  },
  format: ["esm"],
  dts: {
    entry: {
      "index": "src/index.ts",
      "node": "src/node.ts",
      "browser": "src/browser.ts",
      "nodejs-thread-pool": "src/nodejs-thread-pool.ts",
      "thread-pool": "src/thread-pool.ts",
    },
  },
  sourcemap: true,
  clean: true,
  bundle: false,
  outDir: "dist",
  external: ["papaparse", "csv-parse", "csv-parse/sync", "fast-csv", "fast-xml-parser"],
  esbuildPlugins: [
    {
      name: "externalize-wasm-assets",
      setup(build) {
        build.onResolve({ filter: /\/wasm\/(web|nodejs)\/convert_buddy\.js$/ }, (args) => {
          return { path: args.path, external: true };
        });
        build.onResolve({ filter: /\/wasm-node\.cjs$/ }, (args) => {
          return { path: args.path, external: true };
        });
      },
    },
  ],
});
