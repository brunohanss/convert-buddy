const fs = require("node:fs");
const path = require("node:path");

const distPath = path.join(__dirname, "nodejs", "convert_buddy.js");
const sourcePath = path.join(__dirname, "wasm", "nodejs", "convert_buddy.js");

module.exports = require(fs.existsSync(distPath) ? distPath : sourcePath);
