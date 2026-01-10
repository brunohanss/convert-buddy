import type { Transform as NodeTransform } from "node:stream";
import type { PathLike } from "node:fs";

import { ConvertBuddy, type ConvertBuddyOptions, type Format, autoDetectConfig } from "./index.js";

export * from "./index.js";

// Node.js Transform Stream adapter
async function loadNodeTransform(): Promise<typeof import("node:stream").Transform> {
  const isNode =
    typeof process !== "undefined" &&
    !!(process as any).versions?.node;

  if (!isNode) {
    throw new Error("createNodeTransform is only available in Node.js runtimes.");
  }

  const streamModule = await import("node:stream");
  return streamModule.Transform;
}

export async function createNodeTransform(
  opts: ConvertBuddyOptions = {}
): Promise<NodeTransform> {
  let buddy: ConvertBuddy | null = null;
  let initPromise: Promise<void> | null = null;

  const Transform = await loadNodeTransform();
  const transform = new Transform({
    async transform(chunk: Buffer, encoding: string, callback: Function) {
      try {
        if (!buddy) {
          if (!initPromise) {
            initPromise = ConvertBuddy.create(opts).then((b) => {
              buddy = b;
            });
          }
          await initPromise;
        }

        const input = new Uint8Array(chunk);
        const output = buddy!.push(input);

        if (output.length > 0) {
          this.push(Buffer.from(output));
        }

        callback();
      } catch (err) {
        callback(err);
      }
    },

    async flush(callback: Function) {
      try {
        if (buddy) {
          const output = buddy.finish();
          if (output.length > 0) {
            this.push(Buffer.from(output));
          }

          if (opts.profile) {
            const stats = buddy.stats();
            console.log("[convert-buddy] Performance Stats:", stats);
          }
        }
        callback();
      } catch (err) {
        callback(err);
      }
    },
  });

  return transform;
}

/**
 * Convert a file from one format to another and return as a string.
 * Handles file reading and streaming internally.
 * 
 * @example
 * // Basic conversion
 * const result = await convertFileToString("input.csv", {
 *   inputFormat: "csv",
 *   outputFormat: "json"
 * });
 * 
 * @example
 * // With auto-detection
 * const result = await convertFileToString("data.csv", {
 *   inputFormat: "auto",
 *   outputFormat: "ndjson",
 *   onProgress: (stats) => {
 *     console.log(`Processed ${stats.recordsProcessed} records`);
 *   }
 * });
 */
export async function convertFileToString(
  inputPath: PathLike,
  opts: ConvertBuddyOptions = {}
): Promise<string> {
  const bytes = await convertFileToBuffer(inputPath, opts);
  return bytes.toString("utf-8");
}

/**
 * Convert a file from one format to another and return as a Buffer.
 * Handles file reading and streaming internally.
 * 
 * @example
 * const buffer = await convertFileToBuffer("input.csv", {
 *   inputFormat: "csv",
 *   outputFormat: "json"
 * });
 * console.log(buffer.toString());
 */
export async function convertFileToBuffer(
  inputPath: PathLike,
  opts: ConvertBuddyOptions = {}
): Promise<Buffer> {
  const fs = await import("node:fs");
  const path = await import("node:path");
  
  // Handle auto-detection
  let actualOpts = { ...opts };
  
  if (opts.inputFormat === "auto") {
    // Read a sample for auto-detection
    const sampleSize = 256 * 1024; // 256KB
    const fileHandle = await fs.promises.open(inputPath, "r");
    const buffer = Buffer.allocUnsafe(sampleSize);
    const { bytesRead } = await fileHandle.read(buffer, 0, sampleSize, 0);
    await fileHandle.close();
    
    const sample = new Uint8Array(buffer.buffer, buffer.byteOffset, bytesRead);
    const detected = await autoDetectConfig(sample, { debug: opts.debug });
    
    if (detected.format !== "unknown") {
      actualOpts.inputFormat = detected.format as Format;
      
      if (detected.csvConfig) {
        actualOpts.csvConfig = opts.csvConfig ? { ...detected.csvConfig, ...opts.csvConfig } : detected.csvConfig;
      }
      
      if (detected.xmlConfig) {
        actualOpts.xmlConfig = opts.xmlConfig ? { ...detected.xmlConfig, ...opts.xmlConfig } : detected.xmlConfig;
      }
      
      if (opts.debug) {
        console.log("[convert-buddy] Auto-detected format:", detected.format);
      }
    } else {
      throw new Error("Could not auto-detect input format. Please specify inputFormat explicitly.");
    }
  }
  
  const buddy = await ConvertBuddy.create(actualOpts);
  const readStream = fs.createReadStream(inputPath, { highWaterMark: 64 * 1024 });
  
  const chunks: Buffer[] = [];
  
  return new Promise((resolve, reject) => {
    readStream.on("data", (chunk: Buffer) => {
      try {
        if (buddy.isAborted()) {
          readStream.destroy();
          reject(new Error("Conversion aborted"));
          return;
        }
        
        const output = buddy.push(new Uint8Array(chunk));
        if (output.length > 0) {
          chunks.push(Buffer.from(output));
        }
      } catch (error) {
        readStream.destroy();
        reject(error);
      }
    });
    
    readStream.on("end", () => {
      try {
        const final = buddy.finish();
        if (final.length > 0) {
          chunks.push(Buffer.from(final));
        }
        
        if (opts.profile) {
          console.log("[convert-buddy] Performance Stats:", buddy.stats());
        }
        
        resolve(Buffer.concat(chunks));
      } catch (error) {
        reject(error);
      }
    });
    
    readStream.on("error", reject);
  });
}

