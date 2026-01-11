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
const enableThreads = process.env.CONVERT_BUDDY_THREADS === "1";
 // "web" | "nodejs"


// Feature flags for Rust
const features = [];
if (debug) features.push("debug-logs");
if (enableSimd) features.push("simd");
if (enableThreads) features.push("threads");

const featuresArg = features.length ? `--features ${features.join(",")}` : "";

// RUSTFLAGS for SIMD
const rustFlags = [];
if (enableSimd) rustFlags.push("-C target-feature=+simd128");

const env = {
  ...process.env,
  RUSTFLAGS: rustFlags.join(" "),
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
execSync(cmd, { stdio: "inherit", env });
