import React from 'react';

export default function PerformanceModelPage() {
  return (
    <div>
      <h1>Performance Model</h1>

      <p>
        Understanding Convert Buddy's performance characteristics helps you optimize usage and set realistic expectations.
      </p>

      <h2>WASM initialization</h2>

      <p>
        The first time you use Convert Buddy, it loads and initializes the WebAssembly module:
      </p>

      <ul>
        <li><strong>Time</strong>: 10-100ms (one-time cost per page load)</li>
        <li><strong>When</strong>: First call to any Convert Buddy function</li>
        <li><strong>Impact</strong>: Amortized across all conversions in same session</li>
      </ul>

      <pre><code>{`First conversion:  WASM init (50ms) + conversion (20ms) = 70ms
Second conversion: conversion (20ms) = 20ms
Third conversion:  conversion (20ms) = 20ms`}</code></pre>

      <p>
        <strong>Takeaway:</strong> First conversion is slower; subsequent conversions are fast.
      </p>

      <h2>Chunk sizing</h2>

      <p>
        Data flows through the pipeline in chunks. Chunk size affects performance:
      </p>

      <table>
        <thead>
          <tr>
            <th>Chunk size</th>
            <th>Throughput</th>
            <th>Memory</th>
            <th>Progress granularity</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>64KB</td>
            <td>Slower (overhead)</td>
            <td>Lower</td>
            <td>Fine-grained</td>
          </tr>
          <tr>
            <td>1MB (default)</td>
            <td>Optimal</td>
            <td>Moderate</td>
            <td>Balanced</td>
          </tr>
          <tr>
            <td>10MB</td>
            <td>Faster (fewer callbacks)</td>
            <td>Higher</td>
            <td>Coarse</td>
          </tr>
        </tbody>
      </table>

      <p>
        Configure via <code>chunkTargetBytes</code>:
      </p>

      <pre><code>{`const buddy = await ConvertBuddy.create({
  chunkTargetBytes: 2 * 1024 * 1024  // 2MB chunks
});`}</code></pre>

      <h2>Parallelism</h2>

      <p>
        Convert Buddy supports parallel processing in Node.js:
      </p>

      <pre><code>{`const buddy = new ConvertBuddy({
  parallelism: 4  // Use 4 threads (Node only)
});`}</code></pre>

      <p>
        <strong>When parallelism helps:</strong>
      </p>
      <ul>
        <li>Large files (&gt;10MB)</li>
        <li>CPU-bound conversions (XML parsing, complex transforms)</li>
        <li>Multi-core CPUs</li>
      </ul>

      <p>
        <strong>When it doesn't:</strong>
      </p>
      <ul>
        <li>Small files (&lt;1MB)—overhead dominates</li>
        <li>I/O-bound operations</li>
        <li>Single-core environments</li>
      </ul>

      <h2>When overhead dominates</h2>

      <p>
        For tiny inputs, WASM initialization and function call overhead exceed conversion time:
      </p>

      <table>
        <thead>
          <tr>
            <th>Input size</th>
            <th>Init overhead</th>
            <th>Conversion time</th>
            <th>Total time</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>1KB</td>
            <td>50ms</td>
            <td>1ms</td>
            <td>51ms</td>
          </tr>
          <tr>
            <td>10KB</td>
            <td>0ms (cached)</td>
            <td>2ms</td>
            <td>2ms</td>
          </tr>
          <tr>
            <td>1MB</td>
            <td>0ms (cached)</td>
            <td>20ms</td>
            <td>20ms</td>
          </tr>
          <tr>
            <td>100MB</td>
            <td>0ms (cached)</td>
            <td>2000ms</td>
            <td>2000ms</td>
          </tr>
        </tbody>
      </table>

      <p>
        <strong>Rule of thumb:</strong> Convert Buddy is worthwhile for files &gt;1MB.
        For smaller inputs, native JavaScript parsers are faster.
      </p>

      <h2>Key takeaways</h2>

      <ul>
        <li>WASM init is one-time ~50ms cost per page load</li>
        <li>Default 1MB chunks balance throughput and memory</li>
        <li>Parallelism helps for large files in Node.js</li>
        <li>For files &lt;1MB, overhead may dominate</li>
        <li>Typical throughput: 50-150 MB/s</li>
      </ul>
    </div>
  );
}