/**
 * Convert a file from one format to another and write to an output file.
 * Handles file reading, conversion, and writing with streaming.
 * 
 * @example
 * await convertFileToFile("input.csv", "output.json", {
 *   inputFormat: "csv",
 *   outputFormat: "json"
 * });
 * 
 * @example
 * // With progress tracking
 * await convertFileToFile("large-data.csv", "output.ndjson", {
 *   inputFormat: "auto",
 *   outputFormat: "ndjson",
 *   onProgress: (stats) => {
 *     const percent = (stats.bytesIn / totalSize * 100).toFixed(1);
 *     console.log(`Progress: ${percent}%`);
 *   }
 * });
 */
export async function convertFileToFile(
  inputPath: PathLike,
  outputPath: PathLike,
  opts: ConvertBuddyOptions = {}
): Promise<void> {
  const fs = await import("node:fs");
  
  // Handle auto-detection
  let actualOpts = { ...opts };
  
  if (opts.inputFormat === "auto") {
    const sampleSize = 256 * 1024;
    const fileHandle = await fs.promises.open(inputPath, "r");
    const buffer = Buffer.allocUnsafe(sampleSize);
    const { bytesRead } = await fileHandle.read(buffer, 0, sampleSize, 0);
    await fileHandle.close();
    
    const sample = new Uint8Array(buffer.buffer, buffer.byteOffset, bytesRead);
    const detected = await autoDetectConfig(sample, { debug: opts.debug });
    
    if (detected.format !== "unknown") {
      actualOpts.inputFormat = detected.format as Format;
      
      if (detected.csvConfig) {
        actualOpts.csvConfig = opts.csvConfig ? { ...detected.csvConfig, ...opts.csvConfig } : detected.csvConfig;
      }
      
      if (detected.xmlConfig) {
        actualOpts.xmlConfig = opts.xmlConfig ? { ...detected.xmlConfig, ...opts.xmlConfig } : detected.xmlConfig;
      }
      
      if (opts.debug) {
        console.log("[convert-buddy] Auto-detected format:", detected.format);
      }
    } else {
      throw new Error("Could not auto-detect input format. Please specify inputFormat explicitly.");
    }
  }
  
  const buddy = await ConvertBuddy.create(actualOpts);
  const readStream = fs.createReadStream(inputPath, { highWaterMark: 64 * 1024 });
  const writeStream = fs.createWriteStream(outputPath);
  
  return new Promise((resolve, reject) => {
    readStream.on("data", (chunk: Buffer) => {
      try {
        if (buddy.isAborted()) {
          readStream.destroy();
          writeStream.destroy();
          reject(new Error("Conversion aborted"));
          return;
        }
        
        const output = buddy.push(new Uint8Array(chunk));
        if (output.length > 0) {
          writeStream.write(Buffer.from(output));
        }
      } catch (error) {
        readStream.destroy();
        writeStream.destroy();
        reject(error);
      }
    });
    
    readStream.on("end", () => {
      try {
        const final = buddy.finish();
        if (final.length > 0) {
          writeStream.write(Buffer.from(final));
        }
        
        writeStream.end();
        
        if (opts.profile) {
          console.log("[convert-buddy] Performance Stats:", buddy.stats());
        }
      } catch (error) {
        writeStream.destroy();
        reject(error);
      }
    });
    
    writeStream.on("finish", () => resolve());
    writeStream.on("error", reject);
    readStream.on("error", reject);
  });
}

/**
 * Convert data from a Node.js Readable stream.
 * Useful for processing data from HTTP requests, stdin, or other stream sources.
 * 
 * @example
 * import { createReadStream } from 'fs';
 * const stream = createReadStream('input.csv');
 * const result = await convertStream(stream, {
 *   inputFormat: "csv",
 *   outputFormat: "json"
 * });
 */
