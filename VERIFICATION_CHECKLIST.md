# Performance Guardrails - Verification Checklist

## ✅ Pre-Merge Verification

Run these commands to verify the performance guardrails are working:

### 1. Build and Run Benchmarks
```bash
cd packages/convert-buddy-js
npm run build
npm run bench
```

**Expected**: 
- ✅ Creates `bench-results.json`
- ✅ Shows benchmark results table
- ✅ No errors

### 2. Check Against Performance Targets
```bash
npm run bench:check
```

**Expected**:
- ✅ Shows `All benchmarks passed!` or lists specific failures
- ✅ Exit code 0 if passing, 1 if failing

### 3. Test Comparison Script
```bash
# Compare against itself (should always pass)
node dist/bench/compare-benchmarks.js \
  --current bench-results.json \
  --baseline bench-results.json
```

**Expected**:
- ✅ Shows comparison with 0% changes
- ✅ All tests pass
- ✅ Exit code 0

### 4. Test GitHub Comment Generation
```bash
node dist/bench/compare-benchmarks.js \
  --current bench-results.json \
  --check-targets \
  --output-comment
```

**Expected**:
- ✅ Creates `benchmark-comment.md`
- ✅ File contains formatted markdown
- ✅ Includes summary and table

### 5. Verify Baseline Update Script
```bash
node scripts/update-baselines.mjs bench-results.json --dry-run
```

**Expected**:
- ✅ Shows analysis of results
- ✅ Lists any changes needed
- ✅ Does not modify files (dry-run)

## 📋 Files Created/Modified

### New Files
- [x] `.github/workflows/benchmark.yml` - CI workflow
- [x] `packages/convert-buddy-js/bench/performance-baselines.json` - Performance targets
- [x] `packages/convert-buddy-js/bench/compare-benchmarks.ts` - Comparison script
- [x] `packages/convert-buddy-js/bench/PERFORMANCE.md` - Documentation
- [x] `packages/convert-buddy-js/bench/README.md` - Benchmark overview
- [x] `packages/convert-buddy-js/scripts/update-baselines.mjs` - Helper script
- [x] `PERFORMANCE_GUARDRAILS_SUMMARY.md` - Summary document

### Modified Files
- [x] `packages/convert-buddy-js/package.json` - Added bench scripts
- [x] `packages/convert-buddy-js/README.md` - Updated benchmark section
- [x] `packages/convert-buddy-js/bench/runner.ts` - Export runBenchmarks function

## 🧪 CI Testing

### After Merge to Main
1. Push to main branch
2. Verify GitHub Actions runs successfully
3. Check that benchmark artifacts are uploaded
4. Download artifact and verify contents

### On Pull Request
1. Open a test PR
2. Verify benchmark workflow runs
3. Check that PR comment is posted
4. Verify build passes if no regressions
5. Verify build fails if regressions detected (test by artificially slowing code)

## 🎯 Success Criteria

### Local Testing
- ✅ All commands run without errors
- ✅ `bench-results.json` is created with valid data
- ✅ Comparison script correctly identifies regressions
- ✅ GitHub comment is properly formatted

### CI Integration
- ✅ Workflow runs on main branch
- ✅ Workflow runs on pull requests
- ✅ Artifacts are uploaded from main
- ✅ Baseline is downloaded in PRs
- ✅ PR comment is posted
- ✅ Build fails on regression

### Documentation
- ✅ PERFORMANCE.md explains system clearly
- ✅ README.md links to performance docs
- ✅ Code comments explain functionality
- ✅ Examples are accurate and helpful

## 🔍 Manual Testing Scenarios

### Scenario 1: No Regressions
1. Run benchmarks on main
2. Save as baseline
3. Run benchmarks again (same code)
4. Compare: should show no changes

### Scenario 2: Performance Improvement
1. Run baseline
2. Make code faster (or adjust test data)
3. Run benchmarks
4. Compare: should show positive changes, no failures

### Scenario 3: Performance Regression
1. Run baseline
2. Add artificial delay (e.g., `await sleep(100)`)
3. Run benchmarks
4. Compare: should detect regression and fail

### Scenario 4: New Benchmark
1. Add new test to runner.ts
2. Run benchmarks
3. Compare: should warn about missing baseline
4. Update baselines: should add new target

## 🛠️ Troubleshooting

### Issue: Benchmarks vary too much
**Solution**: 
- Close background applications
- Ensure consistent CPU state
- Add warm-up runs
- Use median of multiple runs

### Issue: CI fails but local passes
**Solution**:
- Check Node.js version matches
- Verify environment variables
- Test in Docker container
- Review CI logs for differences

### Issue: Baselines too strict
**Solution**:
- Increase safety margin in `update-baselines.mjs`
- Adjust regression thresholds in `performance-baselines.json`
- Consider platform differences

## 📝 Next Steps After Verification

1. **Commit Changes**
   ```bash
   git add .github/workflows/benchmark.yml
   git add packages/convert-buddy-js/bench/
   git add packages/convert-buddy-js/scripts/update-baselines.mjs
   git add packages/convert-buddy-js/package.json
   git add packages/convert-buddy-js/README.md
   git commit -m "Add performance guardrails and CI benchmarking"
   ```

2. **Push and Test**
   ```bash
   git push origin feature/performance-guardrails
   ```

3. **Open PR**
   - Verify CI runs
   - Check benchmark comment
   - Review with team

4. **Merge to Main**
   - Creates first baseline
   - Enables regression detection for future PRs

## 📚 Reference

- [PERFORMANCE.md](packages/convert-buddy-js/bench/PERFORMANCE.md) - Complete performance guide
- [benchmark.yml](.github/workflows/benchmark.yml) - CI workflow
- [performance-baselines.json](packages/convert-buddy-js/bench/performance-baselines.json) - Performance targets
