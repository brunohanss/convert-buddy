import React from 'react';
import SandpackExample from '@/components/mdx/Sandpack';

export default function AutoDetectPipelinesPage() {
  return (
    <div>
      <h1>Auto-Detect Pipelines</h1>

      <p>
        Build format-agnostic tools that accept any supported input format and automatically
        convert it. This recipe shows how to create universal file importers, data processors,
        and format converters.
      </p>

      <h2>Detect-Then-Convert Pattern</h2>

      <p>
        The simplest pattern: detect format, then convert:
      </p>

      <SandpackExample
        template="node"
        activeFile="/index.js"
        preview={false}
        enableFilePicker={true}
        files={{
          '/index.js': `import { detectFormat, convertToString } from "convert-buddy-js";

async function universalConverter(data, outputFormat = "json") {
  // Step 1: Detect input format
  const inputFormat = await detectFormat(data);
  
  if (inputFormat === "unknown") {
    throw new Error("Could not detect file format");
  }
  
  console.log(\`Detected format: \${inputFormat}\`);
  
  // Step 2: Convert
  const result = await convertToString(data, {
    inputFormat,
    outputFormat
  });
  
  return result;
}

// Test with different formats
const csvData = "name,age\\nAlice,30\\nBob,25";
const jsonData = '[{"name":"Alice","age":30}]';

async function run() {
  console.log("CSV input:");
  const result1 = await universalConverter(csvData);
  console.log(result1);
  
  console.log("\\nJSON input:");
  const result2 = await universalConverter(jsonData, "csv");
  console.log(result2);
}

run().catch(console.error);`,
        }}
      />

      <h2>Universal File Importer</h2>

      <p>
        Create a file importer that handles any format:
      </p>

      <SandpackExample
        template="node"
        activeFile="/index.js"
        preview={false}
        files={{
          '/index.js': `import { detectStructure, convertToString } from "convert-buddy-js";

class UniversalImporter {
  async import(data) {
    // Detect format and structure
    const structure = await detectStructure(data);
    
    console.log(\`Detected: \${structure.format}\`);
    console.log(\`Fields: \${structure.fields.map(f => f.name).join(', ')}\`);
    
    // Convert to JSON for processing
    const json = await convertToString(data, {
      inputFormat: structure.format,
      outputFormat: "json"
    });
    
    return {
      format: structure.format,
      fields: structure.fields,
      records: JSON.parse(json)
    };
  }
}

async function run() {
  const importer = new UniversalImporter();
  
  const csvData = \`name,age,city
Alice,30,New York
Bob,25,Los Angeles\`;
  
  const result = await importer.import(csvData);
  
  console.log(\`\\nImported \${result.records.length} records:\`);
  console.log(result.records);
}

run().catch(console.error);`,
        }}
      />

      <h2>Conditional Processing Based on Format</h2>

      <p>
        Apply different logic based on detected format:
      </p>

      <SandpackExample
        template="node"
        activeFile="/index.js"
        preview={false}
        files={{
          '/index.js': `import { detectStructure, convertToString } from "convert-buddy-js";

async function smartProcessor(data) {
  const structure = await detectStructure(data);
  const format = structure.format;
  
  console.log(\`Processing \${format} data...\`);
  
  // Build format-specific config
  const config = {
    inputFormat: format,
    outputFormat: "json"
  };
  
  // Apply format-specific optimizations
  if (format === "csv") {
    config.csvConfig = {
      delimiter: structure.csv?.delimiter,
      hasHeaders: structure.csv?.hasHeaders,
      trimWhitespace: true
    };
    console.log(\`CSV delimiter: "\${structure.csv?.delimiter}"\`);
  }
  
  if (format === "xml") {
    config.xmlConfig = {
      recordElement: structure.xml?.recordElement,
      includeAttributes: true
    };
    console.log(\`XML record element: <\${structure.xml?.recordElement}>\`);
  }
  
  // Convert with optimized config
  return await convertToString(data, config);
}

const pipeData = \`name|age|city
Alice|30|New York
Bob|25|Los Angeles\`;

async function run() {
  const result = await smartProcessor(pipeData);
  console.log("\\nResult:");
  console.log(result);
}

run().catch(console.error);`,
        }}
      />

      <h2>Multi-Format Data Pipeline</h2>

      <p>
        Build a pipeline that processes data regardless of input format:
      </p>

      <SandpackExample
        template="node"
        activeFile="/index.js"
        preview={false}
        files={{
          '/index.js': `import { detectFormat, convertToString } from "convert-buddy-js";

class DataPipeline {
  constructor() {
    this.transforms = [];
  }
  
  addTransform(fn) {
    this.transforms.push(fn);
    return this;
  }
  
  async process(data, outputFormat = "json") {
    // Detect input format
    const inputFormat = await detectFormat(data);
    console.log(\`Input format: \${inputFormat}\`);
    
    // Convert to JSON for processing
    let json = await convertToString(data, {
      inputFormat,
      outputFormat: "json"
    });
    
    // Apply transforms
    let records = JSON.parse(json);
    for (const transform of this.transforms) {
      records = transform(records);
    }
    
    // Convert to output format if needed
    if (outputFormat === "json") {
      return JSON.stringify(records);
    }
    
    const tempJson = JSON.stringify(records);
    return await convertToString(tempJson, {
      inputFormat: "json",
      outputFormat
    });
  }
}

async function run() {
  const pipeline = new DataPipeline()
    .addTransform(records => records.filter(r => parseInt(r.age) >= 25))
    .addTransform(records => records.map(r => ({
      ...r,
      age_group: parseInt(r.age) >= 30 ? "30+" : "20-29"
    })));
  
  const csvData = \`name,age
Alice,30
Bob,22
Charlie,35
Dave,28\`;
  
  const result = await pipeline.process(csvData, "csv");
  console.log("\\nProcessed result:");
  console.log(result);
}

run().catch(console.error);`,
        }}
      />

      <h2>Format Negotiation</h2>

      <p>
        Let users choose output format while auto-detecting input:
      </p>

      <SandpackExample
        template="node"
        activeFile="/index.js"
        preview={false}
        files={{
          '/index.js': `import { detectFormat, convertToString } from "convert-buddy-js";

async function convertWithOptions(data, options = {}) {
  const {
    outputFormat = "json",
    includeStats = false,
    transform = null
  } = options;
  
  // Detect input
  const inputFormat = await detectFormat(data);
  
  // Build config
  const config = {
    inputFormat,
    outputFormat
  };
  
  if (transform) {
    config.transform = transform;
  }
  
  // Convert
  const result = await convertToString(data, config);
  
  // Return with optional stats
  if (includeStats) {
    const stats = result.stats();
    return {
      data: result,
      stats: {
        inputFormat,
        outputFormat,
        recordsProcessed: stats.recordsProcessed,
        durationMs: stats.durationMs
      }
    };
  }
  
  return result;
}

async function run() {
  const data = "name,age\\nAlice,30\\nBob,25";
  
  // Simple conversion
  const result1 = await convertWithOptions(data, {
    outputFormat: "ndjson"
  });
  console.log("NDJSON output:");
  console.log(result1);
  
  // With stats
  const result2 = await convertWithOptions(data, {
    outputFormat: "json",
    includeStats: true,
    transform: {
      filter: (record) => parseInt(record.age) >= 30
    }
  });
  console.log("\\nWith stats:");
  console.log(result2);
}

run().catch(console.error);`,
        }}
      />

      <h2>Error Handling and Fallbacks</h2>

      <p>
        Robust error handling for production use:
      </p>

      <SandpackExample
        template="node"
        activeFile="/index.js"
        preview={false}
        files={{
          '/index.js': `import { detectFormat, convertToString } from "convert-buddy-js";

async function robustConverter(data, options = {}) {
  const {
    outputFormat = "json",
    allowedFormats = ["csv", "json", "ndjson", "xml"],
    fallbackFormat = null
  } = options;
  
  let inputFormat;
  
  try {
    // Try auto-detection
    inputFormat = await detectFormat(data);
    
    if (inputFormat === "unknown") {
      if (fallbackFormat) {
        console.log("Detection failed, trying fallback:", fallbackFormat);
        inputFormat = fallbackFormat;
      } else {
        throw new Error("Could not detect format and no fallback specified");
      }
    }
    
    // Check if format is allowed
    if (!allowedFormats.includes(inputFormat)) {
      throw new Error(\`Format \${inputFormat} is not allowed\`);
    }
    
    // Convert
    const result = await convertToString(data, {
      inputFormat,
      outputFormat
    });
    
    return {
      success: true,
      format: inputFormat,
      data: result
    };
    
  } catch (error) {
    return {
      success: false,
      error: error.message,
      format: inputFormat
    };
  }
}

async function run() {
  const validData = "name,age\\nAlice,30";
  const result = await robustConverter(validData);
  
  if (result.success) {
    console.log("Success!");
    console.log(\`Format: \${result.format}\`);
    console.log("Data:", result.data);
  } else {
    console.error("Failed:", result.error);
  }
}

run().catch(console.error);`,
        }}
      />

      <h2>See Also</h2>

      <ul>
        <li><a href="/docs/detection/detecting-format">Detecting Format</a> - Format detection basics</li>
        <li><a href="/docs/detection/detecting-structure">Detecting Structure</a> - Deep structure analysis</li>
        <li><a href="/docs/detection/detection-limits">Detection Limits</a> - Understanding edge cases</li>
        <li><a href="/docs/recipes/etl-pipelines">ETL Pipelines</a> - Data transformation workflows</li>
      </ul>
    </div>
  );
}
