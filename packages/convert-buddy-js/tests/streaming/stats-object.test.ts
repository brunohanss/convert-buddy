import { describe, it } from "node:test";
import assert from "node:assert";
import { ConvertBuddy } from "../../index.js";

/**
 * Generate test CSV data
 */
function generateCsv(rows: number): string {
  const header = "id,name,value\n";
  const lines = [header];
  
  for (let i = 0; i < rows; i++) {
    lines.push(`${i},Item${i},${i * 10}\n`);
  }
  
  return lines.join("");
}

describe("Stats object validation tests", () => {
  it("should provide accurate Stats interface fields", async () => {
    const csv = generateCsv(100);
    const csvBuffer = Buffer.from(csv, "utf-8");
    
    const buddy = await ConvertBuddy.create({
      inputFormat: "csv",
      outputFormat: "json",
      profile: true
    });
    
    // Initial stats
    const initial = buddy.stats();
    assert.strictEqual(initial.bytesIn, 0, "Initial bytesIn should be 0");
    assert.strictEqual(initial.bytesOut, 0, "Initial bytesOut should be 0");
    assert.strictEqual(initial.chunksIn, 0, "Initial chunksIn should be 0");
    assert.strictEqual(initial.recordsProcessed, 0, "Initial recordsProcessed should be 0");
    assert.strictEqual(initial.parseTimeMs, 0, "Initial parseTimeMs should be 0");
    assert.strictEqual(initial.transformTimeMs, 0, "Initial transformTimeMs should be 0");
    assert.strictEqual(initial.writeTimeMs, 0, "Initial writeTimeMs should be 0");
    assert.strictEqual(initial.maxBufferSize, 0, "Initial maxBufferSize should be 0");
    assert.strictEqual(initial.currentPartialSize, 0, "Initial currentPartialSize should be 0");
    assert.strictEqual(initial.throughputMbPerSec, 0, "Initial throughputMbPerSec should be 0");
    
    // Process data
    buddy.push(csvBuffer);
    
    const during = buddy.stats();
    assert.ok(during.bytesIn > 0, "bytesIn should increase");
    assert.ok(during.chunksIn > 0, "chunksIn should increase");
    assert.ok(during.recordsProcessed >= 0, "recordsProcessed should be non-negative");
    assert.ok(during.parseTimeMs >= 0, "parseTimeMs should be non-negative");
    assert.ok(during.maxBufferSize >= 0, "maxBufferSize should be non-negative");
    
    buddy.finish();
    
    const final = buddy.stats();
    assert.strictEqual(final.bytesIn, csvBuffer.length, "Final bytesIn should match input size");
    assert.strictEqual(final.recordsProcessed, 100, "Should process 100 records");
    assert.ok(final.bytesOut > 0, "Should produce output");
    assert.ok(final.throughputMbPerSec >= 0, "Throughput should be calculated");
    
    console.log("Final stats:", final);
  });
  
  it("should track progress via onProgress callback", async () => {
    const csv = generateCsv(1000);
    const csvSize = Buffer.byteLength(csv);
    const progressUpdates: any[] = [];
    
    const buddy = await ConvertBuddy.create({
      inputFormat: "csv",
      outputFormat: "json",
      progressIntervalBytes: 512, // Small interval for testing
      onProgress: (stats) => {
        progressUpdates.push({ ...stats });
      }
    });
    
    // Push in chunks to trigger multiple progress callbacks
    const buffer = Buffer.from(csv, "utf-8");
    const chunkSize = 1024;
    
    for (let i = 0; i < buffer.length; i += chunkSize) {
      const chunk = buffer.slice(i, Math.min(i + chunkSize, buffer.length));
      buddy.push(chunk);
    }
    
    buddy.finish();
    
    assert.ok(progressUpdates.length > 0, "Should have progress updates");
    
    // Verify progress is monotonically increasing
    for (let i = 1; i < progressUpdates.length; i++) {
      assert.ok(
        progressUpdates[i].bytesIn >= progressUpdates[i - 1].bytesIn,
        "bytesIn should increase or stay same"
      );
      assert.ok(
        progressUpdates[i].recordsProcessed >= progressUpdates[i - 1].recordsProcessed,
        "recordsProcessed should increase or stay same"
      );
    }
    
    console.log(`Progress callback triggered ${progressUpdates.length} times`);
  });
  
  it("should calculate compression ratio correctly", async () => {
    const csv = generateCsv(100);
    const csvBuffer = Buffer.from(csv, "utf-8");
    
    // CSV to JSON (typically expands)
    const buddy1 = await ConvertBuddy.create({
      inputFormat: "csv",
      outputFormat: "json"
    });
    
    buddy1.push(csvBuffer);
    buddy1.finish();
    
    const stats1 = buddy1.stats();
    const ratio1 = stats1.bytesOut / stats1.bytesIn;
    
    console.log(`CSV → JSON ratio: ${ratio1.toFixed(2)}x (${stats1.bytesIn} → ${stats1.bytesOut} bytes)`);
    assert.ok(ratio1 > 1, "CSV to JSON typically expands");
    
    // JSON to CSV (typically shrinks)
    const jsonData = JSON.stringify([
      { id: 1, name: "Alice", value: 100 },
      { id: 2, name: "Bob", value: 200 }
    ]);
    
    const buddy2 = await ConvertBuddy.create({
      inputFormat: "json",
      outputFormat: "csv"
    });
    
    const jsonBuffer = Buffer.from(jsonData, "utf-8");
    buddy2.push(jsonBuffer);
    buddy2.finish();
    
    const stats2 = buddy2.stats();
    const ratio2 = stats2.bytesOut / stats2.bytesIn;
    
    console.log(`JSON → CSV ratio: ${ratio2.toFixed(2)}x (${stats2.bytesIn} → ${stats2.bytesOut} bytes)`);
    assert.ok(ratio2 < 1, "JSON to CSV typically shrinks");
  });
  
  it("should track processing rate (records per second)", async () => {
    const csv = generateCsv(5000);
    const csvBuffer = Buffer.from(csv, "utf-8");
    
    const startTime = Date.now();
    
    const buddy = await ConvertBuddy.create({
      inputFormat: "csv",
      outputFormat: "ndjson",
      profile: true
    });
    
    buddy.push(csvBuffer);
    buddy.finish();
    
    const endTime = Date.now();
    const elapsedSec = (endTime - startTime) / 1000;
    
    const stats = buddy.stats();
    const recordsPerSec = stats.recordsProcessed / elapsedSec;
    
    console.log(`Processing rate: ${recordsPerSec.toFixed(0)} records/sec`);
    console.log(`Throughput: ${stats.throughputMbPerSec.toFixed(1)} MB/s`);
    
    assert.ok(recordsPerSec > 0, "Should have positive records per second");
    assert.strictEqual(stats.recordsProcessed, 5000);
  });
  
  it("should provide time breakdown with profile enabled", async () => {
    const csv = generateCsv(1000);
    const csvBuffer = Buffer.from(csv, "utf-8");
    
    const buddy = await ConvertBuddy.create({
      inputFormat: "csv",
      outputFormat: "json",
      profile: true
    });
    
    buddy.push(csvBuffer);
    buddy.finish();
    
    const stats = buddy.stats();
    
    console.log("Time breakdown:");
    console.log(`  Parse: ${stats.parseTimeMs}ms`);
    console.log(`  Transform: ${stats.transformTimeMs}ms`);
    console.log(`  Write: ${stats.writeTimeMs}ms`);
    
    const totalTime = stats.parseTimeMs + stats.transformTimeMs + stats.writeTimeMs;
    
    assert.ok(stats.parseTimeMs >= 0, "Parse time should be non-negative");
    assert.ok(stats.transformTimeMs >= 0, "Transform time should be non-negative");
    assert.ok(stats.writeTimeMs >= 0, "Write time should be non-negative");
    assert.ok(totalTime > 0, "Total time should be positive");
    
    // Log percentages
    console.log(`  Parse: ${(stats.parseTimeMs / totalTime * 100).toFixed(1)}%`);
    console.log(`  Transform: ${(stats.transformTimeMs / totalTime * 100).toFixed(1)}%`);
    console.log(`  Write: ${(stats.writeTimeMs / totalTime * 100).toFixed(1)}%`);
  });
  
  it("should track memory usage accurately", async () => {
    const csv = generateCsv(2000);
    const csvBuffer = Buffer.from(csv, "utf-8");
    
    const buddy = await ConvertBuddy.create({
      inputFormat: "csv",
      outputFormat: "json",
      maxMemoryMB: 64
    });
    
    // Process in chunks to see buffer growth
    const chunkSize = 1024;
    let maxObservedBuffer = 0;
    
    for (let i = 0; i < csvBuffer.length; i += chunkSize) {
      const chunk = csvBuffer.slice(i, Math.min(i + chunkSize, csvBuffer.length));
      buddy.push(chunk);
      
      const stats = buddy.stats();
      maxObservedBuffer = Math.max(maxObservedBuffer, stats.maxBufferSize);
    }
    
    buddy.finish();
    
    const finalStats = buddy.stats();
    
    console.log(`Peak memory: ${(finalStats.maxBufferSize / 1024 / 1024).toFixed(2)}MB`);
    console.log(`Current partial: ${(finalStats.currentPartialSize / 1024).toFixed(2)}KB`);
    
    assert.ok(finalStats.maxBufferSize > 0, "Should track peak memory");
    assert.ok(finalStats.maxBufferSize < 64 * 1024 * 1024, "Should stay under memory limit");
  });
  
  it("should calculate ETA correctly with progress", async () => {
    const totalRows = 10000;
    const csv = generateCsv(totalRows);
    const totalBytes = Buffer.byteLength(csv);
    const buffer = Buffer.from(csv, "utf-8");
    
    const startTime = Date.now();
    const progressPoints: Array<{ elapsed: number; bytesIn: number; eta: number }> = [];
    
    const buddy = await ConvertBuddy.create({
      inputFormat: "csv",
      outputFormat: "json",
      progressIntervalBytes: totalBytes / 10, // ~10 updates
      onProgress: (stats) => {
        const elapsedMs = Date.now() - startTime;
        const bytesPerMs = stats.bytesIn / elapsedMs;
        const remainingBytes = totalBytes - stats.bytesIn;
        const etaMs = remainingBytes / bytesPerMs;
        
        progressPoints.push({
          elapsed: elapsedMs,
          bytesIn: stats.bytesIn,
          eta: etaMs
        });
        
        console.log(`Progress: ${(stats.bytesIn / totalBytes * 100).toFixed(1)}%, ETA: ${(etaMs / 1000).toFixed(1)}s`);
      }
    });
    
    // Push in chunks
    const chunkSize = 8 * 1024;
    for (let i = 0; i < buffer.length; i += chunkSize) {
      const chunk = buffer.slice(i, Math.min(i + chunkSize, buffer.length));
      buddy.push(chunk);
    }
    
    buddy.finish();
    
    assert.ok(progressPoints.length > 0, "Should have progress points");
    
    // ETA should generally decrease over time (or stay relatively stable)
    if (progressPoints.length > 2) {
      const firstEta = progressPoints[0].eta;
      const lastEta = progressPoints[progressPoints.length - 1].eta;
      console.log(`First ETA: ${(firstEta / 1000).toFixed(1)}s, Last ETA: ${(lastEta / 1000).toFixed(1)}s`);
    }
  });
});
