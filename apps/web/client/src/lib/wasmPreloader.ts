/**
 * WASM Preloader
 * 
 * This module preloads and initializes the convert-buddy WASM module
 * during app startup to eliminate initialization overhead during first conversion.
 * 
 * PERFORMANCE BENEFITS:
 * - Eliminates 50-200ms WASM initialization delay on first conversion
 * - Downloads and compiles WASM while user is selecting files
 * - Ensures immediate conversion when user clicks "Convert"
 */

import { ConvertBuddy } from 'convert-buddy-js';

let preloadPromise: Promise<void> | null = null;
let isPreloaded = false;

/**
 * Preload the WASM module by creating a dummy converter instance.
 * This triggers WASM download, compilation, and initialization.
 * 
 * Call this during app initialization (e.g., in main.tsx or App.tsx).
 */
export async function preloadWasm(): Promise<void> {
  if (isPreloaded) {
    return;
  }

  if (preloadPromise) {
    return preloadPromise;
  }

  preloadPromise = (async () => {
    try {
      console.log('[WASM Preloader] Starting WASM preload...');
      const startTime = performance.now();

      // Create a minimal converter to initialize WASM
      await ConvertBuddy.create({
        inputFormat: 'csv',
        outputFormat: 'ndjson',
        debug: false,
      });

      const elapsed = performance.now() - startTime;
      console.log(`[WASM Preloader] WASM preloaded successfully in ${elapsed.toFixed(2)}ms`);
      isPreloaded = true;
    } catch (error) {
      console.error('[WASM Preloader] Failed to preload WASM:', error);
      // Don't throw - let the actual conversion handle the error
    }
  })();

  return preloadPromise;
}

/**
 * Check if WASM has been preloaded.
 */
export function isWasmPreloaded(): boolean {
  return isPreloaded;
}

/**
 * Preload WASM when the browser is idle.
 * This is the recommended way to preload without blocking initial render.
 */
export function preloadWasmWhenIdle(): void {
  if ('requestIdleCallback' in window) {
    requestIdleCallback(() => {
      void preloadWasm();
    }, { timeout: 2000 }); // Force preload after 2s even if not idle
  } else {
    // Fallback for browsers without requestIdleCallback (Safari)
    setTimeout(() => {
      void preloadWasm();
    }, 1000);
  }
}
