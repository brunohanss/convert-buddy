import { describe, it } from "node:test";
import assert from "node:assert";
import { ConvertBuddy } from "../../index.js";
import { Readable } from "node:stream";

/**
 * Generate a large CSV dataset for testing
 */
function generateLargeCsv(rows: number): string {
  const header = "id,name,email,age,city,country,salary,department\n";
  const lines = [header];
  
  for (let i = 0; i < rows; i++) {
    const line = `${i},User${i},user${i}@example.com,${20 + (i % 50)},City${i % 100},Country${i % 20},${50000 + (i % 100000)},Dept${i % 10}\n`;
    lines.push(line);
  }
  
  return lines.join("");
}

/**
 * Generate a large NDJSON dataset for testing
 */
function generateLargeNdjson(records: number): string {
  const lines: string[] = [];
  
  for (let i = 0; i < records; i++) {
    const obj = {
      id: i,
      name: `User${i}`,
      email: `user${i}@example.com`,
      age: 20 + (i % 50),
      city: `City${i % 100}`,
      country: `Country${i % 20}`,
      salary: 50000 + (i % 100000),
      department: `Dept${i % 10}`
    };
    lines.push(JSON.stringify(obj));
  }
  
  return lines.join("\n") + "\n";
}

/**
 * Create a readable stream from a string, emitting chunks of specified size
 */
function createChunkedStream(data: string, chunkSize: number): Readable {
  const buffer = Buffer.from(data, "utf-8");
  const chunks: Buffer[] = [];
  
  for (let i = 0; i < buffer.length; i += chunkSize) {
    chunks.push(buffer.slice(i, i + chunkSize));
  }
  
  return Readable.from(chunks);
}

