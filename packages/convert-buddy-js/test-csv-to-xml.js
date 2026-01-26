import { convertToString } from "./dist/index.js";

console.log("Testing CSV to XML conversion...\n");

const csvData = `name,age,city
Alice,30,NYC
Bob,25,LA
Charlie,35,SF`;

console.log("Input CSV:");
console.log(csvData);
console.log();

try {
  const xml = await convertToString(csvData, { 
    inputFormat: 'csv',
    outputFormat: 'xml' 
  });
  
  console.log("✅ SUCCESS! Converted to XML:");
  console.log(xml);
} catch (err) {
  console.log("❌ FAILED:", err.message);
  console.log(err.stack);
}
