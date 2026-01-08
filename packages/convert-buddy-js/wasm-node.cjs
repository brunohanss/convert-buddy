const fs = require("node:fs");
const path = require("node:path");

const distPath = path.join(__dirname, "dist", "wasm", "nodejs", "convert_buddy.js");
// If we are in the dist folder, the path is different
const altDistPath = path.join(__dirname, "wasm", "nodejs", "convert_buddy.js");
const sourcePath = path.join(__dirname, "wasm", "nodejs", "convert_buddy.js");

const finalPath = fs.existsSync(distPath) ? distPath : (fs.existsSync(altDistPath) ? altDistPath : sourcePath);
module.exports = require(finalPath);