describe("Large file streaming tests", () => {
  it("should handle streaming large CSV to JSON with progress tracking", async () => {
    const rowCount = 10000;
    const csv = generateLargeCsv(rowCount);
    const csvSize = Buffer.byteLength(csv);
    
    console.log(`Testing with ${rowCount} rows, ~${(csvSize / 1024 / 1024).toFixed(2)}MB`);
    
    const buddy = await ConvertBuddy.create({
      inputFormat: "csv",
      outputFormat: "json",
      chunkTargetBytes: 64 * 1024,
      progressIntervalBytes: 256 * 1024,
      onProgress: (stats) => {
        const percentage = (stats.bytesIn / csvSize) * 100;
        console.log(`Progress: ${percentage.toFixed(1)}% - ${stats.recordsProcessed} records - ${stats.throughputMbPerSec.toFixed(1)} MB/s`);
      },
      profile: true
    });
    
    // Simulate streaming by chunking the data
    const chunkSize = 32 * 1024; // 32KB chunks
    const stream = createChunkedStream(csv, chunkSize);
    
    const outputs: Uint8Array[] = [];
    
    for await (const chunk of stream) {
      const output = buddy.push(chunk);
      if (output.length > 0) {
        outputs.push(output);
      }
    }
    
    const final = buddy.finish();
    if (final.length > 0) {
      outputs.push(final);
    }
    
    // Combine outputs
    const totalLength = outputs.reduce((sum, arr) => sum + arr.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;
    for (const output of outputs) {
      result.set(output, offset);
      offset += output.length;
    }
    
    const jsonString = new TextDecoder().decode(result);
    const parsed = JSON.parse(jsonString);
    
    assert.strictEqual(parsed.length, rowCount, `Expected ${rowCount} records`);
    assert.strictEqual(parsed[0].id, 0);
    assert.strictEqual(parsed[0].name, "User0");
    
    const stats = buddy.stats();
    console.log(`Final stats: ${stats.bytesIn} bytes in, ${stats.bytesOut} bytes out, ${stats.recordsProcessed} records`);
    assert.strictEqual(stats.recordsProcessed, rowCount);
  });
  
  it("should handle streaming large NDJSON to CSV with memory limits", async () => {
    const recordCount = 5000;
    const ndjson = generateLargeNdjson(recordCount);
    const ndjsonSize = Buffer.byteLength(ndjson);
    
    console.log(`Testing with ${recordCount} NDJSON records, ~${(ndjsonSize / 1024 / 1024).toFixed(2)}MB`);
    
    let progressCallCount = 0;
    
    const buddy = await ConvertBuddy.create({
      inputFormat: "ndjson",
      outputFormat: "csv",
      chunkTargetBytes: 128 * 1024,
      maxMemoryMB: 128,
      progressIntervalBytes: 512 * 1024,
      onProgress: (stats) => {
        progressCallCount++;
        assert.ok(stats.maxBufferSize < 128 * 1024 * 1024, "Buffer should stay under memory limit");
        console.log(`Progress: ${stats.recordsProcessed} records, max buffer: ${(stats.maxBufferSize / 1024 / 1024).toFixed(2)}MB`);
      }
    });
    
    // Stream with smaller chunks
    const chunkSize = 16 * 1024; // 16KB chunks
    const stream = createChunkedStream(ndjson, chunkSize);
    
    const outputs: Uint8Array[] = [];
    
    for await (const chunk of stream) {
      const output = buddy.push(chunk);
      if (output.length > 0) {
        outputs.push(output);
      }
    }
    
    const final = buddy.finish();
    if (final.length > 0) {
      outputs.push(final);
    }
    
    // Combine outputs
    const totalLength = outputs.reduce((sum, arr) => sum + arr.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;
    for (const output of outputs) {
      result.set(output, offset);
      offset += output.length;
    }
    
    const csvString = new TextDecoder().decode(result);
    const lines = csvString.trim().split("\n");
    
    // CSV has header + records
    assert.strictEqual(lines.length, recordCount + 1, "Expected header + records");
    assert.ok(progressCallCount > 0, "Progress callback should have been called");
    
    const stats = buddy.stats();
    console.log(`Memory stats: max buffer ${(stats.maxBufferSize / 1024).toFixed(2)}KB`);
  });
  
  it("should handle very large file simulation with proper chunking", async () => {
    // Simulate a 50MB file by generating data in chunks
    const totalRecords = 50000;
    const batchSize = 5000;
    
    const buddy = await ConvertBuddy.create({
      inputFormat: "csv",
      outputFormat: "ndjson",
      chunkTargetBytes: 256 * 1024,
      progressIntervalBytes: 1024 * 1024,
      onProgress: (stats) => {
        console.log(`Large file: ${(stats.bytesIn / 1024 / 1024).toFixed(2)}MB processed, ${stats.throughputMbPerSec.toFixed(1)} MB/s`);
      }
    });
    
    const outputs: Uint8Array[] = [];
    let totalBytesProcessed = 0;
    
    // Process in batches to simulate very large file
    for (let batch = 0; batch < totalRecords / batchSize; batch++) {
      const batchCsv = batch === 0 
        ? generateLargeCsv(batchSize) 
        : generateLargeCsv(batchSize).split("\n").slice(1).join("\n"); // Skip header for subsequent batches
      
      const batchBuffer = Buffer.from(batchCsv, "utf-8");
      totalBytesProcessed += batchBuffer.length;
      
      // Stream this batch in chunks
      const stream = createChunkedStream(batchCsv, 32 * 1024);
      
      for await (const chunk of stream) {
        const output = buddy.push(chunk);
        if (output.length > 0) {
          outputs.push(output);
        }
      }
    }
    
    const final = buddy.finish();
    if (final.length > 0) {
      outputs.push(final);
    }
    
    // Combine outputs
    const totalLength = outputs.reduce((sum, arr) => sum + arr.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;
    for (const output of outputs) {
      result.set(output, offset);
      offset += output.length;
    }
    
    const ndjsonString = new TextDecoder().decode(result);
    const lines = ndjsonString.trim().split("\n");
    
    assert.strictEqual(lines.length, totalRecords, `Expected ${totalRecords} NDJSON records`);
    
    const stats = buddy.stats();
    console.log(`Processed ${(totalBytesProcessed / 1024 / 1024).toFixed(2)}MB in ${stats.recordsProcessed} records`);
    console.log(`Performance: parse=${stats.parseTimeMs}ms, transform=${stats.transformTimeMs}ms, write=${stats.writeTimeMs}ms`);
  });
  
  it("should properly track stats during streaming conversion", async () => {
    const rowCount = 1000;
    const csv = generateLargeCsv(rowCount);
    
    const buddy = await ConvertBuddy.create({
      inputFormat: "csv",
      outputFormat: "json",
      profile: true
    });
    
    // Get initial stats (should be all zeros)
    const initialStats = buddy.stats();
    assert.strictEqual(initialStats.bytesIn, 0);
    assert.strictEqual(initialStats.bytesOut, 0);
    assert.strictEqual(initialStats.recordsProcessed, 0);
    
    // Push half the data
    const halfPoint = Math.floor(csv.length / 2);
    const firstHalf = csv.substring(0, halfPoint);
    const secondHalf = csv.substring(halfPoint);
    
    const firstBuffer = Buffer.from(firstHalf, "utf-8");
    buddy.push(firstBuffer);
    
    const midStats = buddy.stats();
    assert.ok(midStats.bytesIn > 0, "Should have processed some bytes");
    assert.ok(midStats.parseTimeMs >= 0, "Parse time should be tracked");
    
    // Push second half
    const secondBuffer = Buffer.from(secondHalf, "utf-8");
    buddy.push(secondBuffer);
    buddy.finish();
    
    const finalStats = buddy.stats();
    assert.ok(finalStats.bytesIn >= Buffer.byteLength(csv), "Should have processed all bytes");
    assert.strictEqual(finalStats.recordsProcessed, rowCount, "Should have processed all records");
    assert.ok(finalStats.throughputMbPerSec > 0, "Throughput should be calculated");
    
    console.log(`Stats tracking test: ${finalStats.throughputMbPerSec.toFixed(1)} MB/s throughput`);
  });
});
