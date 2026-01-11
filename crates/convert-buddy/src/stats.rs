use std::time::Duration;
use wasm_bindgen::prelude::*;

/// Performance statistics for the converter
#[wasm_bindgen]
#[derive(Debug, Clone, Default)]
pub struct Stats {
    pub(crate) bytes_in: u64,
    pub(crate) bytes_out: u64,
    pub(crate) chunks_in: u64,
    pub(crate) records_processed: u64,
    pub(crate) parse_time_ns: u64,
    pub(crate) transform_time_ns: u64,
    pub(crate) write_time_ns: u64,
    pub(crate) max_buffer_size: usize,
    pub(crate) current_partial_size: usize,
}

#[wasm_bindgen]
impl Stats {
    #[wasm_bindgen(getter)]
    pub fn bytes_in(&self) -> f64 {
        self.bytes_in as f64
    }

    #[wasm_bindgen(getter)]
    pub fn bytes_out(&self) -> f64 {
        self.bytes_out as f64
    }

    #[wasm_bindgen(getter)]
    pub fn chunks_in(&self) -> f64 {
        self.chunks_in as f64
    }

    #[wasm_bindgen(getter)]
    pub fn records_processed(&self) -> f64 {
        self.records_processed as f64
    }

    #[wasm_bindgen(getter)]
    pub fn parse_time_ms(&self) -> f64 {
        self.parse_time_ns as f64 / 1_000_000.0
    }

    #[wasm_bindgen(getter)]
    pub fn transform_time_ms(&self) -> f64 {
        self.transform_time_ns as f64 / 1_000_000.0
    }

    #[wasm_bindgen(getter)]
    pub fn write_time_ms(&self) -> f64 {
        self.write_time_ns as f64 / 1_000_000.0
    }

    #[wasm_bindgen(getter)]
    pub fn max_buffer_size(&self) -> usize {
        self.max_buffer_size
    }

    #[wasm_bindgen(getter)]
    pub fn current_partial_size(&self) -> usize {
        self.current_partial_size
    }

    #[wasm_bindgen(getter)]
    pub fn throughput_mb_per_sec(&self) -> f64 {
        let total_time_sec = (self.parse_time_ns + self.transform_time_ns + self.write_time_ns) as f64 / 1_000_000_000.0;
        if total_time_sec > 0.0 {
            (self.bytes_in as f64 / 1_048_576.0) / total_time_sec
        } else {
            0.0
        }
    }
}

impl Stats {
    pub(crate) fn record_chunk(&mut self, bytes: usize) {
        self.bytes_in += bytes as u64;
        self.chunks_in += 1;
    }

    pub(crate) fn record_output(&mut self, bytes: usize) {
        self.bytes_out += bytes as u64;
    }

    pub(crate) fn record_records(&mut self, count: usize) {
        self.records_processed += count as u64;
    }

    pub(crate) fn record_parse_time(&mut self, duration: Duration) {
        self.parse_time_ns += duration.as_nanos() as u64;
    }

    pub(crate) fn record_transform_time(&mut self, duration: Duration) {
        self.transform_time_ns += duration.as_nanos() as u64;
    }

    pub(crate) fn record_write_time(&mut self, duration: Duration) {
        self.write_time_ns += duration.as_nanos() as u64;
    }

    pub(crate) fn update_buffer_size(&mut self, size: usize) {
        self.current_partial_size = size;
        if size > self.max_buffer_size {
            self.max_buffer_size = size;
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::time::Duration;

    #[test]
    fn stats_getters_and_recording() {
        let mut stats = Stats::default();
        stats.record_chunk(128);
        stats.record_output(256);
        stats.record_records(3);
        stats.record_parse_time(Duration::from_millis(10));
        stats.record_transform_time(Duration::from_millis(20));
        stats.record_write_time(Duration::from_millis(30));
        stats.update_buffer_size(64);
        stats.update_buffer_size(32);

        assert_eq!(stats.bytes_in(), 128.0);
        assert_eq!(stats.bytes_out(), 256.0);
        assert_eq!(stats.chunks_in(), 1.0);
        assert_eq!(stats.records_processed(), 3.0);
        assert_eq!(stats.max_buffer_size(), 64);
        assert_eq!(stats.current_partial_size(), 32);
        assert!(stats.parse_time_ms() > 0.0);
        assert!(stats.transform_time_ms() > 0.0);
        assert!(stats.write_time_ms() > 0.0);
        assert!(stats.throughput_mb_per_sec() > 0.0);
    }

    #[test]
    fn throughput_zero_when_no_time() {
        let stats = Stats::default();
        assert_eq!(stats.throughput_mb_per_sec(), 0.0);
    }
}
