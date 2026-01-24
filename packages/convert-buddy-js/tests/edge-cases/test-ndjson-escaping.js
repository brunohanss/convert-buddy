import { convertToString } from "./packages/convert-buddy-js/dist/index.js";
import { readFile } from "fs/promises";

async function testNdjsonConversion() {
  // Read the actual NDJSON file
  const ndjsonData = await readFile("./apps/web/public/samples/dnd_characters.ndjson", "utf-8");
  
  console.log("Raw NDJSON data:");
  console.log(ndjsonData);
  console.log("\n" + "=".repeat(80) + "\n");
  
  console.log("First line only:");
  console.log(ndjsonData.split('\n')[0]);
  console.log("\n" + "=".repeat(80) + "\n");
  
  // Test conversion
  const json = await convertToString(ndjsonData, {
    inputFormat: 'ndjson',
    outputFormat: 'json'
  });
  
  console.log("Converted to JSON:");
  console.log(json);
  console.log("\n" + "=".repeat(80) + "\n");
  
  // Parse and verify
  try {
    const parsed = JSON.parse(json);
    console.log("✓ Valid JSON! Record count:", parsed.length);
    console.log("First record:", parsed[0]);
    console.log("Last record:", parsed[parsed.length - 1]);
  } catch (err) {
    console.error("✗ Invalid JSON:", err.message);
  }
  
  // Now test how it would be escaped in the Sandpack transformation
  console.log("\n" + "=".repeat(80) + "\n");
  console.log("Testing Sandpack escaping:");
  
  const escapedData = ndjsonData
    .replace(/\\/g, '\\\\')  // Escape backslashes first
    .replace(/`/g, '\\`')     // Escape backticks
    .replace(/\$/g, '\\$');   // Escape dollar signs
  
  console.log("Escaped for template literal (first 200 chars):");
  console.log(escapedData.substring(0, 200));
  
  // Simulate what happens when evaluated
  const simulatedCode = `const sampleData = \`${escapedData}\`; sampleData`;
  const evaluated = eval(simulatedCode);
  
  console.log("\n" + "=".repeat(80) + "\n");
  console.log("After evaluation (first 200 chars):");
  console.log(evaluated.substring(0, 200));
  
  // Test conversion of evaluated data
  const json2 = await convertToString(evaluated, {
    inputFormat: 'ndjson',
    outputFormat: 'json'
  });
  
  console.log("\n" + "=".repeat(80) + "\n");
  console.log("Converted evaluated data to JSON:");
  console.log(json2);
  
  try {
    const parsed2 = JSON.parse(json2);
    console.log("✓ Valid JSON after escaping! Record count:", parsed2.length);
  } catch (err) {
    console.error("✗ Invalid JSON after escaping:", err.message);
  }
}

testNdjsonConversion().catch(console.error);
