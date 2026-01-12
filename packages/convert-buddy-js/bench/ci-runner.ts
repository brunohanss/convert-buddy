/**
 * Benchmark runner that ensures JSON output is saved properly
 * This is the main runner for CI benchmarks
 */

import { runBenchmarks } from "./runner.js";

// Override console.log to filter out non-JSON output during benchmark
const originalLog = console.log;
const logs: string[] = [];

// Temporarily capture logs
console.log = (...args: any[]) => {
  logs.push(args.map(a => String(a)).join(" "));
};

try {
  await runBenchmarks();
} finally {
  // Restore original console.log
  console.log = originalLog;
  
  // Print captured logs
  logs.forEach(log => console.log(log));
}