export async function convertStream(
  inputStream: NodeJS.ReadableStream,
  opts: ConvertBuddyOptions = {}
): Promise<Buffer> {
  // Handle auto-detection by buffering initial chunk
  let actualOpts = { ...opts };
  let firstChunk: Buffer | null = null;
  
  if (opts.inputFormat === "auto") {
    // We need to peek at the first chunk for detection
    const sampleSize = 256 * 1024;
    const chunks: Buffer[] = [];
    let totalSize = 0;
    
    await new Promise<void>((resolve, reject) => {
      const onData = (chunk: Buffer) => {
        chunks.push(chunk);
        totalSize += chunk.length;
        
        if (totalSize >= sampleSize) {
          inputStream.removeListener("data", onData);
          if ('pause' in inputStream && typeof inputStream.pause === 'function') {
            inputStream.pause();
          }
          resolve();
        }
      };
      
      const onEnd = () => {
        inputStream.removeListener("data", onData);
        resolve();
      };
      
      inputStream.on("data", onData);
      inputStream.once("end", onEnd);
      inputStream.once("error", reject);
    });
    
    const sample = Buffer.concat(chunks).slice(0, sampleSize);
    const detected = await autoDetectConfig(new Uint8Array(sample), { debug: opts.debug });
    
    if (detected.format !== "unknown") {
      actualOpts.inputFormat = detected.format as Format;
      
      if (detected.csvConfig) {
        actualOpts.csvConfig = opts.csvConfig ? { ...detected.csvConfig, ...opts.csvConfig } : detected.csvConfig;
      }
      
      if (detected.xmlConfig) {
        actualOpts.xmlConfig = opts.xmlConfig ? { ...detected.xmlConfig, ...opts.xmlConfig } : detected.xmlConfig;
      }
      
      if (opts.debug) {
        console.log("[convert-buddy] Auto-detected format:", detected.format);
      }
    } else {
      throw new Error("Could not auto-detect input format.");
    }
    
    // Store the buffered data to process it first
    firstChunk = Buffer.concat(chunks);
  }
  
  const buddy = await ConvertBuddy.create(actualOpts);
  const chunks: Buffer[] = [];
  
  return new Promise((resolve, reject) => {
    // Process the buffered first chunk if we did auto-detection
    if (firstChunk) {
      try {
        const output = buddy.push(new Uint8Array(firstChunk));
        if (output.length > 0) {
          chunks.push(Buffer.from(output));
        }
      } catch (error) {
        return reject(error);
      }
    }
    
    inputStream.on("data", (chunk: Buffer) => {
      try {
        if (buddy.isAborted()) {
          if ('destroy' in inputStream && typeof inputStream.destroy === 'function') {
            inputStream.destroy();
          }
          reject(new Error("Conversion aborted"));
          return;
        }
        
        const output = buddy.push(new Uint8Array(chunk));
        if (output.length > 0) {
          chunks.push(Buffer.from(output));
        }
      } catch (error) {
        if ('destroy' in inputStream && typeof inputStream.destroy === 'function') {
          inputStream.destroy();
        }
        reject(error);
      }
    });
    
    inputStream.on("end", () => {
      try {
        const final = buddy.finish();
        if (final.length > 0) {
          chunks.push(Buffer.from(final));
        }
        
        if (opts.profile) {
          console.log("[convert-buddy] Performance Stats:", buddy.stats());
        }
        
        resolve(Buffer.concat(chunks));
      } catch (error) {
        reject(error);
      }
    });
    
    inputStream.on("error", reject);
    
    // Resume if we paused for auto-detection
    if (firstChunk && 'resume' in inputStream && typeof inputStream.resume === 'function') {
      inputStream.resume();
    }
  });
}

/**
 * Convert a Buffer directly (useful when you already have data in memory).
 * 
 * @example
 * const buffer = Buffer.from(csvData);
 * const result = await convertBuffer(buffer, {
 *   inputFormat: "csv",
 *   outputFormat: "json"
 * });
 */
export async function convertBuffer(
  input: Buffer,
  opts: ConvertBuddyOptions = {}
): Promise<Buffer> {
  // Handle auto-detection
  let actualOpts = { ...opts };
  
  if (opts.inputFormat === "auto") {
    const sampleSize = Math.min(256 * 1024, input.length);
    const sample = new Uint8Array(input.buffer, input.byteOffset, sampleSize);
    const detected = await autoDetectConfig(sample, { debug: opts.debug });
    
    if (detected.format !== "unknown") {
      actualOpts.inputFormat = detected.format as Format;
      
      if (detected.csvConfig) {
        actualOpts.csvConfig = opts.csvConfig ? { ...detected.csvConfig, ...opts.csvConfig } : detected.csvConfig;
      }
      
      if (detected.xmlConfig) {
        actualOpts.xmlConfig = opts.xmlConfig ? { ...detected.xmlConfig, ...opts.xmlConfig } : detected.xmlConfig;
      }
      
      if (opts.debug) {
        console.log("[convert-buddy] Auto-detected format:", detected.format);
      }
    } else {
      throw new Error("Could not auto-detect input format.");
    }
  }
  
  const buddy = await ConvertBuddy.create(actualOpts);
  const output = buddy.push(new Uint8Array(input));
  const final = buddy.finish();
  
  if (opts.profile) {
    console.log("[convert-buddy] Performance Stats:", buddy.stats());
  }
  
  return Buffer.concat([Buffer.from(output), Buffer.from(final)]);
}
