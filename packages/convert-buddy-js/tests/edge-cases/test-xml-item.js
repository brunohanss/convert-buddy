import { convertToString } from "./packages/convert-buddy-js/dist/index.js";

const xml = `<?xml version="1.0"?>
<data>
  <item>
    <name>Alice</name>
  </item>
</data>`;

console.log("Testing XML auto-detection with 'item' record element");
const json = await convertToString(xml, { outputFormat: "json", debug: true });
console.log("Result:", json);
console.log("Parsed:", JSON.parse(json));
console.log("Length:", JSON.parse(json).length);
