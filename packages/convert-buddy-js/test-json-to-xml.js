import { convertToString } from "./dist/index.js";

console.log("Testing JSON to XML conversion...\n");

const jsonData = JSON.stringify([
  { name: "Alice", age: 30, city: "NYC" },
  { name: "Bob", age: 25, city: "LA" }
]);

console.log("Input JSON:");
console.log(jsonData);
console.log();

try {
  const xml = await convertToString(jsonData, { 
    inputFormat: 'json',
    outputFormat: 'xml' 
  });
  
  console.log("✅ SUCCESS! Converted to XML:");
  console.log(xml);
} catch (err) {
  console.log("❌ FAILED:", err.message);
  console.log(err.stack);
}

// Test with a single JSON object (not array)
console.log("\n\nTesting single JSON object to XML:");
const singleObject = JSON.stringify({ name: "Charlie", age: 35, city: "SF" });
console.log("Input:", singleObject);

try {
  const xml = await convertToString(singleObject, { 
    inputFormat: 'json',
    outputFormat: 'xml' 
  });
  
  console.log("✅ SUCCESS! Converted to XML:");
  console.log(xml);
} catch (err) {
  console.log("❌ FAILED:", err.message);
}
