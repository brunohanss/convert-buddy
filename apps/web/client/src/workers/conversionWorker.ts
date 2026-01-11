// Web Worker for handling file conversion off the main thread
// This keeps the UI responsive during heavy processing

interface ConversionMessage {
  type: 'start' | 'chunk' | 'finish';
  chunk?: Uint8Array;
  outputFormat?: string;
  inputFormat?: string;
  fileSize?: number;
}

interface ConversionResponse {
  type: 'progress' | 'complete' | 'error';
  bytesProcessed?: number;
  result?: Uint8Array;
  error?: string;
}

let buddy: any = null;
let totalBytesWritten = 0;

self.onmessage = async (event: MessageEvent<ConversionMessage>) => {
  const { type, chunk, outputFormat, inputFormat, fileSize } = event.data;

  try {
    if (type === 'start') {
      // Initialize ConvertBuddy instance
      const { ConvertBuddy } = await import('convert-buddy-js');
      buddy = await ConvertBuddy.create({
        outputFormat: outputFormat,
        inputFormat: inputFormat,
      });
      
      totalBytesWritten = 0;
      
      self.postMessage({
        type: 'progress',
        bytesProcessed: 0,
      } as ConversionResponse);
    } else if (type === 'chunk' && buddy && chunk) {
      // Process a chunk
      const result = buddy.push(chunk);
      totalBytesWritten += result.length;
      
      self.postMessage({
        type: 'progress',
        bytesProcessed: totalBytesWritten,
        result: result,
      } as ConversionResponse);
    } else if (type === 'finish' && buddy) {
      // Finish conversion and get final result
      const finalResult = buddy.finish();
      totalBytesWritten += finalResult.length;
      
      self.postMessage({
        type: 'complete',
        bytesProcessed: totalBytesWritten,
        result: finalResult,
      } as ConversionResponse);
      
      // Clean up
      buddy = null;
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    self.postMessage({
      type: 'error',
      error: errorMsg,
    } as ConversionResponse);
  }
};
