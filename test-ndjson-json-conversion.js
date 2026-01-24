import { convertToString } from "./packages/convert-buddy-js/dist/index.js";

const ndjsonData = `{"name":"Gorwin \\"Grog\\" Oakenshield","race":"Human","class":"Barbarian","quirk":"Collects spoons from every tavern"}
{"name":"Zilaen Whisperleaf","race":"Elf","class":"Rogue","quirk":"Talks to shadows, claims they're shy"}
{"name":"Pip Thistlewhisk","race":"Halfling","class":"Bard","quirk":"Plays the lute with carrots"}
{"name":"Thraxxus Bonegrinder","race":"Orc","class":"Cleric","quirk":"Prays to a rock named Doris"}
{"name":"Elaria Moonbeam","race":"Half-Elf","class":"Wizard","quirk":"Writes shopping lists in ancient runes"}`;

async function testNdjsonToJson() {
  console.log("Testing NDJSON to JSON conversion...\n");
  console.log("Input NDJSON:");
  console.log(ndjsonData);
  console.log("\n" + "=".repeat(80) + "\n");
  
  try {
    const json = await convertToString(ndjsonData, {
      outputFormat: 'json'
    });
    
    console.log("Converted to JSON:");
    console.log(json);
    console.log("\n" + "=".repeat(80) + "\n");
    
    // Try to parse it
    const parsed = JSON.parse(json);
    console.log("Successfully parsed! Count:", parsed.length);
    console.log("First record:", parsed[0]);
    console.log("Last record:", parsed[parsed.length - 1]);
    
  } catch (error) {
    console.error("ERROR:", error.message);
    console.error(error);
  }
}

testNdjsonToJson().catch(console.error);
