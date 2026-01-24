import React from 'react';
import SandpackExample from '@/components/mdx/Sandpack';

export default function AutoDetectionPage() {
  return (
    <div>
      <h1>Auto-Detection</h1>

      <p>
        Learn how to use format detection to build intelligent conversion pipelines
        that automatically adapt to input data.
      </p>

      <h2>Detection-first workflow</h2>

      <p>
        Use <code>detectStructure()</code> to analyze data before conversion.
        This gives you format information and structural insights:
      </p>

      <SandpackExample
        template="node"
        dependencyVersion="latest"
        activeFile="/index.js"
        preview={false}
        enableFilePicker={true}
        files={{
          '/index.js': `import { detectStructure, convertToString } from "convert-buddy-js";

const fileUrl = "";

async function run() {
  const response = await fetch(fileUrl);
  const data = await response.text();
  
  console.log('Step 1: Detect format and structure\\n');
  
  // Detect format first
  const detection = await detectStructure(data);
  
  console.log('Detection result:', {
    format: detection.format,
    confidence: detection.confidence,
    recordCount: detection.recordCount,
    columnCount: detection.columnCount,
    hasHeader: detection.hasHeader
  });
  
  console.log('\\nStep 2: Convert based on detection\\n');
  
  // Use detected format for conversion
  const json = await convertToString(data, {
    inputFormat: detection.format,
    outputFormat: 'json'
  });
  
  // Parse and show formatted output
  const parsed = JSON.parse(json);
  console.log(\`✓ Converted \${parsed.length} records\`);
  console.log('Sample:', JSON.stringify(parsed[0], null, 2));
}

run().catch(console.error);`,
        }}
      />

      <h2>Understanding detection results</h2>

      <p>
        The detection result provides rich metadata about your data:
      </p>

      <SandpackExample
        template="node"
        dependencyVersion="latest"
        activeFile="/index.js"
        preview={false}
        enableFilePicker={true}
        files={{
          '/index.js': `import { detectStructure } from "convert-buddy-js";

const fileUrl = "";

async function run() {
  const response = await fetch(fileUrl);
  const csvData = await response.text();
  
  const detection = await detectStructure(csvData);
  
  console.log('=== Full Detection Result ===\\n');
  
  // Format information
  console.log('Format:', detection.format);
  console.log('Confidence:', detection.confidence);
  console.log('');
  
  // Structural information
  console.log('Records:', detection.recordCount);
  console.log('Columns:', detection.columnCount);
  console.log('Has Header:', detection.hasHeader);
  console.log('');
  
  // Column details (if available)
  if (detection.columns && detection.columns.length > 0) {
    console.log('Column Information:');
    detection.columns.forEach((col, idx) => {
      console.log(\`  [\${idx}] \${col.name}: \${col.type}\`);
    });
  }
  
  // Additional metadata
  if (detection.delimiter) {
    console.log('\\nCSV Delimiter:', JSON.stringify(detection.delimiter));
  }
  
  if (detection.encoding) {
    console.log('Encoding:', detection.encoding);
  }
}

run().catch(console.error);`,
        }}
      />

      <h2>Conditional conversion based on detection</h2>

      <p>
        Use detection results to make intelligent decisions about conversion:
      </p>

      <SandpackExample
        template="node"
        dependencyVersion="latest"
        activeFile="/index.js"
        preview={false}
        enableFilePicker={true}
        files={{
          '/index.js': `import { detectStructure, convertToString } from "convert-buddy-js";

const fileUrl = "";

async function run() {
  const response = await fetch(fileUrl);
  const data = await response.text();
  
  // Detect first
  const detection = await detectStructure(data);
  
  console.log(\`Detected format: \${detection.format}\\n\`);
  
  // Choose output format based on input characteristics
  let outputFormat;
  let conversionOptions = {
    inputFormat: detection.format
  };
  
  if (detection.recordCount > 1000) {
    // Large files: use NDJSON for streaming
    outputFormat = 'ndjson';
    console.log('Large file detected, using NDJSON for efficiency');
  } else if (detection.format === 'csv') {
    // Small CSV: convert to JSON
    outputFormat = 'json';
    console.log('Small CSV file, converting to JSON');
  } else {
    // Default: keep as-is or convert to JSON
    outputFormat = 'json';
    console.log('Converting to JSON');
  }
  
  conversionOptions.outputFormat = outputFormat;
  
  // Apply format-specific config
  if (detection.format === 'csv' && detection.delimiter) {
    conversionOptions.csvDelimiter = detection.delimiter;
    console.log(\`Using detected delimiter: "\${detection.delimiter}"\`);
  }
  
  console.log('\\nConverting...\\n');
  
  const result = await convertToString(data, conversionOptions);
  
  console.log(\`Conversion complete! Output format: \${outputFormat}\`);
  console.log('Result preview:', result.substring(0, 150) + '...');
}

run().catch(console.error);`,
        }}
      />

      <h2>Format-specific configuration after detection</h2>

      <p>
        Use detection results to configure format-specific options:
      </p>

      <SandpackExample
        template="node"
        dependencyVersion="latest"
        activeFile="/index.js"
        preview={false}
        enableFilePicker={true}
        files={{
          '/index.js': `import { detectStructure, convertToString } from "convert-buddy-js";

const fileUrl = "";

async function run() {
  const response = await fetch(fileUrl);
  const data = await response.text();
  
  const detection = await detectStructure(data);
  
  console.log('Detection results:');
  console.log(\`  Format: \${detection.format}\`);
  console.log(\`  Has header: \${detection.hasHeader}\`);
  console.log(\`  Delimiter: "\${detection.delimiter || 'N/A'}"\`);
  console.log('');
  
  // Build conversion options from detection
  const options = {
    inputFormat: detection.format,
    outputFormat: 'json'
  };
  
  // Apply CSV-specific settings
  if (detection.format === 'csv') {
    if (detection.delimiter) {
      options.csvDelimiter = detection.delimiter;
      console.log(\`✓ Using detected delimiter: "\${detection.delimiter}"\`);
    }
    
    if (detection.hasHeader !== undefined) {
      options.csvHasHeader = detection.hasHeader;
      console.log(\`✓ Header row: \${detection.hasHeader}\`);
    }
    
    // Apply custom headers if no header row
    if (!detection.hasHeader && detection.columnCount) {
      options.csvHeaders = Array.from(
        { length: detection.columnCount }, 
        (_, i) => \`column_\${i + 1}\`
      );
      console.log(\`✓ Generated headers: \${options.csvHeaders.join(', ')}\`);
    }
  }
  
  console.log('\\nConverting with detected settings...\\n');
  
  const result = await convertToString(data, options);
  
  console.log('Converted output:');
  console.log(result);
}

run().catch(console.error);`,
        }}
      />

      <h2>Handling ambiguous formats</h2>

      <p>
        Some data may be ambiguous. Check confidence scores and provide fallbacks:
      </p>

      <SandpackExample
        template="node"
        dependencyVersion="latest"
        activeFile="/index.js"
        preview={false}
        enableFilePicker={true}
        files={{
          '/index.js': `import { detectStructure, convertToString } from "convert-buddy-js";

const fileUrl = "";

async function run() {
  const response = await fetch(fileUrl);
  const data = await response.text();
  
  const detection = await detectStructure(data);
  
  console.log(\`Detected: \${detection.format}\`);
  console.log(\`Confidence: \${(detection.confidence * 100).toFixed(1)}%\\n\`);
  
  // Check confidence level
  if (detection.confidence < 0.7) {
    console.log('⚠️  Low confidence detection!');
    console.log('Consider asking user to confirm format\\n');
  }
  
  // Provide fallback for unknown formats
  let inputFormat = detection.format;
  
  if (detection.format === 'unknown' || detection.confidence < 0.5) {
    console.log('❌ Unable to detect format reliably');
    console.log('Defaulting to CSV with comma delimiter\\n');
    inputFormat = 'csv';
  }
  
  try {
    const result = await convertToString(data, {
      inputFormat: inputFormat,
      outputFormat: 'json'
    });
    
    console.log('✓ Conversion successful');
    console.log('Output:', result.substring(0, 100) + '...');
    
  } catch (error) {
    console.log('❌ Conversion failed:', error.message);
    console.log('\\nTry specifying format explicitly');
  }
}

run().catch(console.error);`,
        }}
      />

      <h2>Batch detection for multiple files</h2>

      <p>
        Efficiently detect formats for multiple files before processing:
      </p>

      <SandpackExample
        template="node"
        dependencyVersion="latest"
        activeFile="/index.js"
        preview={false}
        files={{
          '/index.js': `import { detectStructure, convertToString } from "convert-buddy-js";

async function run() {
  // Simulate multiple files
  const files = [
    { name: 'data1.csv', content: 'name,age\\nAlice,30\\nBob,25' },
    { name: 'data2.json', content: '[{"id":1},{"id":2}]' },
    { name: 'data3.txt', content: 'name\\tage\\nCharlie\\t35' }
  ];
  
  console.log('Detecting formats for multiple files...\\n');
  
  // Detect all formats first
  const detections = await Promise.all(
    files.map(async (file) => ({
      name: file.name,
      content: file.content,
      detection: await detectStructure(file.content)
    }))
  );
  
  // Display detection results
  console.log('=== Detection Results ===\\n');
  detections.forEach(({ name, detection }) => {
    console.log(\`\${name}:\`);
    console.log(\`  Format: \${detection.format}\`);
    console.log(\`  Confidence: \${(detection.confidence * 100).toFixed(1)}%\`);
    console.log(\`  Records: \${detection.recordCount}\`);
    console.log('');
  });
  
  // Convert all to JSON
  console.log('=== Converting All Files ===\\n');
  
  for (const { name, content, detection } of detections) {
    const result = await convertToString(content, {
      inputFormat: detection.format,
      outputFormat: 'json'
    });
    
    console.log(\`\${name} → JSON:\`);
    console.log(result);
    console.log('');
  }
}

run().catch(console.error);`,
        }}
      />

      <h2>Smart defaults with detection</h2>

      <p>
        Combine auto-detection with user preferences for the best experience:
      </p>

      <SandpackExample
        template="node"
        dependencyVersion="latest"
        activeFile="/index.js"
        preview={false}
        enableFilePicker={true}
        files={{
          '/index.js': `import { detectStructure, convertToString } from "convert-buddy-js";

const fileUrl = "";

async function run() {
  const response = await fetch(fileUrl);
  const data = await response.text();
  
  // User preferences (could come from settings/UI)
  const userPreferences = {
    preferredOutputFormat: 'json',
    assumeHeaders: true,
    defaultDelimiter: ','
  };
  
  console.log('User preferences:', userPreferences);
  console.log('');
  
  // Detect structure
  const detection = await detectStructure(data);
  
  console.log('Auto-detected:', {
    format: detection.format,
    hasHeader: detection.hasHeader,
    delimiter: detection.delimiter
  });
  console.log('');
  
  // Merge detection with user preferences
  const options = {
    inputFormat: detection.format,
    outputFormat: userPreferences.preferredOutputFormat,
    
    // Use detected values, fall back to user preferences
    csvHasHeader: detection.hasHeader ?? userPreferences.assumeHeaders,
    csvDelimiter: detection.delimiter || userPreferences.defaultDelimiter
  };
  
  console.log('Final conversion options:', options);
  console.log('');
  
  const result = await convertToString(data, options);
  
  console.log('Conversion result:');
  console.log(result);
}

run().catch(console.error);`,
        }}
      />

      <h2>Best practices</h2>

      <ul>
        <li><strong>Detect before converting</strong> - Gives you format and structural info</li>
        <li><strong>Check confidence scores</strong> - Warn users if detection is uncertain</li>
        <li><strong>Use detected delimiters</strong> - Ensures correct CSV parsing</li>
        <li><strong>Apply format-specific config</strong> - Leverage detection metadata</li>
        <li><strong>Provide fallbacks</strong> - Handle unknown or ambiguous formats</li>
        <li><strong>Cache detection results</strong> - Avoid detecting the same data twice</li>
      </ul>

      <h2>Detection confidence levels</h2>

      <table>
        <thead>
          <tr>
            <th>Confidence</th>
            <th>Meaning</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>{'>'} 0.9</td>
            <td>Very confident</td>
            <td>Use detected format automatically</td>
          </tr>
          <tr>
            <td>0.7 - 0.9</td>
            <td>Confident</td>
            <td>Use detected format, show format to user</td>
          </tr>
          <tr>
            <td>0.5 - 0.7</td>
            <td>Uncertain</td>
            <td>Ask user to confirm format</td>
          </tr>
          <tr>
            <td>{'<'} 0.5</td>
            <td>Very uncertain</td>
            <td>Require user to specify format</td>
          </tr>
        </tbody>
      </table>

      <h2>When to skip detection</h2>

      <p>
        You can skip detection and specify the format directly when:
      </p>

      <ul>
        <li>Format is known from file extension or MIME type</li>
        <li>Processing many files of the same format</li>
        <li>Performance is critical (detection adds ~1-2ms overhead)</li>
        <li>Data structure is controlled/guaranteed by your application</li>
      </ul>

      <pre><code>{`// Skip detection when format is known
const result = await convertToString(csvFile, {
  inputFormat: 'csv',  // Explicitly specified
  outputFormat: 'json'
});`}</code></pre>
    </div>
  );
}
