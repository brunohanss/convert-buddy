import { ConvertBuddy } from "./packages/convert-buddy-js/dist/index.js";

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

console.log("=== Test 1: XML to JSON (streaming) ===");
const buddy1 = await ConvertBuddy.create({
  inputFormat: "xml",
  outputFormat: "json",
  xmlConfig: { recordElement: "person" },
  debug: true
});

const output1 = buddy1.push(new TextEncoder().encode(xml));
const final1 = buddy1.finish();

console.log("Output from push:", new TextDecoder().decode(output1));
console.log("Output from finish:", new TextDecoder().decode(final1));
console.log("Combined:", new TextDecoder().decode(new Uint8Array([...output1, ...final1])));

console.log("\n=== Test 2: XML to NDJSON first ===");
const buddy2 = await ConvertBuddy.create({
  inputFormat: "xml",
  outputFormat: "ndjson",
  xmlConfig: { recordElement: "person" },
  debug: true
});

const output2 = buddy2.push(new TextEncoder().encode(xml));
const final2 = buddy2.finish();
const ndjson = new TextDecoder().decode(new Uint8Array([...output2, ...final2]));
console.log("NDJSON output:", ndjson);

console.log("\n=== Test 3: XML to CSV ===");
const buddy3 = await ConvertBuddy.create({
  inputFormat: "xml",
  outputFormat: "csv",
  xmlConfig: { recordElement: "person" },
  debug: true
});

const output3 = buddy3.push(new TextEncoder().encode(xml));
const final3 = buddy3.finish();
const csv = new TextDecoder().decode(new Uint8Array([...output3, ...final3]));
console.log("CSV output:", csv);
