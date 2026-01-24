import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { detectStructure } from "../index.js";

describe("detectStructure - Comprehensive Tests", () => {
  describe("CSV Detection", () => {
    it("should detect CSV with comma delimiter", async () => {
      const csv = `name,age,city
Alice,30,New York
Bob,25,Los Angeles`;
      
      const structure = await detectStructure(csv);
      
      assert.strictEqual(structure?.format, "csv");
      assert.deepStrictEqual(structure?.fields, ["name", "age", "city"]);
      assert.strictEqual(structure?.delimiter, ",");
      assert.strictEqual(structure?.recordElement, undefined);
    });

    it("should detect CSV with pipe delimiter", async () => {
      const csv = `name|age|city
Alice|30|New York
Bob|25|Los Angeles`;
      
      const structure = await detectStructure(csv);
      
      assert.strictEqual(structure?.format, "csv");
      assert.deepStrictEqual(structure?.fields, ["name", "age", "city"]);
      assert.strictEqual(structure?.delimiter, "|");
    });

    it("should detect CSV with tab delimiter", async () => {
      const csv = `name\tage\tcity
Alice\t30\tNew York
Bob\t25\tLos Angeles`;
      
      const structure = await detectStructure(csv);
      
      assert.strictEqual(structure?.format, "csv");
      assert.deepStrictEqual(structure?.fields, ["name", "age", "city"]);
      assert.strictEqual(structure?.delimiter, "\t");
    });

    it("should detect CSV with semicolon delimiter", async () => {
      const csv = `name;age;city
Alice;30;New York
Bob;25;Los Angeles`;
      
      const structure = await detectStructure(csv);
      
      assert.strictEqual(structure?.format, "csv");
      assert.deepStrictEqual(structure?.fields, ["name", "age", "city"]);
      assert.strictEqual(structure?.delimiter, ";");
    });

    it("should detect CSV with multiple field types", async () => {
      const csv = `name,age,salary,is_active,join_date
Alice,30,50000.50,true,2020-01-15
Bob,25,45000.00,false,2021-06-20`;
      
      const structure = await detectStructure(csv);
      
      assert.strictEqual(structure?.format, "csv");
      assert.strictEqual(structure?.fields.length, 5);
      assert.deepStrictEqual(structure?.fields, [
        "name",
        "age", 
        "salary",
        "is_active",
        "join_date"
      ]);
      assert.strictEqual(structure?.delimiter, ",");
    });
  });

  describe("JSON Detection", () => {
    it("should detect JSON array with objects", async () => {
      const json = '[{"name":"Alice","age":30}]';
      
      const structure = await detectStructure(json);
      
      assert.strictEqual(structure?.format, "json");
      assert.ok(structure?.fields.includes("name"));
      assert.ok(structure?.fields.includes("age"));
      assert.strictEqual(structure?.delimiter, undefined);
      assert.strictEqual(structure?.recordElement, undefined);
    });

    it("should detect JSON with multiple records", async () => {
      const json = '[{"name":"Alice","age":30},{"name":"Bob","age":25}]';
      
      const structure = await detectStructure(json);
      
      assert.strictEqual(structure?.format, "json");
      assert.ok(structure?.fields.includes("name"));
      assert.ok(structure?.fields.includes("age"));
    });
  });

  describe("NDJSON Detection", () => {
    it("should detect NDJSON format", async () => {
      const ndjson = '{"name":"Alice","age":30}\n{"name":"Bob","age":25}';
      
      const structure = await detectStructure(ndjson);
      
      assert.strictEqual(structure?.format, "ndjson");
      assert.ok(structure?.fields.includes("name"));
      assert.ok(structure?.fields.includes("age"));
      assert.strictEqual(structure?.delimiter, undefined);
      assert.strictEqual(structure?.recordElement, undefined);
    });

    it("should detect single-line NDJSON", async () => {
      const ndjson = '{"name":"Alice","age":30}';
      
      const structure = await detectStructure(ndjson);
      
      // Single line JSON object is detected as JSON or NDJSON
      assert.ok(structure?.format === "json" || structure?.format === "ndjson");
      assert.ok(structure?.fields.includes("name"));
      assert.ok(structure?.fields.includes("age"));
    });
  });

  describe("XML Detection", () => {
    it("should detect XML with record element", async () => {
      const xml = `<catalog>
  <book>
    <title>The Great Gatsby</title>
    <author>F. Scott Fitzgerald</author>
    <year>1925</year>
  </book>
  <book>
    <title>1984</title>
    <author>George Orwell</author>
    <year>1949</year>
  </book>
</catalog>`;
      
      const structure = await detectStructure(xml);
      
      assert.strictEqual(structure?.format, "xml");
      assert.ok(Array.isArray(structure?.fields));
      assert.ok(structure?.fields.length > 0);
      assert.strictEqual(structure?.recordElement, "book");
      assert.strictEqual(structure?.delimiter, undefined);
    });

    it("should detect XML elements", async () => {
      const xml = `<items><item><name>Alice</name><age>30</age></item></items>`;
      
      const structure = await detectStructure(xml);
      
      assert.strictEqual(structure?.format, "xml");
      assert.ok(structure?.fields.includes("items"));
      assert.ok(structure?.fields.includes("item"));
      assert.strictEqual(structure?.recordElement, "item");
    });
  });

  describe("Format Hint", () => {
    it("should use format hint for CSV", async () => {
      const data = "name,age\nAlice,30";
      
      const structure = await detectStructure(data, "csv");
      
      assert.strictEqual(structure?.format, "csv");
      assert.deepStrictEqual(structure?.fields, ["name", "age"]);
    });

    it("should use format hint for XML", async () => {
      const data = "<items><item><id>1</id></item></items>";
      
      const structure = await detectStructure(data, "xml");
      
      assert.strictEqual(structure?.format, "xml");
    });
  });

  describe("Data Type - Fields are strings", () => {
    it("fields should be array of strings, not objects", async () => {
      const csv = "name,age\nAlice,30";
      
      const structure = await detectStructure(csv);
      
      assert.ok(Array.isArray(structure?.fields));
      assert.strictEqual(typeof structure?.fields[0], "string");
      assert.strictEqual(structure?.fields[0], "name");
      assert.strictEqual(structure?.fields[1], "age");
      
      // Fields should NOT be objects with name/type/sample properties
      assert.strictEqual(typeof (structure?.fields[0] as any).name, "undefined");
      assert.strictEqual(typeof (structure?.fields[0] as any).type, "undefined");
    });
  });

  describe("Structure Properties", () => {
    it("delimiter should be at top level for CSV", async () => {
      const csv = "name,age\nAlice,30";
      
      const structure = await detectStructure(csv);
      
      // Delimiter is at top level, not nested under csv property
      assert.strictEqual(structure?.delimiter, ",");
      assert.strictEqual((structure as any)?.csv, undefined);
    });

    it("recordElement should be at top level for XML", async () => {
      const xml = "<items><item><id>1</id></item></items>";
      
      const structure = await detectStructure(xml);
      
      // recordElement is at top level, not nested under xml property
      assert.strictEqual(structure?.recordElement, "item");
      assert.strictEqual((structure as any)?.xml, undefined);
    });
  });

  describe("Multiple Formats Comparison", () => {
    it("should correctly detect different formats", async () => {
      const formats = {
        csv: "name,age\nAlice,30",
        json: '[{"name":"Alice","age":30}]',
        ndjson: '{"name":"Alice","age":30}',
        xml: "<items><item><name>Alice</name><age>30</age></item></items>"
      };

      const csvStruct = await detectStructure(formats.csv);
      assert.strictEqual(csvStruct?.format, "csv");
      assert.ok(csvStruct?.fields.includes("name"));
      assert.ok(csvStruct?.fields.includes("age"));

      const jsonStruct = await detectStructure(formats.json);
      assert.strictEqual(jsonStruct?.format, "json");
      assert.ok(jsonStruct?.fields.includes("name"));
      assert.ok(jsonStruct?.fields.includes("age"));

      const ndjsonStruct = await detectStructure(formats.ndjson);
      assert.ok(ndjsonStruct?.format === "json" || ndjsonStruct?.format === "ndjson");
      assert.ok(ndjsonStruct?.fields.includes("name"));
      assert.ok(ndjsonStruct?.fields.includes("age"));

      const xmlStruct = await detectStructure(formats.xml);
      assert.strictEqual(xmlStruct?.format, "xml");
      assert.ok(xmlStruct?.fields.length > 0);
    });
  });
});
