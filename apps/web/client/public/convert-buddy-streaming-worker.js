let buddy = null;
let totalBytesRead = 0;
let totalBytesWritten = 0;
let recordsProcessed = 0;
let fileSize = 0;
let chunkSize = 1024 * 1024;
let lastProgressPost = 0;
const PROGRESS_THROTTLE_MS = 150;
self.onmessage = async (event) => {
  const { type, file, opts } = event.data;
  if (type === "start") {
    try {
      const mod = await import("convert-buddy-js");
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
          const ab = output.buffer.slice(output.byteOffset, output.byteOffset + output.byteLength);
          self.postMessage({ type: "data", chunk: ab }, [ab]);
          try {
            const chunkText = new TextDecoder().decode(output);
            recordsProcessed += chunkText.split("\n").length - 1;
          } catch (e) {
          }
        }
        const now = Date.now();
        if (now - lastProgressPost > PROGRESS_THROTTLE_MS) {
          lastProgressPost = now;
          self.postMessage({
            type: "progress",
            bytesRead: totalBytesRead,
            bytesWritten: totalBytesWritten,
            percentComplete: totalBytesRead / fileSize * 100,
            recordsProcessed
          });
        }
        offset = chunkEnd;
      }
      const final = buddy.finish();
      totalBytesWritten += final.length;
      const finalText = new TextDecoder().decode(final);
      recordsProcessed += finalText.split("\n").length - 1;
      self.postMessage({
        type: "complete",
        bytesRead: totalBytesRead,
        bytesWritten: totalBytesWritten,
        recordsProcessed,
        result: final
      });
    } catch (error) {
      self.postMessage({ type: "error", error: error.message });
    }
  }
};
