import { ConvertBuddy, type ConvertBuddyOptions, type Format, autoDetectConfig } from "./index.js";

export * from "./index.js";

export type BrowserConvertOptions = ConvertBuddyOptions & {
  // Additional browser-specific options can go here
};

/**
 * Convert a browser File or Blob object to a string.
 * Handles streaming internally using FileReader and web streams.
 * 
 * @example
 * // From file input
 * const fileInput = document.querySelector('input[type="file"]');
 * const file = fileInput.files[0];
 * const result = await convertFileToString(file, {
 *   inputFormat: "csv",
 *   outputFormat: "json"
 * });
 * 
 * @example
 * // With auto-detection
 * const result = await convertFileToString(file, {
 *   inputFormat: "auto",
 *   outputFormat: "ndjson"
 * });
 */
export async function convertFileToString(
  file: File | Blob,
  opts: BrowserConvertOptions = {}
): Promise<string> {
  const bytes = await convertFile(file, opts);
  return new TextDecoder().decode(bytes);
}

/**
 * Convert a browser File or Blob object to a Uint8Array.
 * Handles streaming internally using FileReader and web streams.
 * 
 * @example
 * const file = fileInput.files[0];
 * const result = await convertFile(file, {
 *   inputFormat: "csv",
 *   outputFormat: "json",
 *   onProgress: (stats) => {
 *     console.log(`Progress: ${stats.bytesIn} bytes processed`);
 *   }
 * });
 */
export async function convertFile(
  file: File | Blob,
  opts: BrowserConvertOptions = {}
): Promise<Uint8Array> {
  // Handle auto-detection
  let actualOpts = { ...opts };
  
  if (opts.inputFormat === "auto") {
    // Read a sample for auto-detection
    const sampleSize = 256 * 1024; // 256KB
    const sampleBlob = file.slice(0, sampleSize);
    const sampleBuffer = await sampleBlob.arrayBuffer();
    const sample = new Uint8Array(sampleBuffer);
    
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
  
  // Use streams API for efficient processing
  const stream = file.stream();
  const reader = stream.getReader();
  
  const chunks: Uint8Array[] = [];
  
  try {
    while (true) {
      const { done, value } = await reader.read();
      
      if (done) break;
      
      if (buddy.isAborted()) {
        throw new Error("Conversion aborted");
      }
      
      const output = buddy.push(value);
      if (output.length > 0) {
        chunks.push(output);
      }
    }
    
    const final = buddy.finish();
    if (final.length > 0) {
      chunks.push(final);
    }
    
    // Combine all chunks
    const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }
    
    if (opts.profile) {
      console.log("[convert-buddy] Performance Stats:", buddy.stats());
    }
    
    return result;
  } catch (error) {
    reader.releaseLock();
    throw error;
  }
}

/**
 * Convert a browser File or Blob and download the result as a file.
 * 
 * @example
 * const fileInput = document.querySelector('input[type="file"]');
 * const file = fileInput.files[0];
 * await convertFileToFile(file, "output.json", {
 *   inputFormat: "csv",
 *   outputFormat: "json"
 * });
 */
export async function convertFileToFile(
  inputFile: File | Blob,
  outputFilename: string,
  opts: BrowserConvertOptions = {}
): Promise<void> {
  const result = await convertFile(inputFile, opts);
  
  // Create a download link
  const blob = new Blob([new Uint8Array(result)], { type: "application/octet-stream" });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement("a");
  link.href = url;
  link.download = outputFilename;
  link.style.display = "none";
  
  document.body.appendChild(link);
  link.click();
  
  // Cleanup
  setTimeout(() => {
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, 100);
}

/**
 * Create a ReadableStream that converts data on-the-fly from a File or Blob.
 * Useful for piping through other stream processors.
 * 
 * @example
 * const file = fileInput.files[0];
 * const stream = convertFileStream(file, {
 *   inputFormat: "csv",
 *   outputFormat: "ndjson"
 * });
 * 
 * const reader = stream.getReader();
 * while (true) {
 *   const { done, value } = await reader.read();
 *   if (done) break;
 *   // Process each chunk as it's converted
 *   console.log(new TextDecoder().decode(value));
 * }
 */
export async function convertFileStream(
  file: File | Blob,
  opts: BrowserConvertOptions = {}
): Promise<ReadableStream<Uint8Array>> {
  // Handle auto-detection
  let actualOpts = { ...opts };
  
  if (opts.inputFormat === "auto") {
    const sampleSize = 256 * 1024;
    const sampleBlob = file.slice(0, sampleSize);
    const sampleBuffer = await sampleBlob.arrayBuffer();
    const sample = new Uint8Array(sampleBuffer);
    
    const detected = await autoDetectConfig(sample, { debug: opts.debug });
    
    if (detected.format !== "unknown") {
      actualOpts.inputFormat = detected.format as Format;
      if (detected.csvConfig) {
        actualOpts.csvConfig = opts.csvConfig ? { ...detected.csvConfig, ...opts.csvConfig } : detected.csvConfig;
      }
      if (detected.xmlConfig) {
        actualOpts.xmlConfig = opts.xmlConfig ? { ...detected.xmlConfig, ...opts.xmlConfig } : detected.xmlConfig;
      }
    } else {
      throw new Error("Could not auto-detect input format.");
    }
  }
  
  const buddy = await ConvertBuddy.create(actualOpts);
  const inputStream = file.stream();
  
  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const reader = inputStream.getReader();
      
      try {
        while (true) {
          const { done, value } = await reader.read();
          
          if (done) {
            const final = buddy.finish();
            if (final.length > 0) {
              controller.enqueue(final);
            }
            controller.close();
            break;
          }
          
          if (buddy.isAborted()) {
            controller.error(new Error("Conversion aborted"));
            break;
          }
          
          const output = buddy.push(value);
          if (output.length > 0) {
            controller.enqueue(output);
          }
        }
      } catch (error) {
        controller.error(error);
      } finally {
        reader.releaseLock();
      }
    },
  });
}
