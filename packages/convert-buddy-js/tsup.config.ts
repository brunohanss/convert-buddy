import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/smoke-test.ts"],
  format: ["esm"],
  dts: true,
  sourcemap: true,
  clean: true,
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