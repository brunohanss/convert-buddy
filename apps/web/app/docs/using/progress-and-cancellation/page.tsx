import React from 'react';
import PlaygroundExample from '@/components/mdx/Playground';

export default function ProgressAndCancellationPage() {
  return (
    <div>
      <h1>Progress and Cancellation</h1>

      <p>
        Build great user experiences with progress telemetry and cancellation support.
        This page shows how to track conversion progress and allow users to cancel long-running operations.
      </p>

      <h2>Basic progress tracking</h2>

      <p>
        Use the <code>onProgress</code> callback to receive real-time conversion statistics:
      </p>

      <PlaygroundExample
        template="node"
        dependencyVersion="latest"
        activeFile="/index.js"
        preview={true}
        enableFilePicker={true}
        files={{
          '/index.js': `import { convertToString } from "convert-buddy-js";

const fileUrl = "";

async function run() {
  const response = await fetch(fileUrl);
  const csvData = await response.text();
  
  console.log('Starting conversion with progress tracking...');
  
  const result = await convertToString(csvData, {
    inputFormat: 'csv',
    outputFormat: 'json',
    progressIntervalBytes: 50, // Report every 50 bytes
    onProgress: (stats) => {
      console.log('Progress update:', {
        bytesProcessed: stats.bytesIn,
        recordsProcessed: stats.recordsProcessed,
        throughput: stats.throughputMbPerSec.toFixed(2) + ' MB/s'
      });
    }
  });
  
  console.log('\\nConversion complete!');
  const parsed = JSON.parse(result);
  console.log(\`Total records converted: \${parsed.length}\`);
}

run().catch(console.error);`,
        }}
      />

      <h2>Progress stats object</h2>

      <p>
        The <code>stats</code> object provided to <code>onProgress</code> contains detailed metrics:
      </p>

      <PlaygroundExample
        template="node"
        dependencyVersion="latest"
        activeFile="/index.js"
        preview={true}
        enableFilePicker={true}
        files={{
          '/index.js': `import { convertToString } from "convert-buddy-js";

const fileUrl = "";

async function run() {
  const response = await fetch(fileUrl);
  const csvData = await response.text();
  
  const totalBytes = new TextEncoder().encode(csvData).length;
  console.log(\`Total file size: \${totalBytes} bytes\\n\`);
  
  await convertToString(csvData, {
    inputFormat: 'csv',
    outputFormat: 'json',
    progressIntervalBytes: 40,
    onProgress: (stats) => {
      // All available stats properties
      console.log('Full stats object:', {
        // Input metrics
        bytesIn: stats.bytesIn,
        
        // Processing metrics  
        recordsProcessed: stats.recordsProcessed,
        
        // Performance metrics
        throughputMbPerSec: stats.throughputMbPerSec.toFixed(2),
        
        // Calculated progress
        percentComplete: ((stats.bytesIn / totalBytes) * 100).toFixed(1) + '%'
      });
    }
  });
  
  console.log('\\nConversion finished!');
}

run().catch(console.error);`,
        }}
      />

      <h2>Progress interval configuration</h2>

      <p>
        Control how often progress callbacks fire using <code>progressIntervalBytes</code>:
      </p>

      <PlaygroundExample
        template="node"
        dependencyVersion="latest"
        activeFile="/index.js"
        preview={true}
        enableFilePicker={true}
        files={{
          '/index.js': `import { convertToString } from "convert-buddy-js";

const fileUrl = "";

async function run() {
  const response = await fetch(fileUrl);
  const csvData = await response.text();
  
  console.log('=== Frequent updates (every 20 bytes) ===');
  let updateCount1 = 0;
  await convertToString(csvData, {
    outputFormat: 'json',
    progressIntervalBytes: 20,
    onProgress: (stats) => {
      updateCount1++;
      console.log(\`Update #\${updateCount1}: \${stats.bytesIn} bytes\`);
    }
  });
  console.log(\`Total updates: \${updateCount1}\\n\`);
  
  console.log('=== Less frequent updates (every 100 bytes) ===');
  let updateCount2 = 0;
  await convertToString(csvData, {
    outputFormat: 'json',
    progressIntervalBytes: 100,
    onProgress: (stats) => {
      updateCount2++;
      console.log(\`Update #\${updateCount2}: \${stats.bytesIn} bytes\`);
    }
  });
  console.log(\`Total updates: \${updateCount2}\\n\`);
  
  console.log('Recommendation: Use 1MB (1048576 bytes) for large files');
  console.log('This balances UI responsiveness with overhead');
}

run().catch(console.error);`,
        }}
      />

      <h2>Building a progress UI</h2>

      <p>
        Use progress stats to build responsive UIs that keep users informed:
      </p>

      <PlaygroundExample
        template="node"
        dependencyVersion="latest"
        activeFile="/index.js"
        preview={true}
        enableFilePicker={true}
        files={{
          '/index.js': `import { convertToString } from "convert-buddy-js";

const fileUrl = "";

async function run() {
  const response = await fetch(fileUrl);
  const csvData = await response.text();
  
  const totalBytes = new TextEncoder().encode(csvData).length;
  const startTime = Date.now();
  
  console.log('╔════════════════════════════════════════╗');
  console.log('║     File Conversion Progress           ║');
  console.log('╚════════════════════════════════════════╝');
  console.log('');
  
  const result = await convertToString(csvData, {
    inputFormat: 'csv',
    outputFormat: 'json',
    progressIntervalBytes: 50,
    onProgress: (stats) => {
      const percent = ((stats.bytesIn / totalBytes) * 100).toFixed(1);
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      
      // Create progress bar
      const barLength = 30;
      const filled = Math.round((stats.bytesIn / totalBytes) * barLength);
      const bar = '█'.repeat(filled) + '░'.repeat(barLength - filled);
      
      console.log(\`[\${bar}] \${percent}%\`);
      console.log(\`Records: \${stats.recordsProcessed} | Speed: \${stats.throughputMbPerSec.toFixed(2)} MB/s | Time: \${elapsed}s\`);
      console.log('');
    }
  });
  
  const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
  const parsed = JSON.parse(result);
  
  console.log('✓ Conversion complete!');
  console.log(\`  Total records: \${parsed.length}\`);
  console.log(\`  Total time: \${totalTime}s\`);
}

run().catch(console.error);`,
        }}
      />

      <h2>Cancellation with abort()</h2>

      <p>
        Cancel long-running conversions using the <code>abort()</code> method:
      </p>

      <PlaygroundExample
        template="node"
        dependencyVersion="latest"
        activeFile="/index.js"
        preview={true}
        enableFilePicker={true}
        files={{
          '/index.js': `import { Converter } from "convert-buddy-js";

const fileUrl = "";

async function run() {
  const response = await fetch(fileUrl);
  const csvData = await response.text();
  
  const converter = new Converter({
    inputFormat: 'csv',
    outputFormat: 'json',
    onProgress: (stats) => {
      console.log(\`Processing: \${stats.bytesIn} bytes, \${stats.recordsProcessed} records\`);
    }
  });
  
  // Simulate cancellation after processing some data
  console.log('Starting conversion...');
  console.log('Will cancel after 100 bytes\\n');
  
  try {
    let output = '';
    let bytesProcessed = 0;
    const chunkSize = 50;
    
    for (let i = 0; i < csvData.length; i += chunkSize) {
      const chunk = csvData.substring(i, i + chunkSize);
      
      // Simulate user clicking "Cancel" button
      if (bytesProcessed > 100) {
        console.log('\\n🛑 User cancelled conversion!');
        converter.abort();
        break;
      }
      
      output += converter.push(chunk);
      bytesProcessed += chunk.length;
    }
    
    // This will throw if aborted
    output += converter.finish();
    
    console.log('Conversion completed');
    
  } catch (error) {
    console.log('\\nCaught error:', error.message);
    console.log('Conversion was successfully aborted');
  }
}

run().catch(console.error);`,
        }}
      />

      <h2>Cancellation with AbortSignal</h2>

      <p>
        Alternatively, use AbortController for standard cancellation patterns:
      </p>

      <PlaygroundExample
        template="node"
        dependencyVersion="latest"
        activeFile="/index.js"
        preview={true}
        files={{
          '/index.js': `// Example showing AbortController pattern
async function run() {
  console.log('AbortController pattern:');
  console.log('');
  console.log('import { convertToString } from "convert-buddy-js";');
  console.log('');
  console.log('const abortController = new AbortController();');
  console.log('');
  console.log('// Start conversion');
  console.log('const promise = convertToString(data, {');
  console.log('  outputFormat: "json",');
  console.log('  signal: abortController.signal');
  console.log('});');
  console.log('');
  console.log('// User clicks cancel button');
  console.log('cancelButton.onclick = () => {');
  console.log('  abortController.abort();');
  console.log('};');
  console.log('');
  console.log('try {');
  console.log('  const result = await promise;');
  console.log('  console.log("Success:", result);');
  console.log('} catch (err) {');
  console.log('  if (err.name === "AbortError") {');
  console.log('    console.log("Cancelled by user");');
  console.log('  }');
  console.log('}');
  console.log('');
  console.log('Note: AbortSignal support may vary by platform');
}

run().catch(console.error);`,
        }}
      />

      <h2>Combining progress and cancellation</h2>

      <p>
        Build complete user experiences with both progress and cancel support:
      </p>

      <PlaygroundExample
        template="node"
        dependencyVersion="latest"
        activeFile="/index.js"
        preview={true}
        enableFilePicker={true}
        files={{
          '/index.js': `import { Converter } from "convert-buddy-js";

const fileUrl = "";

async function run() {
  const response = await fetch(fileUrl);
  const csvData = await response.text();
  
  const totalBytes = new TextEncoder().encode(csvData).length;
  let shouldCancel = false;
  
  const converter = new Converter({
    inputFormat: 'csv',
    outputFormat: 'json',
    progressIntervalBytes: 40,
    onProgress: (stats) => {
      const percent = ((stats.bytesIn / totalBytes) * 100).toFixed(1);
      const barLength = 20;
      const filled = Math.round((stats.bytesIn / totalBytes) * barLength);
      const bar = '█'.repeat(filled) + '░'.repeat(barLength - filled);
      
      console.log(\`[\${bar}] \${percent}% | \${stats.recordsProcessed} records\`);
      
      // Simulate cancel condition (user would click a button)
      if (stats.bytesIn > 100) {
        shouldCancel = true;
      }
    }
  });
  
  console.log('Starting conversion...');
  console.log('(will auto-cancel at 100 bytes for demo)\\n');
  
  try {
    let output = '';
    const chunkSize = 30;
    
    for (let i = 0; i < csvData.length; i += chunkSize) {
      if (shouldCancel) {
        console.log('\\n⚠️  Cancelling conversion...');
        converter.abort();
        break;
      }
      
      const chunk = csvData.substring(i, i + chunkSize);
      output += converter.push(chunk);
    }
    
    output += converter.finish();
    
    const parsed = JSON.parse(output);
    console.log(\`\\n✓ Completed: \${parsed.length} records\`);
    
  } catch (error) {
    console.log(\`\\n❌ Conversion cancelled\`);
    console.log(\`Reason: \${error.message}\`);
  }
}

run().catch(console.error);`,
        }}
      />

      <h2>Best practices</h2>

      <ul>
        <li><strong>Set appropriate intervals</strong> - Use ~1MB for large files to avoid overhead</li>
        <li><strong>Show meaningful progress</strong> - Display percentage, records, and speed</li>
        <li><strong>Provide cancel buttons</strong> - Essential for large file conversions</li>
        <li><strong>Handle abort errors</strong> - Catch and show user-friendly messages</li>
        <li><strong>Clean up resources</strong> - Call abort() in cleanup/unmount handlers</li>
        <li><strong>Test with large files</strong> - Verify progress updates are smooth</li>
      </ul>

      <h2>Progress interval guidelines</h2>

      <table>
        <thead>
          <tr>
            <th>File Size</th>
            <th>Recommended Interval</th>
            <th>Reason</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>{'<'} 1MB</td>
            <td>10KB - 100KB</td>
            <td>Frequent updates for small files</td>
          </tr>
          <tr>
            <td>1MB - 10MB</td>
            <td>100KB - 500KB</td>
            <td>Balance responsiveness and overhead</td>
          </tr>
          <tr>
            <td>10MB - 100MB</td>
            <td>1MB</td>
            <td>Smooth progress without overhead</td>
          </tr>
          <tr>
            <td>{'>'} 100MB</td>
            <td>5MB - 10MB</td>
            <td>Minimize callback overhead</td>
          </tr>
        </tbody>
      </table>

      <h2>UI patterns</h2>

      <p>
        Common UI patterns for progress and cancellation:
      </p>

      <pre><code>{`// React example
function FileConverter({ file }) {
  const [progress, setProgress] = useState(0);
  const [converting, setConverting] = useState(false);
  const converterRef = useRef(null);
  
  const handleConvert = async () => {
    setConverting(true);
    
    const converter = new Converter({
      outputFormat: 'json',
      progressIntervalBytes: 1048576, // 1MB
      onProgress: (stats) => {
        const percent = (stats.bytesIn / file.size) * 100;
        setProgress(percent);
      }
    });
    
    converterRef.current = converter;
    
    try {
      const result = await convertToString(file, converter);
      console.log('Done:', result);
    } catch (err) {
      console.log('Cancelled or error:', err);
    } finally {
      setConverting(false);
      setProgress(0);
    }
  };
  
  const handleCancel = () => {
    converterRef.current?.abort();
  };
  
  return (
    <div>
      <button onClick={handleConvert} disabled={converting}>
        Convert
      </button>
      {converting && (
        <>
          <progress value={progress} max={100} />
          <button onClick={handleCancel}>Cancel</button>
        </>
      )}
    </div>
  );
}`}</code></pre>
    </div>
  );
}
