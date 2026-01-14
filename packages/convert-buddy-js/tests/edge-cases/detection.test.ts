import { describe, it } from "node:test";
import {
  detectFormat,
  detectCsvFieldsAndDelimiter,
} from "../../index.js";
import { strict as assert } from "node:assert";

/**
 * CSV Format Detection Test Suite
 * Tests the automatic detection of CSV delimiters and fields
 */
describe("CSV Format Detection", () => {
  describe("Delimiter Detection", () => {
    it("should detect comma-delimited CSV", async () => {
      const csv = "name,age,city\nAlice,30,NYC\nBob,25,LA\n";
      const detection = await detectCsvFieldsAndDelimiter(csv);
      assert.strictEqual(detection?.delimiter, ",");
      assert.strictEqual(detection?.fields.length, 3);
      assert.deepStrictEqual(detection?.fields, ["name", "age", "city"]);
    });

    it("should detect tab-delimited CSV", async () => {
      const csv = "name\tage\tcity\nAlice\t30\tNYC\nBob\t25\tLA\n";
      const detection = await detectCsvFieldsAndDelimiter(csv);
      assert.strictEqual(detection?.delimiter, "\t");
      assert.strictEqual(detection?.fields.length, 3);
    });

    it("should detect semicolon-delimited CSV", async () => {
      const csv = "name;age;city\nAlice;30;NYC\nBob;25;LA\n";
      const detection = await detectCsvFieldsAndDelimiter(csv);
      assert.strictEqual(detection?.delimiter, ";");
      assert.strictEqual(detection?.fields.length, 3);
    });

    it("should detect pipe-delimited CSV", async () => {
      const csv = "name|age|city\nAlice|30|NYC\nBob|25|LA\n";
      const detection = await detectCsvFieldsAndDelimiter(csv);
      assert.strictEqual(detection?.delimiter, "|");
      assert.strictEqual(detection?.fields.length, 3);
      assert.deepStrictEqual(detection?.fields, ["name", "age", "city"]);
    });

    it("should detect pipe delimiter with many columns", async () => {
      const csv =
        "col_id|col_name|col_desc|col_category|col_type|col_url|col_price|col_discount\n001|product_a|content_a|category_a|type_a|http://example.com|100.00|80.00\n002|product_b|content_b|category_b|type_b|http://example.com|200.00|150.00\n";
      const detection = await detectCsvFieldsAndDelimiter(csv);
      assert.strictEqual(detection?.delimiter, "|");
      assert.strictEqual(detection?.fields.length, 8);
      assert.strictEqual(detection?.fields[0], "col_id");
      assert.strictEqual(detection?.fields[7], "col_discount");
    });

    it("should prefer pipe delimiter when counts are close", async () => {
      // This simulates a file with trailing empty comma-separated fields
      // that would confuse a naive delimiter detector
      const csv =
        "a|b|c|d|e\n1|2|3|4|5\n,,,,,\n";
      const detection = await detectCsvFieldsAndDelimiter(csv);
      // Should detect pipe as the main delimiter used in the data
      assert.strictEqual(detection?.delimiter, "|");
    });

    it("should detect delimiter correctly with quoted fields", async () => {
      const csv =
        'ProductID|Code|Name|Description\n"SKU123"|"CODE456"|"Item X"|"Contains | pipe"\n';
      const detection = await detectCsvFieldsAndDelimiter(csv);
      assert.strictEqual(detection?.delimiter, "|");
      assert.strictEqual(detection?.fields.length, 4);
    });

    it("should handle Google Shopping feed format", async () => {
      // Generic pipe-delimited format with many columns and trailing empty fields
      // This tests detection accuracy with realistic data volume
      const csv = `col_1|col_2|col_3|col_4|col_5|col_6|col_7|col_8|col_9|col_10|col_11|col_12|col_13|col_14|col_15|col_16|col_17|col_18|col_19|col_20|col_21|col_22|col_23|col_24|col_25|col_26|col_27|col_28|col_29|col_30|col_31|col_32|col_33|col_34|col_35|col_36|col_37|col_38|col_39,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
row1_a|row1_b|row1_c|row1_d|row1_e|row1_f|row1_g|row1_h|row1_i|row1_j|row1_k|row1_l|row1_m|row1_n|row1_o|row1_p|row1_q|row1_r|row1_s|row1_t|row1_u|row1_v|row1_w|row1_x|row1_y|row1_z|row1_aa|row1_ab|row1_ac|row1_ad|row1_ae|row1_af|row1_ag|row1_ah|row1_ai|row1_aj|row1_ak|row1_al|row1_am|||||
row2_a|row2_b|row2_c|row2_d|row2_e|row2_f|row2_g|row2_h|row2_i|row2_j|row2_k|row2_l|row2_m|row2_n|row2_o|row2_p|row2_q|row2_r|row2_s|row2_t|row2_u|row2_v|row2_w|row2_x|row2_y|row2_z|row2_aa|row2_ab|row2_ac|row2_ad|row2_ae|row2_af|row2_ag|row2_ah|row2_ai|row2_aj|row2_ak|row2_al|row2_am|||||
`;
      const detection = await detectCsvFieldsAndDelimiter(csv);
      assert.strictEqual(detection?.delimiter, "|");
      // Should have detected the correct field count from the header
      assert(detection!.fields.length > 30);
      assert.strictEqual(detection?.fields[0], "col_1");
      assert.strictEqual(detection?.fields[1], "col_2");
    });
  });

  describe("Format Detection", () => {
    it("should detect JSON format", async () => {
      const json = '{"name":"Alice","age":30}';
      const format = await detectFormat(json);
      assert.strictEqual(format, "json");
    });

    it("should detect NDJSON format", async () => {
      const ndjson = '{"name":"Alice","age":30}\n{"name":"Bob","age":25}\n';
      const format = await detectFormat(ndjson);
      assert.strictEqual(format, "ndjson");
    });

    it("should detect XML format", async () => {
      const xml =
        "<?xml version=\"1.0\"?><root><item>test</item></root>";
      const format = await detectFormat(xml);
      assert.strictEqual(format, "xml");
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty file", async () => {
      const detection = await detectCsvFieldsAndDelimiter("");
      assert.strictEqual(detection, null);
    });

    it("should handle single column", async () => {
      const csv = "name\nAlice\nBob\n";
      const detection = await detectCsvFieldsAndDelimiter(csv);
      assert.strictEqual(detection?.fields.length, 1);
    });

    it("should handle CSV with Unicode characters", async () => {
      const csv = "名前|年齢|都市\n太郎|25|東京\n";
      const detection = await detectCsvFieldsAndDelimiter(csv);
      assert.strictEqual(detection?.delimiter, "|");
      assert.deepStrictEqual(detection?.fields, ["名前", "年齢", "都市"]);
    });

    it("should handle CSV with special characters in field names", async () => {
      const csv = "product_id|unit-price|is_available\n123|19.99|true\n";
      const detection = await detectCsvFieldsAndDelimiter(csv);
      assert.strictEqual(detection?.delimiter, "|");
      assert.deepStrictEqual(detection?.fields, [
        "product_id",
        "unit-price",
        "is_available",
      ]);
    });

    it("should handle large number of fields", async () => {
      // Create a CSV with 100 pipe-delimited fields
      const fields = Array.from({ length: 100 }, (_, i) => `field${i + 1}`);
      const data = fields.join("|") + "\n";
      const detection = await detectCsvFieldsAndDelimiter(data);
      assert.strictEqual(detection?.delimiter, "|");
      assert.strictEqual(detection?.fields.length, 100);
    });

    it("should detect delimiter consistency across multiple lines", async () => {
      const csv =
        "col1|col2|col3\nval1|val2|val3\nval4|val5|val6\nval7|val8|val9\n";
      const detection = await detectCsvFieldsAndDelimiter(csv);
      assert.strictEqual(detection?.delimiter, "|");
      assert.strictEqual(detection?.fields.length, 3);
    });

    it("should handle mixed quoted and unquoted fields with pipe delimiter", async () => {
      const csv =
        'id|name|description\n1|"Product A"|Normal description\n2|"Product B"|"Description with | pipe"\n';
      const detection = await detectCsvFieldsAndDelimiter(csv);
      assert.strictEqual(detection?.delimiter, "|");
    });
  });
});
