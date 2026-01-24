// Test the Sandpack transformation logic

// Simulate NDJSON data with escaped quotes (like from raw-loader)
const sampleData = '{"name":"Gorwin \\"Grog\\" Oakenshield","race":"Human","class":"Barbarian","quirk":"Collects spoons from every tavern"}\n{"name":"Zilaen Whisperleaf","race":"Elf","class":"Rogue","quirk":"Talks to shadows, claims they\'re shy"}\n{"name":"Pip Thistlewhisk","race":"Halfling","class":"Bard","quirk":"Plays the lute with carrots"}\n{"name":"Thraxxus Bonegrinder","race":"Orc","class":"Cleric","quirk":"Prays to a rock named Doris"}\n{"name":"Elaria Moonbeam","race":"Half-Elf","class":"Wizard","quirk":"Writes shopping lists in ancient runes"}';

console.log("RAW SAMPLE DATA:");
console.log(sampleData);
console.log("\n" + "=".repeat(80) + "\n");

// Test JSON.stringify (the OLD broken way)
const wrongEscaped = JSON.stringify(sampleData);
console.log("WRONG WAY (JSON.stringify) - Double escapes backslashes:");
console.log(wrongEscaped);
console.log("\n" + "=".repeat(80) + "\n");

// Test proper escaping (the NEW correct way)
const escapedData = sampleData
  .replace(/\\/g, '\\\\')  // Escape backslashes first
  .replace(/`/g, '\\`')     // Escape backticks for template literal
  .replace(/\$/g, '\\$');   // Escape dollar signs for template literal

console.log("CORRECT WAY (manual escaping):");
console.log(`const sampleData = \`${escapedData}\`;`);
console.log("\n" + "=".repeat(80) + "\n");

// Verify it works by evaluating
const testCode = `const sampleData = \`${escapedData}\`; console.log("Evaluated sampleData:", sampleData.substring(0, 100) + "...");`;
eval(testCode);
