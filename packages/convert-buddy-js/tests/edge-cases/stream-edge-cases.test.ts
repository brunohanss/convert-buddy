import { describe, it } from "node:test";
import assert from "node:assert";
import { Readable } from "node:stream";
import { convertStream, convertBuffer, createNodeTransform } from "../../src/node";

const TEST_CSV = "name,age\nAlice,30\nBob,25\nCharlie,35\n";

describe("Stream edge-cases (small Readable.from)", () => {
  it("convertStream should auto-detect format from small Readable.from stream", async () => {
    const stream = Readable.from([Buffer.from(TEST_CSV)]);

    const result = await convertStream(stream, { inputFormat: "auto", outputFormat: "json" });
    const parsed = JSON.parse(result.toString("utf-8"));
    assert.strictEqual(parsed.length, 3);
  });

  it("createNodeTransform should work with Readable.from piping", async () => {
    const transform = await createNodeTransform({ inputFormat: "csv", outputFormat: "json" });
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
