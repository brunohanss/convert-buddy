import { execSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
const target = process.env.CONVERT_BUDDY_WASM_TARGET ?? "web";
const root = resolve(process.cwd(), "..", "..");
const crateDir = resolve(root, "crates", "convert-buddy");
const outDir = resolve(process.cwd(), "wasm", target);

mkdirSync(outDir, { recursive: true });

// Controls
const debug = process.env.CONVERT_BUDDY_DEBUG === "1";
const enableSimd = process.env.CONVERT_BUDDY_SIMD !== "0"; // Enabled by default
// Only enable threads when explicitly requested (set CONVERT_BUDDY_THREADS=1)
const enableThreads = process.env.CONVERT_BUDDY_THREADS === "1";
 // "web" | "nodejs"


// Feature flags for Rust
const features = [];
if (debug) features.push("debug-logs");
if (enableSimd) features.push("simd");
if (enableThreads) {
  // Use threads-web for both targets for now (until wasm-bindgen-rayon issues are resolved)
  features.push("threads-web"); // Custom JS threading for both Node.js and browsers
}

const featuresArg = features.length ? `--features ${features.join(",")}` : "";

// RUSTFLAGS for SIMD and threads
const rustFlags = [];
if (enableSimd) rustFlags.push("-C target-feature=+simd128");
if (enableThreads) {
  rustFlags.push("-C target-feature=+atomics");
  rustFlags.push("-C target-feature=+bulk-memory");
  rustFlags.push("-C target-feature=+mutable-globals");
}

const env = {
  ...process.env,
  RUSTFLAGS: rustFlags.join(" "),
  // Enable threading with proper environment variable
  ...(enableThreads && { WASM_BINDGEN_THREADS_SUPPORTED: "1" })
};

const cmd = [
  "wasm-pack build",
  `"${crateDir}"`,
  `--target ${target}`,
  "--out-dir",
  `"${outDir}"`,
  "--release",
  featuresArg
].filter(Boolean).join(" ");

console.log(`[convert-buddy-js] build-wasm: ${cmd}`);
if (enableThreads) {
  console.log(`[convert-buddy-js] WASM Threading: ENABLED (explicit)`);
  console.log(`[convert-buddy-js] Threading configured via .cargo/config.toml`);
} else {
  console.log(`[convert-buddy-js] WASM Threading: DISABLED (default)`);
}
execSync(cmd, { stdio: "inherit", env });
