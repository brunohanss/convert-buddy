import { detectStructure } from "convert-buddy-js";

// Test with the user's example - note how the template string has actual newlines
const csvData = `name,age,city
Alice,30,New York
Bob,25,Los Angeles`;

console.log("Testing detectStructure with template literal (actual newlines):");
const structure = await detectStructure(csvData);
console.log('Structure:', structure);
console.log('Fields:', structure?.fields.map(f => `"${f}"`).join(', '));
console.log('');

// Test with escaped newlines (the issue from the docs)
const csvDataEscaped = "name,age,city\nAlice,30,New York\nBob,25,Los Angeles";

console.log("Testing detectStructure with escaped newlines:");
const structure2 = await detectStructure(csvDataEscaped);
console.log('Structure:', structure2);
console.log('Fields:', structure2?.fields.map(f => `"${f}"`).join(', '));
