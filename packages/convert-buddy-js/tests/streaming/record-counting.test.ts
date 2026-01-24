import test from "node:test";
import assert from "node:assert";
import { ConvertBuddy } from "../../index.js";

test("Records are counted for all conversion types", async (t) => {
  const testData = [
    { name: "Alice", age: 30 },
    { name: "Bob", age: 25 },
    { name: "Charlie", age: 35 },
  ];
  
  const csvData = "name,age\nAlice,30\nBob,25\nCharlie,35\n";
  const jsonData = JSON.stringify(testData);
  const ndjsonData = testData.map(r => JSON.stringify(r)).join("\n") + "\n";
  const xmlData = `<?xml version="1.0"?><root><item><name>Alice</name><age>30</age></item><item><name>Bob</name><age>25</age></item><item><name>Charlie</name><age>35</age></item></root>`;

  const expectedRecords = 3;

  await t.test("CSV → CSV (passthrough)", async () => {
    const buddy = await ConvertBuddy.create({
      inputFormat: "csv",
      outputFormat: "csv",
      profile: true,
    });

    const encoder = new TextEncoder();
    const bytes = encoder.encode(csvData);
    buddy.push(bytes);
    buddy.finish();

    const stats = buddy.stats();
    assert.strictEqual(
      stats.recordsProcessed,
      expectedRecords,
      `CSV → CSV should count ${expectedRecords} records, got ${stats.recordsProcessed}`
    );
  });

  await t.test("JSON → JSON (passthrough)", async () => {
    const buddy = await ConvertBuddy.create({
      inputFormat: "json",
      outputFormat: "json",
      profile: true,
    });

    const encoder = new TextEncoder();
    const bytes = encoder.encode(jsonData);
    buddy.push(bytes);
    buddy.finish();

    const stats = buddy.stats();
    assert.strictEqual(
      stats.recordsProcessed,
      expectedRecords,
      `JSON → JSON should count ${expectedRecords} records, got ${stats.recordsProcessed}`
    );
  });

  await t.test("NDJSON → NDJSON (passthrough)", async () => {
    const buddy = await ConvertBuddy.create({
      inputFormat: "ndjson",
      outputFormat: "ndjson",
      profile: true,
    });

    const encoder = new TextEncoder();
    const bytes = encoder.encode(ndjsonData);
    buddy.push(bytes);
    buddy.finish();

    const stats = buddy.stats();
    assert.strictEqual(
      stats.recordsProcessed,
      expectedRecords,
      `NDJSON → NDJSON should count ${expectedRecords} records, got ${stats.recordsProcessed}`
    );
  });

  await t.test("CSV → JSON", async () => {
    const buddy = await ConvertBuddy.create({
      inputFormat: "csv",
      outputFormat: "json",
      profile: true,
    });

    const encoder = new TextEncoder();
    const bytes = encoder.encode(csvData);
    buddy.push(bytes);
    buddy.finish();

    const stats = buddy.stats();
    assert.strictEqual(
      stats.recordsProcessed,
      expectedRecords,
      `CSV → JSON should count ${expectedRecords} records, got ${stats.recordsProcessed}`
    );
  });

  await t.test("CSV → NDJSON", async () => {
    const buddy = await ConvertBuddy.create({
      inputFormat: "csv",
      outputFormat: "ndjson",
      profile: true,
    });

    const encoder = new TextEncoder();
    const bytes = encoder.encode(csvData);
    buddy.push(bytes);
    buddy.finish();

    const stats = buddy.stats();
    assert.strictEqual(
      stats.recordsProcessed,
      expectedRecords,
      `CSV → NDJSON should count ${expectedRecords} records, got ${stats.recordsProcessed}`
    );
  });

  await t.test("JSON → CSV", async () => {
    const buddy = await ConvertBuddy.create({
      inputFormat: "json",
      outputFormat: "csv",
      profile: true,
    });

    const encoder = new TextEncoder();
    const bytes = encoder.encode(jsonData);
    buddy.push(bytes);
    buddy.finish();

    const stats = buddy.stats();
    assert.strictEqual(
      stats.recordsProcessed,
      expectedRecords,
      `JSON → CSV should count ${expectedRecords} records, got ${stats.recordsProcessed}`
    );
  });

  await t.test("JSON → NDJSON", async () => {
    const buddy = await ConvertBuddy.create({
      inputFormat: "json",
      outputFormat: "ndjson",
      profile: true,
    });

    const encoder = new TextEncoder();
    const bytes = encoder.encode(jsonData);
    buddy.push(bytes);
    buddy.finish();

    const stats = buddy.stats();
    assert.strictEqual(
      stats.recordsProcessed,
      expectedRecords,
      `JSON → NDJSON should count ${expectedRecords} records, got ${stats.recordsProcessed}`
    );
  });

  await t.test("NDJSON → JSON", async () => {
    const buddy = await ConvertBuddy.create({
      inputFormat: "ndjson",
      outputFormat: "json",
      profile: true,
    });

    const encoder = new TextEncoder();
    const bytes = encoder.encode(ndjsonData);
    buddy.push(bytes);
    buddy.finish();

    const stats = buddy.stats();
    assert.strictEqual(
      stats.recordsProcessed,
      expectedRecords,
      `NDJSON → JSON should count ${expectedRecords} records, got ${stats.recordsProcessed}`
    );
  });

  await t.test("NDJSON → CSV", async () => {
    const buddy = await ConvertBuddy.create({
      inputFormat: "ndjson",
      outputFormat: "csv",
      profile: true,
    });

    const encoder = new TextEncoder();
    const bytes = encoder.encode(ndjsonData);
    buddy.push(bytes);
    buddy.finish();

    const stats = buddy.stats();
    assert.strictEqual(
      stats.recordsProcessed,
      expectedRecords,
      `NDJSON → CSV should count ${expectedRecords} records, got ${stats.recordsProcessed}`
    );
  });

  await t.test("XML → JSON", async () => {
    const buddy = await ConvertBuddy.create({
      inputFormat: "xml",
      outputFormat: "json",
      profile: true,
    });

    const encoder = new TextEncoder();
    const bytes = encoder.encode(xmlData);
    buddy.push(bytes);
    buddy.finish();

    const stats = buddy.stats();
    assert.strictEqual(
      stats.recordsProcessed,
      expectedRecords,
      `XML → JSON should count ${expectedRecords} records, got ${stats.recordsProcessed}`
    );
  });
});
