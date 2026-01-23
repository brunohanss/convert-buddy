import { convertToString, detectStructure } from "convert-buddy-js";

console.log("=== Testing Auto-Detection Issues ===\n");

// Test 1: JSON Array
console.log("1. Testing JSON Array Detection:");
const jsonArray = "[\r\n  {\r\n    \"name\": \"Gorwin \\\"Grog\\\" Oakenshield\",\r\n    \"race\": \"Human\",\r\n    \"class\": \"Barbarian\",\r\n    \"quirk\": \"Collects spoons from every tavern\"\r\n  },\r\n  {\r\n    \"name\": \"Zilaen Whisperleaf\",\r\n    \"race\": \"Elf\",\r\n    \"class\": \"Rogue\",\r\n    \"quirk\": \"Talks to shadows, claims they're shy\"\r\n  }\r\n]\r\n";

try {
  const csv1 = await convertToString(jsonArray, { outputFormat: 'csv' });
  console.log('Result:');
  console.log(csv1);
  console.log('');
} catch (e) {
  console.error('Error:', e.message);
}

// Test 2: NDJSON
console.log("2. Testing NDJSON Detection:");
const ndjson = "{\"name\":\"Gorwin \\\"Grog\\\" Oakenshield\",\"race\":\"Human\",\"class\":\"Barbarian\",\"quirk\":\"Collects spoons from every tavern\"}\r\n{\"name\":\"Zilaen Whisperleaf\",\"race\":\"Elf\",\"class\":\"Rogue\",\"quirk\":\"Talks to shadows, claims they're shy\"}\r\n";

try {
  const csv2 = await convertToString(ndjson, { outputFormat: 'csv' });
  console.log('Result:');
  console.log(csv2);
  console.log('');
} catch (e) {
  console.error('Error:', e.message);
}

// Test 3: CSV
console.log("3. Testing CSV Detection:");
const csv = "name,race,class,quirk\r\n\"Gorwin \\\"Grog\\\" Oakenshield\",Human,Barbarian,\"Collects spoons from every tavern\"\r\n\"Zilaen Whisperleaf\",Elf,Rogue,\"Talks to shadows, claims they're shy\"\r\n";

try {
  const csv3 = await convertToString(csv, { outputFormat: 'csv' });
  console.log('Result:');
  console.log(csv3);
  console.log('');
} catch (e) {
  console.error('Error:', e.message);
}

// Test 4: XML
console.log("4. Testing XML Detection:");
const xml = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\r\n<characters>\r\n  <character>\r\n    <name>Gorwin \"Grog\" Oakenshield</name>\r\n    <race>Human</race>\r\n    <class>Barbarian</class>\r\n    <quirk>Collects spoons from every tavern</quirk>\r\n  </character>\r\n</characters>\r\n";

try {
  const csv4 = await convertToString(xml, { outputFormat: 'csv' });
  console.log('Result:');
  console.log(csv4);
  console.log('');
} catch (e) {
  console.error('Error:', e.message);
}

// Test 5: detectStructure with CSV
console.log("5. Testing detectStructure with CSV:");
const csvData = `name,age,city
Alice,30,New York
Bob,25,Los Angeles`;

try {
  const structure = await detectStructure(csvData);
  console.log('Structure:', structure);
  console.log('Fields:', structure?.fields);
  console.log('');
} catch (e) {
  console.error('Error:', e.message);
}
