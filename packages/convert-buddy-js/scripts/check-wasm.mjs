import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const wasmTargets = [
  {
    label: "web",
    dir: path.join(rootDir, "wasm", "web"),
    files: ["convert_buddy.js", "convert_buddy_bg.wasm"],
  },
  {
    label: "nodejs",
    dir: path.join(rootDir, "wasm", "nodejs"),
    files: ["convert_buddy.js", "convert_buddy_bg.wasm"],
  },
];

const missing = [];

for (const target of wasmTargets) {
  for (const file of target.files) {
    const filePath = path.join(target.dir, file);
    if (!fs.existsSync(filePath)) {
      missing.push(`${target.label}: ${path.relative(rootDir, filePath)}`);
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
