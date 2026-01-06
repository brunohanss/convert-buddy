# Performance Improvement Proposals

## Current Performance (Baseline)

Based on benchmark results:

| Conversion | Dataset Size | Throughput | Records/sec |
|------------|--------------|------------|-------------|
| CSV→NDJSON (small) | 0.12 MB | 13.6 MB/s | 117,051 |
| CSV→NDJSON (medium) | 29.03 MB | 122.73 MB/s | 422,815 |
| CSV→NDJSON (large) | 144.73 MB | 121.72 MB/s | 840,969 |
| CSV→NDJSON (streaming) | 29.03 MB | 103.43 MB/s | 356,327 |
| NDJSON→JSON (small) | 0.23 MB | 11.59 MB/s | - |
| NDJSON→JSON (medium) | 49.22 MB | 1,248.13 MB/s | - |
| NDJSON passthrough (large) | 245.34 MB | 167.49 MB/s | 682,694 |

## Competitive Landscape

### Popular CSV Parsers (Node.js)

1. **PapaParse**
   - Most popular (5M+ weekly downloads)
   - ~90,000 rows/sec reported
   - Multi-threaded support
   - Slower on quoted CSV (2x penalty)

2. **csv-parse** (node-csv)
   - ~90,000 rows/sec
   - Part of comprehensive CSV toolkit
   - Streaming support

3. **fast-csv**
   - Focus on performance
   - Both parsing and writing
   - ~100,000+ rows/sec

4. **csv-parser**
   - ~90,000 rows/sec
   - Lightweight streaming parser

### Our Current Position

**Strengths:**
- ✅ **Excellent large file performance**: 840K rows/sec on large datasets
- ✅ **WASM-based**: Native speed with JavaScript ease
- ✅ **Streaming architecture**: Low memory footprint
- ✅ **Multi-format**: CSV, NDJSON, JSON, XML

**Weaknesses:**
- ⚠️ **Small file overhead**: 13.6 MB/s on small files (startup cost)
- ⚠️ **Streaming slower than batch**: 103 MB/s vs 122 MB/s

## Proposed Improvements

### Priority 1: High Impact, Low Effort

#### 1.1 Reduce WASM Startup Overhead
**Problem**: Small files show 13.6 MB/s vs 122 MB/s for medium files  
**Root Cause**: WASM instantiation and initialization overhead  
**Solution**:
- Implement WASM module caching
- Lazy initialization of parsers
- Reuse converter instances for multiple conversions

**Expected Impact**: 5-10x improvement on small files  
**Implementation Time**: 2-4 hours

```typescript
// Proposed API
const converter = await ConvertBuddy.createPool({
  poolSize: 4,
  reuseInstances: true
});

// Reuse same instance
for (const file of files) {
  await converter.convert(file);
}
```

#### 1.2 Optimize Buffer Sizes
**Problem**: Current 1MB chunk size may not be optimal  
**Solution**:
- Adaptive chunk sizing based on input size
- Smaller chunks (64KB) for small files
- Larger chunks (4MB) for large files

**Expected Impact**: 10-20% throughput improvement  
**Implementation Time**: 1-2 hours

```rust
fn optimal_chunk_size(input_size: usize) -> usize {
    match input_size {
        0..=1_000_000 => 65_536,        // 64KB for small
        1_000_001..=10_000_000 => 1_048_576,  // 1MB for medium
        _ => 4_194_304,                  // 4MB for large
    }
}
```

#### 1.3 Enable SIMD by Default
**Problem**: SIMD JSON parsing not enabled  
**Solution**:
- Build with `--features simd` by default
- Provide both SIMD and non-SIMD builds

**Expected Impact**: 2-3x JSON parsing speed  
**Implementation Time**: 1 hour

### Priority 2: Medium Impact, Medium Effort

#### 2.1 Parallel Processing
**Problem**: Single-threaded processing  
**Solution**:
- Worker pool for Node.js
- Split large files into chunks
- Process chunks in parallel
- Reassemble in order

**Expected Impact**: 2-4x on multi-core systems  
**Implementation Time**: 1-2 days

```typescript
// Proposed API
const result = await convert(data, {
  inputFormat: "csv",
  outputFormat: "ndjson",
  parallel: true,
  workers: 4  // Auto-detect by default
});
```

#### 2.2 Zero-Copy String Handling
**Problem**: UTF-8 validation and string allocations  
**Solution**:
- Assume valid UTF-8 (unsafe but fast path)
- Validate only on error
- Use `from_utf8_unchecked` for hot paths

**Expected Impact**: 15-25% improvement  
**Implementation Time**: 4-8 hours  
**Risk**: Medium (need thorough testing)

#### 2.3 Custom Allocator
**Problem**: Default allocator not optimized for streaming  
**Solution**:
- Use `mimalloc` or `jemalloc`
- Pool allocator for fixed-size buffers

**Expected Impact**: 10-15% improvement  
**Implementation Time**: 2-4 hours

```toml
[dependencies]
mimalloc = { version = "0.1", default-features = false }
```

### Priority 3: High Impact, High Effort

