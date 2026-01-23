import { convertToString } from "convert-buddy-js";

// Test the failing XML conversions
const xml1 = `<?xml version="1.0"?>
<people>
  <person>
    <name>Alice</name>
  </person>
</people>`;

console.log("Test 1: XML to JSON");
const json1 = await convertToString(xml1, { outputFormat: "json" });
console.log("JSON output:", json1);
console.log("Parsed:", JSON.parse(json1));

const xml2 = `<?xml version="1.0"?>
<data>
  <item>
    <name>Alice</name>
  </item>
</data>`;

console.log("\nTest 2: XML to JSON");
const json2 = await convertToString(xml2, { outputFormat: "json" });
console.log("JSON output:", json2);
console.log("Parsed:", JSON.parse(json2));
