// Web Worker for streaming file conversion using convert-buddy-js
// This worker processes a File/Blob in chunks and posts progress/results

let buddy = null;
let totalBytesRead = 0;
let totalBytesWritten = 0;
let recordsProcessed = 0;
let fileSize = 0;
let chunkSize = 1024 * 1024; // 1MB default
let lastProgressPost = 0;
const PROGRESS_THROTTLE_MS = 150; // post progress at most ~6-7 times/sec
const utf8Decoder = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true });

self.onmessage = async (event) => {
  const { type, file, opts } = event.data;

  if (type === 'start') {
    try {
      // Dynamically import WASM module
      const mod = await import('convert-buddy-js');
      const { ConvertBuddy } = mod;
      buddy = await ConvertBuddy.create(opts);
      fileSize = file.size;
      totalBytesRead = 0;
      totalBytesWritten = 0;
      recordsProcessed = 0;
      chunkSize = opts.chunkTargetBytes || chunkSize;

      let offset = 0;
      while (offset < fileSize) {
        const chunkEnd = Math.min(offset + chunkSize, fileSize);
        const chunk = file.slice(offset, chunkEnd);
        const chunkData = await chunk.arrayBuffer();
        const uint8Array = new Uint8Array(chunkData);
        totalBytesRead += uint8Array.length;

        const output = buddy.push(uint8Array);
        if (output && output.length > 0) {
          totalBytesWritten += output.length;

          // Send processed data back as transferable ArrayBuffer to avoid copy
          const ab = output.buffer.slice(output.byteOffset, output.byteOffset + output.byteLength);
          self.postMessage({ type: 'data', chunk: ab }, [ab]);

          // Count records (approximate) on worker side (keep for telemetry)
          try {
            const chunkText = utf8Decoder.decode(output);
            recordsProcessed += chunkText.split('\n').length - 1;
          } catch (e) {
            // ignore decoding failures for counting
          }
        }

        const now = Date.now();
        if (now - lastProgressPost > PROGRESS_THROTTLE_MS) {
          lastProgressPost = now;
          self.postMessage({
            type: 'progress',
            bytesRead: totalBytesRead,
            bytesWritten: totalBytesWritten,
            percentComplete: (totalBytesRead / fileSize) * 100,
            recordsProcessed,
          });
        }

        offset = chunkEnd;
      }
      // Finalize
      const final = buddy.finish();
      totalBytesWritten += final.length;
      try {
        const finalText = utf8Decoder.decode(final);
        recordsProcessed += finalText.split('\n').length - 1;
      } catch (e) {
        // ignore decoding failures for counting
      }
      self.postMessage({
        type: 'complete',
        bytesRead: totalBytesRead,
        bytesWritten: totalBytesWritten,
        recordsProcessed,
        result: final,
      });
    } catch (error) {
      self.postMessage({ type: 'error', error: error.message });
    }
  }
};
