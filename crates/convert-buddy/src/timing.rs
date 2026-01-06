use std::time::{Duration, Instant};

/// Timer for measuring performance in WASM
pub struct Timer {
    start: Instant,
}

impl Timer {
    pub fn new() -> Self {
        Self {
            start: Instant::now(),
        }
    }

    pub fn elapsed(&self) -> Duration {
        self.start.elapsed()
    }

    pub fn reset(&mut self) {
        self.start = Instant::now();
    }
}

impl Default for Timer {
    fn default() -> Self {
        Self::new()
    }
}

/// Scoped timer that records elapsed time to a target on drop
pub struct ScopedTimer<'a> {
    timer: Timer,
    target: &'a mut u64,
}

impl<'a> ScopedTimer<'a> {
    pub fn new(target: &'a mut u64) -> Self {
        Self {
            timer: Timer::new(),
            target,
        }
    }
}

impl<'a> Drop for ScopedTimer<'a> {
    fn drop(&mut self) {
        *self.target += self.timer.elapsed().as_nanos() as u64;
    }
}

/// Macro for timing a block of code
#[macro_export]
macro_rules! time_block {
    ($target:expr, $block:block) => {{
        let _timer = $crate::timing::ScopedTimer::new($target);
        $block
    }};
}
