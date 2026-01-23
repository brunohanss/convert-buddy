import { convertToString, autoDetectConfig, detectFormat } from "./packages/convert-buddy-js/dist/index.js";

const xml = `<?xml version="1.0"?>
<people>
  <person>
    <name>Alice</name>
    <age>30</age>
  </person>
  <person>
    <name>Bob</name>
    <age>25</age>
  </person>
</people>`;

console.log("=== Test 1: detectFormat ===");
const format = await detectFormat(xml);
console.log("Detected format:", format);

console.log("\n=== Test 2: autoDetectConfig ===");
const config = await autoDetectConfig(xml, { debug: true });
console.log("Config:", JSON.stringify(config, null, 2));

console.log("\n=== Test 3: Convert with explicit config ===");
const json1 = await convertToString(xml, {
  inputFormat: "xml",
  outputFormat: "json",
  xmlConfig: {
    recordElement: "person"
  },
  debug: true
});
console.log("JSON output:", json1);
console.log("Parsed:", JSON.parse(json1));

console.log("\n=== Test 4: Convert with auto-detection ===");
const json2 = await convertToString(xml, {
  outputFormat: "json",
  debug: true
});
console.log("JSON output:", json2);
console.log("Parsed:", JSON.parse(json2));
