#!/usr/bin/env node

/**
 * Helper script to update performance baselines based on actual benchmark results
 * 
 * Usage:
 *   node scripts/update-baselines.mjs bench-results.json
 * 
 * This will analyze the results and suggest updates to performance-baselines.json
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function normalizeTestName(name) {
  return name
    .toLowerCase()
    .replace(/→/g, "_to_")
    .replace(/->/g, "_to_")
    .replace(/\s*\(([^)]+)\)\s*/g, "_$1")
    .replace(/[^a-z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}

function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.log(`
Update Performance Baselines

Usage: node scripts/update-baselines.mjs <bench-results.json> [options]

Options:
  --margin <percent>    Safety margin to add to targets (default: 20)
  --output <file>       Output file (default: overwrites original)
  --dry-run            Show changes without saving

Examples:
  # Update baselines with 20% safety margin
  node scripts/update-baselines.mjs bench-results.json

  # More conservative 30% margin
  node scripts/update-baselines.mjs bench-results.json --margin 30

  # Preview changes without saving
  node scripts/update-baselines.mjs bench-results.json --dry-run
`);
    process.exit(0);
  }

  const resultsPath = args[0];
  const marginPercent = parseInt(args[args.indexOf('--margin') + 1] || '20', 10);
  const outputPath = args[args.indexOf('--output') + 1] || 
                     path.join(__dirname, '../bench/performance-baselines.json');
  const dryRun = args.includes('--dry-run');

  if (!fs.existsSync(resultsPath)) {
    console.error(`Error: File not found: ${resultsPath}`);
    process.exit(1);
  }

  // Load benchmark results
  const benchResults = JSON.parse(fs.readFileSync(resultsPath, 'utf-8'));
  
  // Load existing baselines
  const baselinesPath = path.join(__dirname, '../bench/performance-baselines.json');
  const baselines = JSON.parse(fs.readFileSync(baselinesPath, 'utf-8'));

  console.log(`📊 Analyzing ${benchResults.results.length} benchmark results...`);
  console.log(`📈 Using ${marginPercent}% safety margin\n`);

  const updates = {};
  let changeCount = 0;

  for (const result of benchResults.results) {
    const normalizedName = normalizeTestName(result.name);
    const existing = baselines.thresholds.targets[normalizedName];

    // Calculate targets with safety margin
    const margin = 1 - (marginPercent / 100);
    const newTarget = {
      description: result.name,
      minThroughputMbps: Math.floor(result.throughputMbps * margin),
      maxLatencyMs: Math.ceil(result.latencyMs * (1 + marginPercent / 100)),
      maxMemoryMb: Math.ceil(result.memoryMb * (1 + marginPercent / 100)),
      minRecordsPerSec: Math.floor(result.recordsPerSec * margin)
    };

    if (!existing) {
      console.log(`✨ NEW: ${result.name} (${normalizedName})`);
      console.log(`   Throughput: ${newTarget.minThroughputMbps} MB/s`);
      console.log(`   Latency:    ${newTarget.maxLatencyMs} ms`);
      console.log(`   Memory:     ${newTarget.maxMemoryMb} MB`);
      console.log(`   Records/s:  ${newTarget.minRecordsPerSec}\n`);
      changeCount++;
    } else {
      // Check if update needed
      const changes = [];
      if (newTarget.minThroughputMbps !== existing.minThroughputMbps) {
        changes.push(`Throughput: ${existing.minThroughputMbps} → ${newTarget.minThroughputMbps} MB/s`);
      }
      if (newTarget.maxLatencyMs !== existing.maxLatencyMs) {
        changes.push(`Latency: ${existing.maxLatencyMs} → ${newTarget.maxLatencyMs} ms`);
      }
      if (newTarget.maxMemoryMb !== existing.maxMemoryMb) {
        changes.push(`Memory: ${existing.maxMemoryMb} → ${newTarget.maxMemoryMb} MB`);
      }

      if (changes.length > 0) {
        console.log(`🔄 UPDATE: ${result.name}`);
        changes.forEach(c => console.log(`   ${c}`));
        console.log();
        changeCount++;
      }
    }

    updates[normalizedName] = newTarget;
  }

  // Update baselines object
  baselines.thresholds.targets = updates;
  baselines.metadata.lastUpdated = new Date().toISOString().split('T')[0];

  if (changeCount === 0) {
    console.log('✅ No changes needed - baselines are up to date!');
    process.exit(0);
  }

  console.log(`\n📝 Summary: ${changeCount} changes`);

  if (dryRun) {
    console.log('\n🔍 DRY RUN - No files were modified');
    console.log('Remove --dry-run to apply changes');
    process.exit(0);
  }

  // Save updated baselines
  fs.writeFileSync(
    outputPath,
    JSON.stringify(baselines, null, 2) + '\n'
  );

  console.log(`\n✅ Updated: ${outputPath}`);
  console.log('\n⚠️  Remember to:');
  console.log('   1. Review the changes');
  console.log('   2. Test with: npm run bench:check');
  console.log('   3. Commit the updated baselines');
  console.log('   4. Document the reason in your PR');
}

main();
