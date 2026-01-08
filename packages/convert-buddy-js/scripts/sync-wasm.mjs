import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceRoot = path.join(rootDir, "wasm");
const destRoot = path.join(rootDir, "dist", "wasm");
const targets = ["web", "nodejs"];

if (!fs.existsSync(sourceRoot)) {
  console.error("[convert-buddy-js] Missing wasm source directory:", sourceRoot);
  process.exit(1);
}

for (const target of targets) {
  const sourceDir = path.join(sourceRoot, target);
  const destDir = path.join(destRoot, target);

  if (!fs.existsSync(sourceDir)) {
    console.error(`[convert-buddy-js] Missing wasm source: ${sourceDir}`);
    process.exit(1);
  }

  fs.rmSync(destDir, { recursive: true, force: true });
  fs.mkdirSync(destDir, { recursive: true });
  fs.cpSync(sourceDir, destDir, { recursive: true });
  
  // Remove .gitignore files created by wasm-pack that prevent npm from including wasm files
  const gitignorePath = path.join(destDir, ".gitignore");
  if (fs.existsSync(gitignorePath)) {
    fs.unlinkSync(gitignorePath);
  }
}

console.log(`[convert-buddy-js] Synced wasm assets into ${destRoot}`);
