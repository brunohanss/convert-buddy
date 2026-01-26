import { convertToString } from "./dist/index.js";

console.log("Testing error handling for invalid outputFormat...\n");

const testData = `name,age,city
Alice,30,NYC
Bob,25,LA`;

// Test 1: Invalid outputFormat
console.log("Test 1: Invalid outputFormat 'pdf'");
try {
  await convertToString(testData, { outputFormat: 'pdf' });
  console.log("❌ FAILED: Should have thrown an error");
} catch (err) {
  console.log("✅ PASSED: Error caught:", err.message);
}

// Test 2: Invalid inputFormat
console.log("\nTest 2: Invalid inputFormat 'yaml'");
try {
  await convertToString(testData, { inputFormat: 'yaml', outputFormat: 'json' });
  console.log("❌ FAILED: Should have thrown an error");
} catch (err) {
  console.log("✅ PASSED: Error caught:", err.message);
}

// Test 3: Valid formats should work
console.log("\nTest 3: Valid formats (csv -> json)");
try {
  const result = await convertToString(testData, { outputFormat: 'json' });
  console.log("✅ PASSED: Conversion succeeded");
  console.log("Result:", result.substring(0, 100) + "...");
} catch (err) {
  console.log("❌ FAILED: Should not have thrown an error:", err.message);
}

// Test 4: All valid output formats
console.log("\nTest 4: Testing all valid output formats");
const formats = ['csv', 'json', 'ndjson', 'xml'];
for (const format of formats) {
  try {
    await convertToString(testData, { outputFormat: format });
    console.log(`✅ ${format}: PASSED`);
  } catch (err) {
    console.log(`❌ ${format}: FAILED - ${err.message}`);
  }
}

console.log("\n✅ All tests completed!");
