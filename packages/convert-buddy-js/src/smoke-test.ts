import { ConvertBuddy, convert, convertToString, createNodeTransform } from "./index.js";

async function testBasicConversion() {
  console.log("\n=== Test: Basic CSV to NDJSON ===");
  
  const csvData = `name,age,city
Alice,30,New York
Bob,25,London
Charlie,35,Tokyo`;

  const result = await convertToString(csvData, {
    inputFormat: "csv",
    outputFormat: "ndjson",
    debug: false,
    profile: true,
  });

  console.log("Input CSV:");
  console.log(csvData);
  console.log("\nOutput NDJSON:");
  console.log(result);

  // Validate output
  const lines = result.trim().split("\n");
  if (lines.length !== 3) {
    throw new Error(`Expected 3 lines, got ${lines.length}`);
  }

  const firstRecord = JSON.parse(lines[0]);
  if (firstRecord.name !== "Alice") {
    throw new Error(`Expected name=Alice, got ${firstRecord.name}`);
  }

  console.log("✓ Basic conversion test passed");
}

async function testStreamingAPI() {
  console.log("\n=== Test: Streaming API ===");

  const buddy = await ConvertBuddy.create({
    inputFormat: "csv",
    outputFormat: "ndjson",
    debug: false,
  });

  // Push data in chunks
  const header = new TextEncoder().encode("name,age\n");
  const row1 = new TextEncoder().encode("Alice,30\n");
  const row2 = new TextEncoder().encode("Bob,25\n");

  const out1 = buddy.push(header);
  const out2 = buddy.push(row1);
  const out3 = buddy.push(row2);
  const final = buddy.finish();

  const combined = new Uint8Array(
    out1.length + out2.length + out3.length + final.length
  );
  combined.set(out1, 0);
  combined.set(out2, out1.length);
  combined.set(out3, out1.length + out2.length);
  combined.set(final, out1.length + out2.length + out3.length);

  const result = new TextDecoder().decode(combined);
  console.log("Streaming result:");
  console.log(result);

  console.log("✓ Streaming API test passed");
}

async function testNdjsonToJson() {
  console.log("\n=== Test: NDJSON to JSON Array ===");

  const ndjsonData = `{"name":"Alice","age":30}
{"name":"Bob","age":25}
{"name":"Charlie","age":35}`;

  const result = await convertToString(ndjsonData, {
    inputFormat: "ndjson",
    outputFormat: "json",
    debug: false,
  });

  console.log("Input NDJSON:");
  console.log(ndjsonData);
  console.log("\nOutput JSON:");
  console.log(result);

  // Validate it's valid JSON array
  const parsed = JSON.parse(result);
  if (!Array.isArray(parsed)) {
    throw new Error("Expected JSON array");
  }
  if (parsed.length !== 3) {
    throw new Error(`Expected 3 items, got ${parsed.length}`);
  }

  console.log("✓ NDJSON to JSON test passed");
}

async function testQuotedCsv() {
  console.log("\n=== Test: Quoted CSV with Commas ===");

  const csvData = `name,description
"Alice","Hello, World"
"Bob","Test, with, commas"
"Charlie","Normal text"`;

  const result = await convertToString(csvData, {
    inputFormat: "csv",
    outputFormat: "ndjson",
    debug: false,
  });

  console.log("Input CSV:");
  console.log(csvData);
  console.log("\nOutput NDJSON:");
  console.log(result);

  const lines = result.trim().split("\n");
  const firstRecord = JSON.parse(lines[0]);
  
  if (!firstRecord.description.includes(",")) {
    throw new Error("Expected comma in description to be preserved");
  }

  console.log("✓ Quoted CSV test passed");
}

async function testStats() {
  console.log("\n=== Test: Performance Stats ===");

  const csvData = `name,age
Alice,30
Bob,25
Charlie,35`;

  const result = await convert(new TextEncoder().encode(csvData), {
    inputFormat: "csv",
    outputFormat: "ndjson",
    profile: true,
  });

  // Stats are logged automatically with profile: true
  console.log("✓ Stats test passed");
}

