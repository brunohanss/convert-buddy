import { convertToString } from "convert-buddy-js";

// Test CSV -> CSV with explicit inputFormat
const csvData = "name,race,class,quirk\r\n\"Gorwin \\\"Grog\\\" Oakenshield\",Human,Barbarian,\"Collects spoons from every tavern\"\r\n";

console.log("Testing CSV → CSV with EXPLICIT inputFormat:");
const csvResult1 = await convertToString(csvData, { inputFormat: 'csv', outputFormat: 'csv' });
console.log(csvResult1);

console.log("\n\nTesting CSV → CSV with AUTO inputFormat:");
const csvResult2 = await convertToString(csvData, { outputFormat: 'csv' });
console.log(csvResult2);

console.log("\n\nTesting CSV → JSON with AUTO inputFormat:");
const jsonResult = await convertToString(csvData, { outputFormat: 'json' });
console.log(jsonResult);
