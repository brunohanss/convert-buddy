import React from 'react';
import SandpackExample from '@/components/mdx/Sandpack';

export default function BrowserHelpersPage() {
  return (
    <div>
      <h1>Browser Helpers</h1>

      <p>
        Browser-specific helper functions make it easy to integrate file conversions
        into web applications. These utilities handle MIME types, file extensions,
        download filenames, and File System Access API integration.
      </p>

      <h2>Helper Functions</h2>

      <h3>getMimeType()</h3>

      <p>
        Get the appropriate MIME type for a given format. Useful for creating Blobs,
        setting HTTP headers, and browser downloads.
      </p>

      <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '4px', marginBottom: '1rem' }}>
        <pre style={{ margin: 0 }}>
{`getMimeType(format: Format): string

// Returns:
// "json"   → "application/json"
// "ndjson" → "application/x-ndjson"
// "csv"    → "text/csv"
// "xml"    → "application/xml"`}
        </pre>
      </div>

      <h4>Basic Usage</h4>

      <SandpackExample
        template="vanilla"
        dependencyVersion="latest"
        activeFile="/index.js"
        preview={false}
        files={{
          '/index.js': `import { getMimeType } from "convert-buddy-js";

// Get MIME types for different formats
console.log('JSON MIME type:', getMimeType('json'));
console.log('CSV MIME type:', getMimeType('csv'));
console.log('XML MIME type:', getMimeType('xml'));
console.log('NDJSON MIME type:', getMimeType('ndjson'));

// Use with Blob
const data = JSON.stringify([{ name: "Ada", age: 36 }]);
const mimeType = getMimeType('json');
const blob = new Blob([data], { type: mimeType });

console.log('\\nCreated blob:', blob.type, blob.size, 'bytes');`,
        }}
      />

      <h3>getExtension()</h3>

      <p>
        Get the file extension for a format (without the dot).
        Useful for generating filenames and file type filters.
      </p>

      <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '4px', marginBottom: '1rem' }}>
        <pre style={{ margin: 0 }}>
{`getExtension(format: Format): string

// All formats currently return the format name:
// "json" → "json"
// "csv" → "csv"
// etc.`}
        </pre>
      </div>

      <h4>Basic Usage</h4>

      <SandpackExample
        template="vanilla"
        dependencyVersion="latest"
        activeFile="/index.js"
        preview={false}
        files={{
          '/index.js': `import { getExtension } from "convert-buddy-js";

// Get file extensions
console.log('JSON extension:', getExtension('json'));
console.log('CSV extension:', getExtension('csv'));
console.log('XML extension:', getExtension('xml'));
console.log('NDJSON extension:', getExtension('ndjson'));

// Build filename
const format = 'json';
const filename = \`data.\${getExtension(format)}\`;
console.log('\\nGenerated filename:', filename);`,
        }}
      />

      <h3>getSuggestedFilename()</h3>

      <p>
        Generate a suggested filename for a converted file. Replaces the extension
        of the original file with the output format extension. Optionally adds a timestamp.
      </p>

      <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '4px', marginBottom: '1rem' }}>
        <pre style={{ margin: 0 }}>
{`getSuggestedFilename(
  originalName: string,
  outputFormat: Format,
  includeTimestamp?: boolean
): string`}
        </pre>
      </div>

      <h4>Basic Usage</h4>

      <SandpackExample
        template="vanilla"
        dependencyVersion="latest"
        activeFile="/index.js"
        preview={false}
        files={{
          '/index.js': `import { getSuggestedFilename } from "convert-buddy-js";

// Simple filename conversion
const name1 = getSuggestedFilename('data.csv', 'json');
console.log('Simple:', name1);

// With timestamp
const name2 = getSuggestedFilename('data.csv', 'json', true);
console.log('With timestamp:', name2);

// Different formats
console.log('\\nCSV to XML:', getSuggestedFilename('users.csv', 'xml'));
console.log('JSON to NDJSON:', getSuggestedFilename('items.json', 'ndjson'));
console.log('XML to CSV:', getSuggestedFilename('records.xml', 'csv'));

// File without extension
console.log('\\nNo extension:', getSuggestedFilename('data', 'json'));`,
        }}
      />

      <h3>getFileTypeConfig()</h3>

      <p>
        Get the File System Access API configuration for <code>showSaveFilePicker()</code>.
        Returns the proper file type descriptor with MIME type and extension.
      </p>

      <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '4px', marginBottom: '1rem' }}>
        <pre style={{ margin: 0 }}>
{`getFileTypeConfig(format: Format): Array<{
  description: string;
  accept: Record<string, string[]>;
}>`}
        </pre>
      </div>

      <h4>Basic Usage</h4>

      <SandpackExample
        template="vanilla"
        dependencyVersion="latest"
        activeFile="/index.js"
        preview={false}
        files={{
          '/index.js': `import { getFileTypeConfig } from "convert-buddy-js";

// Get file type configs for different formats
const jsonConfig = getFileTypeConfig('json');
console.log('JSON config:', JSON.stringify(jsonConfig, null, 2));

const csvConfig = getFileTypeConfig('csv');
console.log('\\nCSV config:', JSON.stringify(csvConfig, null, 2));

const xmlConfig = getFileTypeConfig('xml');
console.log('\\nXML config:', JSON.stringify(xmlConfig, null, 2));

// This would be used with showSaveFilePicker:
// const handle = await showSaveFilePicker({ types: jsonConfig });`,
        }}
      />

      <h2>Complete Examples</h2>

      <h3>File Download</h3>

      <p>
        Convert a file and trigger a browser download with proper MIME type and filename.
      </p>

      <SandpackExample
        template="vanilla"
        dependencyVersion="latest"
        activeFile="/index.js"
        preview={false}
        enableFilePicker={true}
        files={{
          '/index.js': `import { 
  convertAny, 
  getMimeType, 
  getSuggestedFilename 
} from "convert-buddy-js";

const fileUrl = "";

async function convertAndDownload() {
  if (!fileUrl) {
    console.log("Add a file URL to test download");
    return;
  }
  
  console.log('Starting conversion...');
  
  const response = await fetch(fileUrl);
  const blob = await response.blob();
  
  // Convert the file
  const result = await convertAny(blob, { 
    outputFormat: 'json' 
  });
  
  // Create download
  const mimeType = getMimeType('json');
  const filename = getSuggestedFilename('data.csv', 'json');
  const downloadBlob = new Blob([result], { type: mimeType });
  
  // Trigger download
  const url = URL.createObjectURL(downloadBlob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  
  // Cleanup
  URL.revokeObjectURL(url);
  
  console.log(\`Downloaded: \${filename}\`);
  console.log(\`Size: \${(downloadBlob.size / 1024).toFixed(2)} KB\`);
  console.log(\`Type: \${mimeType}\`);
}

convertAndDownload().catch(console.error);`,
        }}
      />

      <h3>File System Access API</h3>

      <p>
        Use the File System Access API to let users choose where to save the converted file.
        This provides a native save dialog in supported browsers.
      </p>

      <SandpackExample
        template="vanilla"
        dependencyVersion="latest"
        activeFile="/index.js"
        preview={false}
        enableFilePicker={true}
        files={{
          '/index.js': `import { 
  convertAny, 
  getSuggestedFilename,
  getFileTypeConfig 
} from "convert-buddy-js";

const fileUrl = "";

async function saveWithFilePicker() {
  if (!fileUrl) {
    console.log("Add a file URL to test File System Access API");
    return;
  }
  
  // Check if API is supported
  if (!('showSaveFilePicker' in window)) {
    console.log('File System Access API not supported in this environment');
    console.log('This requires a modern browser like Chrome or Edge');
    return;
  }
  
  try {
    const response = await fetch(fileUrl);
    const blob = await response.blob();
    
    // Convert
    const result = await convertAny(blob, { 
      outputFormat: 'json' 
    });
    
    // Show save dialog
    const types = getFileTypeConfig('json');
    const suggestedName = getSuggestedFilename('data.csv', 'json');
    
    console.log('Opening save dialog...');
    console.log('Suggested name:', suggestedName);
    console.log('File types:', JSON.stringify(types, null, 2));
    
    // This would show the native save dialog:
    // const handle = await window.showSaveFilePicker({
    //   suggestedName,
    //   types
    // });
    // const writable = await handle.createWritable();
    // await writable.write(result);
    // await writable.close();
    
    console.log('File would be saved via native dialog');
    
  } catch (err) {
    console.error('Error:', err.message);
  }
}

saveWithFilePicker().catch(console.error);`,
        }}
      />

      <h3>File Upload and Convert</h3>

      <p>
        Handle file uploads, convert them, and provide immediate download.
      </p>

      <SandpackExample
        template="vanilla"
        dependencyVersion="latest"
        activeFile="/index.js"
        preview={false}
        enableFilePicker={true}
        files={{
          '/index.js': `import { 
  convertAny, 
  getMimeType, 
  getSuggestedFilename 
} from "convert-buddy-js";

const fileUrl = "";

async function handleFileUpload(outputFormat) {
  if (!fileUrl) {
    console.log("Add a file URL to simulate file upload");
    return;
  }
  
  try {
    console.log(\`Converting to \${outputFormat}...\`);
    
    // Simulate file input
    const response = await fetch(fileUrl);
    const file = await response.blob();
    
    console.log(\`Input file size: \${(file.size / 1024).toFixed(2)} KB\`);
    
    // Convert
    const result = await convertAny(file, { 
      outputFormat,
      onProgress: (stats) => {
        console.log(\`  Progress: \${stats.recordsProcessed} records\`);
      }
    });
    
    console.log('Conversion complete!');
    console.log(\`Output size: \${(result.byteLength / 1024).toFixed(2)} KB\`);
    
    // Create download
    const mimeType = getMimeType(outputFormat);
    const filename = getSuggestedFilename('upload.csv', outputFormat, true);
    const blob = new Blob([result], { type: mimeType });
    
    console.log(\`Download: \${filename}\`);
    console.log(\`MIME type: \${mimeType}\`);
    
    // In a real app, trigger download here
    // const url = URL.createObjectURL(blob);
    // const a = document.createElement('a');
    // a.href = url;
    // a.download = filename;
    // a.click();
    // URL.revokeObjectURL(url);
    
  } catch (err) {
    console.error('Conversion failed:', err.message);
  }
}

// Test with different formats
handleFileUpload('json')
  .then(() => handleFileUpload('xml'))
  .catch(console.error);`,
        }}
      />

      <h3>Drag and Drop Converter</h3>

      <p>
        Handle drag-and-drop file conversions with proper file naming.
      </p>

      <SandpackExample
        template="vanilla"
        dependencyVersion="latest"
        activeFile="/index.js"
        preview={false}
        files={{
          '/index.js': `import { 
  convertAny, 
  getMimeType, 
  getSuggestedFilename 
} from "convert-buddy-js";

// Simulate dropped file
const simulateDroppedFile = () => {
  const csvData = "name,age\\nAda,36\\nAlan,42";
  const blob = new Blob([csvData], { type: 'text/csv' });
  return new File([blob], 'data.csv', { type: 'text/csv' });
};

async function handleDrop(file, outputFormat) {
  console.log(\`Processing: \${file.name}\`);
  console.log(\`Type: \${file.type}\`);
  console.log(\`Size: \${(file.size / 1024).toFixed(2)} KB\`);
  
  try {
    // Convert the dropped file
    const result = await convertAny(file, { 
      outputFormat 
    });
    
    // Generate download
    const mimeType = getMimeType(outputFormat);
    const filename = getSuggestedFilename(file.name, outputFormat);
    const blob = new Blob([result], { type: mimeType });
    
    console.log(\`\\nConverted to: \${filename}\`);
    console.log(\`Output size: \${(blob.size / 1024).toFixed(2)} KB\`);
    console.log(\`MIME type: \${mimeType}\`);
    
    // Preview output
    const text = new TextDecoder().decode(result);
    console.log(\`\\nPreview:\\n\${text.substring(0, 200)}...\`);
    
  } catch (err) {
    console.error(\`Error converting \${file.name}:\`, err.message);
  }
}

// Simulate drag and drop
const file = simulateDroppedFile();
handleDrop(file, 'json').catch(console.error);`,
        }}
      />

      <h3>Multiple Format Downloads</h3>

      <p>
        Convert one input to multiple formats and provide download links for each.
      </p>

      <SandpackExample
        template="vanilla"
        dependencyVersion="latest"
        activeFile="/index.js"
        preview={false}
        enableFilePicker={true}
        files={{
          '/index.js': `import { 
  convertAny, 
  getMimeType, 
  getSuggestedFilename 
} from "convert-buddy-js";

const fileUrl = "";

async function convertToMultipleFormats() {
  if (!fileUrl) {
    console.log("Add a file URL to test multiple format conversion");
    return;
  }
  
  const response = await fetch(fileUrl);
  const inputBlob = await response.blob();
  
  const formats = ['json', 'xml', 'ndjson'];
  const downloads = [];
  
  console.log('Converting to multiple formats...');
  
  for (const format of formats) {
    console.log(\`\\nConverting to \${format.toUpperCase()}...\`);
    
    const result = await convertAny(inputBlob, { 
      outputFormat: format 
    });
    
    const mimeType = getMimeType(format);
    const filename = getSuggestedFilename('data.csv', format);
    const blob = new Blob([result], { type: mimeType });
    
    downloads.push({
      format,
      filename,
      mimeType,
      blob,
      size: blob.size
    });
    
    console.log(\`  ✓ \${filename} (\${(blob.size / 1024).toFixed(2)} KB)\`);
  }
  
  console.log(\`\\nGenerated \${downloads.length} downloads:\`);
  downloads.forEach(d => {
    console.log(\`  - \${d.filename} (\${d.mimeType})\`);
  });
  
  // In a real app, create download links for each
  // downloads.forEach(d => {
  //   const url = URL.createObjectURL(d.blob);
  //   const a = document.createElement('a');
  //   a.href = url;
  //   a.download = d.filename;
  //   a.textContent = \`Download \${d.format.toUpperCase()}\`;
  //   document.body.appendChild(a);
  // });
}

convertToMultipleFormats().catch(console.error);`,
        }}
      />

      <h2>Browser Compatibility</h2>

      <ul>
        <li><strong>All helpers:</strong> Work in all modern browsers (Chrome, Firefox, Safari, Edge)</li>
        <li><strong>File System Access API:</strong> Chrome 86+, Edge 86+ (not Firefox/Safari yet)</li>
        <li><strong>Blob and URL.createObjectURL:</strong> All modern browsers</li>
        <li><strong>Download attribute:</strong> All modern browsers</li>
      </ul>

      <h2>Best Practices</h2>

      <ol>
        <li><strong>Always use getMimeType():</strong> Ensures correct MIME types for downloads</li>
        <li><strong>Clean up object URLs:</strong> Call <code>URL.revokeObjectURL()</code> after download</li>
        <li><strong>Provide meaningful filenames:</strong> Use <code>getSuggestedFilename()</code> with timestamps for uniqueness</li>
        <li><strong>Check browser support:</strong> Detect File System Access API before using</li>
        <li><strong>Handle errors gracefully:</strong> User might cancel save dialog or deny permission</li>
      </ol>

      <h2>Next Steps</h2>

      <ul>
        <li>For Node.js file I/O: See <a href="/docs/api/node-helpers">Node Helpers</a></li>
        <li>For conversion basics: See <a href="/docs/api/simple">Simple API</a></li>
        <li>For multiple conversions: See <a href="/docs/api/instance">Instance API</a></li>
      </ul>
    </div>
  );
}
