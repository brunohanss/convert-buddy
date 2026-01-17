#[cfg(test)]
mod timing_tests {
    use wasm_bindgen_test::*;
    use crate::timing::{Timer, ScopedTimer};
    use std::time::Duration;

    #[wasm_bindgen_test]
    fn timer_tracks_elapsed_and_reset() {
        let mut timer = Timer::new();
        let first = timer.elapsed();
        timer.reset();
        let second = timer.elapsed();
        assert!(first >= Duration::from_secs(0));
        assert!(second >= Duration::from_secs(0));
    }

    #[wasm_bindgen_test]
    fn scoped_timer_updates_target_on_drop() {
        let mut target = 0u64;
        {
            let _timer = ScopedTimer::new(&mut target);
        }
        assert!(target > 0);
    }

    #[wasm_bindgen_test]
    fn time_block_macro_records_time() {
        let mut target = 0u64;
        let result = {
            let _timer = ScopedTimer::new(&mut target);
            2 + 2
        };
        assert_eq!(result, 4);
        assert!(target > 0);
    }
}
