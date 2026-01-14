import { detectFormat, detectStructure } from "./dist/index.js";

// Test the new unified API
async function testUnifiedDetection() {
  console.log("Testing unified detection API...");
  
  // Test JSON
  const jsonData = '[{"name": "Alice", "age": 30}, {"name": "Bob", "age": 25}]';
  console.log("\n=== JSON Test ===");
  const jsonFormat = await detectFormat(jsonData);
  console.log("Detected format:", jsonFormat);
  
  const jsonStructure = await detectStructure(jsonData);
  console.log("Structure (auto-detect):", jsonStructure);
  
  const jsonStructureHint = await detectStructure(jsonData, "json");
  console.log("Structure (with hint):", jsonStructureHint);
  
  // Test NDJSON
  const ndjsonData = '{"name": "Alice", "age": 30}\n{"name": "Bob", "age": 25}';
  console.log("\n=== NDJSON Test ===");
  const ndjsonFormat = await detectFormat(ndjsonData);
  console.log("Detected format:", ndjsonFormat);
  
  const ndjsonStructure = await detectStructure(ndjsonData);
  console.log("Structure (auto-detect):", ndjsonStructure);
  
  // Test CSV
  const csvData = 'name,age,city\nAlice,30,NYC\nBob,25,LA';
  console.log("\n=== CSV Test ===");
  const csvFormat = await detectFormat(csvData);
  console.log("Detected format:", csvFormat);
  
  const csvStructure = await detectStructure(csvData);
  console.log("Structure (auto-detect):", csvStructure);
}

testUnifiedDetection().catch(console.error);