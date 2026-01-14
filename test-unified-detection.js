const { detectFormat, detectStructure } = require('./packages/convert-buddy-js');
const fs = require('fs');

async function testUnifiedDetection() {
  console.log('Testing unified detection API...\n');

  // Test JSON
  const jsonData = fs.readFileSync('./test-sample.json');
  const jsonStream = new ReadableStream({
    start(controller) {
      controller.enqueue(jsonData);
      controller.close();
    }
  });
  
  const jsonFormat = await detectFormat(jsonStream);
  console.log('JSON format detection:', jsonFormat);
  
  const jsonStructure = await detectStructure(fs.createReadStream('./test-sample.json'), jsonFormat);
  console.log('JSON structure:', jsonStructure);
  console.log('');

  // Test NDJSON
  const ndjsonFormat = await detectFormat(fs.createReadStream('./test-sample.ndjson'));
  console.log('NDJSON format detection:', ndjsonFormat);
  
  const ndjsonStructure = await detectStructure(fs.createReadStream('./test-sample.ndjson'), ndjsonFormat);
  console.log('NDJSON structure:', ndjsonStructure);
  console.log('');

  // Test CSV
  const csvFormat = await detectFormat(fs.createReadStream('./test-sample.xml'));
  console.log('CSV format detection:', csvFormat);
  
  const csvStructure = await detectStructure(fs.createReadStream('./test-sample.xml'), csvFormat || 'csv');
  console.log('CSV structure:', csvStructure);
  console.log('');
}

testUnifiedDetection().catch(console.error);