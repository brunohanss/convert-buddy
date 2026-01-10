#!/usr/bin/env node

// Set the environment variable before importing the benchmark
process.env.UV_THREADPOOL_SIZE = '1';

// Import and run the benchmark
import('../dist/bench/single-thread.js').catch(err => {
  console.error('Error running single-thread benchmark:', err);
  process.exit(1);
});
