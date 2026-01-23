import { convertToString } from "./packages/convert-buddy-js/dist/index.js";

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

console.log("=== Test 1: convertToString XML→JSON (explicit config) ===");
try {
  const json1 = await convertToString(xml, {
    inputFormat: "xml",
    outputFormat: "json",
    xmlConfig: { recordElement: "person" },
    debug: true
  });
  console.log("Result:", json1);
  console.log("Parsed:", JSON.parse(json1));
} catch (err) {
  console.error("Error:", err.message);
}

console.log("\n=== Test 2: convertToString XML→JSON (auto-detect) ===");
try {
  const json2 = await convertToString(xml, {
    outputFormat: "json",
    debug: true
  });
  console.log("Result:", json2);
  console.log("Parsed:", JSON.parse(json2));
} catch (err) {
  console.error("Error:", err.message);
}

console.log("\n=== Test 3: Simple XML ===");
const simpleXml = `<items><item><id>1</id></item><item><id>2</id></item></items>`;
try {
  const json3 = await convertToString(simpleXml, {
    inputFormat: "xml",
    outputFormat: "json",
    xmlConfig: { recordElement: "item" },
    debug: true
  });
  console.log("Result:", json3);
  console.log("Parsed:", JSON.parse(json3));
} catch (err) {
  console.error("Error:", err.message);
}
