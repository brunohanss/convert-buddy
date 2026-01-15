/**
 * Stream a File/Blob conversion in a Web Worker with progress updates.
 *
 * @param file File or Blob to convert
 * @param opts Convert options (inputFormat, outputFormat, etc)
 * @param onProgress Callback for progress updates
 * @returns Promise<Uint8Array> with the converted result
 */
export async function streamProcessFileInWorker(
  file: File | Blob,
  opts: BrowserConvertOptions = {},
  onProgress?: (progress: { bytesRead: number; bytesWritten: number; percentComplete: number; recordsProcessed: number }) => void
): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    // Create worker
    const worker = new Worker(new URL('./streaming-worker.js', import.meta.url), { type: 'module' });

    worker.onmessage = (event) => {
      const { type, ...data } = event.data;
      if (type === 'progress' && onProgress) {
        onProgress(data);
      } else if (type === 'complete') {
        worker.terminate();
        resolve(new Uint8Array(data.result));
      } else if (type === 'error') {
        worker.terminate();
        reject(new Error(data.error));
      }
    };

    // Send file and options to worker
    worker.postMessage({ type: 'start', file, opts });
  });
}
import { ConvertBuddy, type ConvertBuddyOptions, type ConvertOptions, type Format, autoDetectConfig, detectFormat, getMimeType, getFileTypeConfig, convertAny as convertAnyCore, convertAnyToString as convertAnyToStringCore } from "./index.js";

export * from "./index.js";

export type BrowserConvertOptions = ConvertBuddyOptions & {
  // Additional browser-specific options can go here
};

/**
 * Ultra-simple convert function for browser.
 * Auto-detects input type (File, URL, string, etc.) and format.
 * 
 * @example
 * // From File
 * const file = fileInput.files[0];
 * const result = await convert(file, { outputFormat: "json" });
 * 
 * @example
 * // From URL
 * const result = await convert("https://example.com/data.csv", { outputFormat: "json" });
 * 
 * @example
 * // From string
 * const result = await convert(csvString, { outputFormat: "json" });
 */
export async function convert(
  input: string | Uint8Array | File | Blob | ReadableStream<Uint8Array>,
  opts: ConvertOptions
): Promise<Uint8Array> {
  return convertAnyCore(input, opts);
}

/**
 * Ultra-simple convert function that returns a string.
 * 
 * @example
 * const json = await convertToString(file, { outputFormat: "json" });
 * console.log(JSON.parse(json));
 */
export async function convertToString(
  input: string | Uint8Array | File | Blob | ReadableStream<Uint8Array>,
  opts: ConvertOptions
): Promise<string> {
  return convertAnyToStringCore(input, opts);
}

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
  const decoder = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true });
  return decoder.decode(bytes);
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
    const sample = new Uint8Array(sampleBuffer as ArrayBuffer);
    
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
  
  // Adaptive chunk sizing based on file size
  // Tuned to balance WASM boundary crossing reduction with memory efficiency
  if (!actualOpts.chunkTargetBytes) {
    const fileSize = file.size;
    actualOpts.chunkTargetBytes = Math.max(
      512 * 1024,      // minimum: 512KB
      Math.min(
        1 * 1024 * 1024,   // maximum: 1MB (conservative for memory)
        Math.floor(fileSize / 16)  // 1/16 of file size
      )
    );
    if (opts.debug) {
      console.log(`[convert-buddy] Adaptive chunk sizing: ${fileSize} bytes → ${actualOpts.chunkTargetBytes} byte chunks`);
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
/**
 * Auto-detect format and create a ReadableStream for conversion.
 * This is a convenience helper that combines format detection with streaming conversion.
 * 
 * @example
 * const file = fileInput.files[0];
 * const stream = await autoConvertStream(file, { outputFormat: "json" });
 * 
 * // Pipe to response
 * return new Response(stream);
 */
export async function autoConvertStream(
  file: File | Blob,
  opts: Omit<BrowserConvertOptions, "inputFormat"> & { outputFormat: Format }
): Promise<ReadableStream<Uint8Array>> {
  return convertFileStream(file, {
    ...opts,
    inputFormat: "auto",
  });
}

/**
 * Stream a file conversion directly to a writable destination.
 * This is useful for streaming large conversions to disk using File System Access API
 * or to other writable streams.
 * 
 * @example
 * // Using File System Access API
 * const fileInput = document.querySelector('input[type="file"]');
 * const file = fileInput.files[0];
 * 
 * const fileHandle = await window.showSaveFilePicker({
 *   suggestedName: "output.json",
 *   types: [{ description: "JSON", accept: { "application/json": [".json"] } }]
 * });
 * const writable = await fileHandle.createWritable();
 * 
 * await convertStreamToWritable(file, writable, {
 *   inputFormat: "csv",
 *   outputFormat: "json",
 *   onProgress: (stats) => console.log(`${stats.bytesIn} bytes processed`)
 * });
 * 
 * @example
 * // With auto-detection
 * await convertStreamToWritable(file, writable, {
 *   inputFormat: "auto",
 *   outputFormat: "ndjson"
 * });
 */
export async function convertStreamToWritable(
  file: File | Blob,
  writable: WritableStream<Uint8Array> | FileSystemWritableFileStream,
  opts: BrowserConvertOptions = {}
): Promise<void> {
  const outputStream = await convertFileStream(file, opts);
  await outputStream.pipeTo(writable);
}

/**
 * Check if File System Access API is supported in the current browser.
 * Use this to determine if you can use File System Access API features.
 * 
 * @example
 * if (isFileSystemAccessSupported()) {
 *   // Use File System Access API
 *   const handle = await window.showSaveFilePicker();
 * } else {
 *   // Fall back to download link
 *   await convertFileToFile(file, "output.json", opts);
 * }
 */
export function isFileSystemAccessSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "showSaveFilePicker" in window &&
    "showOpenFilePicker" in window
  );
}

