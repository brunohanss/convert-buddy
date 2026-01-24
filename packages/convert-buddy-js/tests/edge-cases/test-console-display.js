import { convertToString } from "./packages/convert-buddy-js/dist/index.js";

// Test console display vs actual data
const ndjsonData = '{"name":"Gorwin \\"Grog\\" Oakenshield","race":"Human","class":"Barbarian","quirk":"Collects spoons from every tavern"}\n{"name":"Zilaen Whisperleaf","race":"Elf","class":"Rogue","quirk":"Talks to shadows, claims they\'re shy"}\n{"name":"Pip Thistlewhisk","race":"Halfling","class":"Bard","quirk":"Plays the lute with carrots"}\n{"name":"Thraxxus Bonegrinder","race":"Orc","class":"Cleric","quirk":"Prays to a rock named Doris"}\n{"name":"Elaria Moonbeam","race":"Half-Elf","class":"Wizard","quirk":"Writes shopping lists in ancient runes"}';

async function test() {
  const json = await convertToString(ndjsonData, {
    inputFormat: 'ndjson',
    outputFormat: 'json'
  });
  
  console.log("=== DIRECT LOG (may be truncated in some consoles) ===");
  console.log(json);
  
  console.log("\n=== STRING LENGTH ===");
  console.log("Length:", json.length, "characters");
  
  console.log("\n=== FIRST 100 CHARS ===");
  console.log(json.substring(0, 100));
  
  console.log("\n=== LAST 100 CHARS ===");
  console.log(json.substring(json.length - 100));
  
  console.log("\n=== PARSED AND RE-STRINGIFIED ===");
  const parsed = JSON.parse(json);
  console.log(JSON.stringify(parsed, null, 2));
}

test();