#### 3.1 SIMD CSV Parsing
**Problem**: Current CSV parser uses scalar operations  
**Solution**:
- Use SIMD for delimiter/quote scanning
- Vectorized field extraction
- Similar to simdjson approach

**Expected Impact**: 2-3x CSV parsing speed  
**Implementation Time**: 1-2 weeks

**Reference**: https://github.com/geofflangdale/simdcsv

#### 3.2 Compile-Time Schema
**Problem**: Dynamic field detection adds overhead  
**Solution**:
- Optional schema specification
- Codegen optimized parsers
- Skip type inference

**Expected Impact**: 30-50% for known schemas  
**Implementation Time**: 1 week

```typescript
const result = await convert(data, {
  inputFormat: "csv",
  outputFormat: "ndjson",
  schema: {
    name: "string",
    age: "number",
    active: "boolean"
  }
});
```

#### 3.3 Streaming Compression
**Problem**: No compression support  
**Solution**:
- Gzip/Brotli input/output
- Streaming decompression
- Transparent handling

**Expected Impact**: Enables larger datasets  
**Implementation Time**: 1 week

### Priority 4: Future Enhancements

#### 4.1 GPU Acceleration
**Potential**: Use WebGPU for parallel parsing  
**Complexity**: Very High  
**Timeline**: Research phase

#### 4.2 Adaptive Parsing
**Potential**: ML-based format detection and optimization  
**Complexity**: High  
**Timeline**: 2-3 months

#### 4.3 Memory-Mapped Files
**Potential**: Zero-copy file access  
**Complexity**: Medium  
**Timeline**: 1-2 weeks

## Implementation Roadmap

### Phase 1: Quick Wins (1 week)
- ✅ Reduce WASM startup overhead
- ✅ Optimize buffer sizes
- ✅ Enable SIMD by default
- ✅ Custom allocator

**Expected Result**: 2-3x overall improvement

### Phase 2: Parallelization (2 weeks)
- ✅ Worker pool implementation
- ✅ Chunk-based parallelization
- ✅ Benchmark validation

**Expected Result**: 3-5x on multi-core systems

### Phase 3: Advanced Optimizations (1 month)
- ✅ SIMD CSV parsing
- ✅ Zero-copy string handling
- ✅ Compile-time schema

**Expected Result**: 5-10x overall improvement

### Phase 4: Ecosystem (2 months)
- ✅ Compression support
- ✅ Additional formats (Parquet, Avro)
- ✅ Cloud integrations

## Benchmark Targets

### Short-term (Phase 1)
- CSV→NDJSON (small): **100+ MB/s** (current: 13.6 MB/s)
- CSV→NDJSON (large): **200+ MB/s** (current: 121.72 MB/s)
- Streaming: **Match batch performance** (current: 84% of batch)

### Medium-term (Phase 2)
- CSV→NDJSON (large): **400+ MB/s** with 4 workers
- NDJSON→JSON: **2,000+ MB/s**
- Memory usage: **< 1.5x input size**

### Long-term (Phase 3)
- CSV→NDJSON: **500+ MB/s** (SIMD)
- Competitive with native tools (ripgrep, xsv)
- Best-in-class JavaScript performance

## Competitive Positioning

### Target Performance vs Competitors

| Tool | CSV Parsing | Strengths | Weaknesses |
|------|-------------|-----------|------------|
| **convert-buddy** (current) | 121 MB/s | Multi-format, WASM | Small file overhead |
| **convert-buddy** (Phase 1) | 250+ MB/s | Multi-format, WASM, Fast | - |
| **convert-buddy** (Phase 2) | 500+ MB/s | Multi-format, WASM, Parallel | - |
| PapaParse | ~90K rows/s | Popular, Easy | Slow on quoted |
| csv-parse | ~90K rows/s | Comprehensive | JS-based |
| fast-csv | ~100K rows/s | Fast | Single format |
| xsv (Rust CLI) | 1+ GB/s | Fastest | CLI only, no JS |

### Unique Value Propositions

1. **Multi-format Support**: CSV, NDJSON, JSON, XML in one tool
2. **WASM Performance**: Near-native speed in JavaScript
3. **Streaming Architecture**: Handle files larger than memory
4. **Type Safety**: Full TypeScript support
5. **Cross-platform**: Browser + Node.js

## Measurement & Validation

### Benchmarking Strategy
1. Compare against PapaParse, csv-parse, fast-csv
2. Test on real-world datasets
3. Measure memory usage
4. Profile hot paths
5. A/B test optimizations

### Success Metrics
- **Throughput**: MB/s and rows/sec
- **Latency**: Time to first output
- **Memory**: Peak RSS and heap usage
- **Compatibility**: Pass all existing tests
- **Bundle Size**: Keep WASM < 200KB

## Conclusion

With focused optimization efforts, convert-buddy can achieve:
- **2-3x improvement** in 1 week (Phase 1)
- **5-10x improvement** in 1 month (Phase 3)
- **Best-in-class JavaScript performance** for data conversion

The WASM foundation provides a solid base for these improvements while maintaining the ease of use and cross-platform compatibility that JavaScript developers expect.
