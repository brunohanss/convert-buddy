import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/node.ts", "src/browser.ts", "src/nodejs-thread-pool.ts", "src/thread-pool.ts", "bench/runner.ts", "bench/runner-with-competitors.ts", "bench/datasets.ts", "bench/multi-thread.ts", "bench/single-thread.ts", "bench/compare-threads.ts", "bench/runner-competitors-comprehensive.ts", "bench/run-all-use-cases.ts", "bench/compare-benchmarks.ts", "bench/ci-runner.ts", "bench/use-cases/csv-to-json.ts", "bench/use-cases/ndjson-conversions.ts", "bench/use-cases/json-conversions.ts", "bench/use-cases/xml-conversions.ts", "tests/edge-cases/csv-edge-cases.test.ts", "tests/edge-cases/error-handling.test.ts", "tests/edge-cases/ndjson-edge-cases.test.ts", "tests/edge-cases/detection.test.ts", "tests/edge-cases/control-features.test.ts", "tests/edge-cases/node-helpers.test.ts"],
  format: ["esm"],
  dts: true,
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
