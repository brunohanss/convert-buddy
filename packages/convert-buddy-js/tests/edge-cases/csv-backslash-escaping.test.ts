import test from 'node:test';
import assert from 'node:assert';
import { convertToString } from '../index.js';

test('CSV Backslash Escaping - Comprehensive Test Suite', async (t) => {
  
  await t.test('Basic backslash-escaped quotes', async () => {
    const input = `name,title
"Gorwin \\"Grog\\" Oakenshield",Barbarian`;
    
    const ndjson = await convertToString(input, { 
      outputFormat: 'ndjson' 
    });
    
    const record = JSON.parse(ndjson.trim().split('\n')[0]);
    assert.strictEqual(record.name, 'Gorwin "Grog" Oakenshield', 'Should parse backslash-escaped quotes correctly');
  });

  await t.test('Multiple backslash-escaped quotes', async () => {
    const input = `message,value
"Multiple \\"Escapes\\"",123`;
    
    const ndjson = await convertToString(input, { 
      outputFormat: 'ndjson' 
    });
    
    const record = JSON.parse(ndjson.trim());
    assert.strictEqual(record.message, 'Multiple "Escapes"', 'Should handle multiple escaped quotes');
  });

  await t.test('Mixed RFC 4180 and backslash escaping', async () => {
    const input = `name,description
"Gorwin \\"Grog\\" Oakenshield","Says ""Hello"" to everyone"`;
    
    const ndjson = await convertToString(input, { 
      outputFormat: 'ndjson' 
    });
    
    const record = JSON.parse(ndjson.trim());
    assert(record.name.includes('Grog'), 'Should parse backslash-escaped quotes');
    assert(record.description.includes('Hello'), 'Should parse RFC 4180 escaping');
  });

  await t.test('Roundtrip: CSV to NDJSON to CSV', async () => {
    const originalCsv = `name,role,quote
"Gorwin \\"Grog\\" Oakenshield",Barbarian,"Collects spoons"
"Zilaen Whisperleaf",Rogue,"Talks to shadows"`;
    
    // CSV -> NDJSON
    const ndjson = await convertToString(originalCsv, { 
      outputFormat: 'ndjson' 
    });
    
    // Verify data was extracted correctly
    const records = ndjson.trim().split('\n').map(l => JSON.parse(l));
    assert(records[0].name.includes('Grog'), 'First record should have parsed backslash-escaped quotes');
    assert.strictEqual(records[1].name, 'Zilaen Whisperleaf', 'Second record should parse correctly');
    
    // NDJSON -> CSV
    const csvOutput = await convertToString(ndjson, { 
      inputFormat: 'ndjson',
      outputFormat: 'csv' 
    });
    
    // Verify data is preserved (output uses RFC 4180 escaping)
    assert(csvOutput.includes('Gorwin'), 'CSV output should contain Gorwin');
    assert(csvOutput.includes('Grog'), 'CSV output should contain Grog');
    assert(csvOutput.includes('Zilaen'), 'CSV output should contain Zilaen');
  });

  await t.test('Real-world D&D character data with backslash escapes', async () => {
    const input = `name,race,class,quirk
"Gorwin \\"Grog\\" Oakenshield",Human,Barbarian,"Collects spoons from every tavern"
"Zilaen Whisperleaf",Elf,Rogue,"Talks to shadows, claims they're shy"
"Pip Thistlewhisk",Halfling,Bard,"Plays the lute with carrots"
"Thraxxus Bonegrinder",Orc,Cleric,"Prays to a rock named Doris"
"Elaria Moonbeam",Half-Elf,Wizard,"Writes shopping lists in ancient runes"`;
    
    const ndjson = await convertToString(input, { 
      outputFormat: 'ndjson' 
    });
    
    const records = ndjson.trim().split('\n').map(l => JSON.parse(l));
    
    assert.strictEqual(records.length, 5, 'Should parse all 5 records');
    assert.strictEqual(records[0].name, 'Gorwin "Grog" Oakenshield', 'First character name correct');
    assert.strictEqual(records[0].race, 'Human', 'First character race correct');
    assert.strictEqual(records[0].quirk, 'Collects spoons from every tavern', 'First character quirk correct');
    assert.strictEqual(records[1].name, 'Zilaen Whisperleaf', 'Second character name correct');
    assert.strictEqual(records[4].class, 'Wizard', 'Last character class correct');
  });
});
