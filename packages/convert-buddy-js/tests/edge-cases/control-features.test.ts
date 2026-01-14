import { describe, it, before } from "node:test";
import assert from "node:assert";
import { ConvertBuddy } from "../../index.js";

describe("Abort/Pause/Resume Control", () => {
  it("should abort conversion when abort() is called", async () => {
    const buddy = await ConvertBuddy.create({
      inputFormat: "csv",
      outputFormat: "json",
    });

    const csvData = new TextEncoder().encode("name,age\nAlice,30\nBob,25\n");
    
    // Push first chunk
    buddy.push(csvData.slice(0, 10));
    
    // Abort the conversion
    buddy.abort();
    
    // Should throw when trying to push more data
    assert.throws(() => {
      buddy.push(csvData.slice(10));
    }, /aborted/);
    
    assert.strictEqual(buddy.isAborted(), true);
  });

  it("should pause and resume conversion", async () => {
    const buddy = await ConvertBuddy.create({
      inputFormat: "csv",
      outputFormat: "json",
    });

    const csvData = new TextEncoder().encode("name,age\nAlice,30\nBob,25\n");
    
    // Push first chunk
    buddy.push(csvData.slice(0, 10));
    
    // Pause the conversion
    buddy.pause();
    assert.strictEqual(buddy.isPaused(), true);
    
    // Should throw when trying to push while paused
    assert.throws(() => {
      buddy.push(csvData.slice(10, 20));
    }, /paused/);
    
    // Resume and continue
    buddy.resume();
    assert.strictEqual(buddy.isPaused(), false);
    
    // Should work now
    buddy.push(csvData.slice(10));
    const result = buddy.finish();
    assert.ok(result.length > 0);
  });

  it("should track aborted state correctly", async () => {
    const buddy = await ConvertBuddy.create({
      inputFormat: "csv",
      outputFormat: "json",
    });

    assert.strictEqual(buddy.isAborted(), false);
    buddy.abort();
    assert.strictEqual(buddy.isAborted(), true);
  });
});

describe("Progress Callbacks", () => {
  it("should call progress callback during conversion", async () => {
    let progressCalls = 0;

    const buddy = await ConvertBuddy.create({
      inputFormat: "csv",
      outputFormat: "json",
      onProgress: (stats) => {
        progressCalls++;
      },
      progressIntervalBytes: 1, // Trigger on every byte for testing
    });

    const csvData = new TextEncoder().encode("name,age\nAlice,30\nBob,25\nCharlie,35\n");
    
    // Push all data at once
    buddy.push(csvData);
    buddy.finish();
    
    // Progress callback should have been called at least on finish
    assert.ok(progressCalls > 0, "Progress callback should be called");
  });

  it("should call progress callback on finish", async () => {
    let finalCallMade = false;

    const buddy = await ConvertBuddy.create({
      inputFormat: "csv",
      outputFormat: "json",
      onProgress: (stats) => {
        finalCallMade = true;
      },
    });

    const csvData = new TextEncoder().encode("name,age\nAlice,30\n");
    buddy.push(csvData);
    buddy.finish();
    
    assert.ok(finalCallMade, "Progress callback should be called on finish");
  });
});

describe("Auto-detection", () => {
  it("should handle auto format detection in options", async () => {
    // This will test that the "auto" format is accepted
    // Actual detection happens on first push, which we can't easily test here
    // without data, but we can verify the option is accepted
    const buddy = await ConvertBuddy.create({
      inputFormat: "auto" as any,
      outputFormat: "json",
    });
    
    // Should not throw
    assert.ok(buddy);
  });
});
