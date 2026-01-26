import { convertToString } from "./dist/index.js";

console.log("Comprehensive Conversion Test\n");
console.log("=" .repeat(60));

const testData = {
  csv: `name,age,city
Alice,30,NYC
Bob,25,LA`,
  json: `[{"name":"Alice","age":30,"city":"NYC"},{"name":"Bob","age":25,"city":"LA"}]`,
  ndjson: `{"name":"Alice","age":30,"city":"NYC"}
{"name":"Bob","age":25,"city":"LA"}`,
  xml: `<root>
  <record>
    <name>Alice</name>
    <age>30</age>
    <city>NYC</city>
  </record>
  <record>
    <name>Bob</name>
    <age>25</age>
    <city>LA</city>
  </record>
</root>`
};

const formats = ['csv', 'json', 'ndjson', 'xml'];

async function testConversion(from, to, data) {
  try {
    const result = await convertToString(data, {
      inputFormat: from,
      outputFormat: to
    });
    
    const preview = result.length > 100 ? result.substring(0, 100) + '...' : result;
    return { success: true, preview };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

console.log("\nTesting all format conversion combinations:\n");

for (const fromFormat of formats) {
  for (const toFormat of formats) {
    const testName = `${fromFormat.toUpperCase()} → ${toFormat.toUpperCase()}`;
    const result = await testConversion(fromFormat, toFormat, testData[fromFormat]);
    
    if (result.success) {
      console.log(`✅ ${testName.padEnd(20)} SUCCESS`);
      if (process.env.VERBOSE) {
        console.log(`   Preview: ${result.preview}\n`);
      }
    } else {
      console.log(`❌ ${testName.padEnd(20)} FAILED: ${result.error}`);
    }
  }
}

console.log("\n" + "=".repeat(60));
console.log("All conversion paths tested!");
