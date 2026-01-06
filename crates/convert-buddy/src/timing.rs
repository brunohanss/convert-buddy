use std::time::Duration;

/// Get current time in milliseconds (WASM-compatible)
#[cfg(target_arch = "wasm32")]
fn now_ms() -> f64 {
    js_sys::Date::now()
}

#[cfg(not(target_arch = "wasm32"))]
fn now_ms() -> f64 {
    use std::time::SystemTime;
    SystemTime::now()
        .duration_since(SystemTime::UNIX_EPOCH)
        .unwrap()
        .as_secs_f64() * 1000.0
}

/// Timer for measuring performance in WASM
pub struct Timer {
    start_ms: f64,
}

impl Timer {
    pub fn new() -> Self {
        Self {
            start_ms: now_ms(),
        }
    }

    pub fn elapsed(&self) -> Duration {
        let elapsed_ms = now_ms() - self.start_ms;
        Duration::from_secs_f64(elapsed_ms / 1000.0)
    }

    pub fn reset(&mut self) {
        self.start_ms = now_ms();
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
