use wasm_bindgen::prelude::*;
use log::{debug, info};

#[wasm_bindgen]
pub fn init(debug_enabled: bool) {
    console_error_panic_hook::set_once();

    // Default to info; enable debug logs when requested.
    // In a real tool, you may expose a numeric log level setter.
    if debug_enabled {
        let _ = console_log::init_with_level(log::Level::Debug);
        debug!("convert-buddy: debug logging enabled");
    } else {
        let _ = console_log::init_with_level(log::Level::Info);
        info!("convert-buddy: logging initialized");
    }
}

/// A streaming converter state machine.
/// For now this is a skeleton that simply echoes input bytes.
/// Replace internals with real parsing + transformation later.
#[wasm_bindgen]
pub struct Converter {
    debug: bool,
    // Placeholders for stateful parsers (e.g., partial line buffer for NDJSON/CSV)
    partial: Vec<u8>,
}

#[wasm_bindgen]
impl Converter {
    #[wasm_bindgen(constructor)]
    pub fn new(debug: bool) -> Converter {
        if debug {
            debug!("Converter::new(debug=true)");
        }
        Converter { debug, partial: Vec::new() }
    }

    /// Push a chunk of bytes. Returns converted output bytes for that chunk.
    /// IMPORTANT: This method is intentionally "batchy": one call per chunk.
    /// Avoid per-row callbacks from WASM -> JS to reduce boundary overhead.
    pub fn push(&mut self, chunk: &[u8]) -> Vec<u8> {
        if self.debug {
            debug!("Converter::push chunk_len={}", chunk.len());
        }

        // Skeleton behavior: pass-through.
        // Replace with format-aware streaming conversion.
        chunk.to_vec()
    }

    /// Finish the stream and return any remaining buffered output.
    pub fn finish(&mut self) -> Vec<u8> {
        if self.debug {
            debug!("Converter::finish partial_len={}", self.partial.len());
        }
        let out = std::mem::take(&mut self.partial);
        out
    }
}
