let timer: ReturnType<typeof setInterval> | null = null;
let progress = 0;

self.onmessage = (event: MessageEvent<{ type: string }>) => {
  if (event.data.type === 'start') {
    progress = 0;
    if (timer) clearInterval(timer);
    timer = setInterval(() => {
      progress += 6;
      if (progress >= 100) {
        progress = 100;
      }
      self.postMessage({
        type: 'progress',
        payload: {
          progress,
          throughput: 150 + Math.random() * 80,
          recordsPerSec: 900000 + Math.random() * 400000,
          memory: 60 + Math.random() * 20
        }
      });
      if (progress === 100 && timer) {
        clearInterval(timer);
        timer = null;
        self.postMessage({ type: 'complete' });
      }
    }, 600);
  }

  if (event.data.type === 'stop') {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
    self.postMessage({ type: 'stopped' });
  }
};
