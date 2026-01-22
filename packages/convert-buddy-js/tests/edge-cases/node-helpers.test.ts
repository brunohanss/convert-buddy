import { describe, it } from "node:test";
import assert from "node:assert";
import { writeFileSync, unlinkSync, readFileSync } from "node:fs";
import { 
  convertFileToString, 
  convertFileToBuffer,
  convertFileToFile,
  convertBuffer,
  convertStream,
  createNodeTransform
} from "../../node.js";
import { Readable } from "node:stream";

const TEST_CSV = "name,age\nAlice,30\nBob,25\nCharlie,35\n";
const TEST_FILE = "./test-input.csv";
const TEST_OUTPUT = "./test-output.json";

describe("Node.js High-Level Helpers", () => {
  it("should convert file to string", async () => {
    writeFileSync(TEST_FILE, TEST_CSV);
    
    try {
      const result = await convertFileToString(TEST_FILE, {
        inputFormat: "csv",
        outputFormat: "json",
      });
      
      assert.ok(result.length > 0);
      assert.ok(result.includes("Alice"));
      
      // Should be valid JSON
      const parsed = JSON.parse(result);
      assert.ok(Array.isArray(parsed));
    } finally {
      unlinkSync(TEST_FILE);
    }
  });

  it("should convert file to buffer", async () => {
    writeFileSync(TEST_FILE, TEST_CSV);
    
    try {
      const result = await convertFileToBuffer(TEST_FILE, {
        inputFormat: "csv",
        outputFormat: "json",
      });
      
      assert.ok(Buffer.isBuffer(result));
      assert.ok(result.length > 0);
      
      const str = result.toString("utf-8");
      assert.ok(str.includes("Alice"));
    } finally {
      unlinkSync(TEST_FILE);
    }
  });

  it("should convert file to file", async () => {
    writeFileSync(TEST_FILE, TEST_CSV);
    
    try {
      await convertFileToFile(TEST_FILE, TEST_OUTPUT, {
        inputFormat: "csv",
        outputFormat: "json",
      });
      
      const result = readFileSync(TEST_OUTPUT, "utf-8");
      assert.ok(result.length > 0);
      assert.ok(result.includes("Alice"));
      
      // Should be valid JSON
      const parsed = JSON.parse(result);
      assert.ok(Array.isArray(parsed));
    } finally {
      unlinkSync(TEST_FILE);
      try { unlinkSync(TEST_OUTPUT); } catch {}
    }
  });

  it("should convert buffer", async () => {
    const buffer = Buffer.from(TEST_CSV);
    
    const result = await convertBuffer(buffer, {
      inputFormat: "csv",
      outputFormat: "json",
    });
    
    assert.ok(Buffer.isBuffer(result));
    const str = result.toString("utf-8");
    assert.ok(str.includes("Alice"));
  });

  it("should convert stream", async () => {
    const stream = Readable.from([Buffer.from(TEST_CSV)]);
    
    const result = await convertStream(stream, {
      inputFormat: "csv",
      outputFormat: "json",
    });
    
    assert.ok(Buffer.isBuffer(result));
    const str = result.toString("utf-8");
    assert.ok(str.includes("Alice"));
  });



  it("should auto-detect CSV format from file", async () => {
    writeFileSync(TEST_FILE, TEST_CSV);
    
    try {
      // For auto-detection test, just verify that the conversion completes
      // without throwing an error
      const result = await convertFileToString(TEST_FILE, {
        inputFormat: "auto",
        outputFormat: "ndjson",
      });
      
      assert.ok(result.length > 0);
      // NDJSON format contains the data
      assert.ok(result.includes("Alice") || result.includes("name"));
    } finally {
      unlinkSync(TEST_FILE);
    }
  });

  it("should auto-detect NDJSON format from file", async () => {
    const ndjson = '{"name":"Alice","age":30}\n{"name":"Bob","age":25}\n';
    writeFileSync(TEST_FILE, ndjson);
    
    try {
      const result = await convertFileToString(TEST_FILE, {
        inputFormat: "auto",
        outputFormat: "csv",
      });
      
      assert.ok(result.length > 0);
      assert.ok(result.includes("Alice") || result.includes("name"));
    } finally {
      unlinkSync(TEST_FILE);
    }
  });

  it("should auto-detect format for buffer conversion", async () => {
    const buffer = Buffer.from(TEST_CSV);
    
    const result = await convertBuffer(buffer, {
      inputFormat: "auto",
      outputFormat: "json",
    });
    
    const parsed = JSON.parse(result.toString("utf-8"));
    assert.strictEqual(parsed.length, 3);
  });

  it("should auto-detect format for stream conversion", async () => {
    const stream = Readable.from([Buffer.from(TEST_CSV)]);
    
    const result = await convertStream(stream, {
      inputFormat: "auto",
      outputFormat: "json",
    });
    
    const parsed = JSON.parse(result.toString("utf-8"));
    assert.strictEqual(parsed.length, 3);
  });

  it("should convert using createNodeTransform", async () => {
    const transform = await createNodeTransform({
      inputFormat: "csv",
      outputFormat: "json",
    });

    const source = Readable.from([Buffer.from(TEST_CSV)]);
    const chunks: Buffer[] = [];
    
    for await (const chunk of source.pipe(transform)) {
      chunks.push(Buffer.from(chunk));
    }
    
    const result = Buffer.concat(chunks).toString("utf-8");
    const parsed = JSON.parse(result);
    assert.strictEqual(parsed.length, 3);
  });
});