async function testPartialLines() {
  console.log("\n=== Test: Partial Line Handling ===");

  const buddy = await ConvertBuddy.create({
    inputFormat: "csv",
    outputFormat: "ndjson",
    debug: false,
  });

  // Split a line across chunks
  const chunk1 = new TextEncoder().encode("name,age\nAli");
  const chunk2 = new TextEncoder().encode("ce,30\nBob,25\n");

  const out1 = buddy.push(chunk1);
  const out2 = buddy.push(chunk2);
  const final = buddy.finish();

  const combined = new Uint8Array(out1.length + out2.length + final.length);
  combined.set(out1, 0);
  combined.set(out2, out1.length);
  combined.set(final, out1.length + out2.length);

  const result = new TextDecoder().decode(combined);
  console.log("Result with partial lines:");
  console.log(result);

  const lines = result.trim().split("\n");
  if (lines.length !== 2) {
    throw new Error(`Expected 2 lines, got ${lines.length}`);
  }

  const firstRecord = JSON.parse(lines[0]);
  if (firstRecord.name !== "Alice") {
    throw new Error(`Expected name=Alice, got ${firstRecord.name}`);
  }

  console.log("✓ Partial line test passed");
}

async function testLargeDataset() {
  console.log("\n=== Test: Large Dataset Performance ===");

  // Generate large CSV
  const rows = 10000;
  let csv = "id,name,value\n";
  for (let i = 0; i < rows; i++) {
    csv += `${i},name_${i},${i * 100}\n`;
  }

  const start = performance.now();
  const result = await convert(new TextEncoder().encode(csv), {
    inputFormat: "csv",
    outputFormat: "ndjson",
    profile: true,
  });
  const end = performance.now();

  const lines = new TextDecoder().decode(result).trim().split("\n");
  
  console.log(`Processed ${rows} rows in ${(end - start).toFixed(2)}ms`);
  console.log(`Throughput: ${((csv.length / (1024 * 1024)) / ((end - start) / 1000)).toFixed(2)} MB/s`);
  console.log(`Output lines: ${lines.length}`);

  if (lines.length !== rows) {
    throw new Error(`Expected ${rows} lines, got ${lines.length}`);
  }

  console.log("✓ Large dataset test passed");
}

async function testEmptyAndWhitespace() {
  console.log("\n=== Test: Empty Lines and Whitespace ===");

  const csvData = `name,age

Alice,30

Bob,25
`;

  const result = await convertToString(csvData, {
    inputFormat: "csv",
    outputFormat: "ndjson",
    debug: false,
  });

  console.log("Input CSV (with empty lines):");
  console.log(JSON.stringify(csvData));
  console.log("\nOutput NDJSON:");
  console.log(result);

  const lines = result.trim().split("\n").filter(l => l.length > 0);
  if (lines.length !== 2) {
    throw new Error(`Expected 2 non-empty lines, got ${lines.length}`);
  }

  console.log("✓ Empty lines test passed");
}

// Run all tests
async function runAllTests() {
  console.log("╔════════════════════════════════════════╗");
  console.log("║  Convert Buddy - Smoke Test Suite     ║");
  console.log("╚════════════════════════════════════════╝");

  try {
    await testBasicConversion();
    await testStreamingAPI();
    await testNdjsonToJson();
    await testQuotedCsv();
    await testStats();
    await testPartialLines();
    await testLargeDataset();
    await testEmptyAndWhitespace();

    console.log("\n╔════════════════════════════════════════╗");
    console.log("║  ✓ All tests passed successfully!     ║");
    console.log("╚════════════════════════════════════════╝\n");
  } catch (error) {
    console.error("\n✗ Test failed:", error);
    process.exit(1);
  }
}

runAllTests();
