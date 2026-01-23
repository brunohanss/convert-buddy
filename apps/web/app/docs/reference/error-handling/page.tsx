import React from 'react';

export default function ErrorHandlingPage() {
  return (
    <div>
      <h1>Error Handling</h1>

      <p>
        Understanding and handling errors in Convert Buddy.
      </p>

      <h2>Error types</h2>

      <h3>Detection errors</h3>
      <p>
        Errors during format or structure detection:
      </p>

      <ul>
        <li><strong>Unknown format</strong>: Input doesn't match any known format</li>
        <li><strong>Insufficient data</strong>: Sample too small for detection (&lt;100 bytes)</li>
        <li><strong>Ambiguous format</strong>: Multiple formats match equally well</li>
      </ul>

      <pre><code>{`try {
  const format = await detectFormat(data);
  if (format === 'unknown') {
    // Handle unknown format
    console.error('Could not detect format');
  }
} catch (err) {
  console.error('Detection failed:', err.message);
}`}</code></pre>

      <h3>Parsing errors</h3>
      <p>
        Errors during input parsing:
      </p>

      <ul>
        <li><strong>Malformed CSV</strong>: Unclosed quotes, inconsistent columns</li>
        <li><strong>Invalid JSON</strong>: Syntax errors, unclosed brackets</li>
        <li><strong>Invalid XML</strong>: Unclosed tags, invalid characters</li>
        <li><strong>Encoding errors</strong>: Invalid UTF-8 sequences</li>
      </ul>

      <pre><code>{`try {
  const result = await convertToString(data, {
    outputFormat: 'json'
  });
} catch (err) {
  if (err.message.includes('parse')) {
    console.error('Input is malformed:', err.message);
  }
}`}</code></pre>

      <h3>Transform errors</h3>
      <p>
        Errors during field transformation:
      </p>

      <ul>
        <li><strong>Missing required field</strong>: Required field not in input</li>
        <li><strong>Coercion failure</strong>: Cannot convert value to target type</li>
        <li><strong>Compute expression error</strong>: Invalid or failing expression</li>
      </ul>

      <pre><code>{`try {
  const result = await convertToString(data, {
    outputFormat: 'json',
    transform: {
      fields: [
        { targetFieldName: 'email', required: true }
      ],
      onMissingRequired: 'error'  // Throw on missing required
    }
  });
} catch (err) {
  if (err.message.includes('required')) {
    console.error('Required field missing:', err.message);
  }
}`}</code></pre>

      <h3>Configuration errors</h3>
      <p>
        Errors in configuration:
      </p>

      <ul>
        <li><strong>Invalid options</strong>: Unknown or invalid config values</li>
        <li><strong>Incompatible settings</strong>: Conflicting options</li>
      </ul>

      <pre><code>{`try {
  const buddy = new ConvertBuddy({
    outputFormat: 'invalid'  // Error: invalid format
  });
} catch (err) {
  console.error('Configuration error:', err.message);
}`}</code></pre>

      <h2>Error handling strategies</h2>

      <h3>Fail fast (strict)</h3>
      <p>
        Stop on first error—best for data quality validation:
      </p>

      <pre><code>{`try {
  const result = await convertToString(data, {
    outputFormat: 'json',
    transform: {
      fields: [
        { targetFieldName: 'age', coerce: { type: 'i64' } }
      ],
      onCoerceError: 'error'  // Throw immediately
    }
  });
} catch (err) {
  console.error('Conversion failed:', err);
  // Handle error, show message to user
}`}</code></pre>

      <h3>Continue with nulls (lenient)</h3>
      <p>
        Replace errors with null values—best for dirty data:
      </p>

      <pre><code>{`const result = await convertToString(data, {
  outputFormat: 'json',
  transform: {
    fields: [
      { targetFieldName: 'age', coerce: { type: 'i64' } }
    ],
    onCoerceError: 'null'  // Use null for failed coercions
  }
});

// Output: [{ "age": 25 }, { "age": null }, ...]`}</code></pre>

      <h3>Drop bad records (data quality)</h3>
      <p>
        Skip records with errors—best for log processing:
      </p>

      <pre><code>{`const result = await convertToString(data, {
  outputFormat: 'json',
  transform: {
    fields: [
      { targetFieldName: 'timestamp', coerce: { type: 'timestamp_ms' } }
    ],
    onCoerceError: 'dropRecord'  // Skip entire record
  }
});

// Only valid records in output`}</code></pre>

      <h2>Debugging errors</h2>

      <h3>Enable debug mode</h3>
      <pre><code>{`const buddy = new ConvertBuddy({
  outputFormat: 'json',
  debug: true  // Log detailed debug info
});`}</code></pre>

      <h3>Check stats for issues</h3>
      <pre><code>{`const buddy = await ConvertBuddy.create({
  outputFormat: 'json',
  onProgress: (stats) => {
    // Check if records are being processed
    if (stats.recordsProcessed === 0 && stats.bytesIn > 10000) {
      console.warn('No records parsed yet - possible parsing issue');
    }
  }
});`}</code></pre>

      <h3>Validate with small sample first</h3>
      <pre><code>{`// Test with small sample before full conversion
const sample = data.substring(0, 1000);

try {
  const testResult = await convertToString(sample, options);
  console.log('Sample conversion successful');
  
  // Now process full data
  const fullResult = await convertToString(data, options);
} catch (err) {
  console.error('Sample conversion failed:', err);
  // Fix config or data before processing full file
}`}</code></pre>

      <h2>Common errors and solutions</h2>

      <h3>"Unknown format"</h3>
      <p><strong>Cause:</strong> Auto-detection failed</p>
      <p><strong>Solution:</strong> Specify <code>inputFormat</code> explicitly</p>
      <pre><code>{`const result = await convertToString(data, {
  inputFormat: 'csv',  // Don't rely on auto-detection
  outputFormat: 'json'
});`}</code></pre>

      <h3>"Parse error: unclosed quote"</h3>
      <p><strong>Cause:</strong> Malformed CSV with unescaped quotes</p>
      <p><strong>Solution:</strong> Check CSV quoting, consider different quote character</p>
      <pre><code>{`const result = await convertToString(data, {
  outputFormat: 'json',
  csvConfig: {
    quote: "'"  // Try single quote instead
  }
});`}</code></pre>

      <h3>"Required field 'email' missing"</h3>
      <p><strong>Cause:</strong> Transform expects field that doesn't exist</p>
      <p><strong>Solution:</strong> Make field optional or provide default</p>
      <pre><code>{`const result = await convertToString(data, {
  outputFormat: 'json',
  transform: {
    fields: [
      { 
        targetFieldName: 'email',
        required: false,  // Optional
        defaultValue: null  // Default when missing
      }
    ]
  }
});`}</code></pre>

      <h3>"Coercion failed: invalid integer"</h3>
      <p><strong>Cause:</strong> Cannot convert string to number</p>
      <p><strong>Solution:</strong> Use lenient error handling or validate data</p>
      <pre><code>{`const result = await convertToString(data, {
  outputFormat: 'json',
  transform: {
    fields: [
      { targetFieldName: 'age', coerce: { type: 'i64' } }
    ],
    onCoerceError: 'null'  // Use null instead of error
  }
});`}</code></pre>

      <h2>Error recovery patterns</h2>

      <h3>Retry with fallback format</h3>
      <pre><code>{`async function convertWithFallback(data) {
  try {
    return await convertToString(data, { outputFormat: 'json' });
  } catch (err) {
    console.warn('Auto-detection failed, trying CSV');
    try {
      return await convertToString(data, {
        inputFormat: 'csv',
        outputFormat: 'json'
      });
    } catch (csvErr) {
      console.error('All formats failed');
      throw csvErr;
    }
  }
}`}</code></pre>

      <h3>Partial conversion on error</h3>
      <pre><code>{`const buddy = await ConvertBuddy.create({
  outputFormat: 'json',
  transform: {
    fields: [{ targetFieldName: 'data' }],
    onCoerceError: 'dropRecord'  // Skip bad records
  }
});

try {
  // Process will continue even if some records fail
  const result = buddy.convert(data);
  
  const stats = buddy.stats();
  console.log(\`Converted \${stats.recordsProcessed} records\`);
} catch (err) {
  // Only catastrophic errors (e.g., parse failure) throw
  console.error('Fatal error:', err);
}`}</code></pre>

      <h2>See also</h2>
      <ul>
        <li><a href="/docs/reference/configuration">Configuration</a> - All error handling options</li>
        <li><a href="/docs/reference/transform">Transform</a> - Transform error handling</li>
        <li><a href="/docs/concepts/format-detection">Format Detection</a> - Detection limitations</li>
      </ul>
    </div>
  );
}
