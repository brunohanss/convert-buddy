/**
 * Streaming File Processor using convert-buddy-js WASM
 * 
 * This module handles large file processing by:
 * 1. Reading files in chunks
 * 2. Processing each chunk with convert-buddy WASM parser
 * 3. Writing output chunks to disk using File System Access API
 * 4. Tracking real-time performance metrics
 * 
 * Note: Most of this functionality is now available in convert-buddy-js/browser
 * via convertStreamToWritable, autoConvertStream, and related helpers.
 */

import { 
  ConvertBuddy, 
  detectFormat, 
  getSuggestedFilename,
  getFileTypeConfig,
  type Format 
} from 'convert-buddy-js/browser';

export interface StreamingProgress {
  bytesRead: number;
  bytesWritten: number;
  totalBytes: number;
  percentComplete: number;
  throughputMbPerSec: number;
  elapsedSeconds: number;
  estimatedSecondsRemaining: number;
  recordsProcessed: number;
  status: 'idle' | 'reading' | 'processing' | 'writing' | 'complete' | 'error';
  error?: string;
}

export interface StreamingResult {
  success: boolean;
  totalBytesRead: number;
  totalBytesWritten: number;
  totalRecordsProcessed: number;
  totalTimeSeconds: number;
  averageThroughputMbPerSec: number;
  outputFileName: string;
  outputFormat: Format;
  error?: string;
}

const CHUNK_SIZE = 2 * 1024 * 1024; // 2MB chunks for optimal WASM processing (was 1MB)

/**
 * Process a large file using streaming with convert-buddy WASM
 * Uses the actual convert-buddy-js library for real parsing
 */
export async function streamProcessFile(
  file: File,
  onProgress: (progress: StreamingProgress) => void,
  options: {
    outputFormat: Format;
    inputFormat?: Format;
  }
): Promise<StreamingResult> {
  const startTime = performance.now();
  let bytesRead = 0;
  let bytesWritten = 0;
  let recordsProcessed = 0;
  let fileHandle: FileSystemFileHandle | null = null;
  let writable: FileSystemWritableFileStream | null = null;
  const outputFormat = options.outputFormat;

  try {
    const inputFormat = options.inputFormat ?? await detectFormat(file.stream());
    if (inputFormat === "unknown") {
      throw new Error("Unable to detect the input format for streaming conversion.");
    }

    // Initialize convert-buddy parser with actual WASM library
    const parser = await ConvertBuddy.create({
      debug: false,
      inputFormat,
      outputFormat,
    });

    // Request write permission using File System Access API
    const baseName = file.name.replace(/\.[^/.]+$/, "");
    const fileName = getSuggestedFilename(file.name, outputFormat, true);
    const types = getFileTypeConfig(outputFormat);
    
    fileHandle = await (window as any).showSaveFilePicker({
      suggestedName: fileName,
      types,
    });

    if (!fileHandle) {
      throw new Error('File save cancelled by user');
    }

    writable = await fileHandle.createWritable();

    // Process file in chunks
    let offset = 0;
    const totalBytes = file.size;

    while (offset < totalBytes) {
      const chunkEnd = Math.min(offset + CHUNK_SIZE, totalBytes);
      const chunk = file.slice(offset, chunkEnd);
      const chunkData = await chunk.arrayBuffer();
      const uint8Array = new Uint8Array(chunkData);

      bytesRead += chunkData.byteLength;

      // Update progress - processing
      const elapsedSeconds = (performance.now() - startTime) / 1000;
      const throughputMbPerSec = (bytesRead / (1024 * 1024)) / Math.max(elapsedSeconds, 0.1);
      const percentComplete = (bytesRead / totalBytes) * 100;
      const estimatedSecondsRemaining = 
        bytesRead > 0 
          ? ((totalBytes - bytesRead) / (bytesRead / elapsedSeconds))
          : 0;

      onProgress({
        bytesRead,
        bytesWritten,
        totalBytes,
        percentComplete,
        throughputMbPerSec,
        elapsedSeconds,
        estimatedSecondsRemaining,
        recordsProcessed,
        status: 'processing',
      });

      // Process chunk with convert-buddy WASM parser
      try {
        const processedChunk = parser.push(uint8Array);
        
        if (processedChunk && processedChunk.length > 0) {
          // Write processed chunk to disk
          await writable.write(processedChunk);
          bytesWritten += processedChunk.byteLength;

          // Count records (approximate - count newlines)
          const chunkText = new TextDecoder().decode(processedChunk);
          const lineCount = chunkText.split('\n').length - 1;
          recordsProcessed += lineCount;
        }
      } catch (error) {
        throw new Error(`Failed to process chunk at offset ${offset}: ${error}`);
      }

      offset = chunkEnd;
    }

    // Finalize parser to get any remaining output
    const finalOutput = parser.finish();
    if (finalOutput && finalOutput.length > 0) {
      await writable.write(finalOutput);
      bytesWritten += finalOutput.byteLength;
      const finalText = new TextDecoder().decode(finalOutput);
      recordsProcessed += finalText.split('\n').length - 1;
    }

    // Close file handle
    await writable.close();

    const totalTimeSeconds = (performance.now() - startTime) / 1000;
    const averageThroughputMbPerSec = (bytesWritten / (1024 * 1024)) / Math.max(totalTimeSeconds, 0.1);

    // Final progress update
    onProgress({
      bytesRead: totalBytes,
      bytesWritten,
      totalBytes,
      percentComplete: 100,
      throughputMbPerSec: averageThroughputMbPerSec,
      elapsedSeconds: totalTimeSeconds,
      estimatedSecondsRemaining: 0,
      recordsProcessed,
      status: 'complete',
    });

    return {
      success: true,
      totalBytesRead: bytesRead,
      totalBytesWritten: bytesWritten,
      totalRecordsProcessed: recordsProcessed,
      totalTimeSeconds,
      averageThroughputMbPerSec,
      outputFileName: fileName,
      outputFormat,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Close file handle if open
    if (writable) {
      try {
        await writable.close();
      } catch (e) {
        // Ignore close errors
      }
    }

    onProgress({
      bytesRead,
      bytesWritten,
      totalBytes: file.size,
      percentComplete: (bytesRead / file.size) * 100,
      throughputMbPerSec: 0,
      elapsedSeconds: (performance.now() - startTime) / 1000,
      estimatedSecondsRemaining: 0,
      recordsProcessed,
      status: 'error',
      error: errorMessage,
    });

    return {
      success: false,
      totalBytesRead: bytesRead,
      totalBytesWritten: bytesWritten,
      totalRecordsProcessed: recordsProcessed,
      totalTimeSeconds: (performance.now() - startTime) / 1000,
      averageThroughputMbPerSec: 0,
      outputFileName: '',
      outputFormat,
      error: errorMessage,
    };
  }
}

/**
 * Check if File System Access API is supported
 */
export function isFileSystemAccessSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'showSaveFilePicker' in window &&
    'showOpenFilePicker' in window
  );
}

/**
 * Format bytes to human-readable size
 */
export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Format seconds to human-readable time
 */
export function formatTime(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return `${minutes}m ${secs}s`;
  }
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
}
