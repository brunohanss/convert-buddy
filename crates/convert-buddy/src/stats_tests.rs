#[cfg(test)]
mod stats_tests {
    use wasm_bindgen_test::*;
    use crate::stats::Stats;
    use std::time::Duration;

    #[wasm_bindgen_test]
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

    #[wasm_bindgen_test]
    fn throughput_zero_when_no_time() {
        let stats = Stats::default();
        assert_eq!(stats.throughput_mb_per_sec(), 0.0);
    }
}