/**
 * Convert a file and save it using File System Access API with a user-selected location.
 * This provides a better UX than automatic downloads by letting users choose where to save.
 * Falls back to regular download if File System Access API is not supported.
 * 
 * @example
 * const file = fileInput.files[0];
 * await convertAndSave(file, {
 *   inputFormat: "csv",
 *   outputFormat: "json",
 *   suggestedName: "output.json"
 * });
 */
export async function convertAndSave(
  file: File | Blob,
  opts: BrowserConvertOptions & {
    suggestedName?: string;
  } = {}
): Promise<void> {
  if (!isFileSystemAccessSupported()) {
    // Fall back to regular download
    const filename = opts.suggestedName || "converted";
    await convertFileToFile(file, filename, opts);
    return;
  }

  const outputFormat = opts.outputFormat || "json";
  const suggestedName = opts.suggestedName || `converted.${outputFormat}`;
  const types = getFileTypeConfig(outputFormat);

  try {
    const fileHandle = await (window as any).showSaveFilePicker({
      suggestedName,
      types,
    });

    const writable = await fileHandle.createWritable();
    await convertStreamToWritable(file, writable, opts);
  } catch (error: any) {
    // User cancelled or error occurred
    if (error?.name === "AbortError") {
      // User cancelled - this is fine, just return
      return;
    }
    // Re-throw other errors
    throw error;
  }
}

/**
 * Stream a File/Blob conversion in a Web Worker and pipe output to a Writable.
 * This is useful for saving directly to disk using File System Access API.
 */
export async function streamProcessFileInWorkerToWritable(
  file: File | Blob,
  writable: WritableStream<Uint8Array> | FileSystemWritableFileStream,
  opts: BrowserConvertOptions = {},
  onProgress?: (progress: { bytesRead: number; bytesWritten: number; percentComplete: number; recordsProcessed: number }) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./streaming-worker.js', import.meta.url), { type: 'module' });
    let writer: WritableStreamDefaultWriter<Uint8Array> | null = null;

    (async () => {
      try {
        if ((writable as any).getWriter) {
          writer = (writable as WritableStream<Uint8Array>).getWriter();
        } else {
          // FileSystemWritableFileStream supports write(Uint8Array)
          writer = null;
        }

        worker.onmessage = async (event) => {
          const { type } = event.data;
          if (type === 'data') {
            const ab: ArrayBuffer = event.data.chunk;
            const chunk = new Uint8Array(ab);
            if (writer) {
              await writer.write(chunk);
            } else if ((writable as any).write) {
              await (writable as any).write(chunk);
            }
          } else if (type === 'progress') {
            onProgress?.(event.data);
          } else if (type === 'complete') {
            // write final chunk if present
            if (event.data.result) {
              const finalChunk = new Uint8Array(event.data.result);
              if (writer) await writer.write(finalChunk);
              else if ((writable as any).write) await (writable as any).write(finalChunk);
            }

            try {
              // Only close if we have a writer (WritableStream with getWriter)
              // FileSystemWritableFileStream should NOT be closed by us - caller owns it
              if (writer) {
                await writer.close();
              }
            } catch (e) {
              // ignore close errors
            }
            worker.terminate();
            resolve();
          } else if (type === 'error') {
            worker.terminate();
            reject(new Error(event.data.error));
          }
        };

        // Start worker
        worker.postMessage({ type: 'start', file, opts });
      } catch (err) {
        if (writer) {
          try { await writer.abort(err); } catch {}
        }
        worker.terminate();
        reject(err);
      }
    })();
  });
}
