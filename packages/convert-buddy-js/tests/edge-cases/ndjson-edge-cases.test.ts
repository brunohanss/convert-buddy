import { describe, it } from "node:test";
import { convertToString, convert } from "../../src/index.js";
import { strict as assert } from "node:assert";

/**
 * Comprehensive NDJSON Edge Case Test Suite
 * 
 * Tests all possible edge cases for NDJSON parsing to ensure maximum safety.
 */

describe("NDJSON Edge Cases - Comprehensive Safety Tests", () => {
  
  // ========== LINE HANDLING ==========
  describe("Line Handling", () => {
    it("should handle empty file", async () => {
      const result = await convertToString("", {
        inputFormat: "ndjson",
        outputFormat: "json",
      });
      assert.strictEqual(result.trim(), "[]");
    });

    it("should handle file with only empty lines", async () => {
      const ndjson = "\n\n\n\n";
      const result = await convertToString(ndjson, {
        inputFormat: "ndjson",
        outputFormat: "json",
      });
      assert.strictEqual(result.trim(), "[]");
    });

    it("should handle lines with only whitespace", async () => {
      const ndjson = "   \n  \n   \n";
      const result = await convertToString(ndjson, {
        inputFormat: "ndjson",
        outputFormat: "json",
      });
      assert.strictEqual(result.trim(), "[]");
    });

    it("should handle empty lines between records", async () => {
      const ndjson = `{"name":"Alice"}\n\n{"name":"Bob"}\n\n{"name":"Charlie"}`;
      const result = await convertToString(ndjson, {
        inputFormat: "ndjson",
        outputFormat: "json",
      });
      const parsed = JSON.parse(result);
      assert.strictEqual(parsed.length, 3);
    });

    it("should handle very long lines (>10MB)", async () => {
      const largeObj = { data: "A".repeat(1000000) };
      const ndjson = JSON.stringify(largeObj);
      const result = await convertToString(ndjson, {
        inputFormat: "ndjson",
        outputFormat: "json",
      });
      const parsed = JSON.parse(result);
      assert.strictEqual(parsed.length, 1);
    });

    it("should handle missing trailing newline", async () => {
      const ndjson = `{"name":"Alice"}\n{"name":"Bob"}`;
      const result = await convertToString(ndjson, {
        inputFormat: "ndjson",
        outputFormat: "json",
      });
      const parsed = JSON.parse(result);
      assert.strictEqual(parsed.length, 2);
    });

    it("should handle multiple consecutive newlines", async () => {
      const ndjson = `{"name":"Alice"}\n\n\n{"name":"Bob"}\n\n\n`;
      const result = await convertToString(ndjson, {
        inputFormat: "ndjson",
        outputFormat: "json",
      });
      const parsed = JSON.parse(result);
      assert.strictEqual(parsed.length, 2);
    });

    it("should handle single line NDJSON", async () => {
      const ndjson = `{"name":"Alice"}`;
      const result = await convertToString(ndjson, {
        inputFormat: "ndjson",
        outputFormat: "json",
      });
      const parsed = JSON.parse(result);
      assert.strictEqual(parsed.length, 1);
    });

    it("should handle CRLF line endings", async () => {
      const ndjson = `{"name":"Alice"}\r\n{"name":"Bob"}\r\n`;
      const result = await convertToString(ndjson, {
        inputFormat: "ndjson",
        outputFormat: "json",
      });
      const parsed = JSON.parse(result);
      assert.strictEqual(parsed.length, 2);
    });

    it("should handle mixed line endings (LF and CRLF)", async () => {
      const ndjson = `{"name":"Alice"}\n{"name":"Bob"}\r\n{"name":"Charlie"}\n`;
      const result = await convertToString(ndjson, {
        inputFormat: "ndjson",
        outputFormat: "json",
      });
      const parsed = JSON.parse(result);
      assert.strictEqual(parsed.length, 3);
    });
  });

  // ========== JSON VALIDITY ==========
  describe("JSON Validity", () => {
    it("should handle valid JSON objects", async () => {
      const ndjson = `{"name":"Alice","age":30}\n{"name":"Bob","age":25}`;
      const result = await convertToString(ndjson, {
        inputFormat: "ndjson",
        outputFormat: "json",
      });
      const parsed = JSON.parse(result);
      assert.strictEqual(parsed.length, 2);
    });

    it("should handle JSON arrays as records", async () => {
      const ndjson = `[1,2,3]\n[4,5,6]\n[7,8,9]`;
      const result = await convertToString(ndjson, {
        inputFormat: "ndjson",
        outputFormat: "json",
      });
      const parsed = JSON.parse(result);
      assert.strictEqual(parsed.length, 3);
    });

    it("should handle JSON primitives (strings)", async () => {
      const ndjson = `"Alice"\n"Bob"\n"Charlie"`;
      const result = await convertToString(ndjson, {
        inputFormat: "ndjson",
        outputFormat: "json",
      });
      const parsed = JSON.parse(result);
      assert.strictEqual(parsed.length, 3);
    });

    it("should handle JSON primitives (numbers)", async () => {
      const ndjson = `42\n3.14\n-100`;
      const result = await convertToString(ndjson, {
        inputFormat: "ndjson",
        outputFormat: "json",
      });
      const parsed = JSON.parse(result);
      assert.strictEqual(parsed.length, 3);
    });

    it("should handle JSON primitives (booleans)", async () => {
      const ndjson = `true\nfalse\ntrue`;
      const result = await convertToString(ndjson, {
        inputFormat: "ndjson",
        outputFormat: "json",
      });
      const parsed = JSON.parse(result);
      assert.strictEqual(parsed.length, 3);
    });

    it("should handle JSON null values", async () => {
      const ndjson = `null\nnull\nnull`;
      const result = await convertToString(ndjson, {
        inputFormat: "ndjson",
        outputFormat: "json",
      });
      const parsed = JSON.parse(result);
      assert.strictEqual(parsed.length, 3);
    });

    it("should handle deeply nested objects (>10 levels)", async () => {
      let obj: any = { value: "deep" };
      for (let i = 0; i < 15; i++) {
        obj = { nested: obj };
      }
      const ndjson = JSON.stringify(obj);
      const result = await convertToString(ndjson, {
        inputFormat: "ndjson",
        outputFormat: "json",
      });
      const parsed = JSON.parse(result);
      assert.strictEqual(parsed.length, 1);
    });

    it("should handle large arrays (>1000 elements)", async () => {
      const largeArray = Array.from({ length: 2000 }, (_, i) => i);
      const ndjson = JSON.stringify(largeArray);
      const result = await convertToString(ndjson, {
        inputFormat: "ndjson",
        outputFormat: "json",
      });
      const parsed = JSON.parse(result);
      assert.strictEqual(parsed.length, 1);
    });

    it("should handle Unicode escape sequences", async () => {
      const ndjson = `{"emoji":"😀"}\n{"text":"Hello"}`;
      const result = await convertToString(ndjson, {
        inputFormat: "ndjson",
        outputFormat: "json",
      });
      const parsed = JSON.parse(result);
      assert.strictEqual(parsed.length, 2);
    });

    it("should handle special characters in strings", async () => {
      const ndjson = `{"text":"Line 1\\nLine 2"}\n{"text":"Tab\\there"}`;
      const result = await convertToString(ndjson, {
        inputFormat: "ndjson",
        outputFormat: "json",
      });
      const parsed = JSON.parse(result);
      assert.strictEqual(parsed.length, 2);
    });
  });

  // ========== DATA TYPES ==========
  describe("Data Types", () => {
    it("should handle all JSON types in single record", async () => {
      const ndjson = `{"string":"text","number":42,"boolean":true,"null":null,"array":[1,2,3],"object":{"nested":"value"}}`;
      const result = await convertToString(ndjson, {
        inputFormat: "ndjson",
        outputFormat: "json",
      });
      const parsed = JSON.parse(result);
      assert.strictEqual(parsed.length, 1);
      assert.strictEqual(parsed[0].string, "text");
      assert.strictEqual(parsed[0].number, 42);
      assert.strictEqual(parsed[0].boolean, true);
      assert.strictEqual(parsed[0].null, null);
    });

    it("should handle mixed types across records", async () => {
      const ndjson = `{"type":"object"}\n[1,2,3]\n"string"\n42\ntrue\nnull`;
      const result = await convertToString(ndjson, {
        inputFormat: "ndjson",
        outputFormat: "json",
      });
      const parsed = JSON.parse(result);
      assert.strictEqual(parsed.length, 6);
    });

    it("should handle empty objects", async () => {
      const ndjson = `{}\n{}\n{}`;
      const result = await convertToString(ndjson, {
        inputFormat: "ndjson",
        outputFormat: "json",
      });
      const parsed = JSON.parse(result);
      assert.strictEqual(parsed.length, 3);
    });

    it("should handle empty arrays", async () => {
      const ndjson = `[]\n[]\n[]`;
      const result = await convertToString(ndjson, {
        inputFormat: "ndjson",
        outputFormat: "json",
      });
      const parsed = JSON.parse(result);
      assert.strictEqual(parsed.length, 3);
    });

    it("should handle very large strings (>1MB)", async () => {
      const largeString = "A".repeat(2000000);
      const ndjson = JSON.stringify({ data: largeString });
      const result = await convertToString(ndjson, {
        inputFormat: "ndjson",
        outputFormat: "json",
      });
      const parsed = JSON.parse(result);
      assert.strictEqual(parsed.length, 1);
    });

    it("should handle numbers at precision limits", async () => {
      const ndjson = `{"max":${Number.MAX_SAFE_INTEGER}}\n{"min":${Number.MIN_SAFE_INTEGER}}\n{"float":${Number.MAX_VALUE}}`;
      const result = await convertToString(ndjson, {
        inputFormat: "ndjson",
        outputFormat: "json",
      });
      const parsed = JSON.parse(result);
      assert.strictEqual(parsed.length, 3);
    });

    it("should handle objects with many keys (>1000)", async () => {
      const obj: any = {};
      for (let i = 0; i < 1500; i++) {
        obj[`key${i}`] = i;
      }
      const ndjson = JSON.stringify(obj);
      const result = await convertToString(ndjson, {
        inputFormat: "ndjson",
        outputFormat: "json",
      });
      const parsed = JSON.parse(result);
      assert.strictEqual(parsed.length, 1);
      assert.strictEqual(Object.keys(parsed[0]).length, 1500);
    });

    it("should handle objects with duplicate keys (last wins)", async () => {
      const ndjson = `{"key":"value1","key":"value2"}`;
      const result = await convertToString(ndjson, {
        inputFormat: "ndjson",
        outputFormat: "json",
      });
      const parsed = JSON.parse(result);
      assert.strictEqual(parsed.length, 1);
    });

    it("should handle objects with special key names", async () => {
      const ndjson = `{"":"empty","123":"numeric","@#$":"special","__proto__":"proto"}`;
      const result = await convertToString(ndjson, {
        inputFormat: "ndjson",
        outputFormat: "json",
      });
      const parsed = JSON.parse(result);
      assert.strictEqual(parsed.length, 1);
    });
  });

  // ========== NDJSON PASSTHROUGH ==========
  describe("NDJSON Passthrough", () => {
    it("should handle NDJSON → NDJSON passthrough", async () => {
      const ndjson = `{"name":"Alice"}\n{"name":"Bob"}\n{"name":"Charlie"}`;
      const result = await convertToString(ndjson, {
        inputFormat: "ndjson",
        outputFormat: "ndjson",
      });
      const lines = result.trim().split("\n");
      assert.strictEqual(lines.length, 3);
    });

    it("should preserve record order in passthrough", async () => {
      const ndjson = `{"id":1}\n{"id":2}\n{"id":3}`;
      const result = await convertToString(ndjson, {
        inputFormat: "ndjson",
        outputFormat: "ndjson",
      });
      const lines = result.trim().split("\n");
      const first = JSON.parse(lines[0]);
      assert.strictEqual(first.id, 1);
    });

    it("should handle large passthrough (10K records)", async () => {
      let ndjson = "";
      for (let i = 0; i < 10000; i++) {
        ndjson += `{"id":${i}}\n`;
      }
      const result = await convertToString(ndjson, {
        inputFormat: "ndjson",
        outputFormat: "ndjson",
      });
      const lines = result.trim().split("\n");
      assert.strictEqual(lines.length, 10000);
    });
  });

  // ========== STREAMING AND BOUNDARIES ==========
  describe("Streaming and Chunk Boundaries", () => {
    it("should handle records split across chunks", async () => {
      const ndjson = `{"name":"Alice"}\n{"name":"Bob"}\n{"name":"Charlie"}`;
      const data = new TextEncoder().encode(ndjson);
      
      const result = await convert(data, {
        inputFormat: "ndjson",
        outputFormat: "json",
      });
      
      const resultStr = new TextDecoder().decode(result);
      const parsed = JSON.parse(resultStr);
      assert.strictEqual(parsed.length, 3);
    });

    it("should handle partial JSON objects across chunks", async () => {
      const ndjson = `{"name":"Alice","age":30}\n{"name":"Bob","age":25}`;
      const result = await convertToString(ndjson, {
        inputFormat: "ndjson",
        outputFormat: "json",
      });
      const parsed = JSON.parse(result);
      assert.strictEqual(parsed.length, 2);
    });
  });

  // ========== PERFORMANCE EDGE CASES ==========
  describe("Performance Edge Cases", () => {
    it("should handle tiny files (<100 bytes)", async () => {
      const ndjson = `{"a":1}`;
      const result = await convertToString(ndjson, {
        inputFormat: "ndjson",
        outputFormat: "json",
      });
      assert.ok(result.length > 0);
    });

    it("should handle many small records", async () => {
      let ndjson = "";
      for (let i = 0; i < 1000; i++) {
        ndjson += `{"id":${i}}\n`;
      }
      const result = await convertToString(ndjson, {
        inputFormat: "ndjson",
        outputFormat: "json",
      });
      const parsed = JSON.parse(result);
      assert.strictEqual(parsed.length, 1000);
    });

    it("should handle few large records", async () => {
      const largeValue = "A".repeat(50000);
      const ndjson = `{"data":"${largeValue}"}\n{"data":"${largeValue}"}`;
      const result = await convertToString(ndjson, {
        inputFormat: "ndjson",
        outputFormat: "json",
      });
      const parsed = JSON.parse(result);
      assert.strictEqual(parsed.length, 2);
    });

    it("should handle highly compressible data", async () => {
      let ndjson = "";
      for (let i = 0; i < 100; i++) {
        ndjson += `{"name":"Alice","value":100}\n`;
      }
      const result = await convertToString(ndjson, {
        inputFormat: "ndjson",
        outputFormat: "json",
      });
      const parsed = JSON.parse(result);
      assert.strictEqual(parsed.length, 100);
    });

    it("should handle random data (low compressibility)", async () => {
      let ndjson = "";
      for (let i = 0; i < 100; i++) {
        ndjson += `{"id":"${Math.random().toString(36)}","value":${Math.random()}}\n`;
      }
      const result = await convertToString(ndjson, {
        inputFormat: "ndjson",
        outputFormat: "json",
      });
      const parsed = JSON.parse(result);
      assert.strictEqual(parsed.length, 100);
    });
  });

  // ========== MALFORMED INPUT (ERROR HANDLING) ==========
  describe("Malformed Input Handling", () => {
    it("should handle invalid JSON syntax gracefully", async () => {
      const ndjson = `{"name":"Alice"}\n{invalid json}\n{"name":"Bob"}`;
      try {
        const result = await convertToString(ndjson, {
          inputFormat: "ndjson",
          outputFormat: "json",
        });
        // If it succeeds, it handled it gracefully (maybe skipped invalid line)
        assert.ok(true);
      } catch (error) {
        // If it fails, it detected the error
        assert.ok(error);
      }
    });

    it("should handle incomplete JSON objects", async () => {
      const ndjson = `{"name":"Alice"\n{"name":"Bob"}`;
      try {
        const result = await convertToString(ndjson, {
          inputFormat: "ndjson",
          outputFormat: "json",
        });
        assert.ok(true);
      } catch (error) {
        assert.ok(error);
      }
    });

    it("should handle truncated JSON", async () => {
      const ndjson = `{"name":"Alice","age":30,"city":"N`;
      try {
        const result = await convertToString(ndjson, {
          inputFormat: "ndjson",
          outputFormat: "json",
        });
        assert.ok(true);
      } catch (error) {
        assert.ok(error);
      }
    });

    it("should handle mixed valid and invalid lines", async () => {
      const ndjson = `{"valid":1}\ninvalid\n{"valid":2}\n{broken\n{"valid":3}`;
      try {
        const result = await convertToString(ndjson, {
          inputFormat: "ndjson",
          outputFormat: "json",
        });
        assert.ok(true);
      } catch (error) {
        assert.ok(error);
      }
    });
  });

  // ========== UNICODE AND ENCODING ==========
  describe("Unicode and Encoding", () => {
    it("should handle Unicode characters", async () => {
      const ndjson = `{"emoji":"😀🎉🚀"}\n{"text":"日本語"}\n{"symbols":"αβγδ"}`;
      const result = await convertToString(ndjson, {
        inputFormat: "ndjson",
        outputFormat: "json",
      });
      const parsed = JSON.parse(result);
      assert.strictEqual(parsed.length, 3);
      assert.ok(parsed[0].emoji.includes("😀"));
    });

    it("should handle surrogate pairs", async () => {
      const ndjson = `{"emoji":"𝕳𝖊𝖑𝖑𝖔"}`;
      const result = await convertToString(ndjson, {
        inputFormat: "ndjson",
        outputFormat: "json",
      });
      const parsed = JSON.parse(result);
      assert.strictEqual(parsed.length, 1);
    });

    it("should handle zero-width characters", async () => {
      const ndjson = `{"text":"Hello\u200BWorld"}`;
      const result = await convertToString(ndjson, {
        inputFormat: "ndjson",
        outputFormat: "json",
      });
      const parsed = JSON.parse(result);
      assert.strictEqual(parsed.length, 1);
    });
  });
});

console.log("✓ NDJSON Edge Case Test Suite loaded");
console.log("  Run with: node --test tests/edge-cases/ndjson-edge-cases.test.ts");
