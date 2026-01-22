import fs from 'fs';
import path from 'path';

// Use local built dist entry (core ESM bundle)
import { convertToString } from '../packages/convert-buddy-js/dist/index.js';

async function main() {
  const samplePath = path.resolve('./apps/web/public/samples/dnd_characters.xml');
  const xml = fs.readFileSync(samplePath, 'utf8');

  console.log('Sample XML length:', xml.length);

  // Set options to XML->CSV and enable debug for verbose logs
  const opts = { inputFormat: 'xml', outputFormat: 'csv', debug: true };

  try {
    const out = await convertToString(xml, opts);
    console.log('\nConverted output (first 400 chars):\n', out.slice(0, 400));
    console.log('\nConverted output length:', out.length);
  } catch (e) {
    console.error('Conversion failed with error:');
    console.error(e && e.stack ? e.stack : e);
    throw e;
  }
}

main().catch((e) => { console.error('Error:', e); process.exit(1); });
