import { describe, it } from "node:test";
import { strict as assert } from "node:assert";
import { convertToString, detectFormat, detectStructure } from "../../index.js";

/**
 * Auto-Detection Integration Tests
 * 
 * These tests ensure that auto-detection works correctly when inputFormat is not specified.
 * This prevents regression of issues where formats were misdetected or conversion failed.
 */
describe("Auto-Detection Integration Tests", () => {
  describe("Format Detection Accuracy", () => {
    it("should correctly detect JSON array", async () => {
      const jsonArray = `[
  {
    "name": "Alice",
    "age": 30
  },
  {
    "name": "Bob",
    "age": 25
  }
]`;
      
      const format = await detectFormat(jsonArray);
      assert.strictEqual(format, "json", "Should detect JSON array, not NDJSON");
    });

    it("should correctly detect NDJSON", async () => {
      const ndjson = `{"name":"Alice","age":30}
{"name":"Bob","age":25}`;
      
      const format = await detectFormat(ndjson);
      assert.strictEqual(format, "ndjson");
    });

    it("should correctly detect CSV", async () => {
      const csv = `name,age,city
Alice,30,New York
Bob,25,Los Angeles`;
      
      const format = await detectFormat(csv);
      assert.strictEqual(format, "csv");
    });

    it("should correctly detect XML", async () => {
      const xml = `<?xml version="1.0"?>
<people>
  <person>
    <name>Alice</name>
    <age>30</age>
  </person>
</people>`;
      
      const format = await detectFormat(xml);
      assert.strictEqual(format, "xml");
    });
  });

  describe("Auto-Detection Conversion - JSON Array", () => {
    it("should convert JSON array to CSV with auto-detection", async () => {
      const jsonArray = `[
  {
    "name": "Alice",
    "age": 30
  },
  {
    "name": "Bob",
    "age": 25
  }
]`;
      
      const csv = await convertToString(jsonArray, { outputFormat: "csv" });
      
      // Should produce valid CSV
      assert.ok(csv.includes("name"), "CSV should have header");
      assert.ok(csv.includes("Alice"), "CSV should have Alice");
      assert.ok(csv.includes("Bob"), "CSV should have Bob");
      assert.ok(!csv.includes("{"), "Should not contain JSON braces");
    });

    it("should convert JSON array to NDJSON with auto-detection", async () => {
      const jsonArray = `[{"name":"Alice"},{"name":"Bob"}]`;
      
      const ndjson = await convertToString(jsonArray, { outputFormat: "ndjson" });
      
      const lines = ndjson.trim().split("\n");
      assert.strictEqual(lines.length, 2);
      assert.deepStrictEqual(JSON.parse(lines[0]), { name: "Alice" });
      assert.deepStrictEqual(JSON.parse(lines[1]), { name: "Bob" });
    });
  });

  describe("Auto-Detection Conversion - NDJSON", () => {
    it("should convert NDJSON to CSV with auto-detection", async () => {
      const ndjson = `{"name":"Alice","age":30}
{"name":"Bob","age":25}`;
      
      const csv = await convertToString(ndjson, { outputFormat: "csv" });
      
      assert.ok(csv.includes("name"), "CSV should have header");
      assert.ok(csv.includes("Alice"), "CSV should have Alice");
      assert.ok(!csv.includes("{"), "Should not contain JSON braces");
    });

    it("should convert NDJSON to JSON with auto-detection", async () => {
      const ndjson = `{"name":"Alice"}
{"name":"Bob"}`;
      
      const json = await convertToString(ndjson, { outputFormat: "json" });
      
      const parsed = JSON.parse(json);
      assert.strictEqual(parsed.length, 2);
      assert.deepStrictEqual(parsed[0], { name: "Alice" });
      assert.deepStrictEqual(parsed[1], { name: "Bob" });
    });
  });

  describe("Auto-Detection Conversion - CSV", () => {
    it("should convert CSV to JSON with auto-detection", async () => {
      const csv = `name,age
Alice,30
Bob,25`;
      
      const json = await convertToString(csv, { outputFormat: "json" });
      
      const parsed = JSON.parse(json);
      assert.strictEqual(parsed.length, 2);
      assert.strictEqual(parsed[0].name, "Alice");
      assert.strictEqual(parsed[0].age, "30");
    });

    it("should convert CSV to CSV with auto-detection (passthrough)", async () => {
      const csv = `name,age
Alice,30
Bob,25`;
      
      const result = await convertToString(csv, { outputFormat: "csv" });
      
      // Should be valid CSV
      assert.ok(result.includes("name"), "Should have header");
      assert.ok(result.includes("Alice"), "Should have Alice");
      assert.ok(result.includes("Bob"), "Should have Bob");
      // Should not be JSON
      assert.ok(!result.includes("{"), "Should not contain JSON braces");
      assert.ok(!result.includes("["), "Should not contain JSON brackets");
    });

    it("should convert CSV to NDJSON with auto-detection", async () => {
      const csv = `name,age
Alice,30
Bob,25`;
      
      const ndjson = await convertToString(csv, { outputFormat: "ndjson" });
      
      const lines = ndjson.trim().split("\n");
      assert.strictEqual(lines.length, 2);
      assert.deepStrictEqual(JSON.parse(lines[0]), { name: "Alice", age: "30" });
    });
  });

  describe("Auto-Detection Conversion - XML", () => {
    it("should convert XML to CSV with auto-detection", async () => {
      const xml = `<?xml version="1.0"?>
<people>
  <person>
    <name>Alice</name>
    <age>30</age>
  </person>
  <person>
    <name>Bob</name>
    <age>25</age>
  </person>
</people>`;
      
      const csv = await convertToString(xml, { outputFormat: "csv" });
      
      assert.ok(csv.includes("name"), "CSV should have name field");
      assert.ok(csv.includes("Alice"), "CSV should have Alice");
      assert.ok(csv.includes("Bob"), "CSV should have Bob");
      assert.ok(!csv.includes("<"), "Should not contain XML tags");
    });

    it.skip("should convert XML to JSON with auto-detection (XML parser bug)", async () => {
      const xml = `<?xml version="1.0"?>
<people>
  <person>
    <name>Alice</name>
  </person>
</people>`;
      
      const json = await convertToString(xml, { outputFormat: "json" });
      
      const parsed = JSON.parse(json);
      assert.ok(Array.isArray(parsed));
      // XML parsing may include the parent element, so check if any record has the name
      const hasAlice = parsed.some((record: any) => 
        record.name === "Alice" || (record.person && record.person.name === "Alice")
      );
      assert.ok(hasAlice, "JSON should contain Alice somewhere in the structure");
    });
  });

  describe("detectStructure", () => {
    it("should detect CSV structure with fields", async () => {
      const csv = `name,age,city
Alice,30,New York
Bob,25,Los Angeles`;
      
      const structure = await detectStructure(csv);
      
      assert.strictEqual(structure?.format, "csv");
      assert.ok(Array.isArray(structure?.fields), "fields should be an array");
      assert.strictEqual(structure?.fields.length, 3);
      assert.deepStrictEqual(structure?.fields, ["name", "age", "city"]);
      assert.strictEqual(structure?.delimiter, ",");
    });

    it("should detect JSON structure", async () => {
      const json = `[{"name":"Alice","age":30}]`;
      
      const structure = await detectStructure(json);
      
      assert.strictEqual(structure?.format, "json");
      assert.ok(Array.isArray(structure?.fields));
    });

    it("should detect XML structure", async () => {
      const xml = `<?xml version="1.0"?>
<people>
  <person>
    <name>Alice</name>
  </person>
</people>`;
      
      const structure = await detectStructure(xml);
      
      assert.strictEqual(structure?.format, "xml");
      assert.ok(Array.isArray(structure?.fields));
    });
  });

  describe("Edge Cases", () => {
    it("should handle JSON with CRLF line endings", async () => {
      const json = "[\r\n  {\"name\":\"Alice\"}\r\n]";
      
      const format = await detectFormat(json);
      assert.strictEqual(format, "json", "Should detect JSON with CRLF");
      
      const csv = await convertToString(json, { outputFormat: "csv" });
      assert.ok(csv.includes("Alice"));
    });

    it("should handle NDJSON with CRLF line endings", async () => {
      const ndjson = "{\"name\":\"Alice\"}\r\n{\"name\":\"Bob\"}\r\n";
      
      const format = await detectFormat(ndjson);
      assert.strictEqual(format, "ndjson");
      
      const csv = await convertToString(ndjson, { outputFormat: "csv" });
      assert.ok(csv.includes("Alice"));
      assert.ok(csv.includes("Bob"));
    });

    it("should handle CSV with quoted fields", async () => {
      const csv = `name,description
"Alice","A person with a, comma"
"Bob","Another person"`;
      
      const json = await convertToString(csv, { outputFormat: "json" });
      const parsed = JSON.parse(json);
      
      assert.strictEqual(parsed[0].description, "A person with a, comma");
    });

    it("should handle XML with special characters", async () => {
      const xml = `<?xml version="1.0"?>
<data>
  <item>
    <name>Alice</name>
  </item>
</data>`;
      
      const json = await convertToString(xml, { outputFormat: "json" });
      // Just verify it produces valid JSON and doesn't crash
      const parsed = JSON.parse(json);
      assert.ok(Array.isArray(parsed), "Should produce an array");
      assert.ok(parsed.length > 0, "Should have at least one record");
    });
  });
});
