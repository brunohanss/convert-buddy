import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const wasmTargets = [
  {
    label: "web",
    sourceDir: path.join(rootDir, "wasm", "web"),
    distDir: path.join(rootDir, "dist", "wasm", "web"),
    files: ["convert_buddy.js", "convert_buddy_bg.wasm"],
  },
  {
    label: "nodejs",
    sourceDir: path.join(rootDir, "wasm", "nodejs"),
    distDir: path.join(rootDir, "dist", "wasm", "nodejs"),
    files: ["convert_buddy.js", "convert_buddy_bg.wasm"],
  },
];

const missing = [];

for (const target of wasmTargets) {
  for (const file of target.files) {
    const sourcePath = path.join(target.sourceDir, file);
    if (!fs.existsSync(sourcePath)) {
      missing.push(`${target.label} source: ${path.relative(rootDir, sourcePath)}`);
    }

    const distPath = path.join(target.distDir, file);
    if (!fs.existsSync(distPath)) {
      missing.push(`${target.label} dist: ${path.relative(rootDir, distPath)}`);
    }
  }
}

if (missing.length > 0) {
  console.error("[convert-buddy-js] Missing wasm artifacts:");
  for (const entry of missing) {
    console.error(`- ${entry}`);
  }
  process.exit(1);
}

console.log("[convert-buddy-js] All wasm artifacts are present.");
