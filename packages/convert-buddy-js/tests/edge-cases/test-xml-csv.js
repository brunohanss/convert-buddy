import { convertToString } from "convert-buddy-js";

// Test XML to CSV
const xml = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\r\n<characters>\r\n  <character>\r\n    <name>Gorwin \"Grog\" Oakenshield</name>\r\n    <race>Human</race>\r\n    <class>Barbarian</class>\r\n    <quirk>Collects spoons from every tavern</quirk>\r\n  </character>\r\n  <character>\r\n    <name>Zilaen Whisperleaf</name>\r\n    <race>Elf</race>\r\n    <class>Rogue</class>\r\n    <quirk>Talks to shadows, claims they're shy</quirk>\r\n  </character>\r\n</characters>\r\n";

console.log("Testing XML → CSV with auto-detection:");
const csv = await convertToString(xml, { outputFormat: 'csv' });
console.log(csv);
console.log("\nLength:", csv.length);

// Test CSV -> CSV
const csvData = "name,race,class,quirk\r\n\"Gorwin \\\"Grog\\\" Oakenshield\",Human,Barbarian,\"Collects spoons from every tavern\"\r\n\"Zilaen Whisperleaf\",Elf,Rogue,\"Talks to shadows, claims they're shy\"\r\n";

console.log("\n\nTesting CSV → CSV with auto-detection:");
const csvResult = await convertToString(csvData, { outputFormat: 'csv' });
console.log(csvResult);
