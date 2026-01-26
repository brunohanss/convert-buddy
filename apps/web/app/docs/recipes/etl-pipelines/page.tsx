import React from 'react';
import PlaygroundExample from '@/components/mdx/Playground';

export default function ETLPipelinesPage() {
  return (
    <div>
      <h1>ETL Pipelines</h1>

      <p>
        Extract, Transform, Load (ETL) pipelines are data workflows that move and reshape data
        between systems. Convert Buddy excels at the Transform step with field mapping, type
        coercion, filtering, and computed fields.
      </p>

      <h2>Basic ETL Pattern</h2>

      <p>
        A complete ETL workflow with Convert Buddy:
      </p>

      <PlaygroundExample
        template="node"
        activeFile="/index.js"
        preview={true}
        files={{
          '/index.js': `import { convertToString } from "convert-buddy-js";

// EXTRACT: Source data (CSV from database export)
const sourceData = \`user_id,first_name,last_name,email_address,signup_date,is_active
1,John,Doe,john@example.com,2024-01-15,1
2,Jane,Smith,jane@example.com,2024-02-20,1
3,Bob,Jones,bob@example.com,2024-03-10,0\`;

async function etlPipeline() {
  // TRANSFORM: Convert and reshape data
  const transformed = await convertToString(sourceData, {
    inputFormat: "csv",
    outputFormat: "json",
    transform: {
      // Rename fields
      fieldMap: {
        user_id: "id",
        first_name: "firstName",
        last_name: "lastName",
        email_address: "email",
        signup_date: "signupDate",
        is_active: "active"
      },
      // Type coercion
      coerce: {
        id: "number",
        active: "boolean",
        signupDate: "date"
      },
      // Computed fields
      computedFields: {
        fullName: (record) => \`\${record.firstName} \${record.lastName}\`,
        emailDomain: (record) => record.email.split('@')[1]
      }
    }
  });
  
  // LOAD: Output in target format
  console.log("Transformed data:");
  console.log(transformed);
  
  return transformed;
}

etlPipeline().catch(console.error);`,
        }}
      />

      <h2>Multi-Step Transforms</h2>

      <p>
        Chain multiple transformation steps:
      </p>

      <PlaygroundExample
        template="node"
        activeFile="/index.js"
        preview={true}
        files={{
          '/index.js': `import { convertToString } from "convert-buddy-js";

const rawData = \`product_code,product_name,price_usd,stock_qty,category_id
WDG-001,Widget Pro,19.99,150,1
GDG-002,Gadget Plus,29.99,75,2
WDG-003,Widget Lite,9.99,200,1\`;

async function multiStepETL() {
  // Step 1: Basic field mapping and filtering
  const step1 = await convertToString(rawData, {
    inputFormat: "csv",
    outputFormat: "json",
    transform: {
      fieldMap: {
        product_code: "sku",
        product_name: "name",
        price_usd: "price",
        stock_qty: "stock",
        category_id: "categoryId"
      },
      filter: (record) => parseInt(record.stock) > 50
    }
  });
  
  console.log("Step 1 - Filtered products:");
  console.log(step1);
  
  // Step 2: Add computed fields
  const step2 = await convertToString(step1, {
    inputFormat: "json",
    outputFormat: "json",
    transform: {
      computedFields: {
        priceWithTax: (record) => (parseFloat(record.price) * 1.1).toFixed(2),
        inStock: (record) => parseInt(record.stock) > 0,
        categoryName: (record) => 
          record.categoryId === "1" ? "Widgets" : "Gadgets"
      }
    }
  });
  
  console.log("\\nStep 2 - Enriched data:");
  console.log(step2);
  
  // Step 3: Convert to CSV for loading into database
  const step3 = await convertToString(step2, {
    inputFormat: "json",
    outputFormat: "csv"
  });
  
  console.log("\\nStep 3 - Final CSV for database:");
  console.log(step3);
}

multiStepETL().catch(console.error);`,
        }}
      />

      <h2>Field Mapping Strategies</h2>

      <p>
        Different approaches to field mapping:
      </p>

      <PlaygroundExample
        template="node"
        activeFile="/index.js"
        preview={true}
        files={{
          '/index.js': `import { convertToString } from "convert-buddy-js";

const sourceData = \`old_field1,old_field2,old_field3,keep_this,drop_this
value1,value2,value3,important,unimportant\`;

async function demonstrateMappingStrategies() {
  // Strategy 1: Rename specific fields, keep others
  const result1 = await convertToString(sourceData, {
    inputFormat: "csv",
    outputFormat: "json",
    transform: {
      fieldMap: {
        old_field1: "new_field1",
        old_field2: "new_field2",
        old_field3: "new_field3",
        keep_this: true,  // Keep with same name
        // drop_this is omitted = dropped
      }
    }
  });
  
  console.log("Selective mapping:");
  console.log(result1);
  
  // Strategy 2: Keep only specific fields
  const result2 = await convertToString(sourceData, {
    inputFormat: "csv",
    outputFormat: "json",
    transform: {
      fieldMap: {
        old_field1: "field1",
        keep_this: true
        // All other fields dropped
      }
    }
  });
  
  console.log("\\nKeep only field1 and keep_this:");
  console.log(result2);
}

demonstrateMappingStrategies().catch(console.error);`,
        }}
      />

      <h2>Type Coercion</h2>

      <p>
        Convert field types during transformation:
      </p>

      <PlaygroundExample
        template="node"
        activeFile="/index.js"
        preview={true}
        files={{
          '/index.js': `import { convertToString } from "convert-buddy-js";

const mixedTypes = \`id,name,age,salary,is_manager,hire_date,score
1,Alice,30,50000.50,true,2020-01-15,95.5
2,Bob,25,45000,false,2021-06-20,87.2\`;

async function demonstrateCoercion() {
  const result = await convertToString(mixedTypes, {
    inputFormat: "csv",
    outputFormat: "json",
    transform: {
      coerce: {
        id: "number",
        age: "number",
        salary: "number",
        is_manager: "boolean",
        hire_date: "date",
        score: "number"
      }
    }
  });
  
  console.log("Coerced types:");
  console.log(result);
  
  const parsed = JSON.parse(result);
  console.log("\\nField types:");
  const first = parsed[0];
  Object.entries(first).forEach(([key, value]) => {
    console.log(\`  \${key}: \${typeof value} (\${value})\`);
  });
}

demonstrateCoercion().catch(console.error);`,
        }}
      />

      <h2>Computed Fields</h2>

      <p>
        Create new fields from existing data:
      </p>

      <PlaygroundExample
        template="node"
        activeFile="/index.js"
        preview={true}
        files={{
          '/index.js': `import { convertToString } from "convert-buddy-js";

const salesData = \`order_id,product,quantity,unit_price,discount_pct
1001,Widget,10,19.99,0
1002,Gadget,5,29.99,10
1003,Doohickey,20,9.99,5\`;

async function computeFields() {
  const result = await convertToString(salesData, {
    inputFormat: "csv",
    outputFormat: "json",
    transform: {
      coerce: {
        order_id: "number",
        quantity: "number",
        unit_price: "number",
        discount_pct: "number"
      },
      computedFields: {
        // Subtotal before discount
        subtotal: (record) => 
          (record.quantity * record.unit_price).toFixed(2),
        
        // Discount amount
        discount_amount: (record) => 
          (record.quantity * record.unit_price * record.discount_pct / 100).toFixed(2),
        
        // Final total
        total: (record) => {
          const subtotal = record.quantity * record.unit_price;
          const discount = subtotal * record.discount_pct / 100;
          return (subtotal - discount).toFixed(2);
        },
        
        // Order size category
        order_size: (record) => 
          record.quantity >= 15 ? "Large" : record.quantity >= 10 ? "Medium" : "Small"
      }
    }
  });
  
  console.log("Sales data with computed fields:");
  console.log(result);
}

computeFields().catch(console.error);`,
        }}
      />

      <h2>Validation and Error Handling</h2>

      <p>
        Add validation to your ETL pipeline:
      </p>

      <PlaygroundExample
        template="node"
        activeFile="/index.js"
        preview={true}
        files={{
          '/index.js': `import { convertToString } from "convert-buddy-js";

const userData = \`name,email,age
Alice,alice@example.com,30
Bob,invalid-email,25
Charlie,charlie@example.com,-5
Dave,dave@example.com,28\`;

async function validatedETL() {
  const errors = [];
  
  const result = await convertToString(userData, {
    inputFormat: "csv",
    outputFormat: "json",
    transform: {
      coerce: {
        age: "number"
      },
      computedFields: {
        // Validation flags
        valid_email: (record) => /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(record.email),
        valid_age: (record) => record.age > 0 && record.age < 150
      },
      filter: (record) => {
        const isValid = record.valid_email && record.valid_age;
        
        if (!isValid) {
          errors.push({
            name: record.name,
            issues: [
              !record.valid_email && "Invalid email",
              !record.valid_age && "Invalid age"
            ].filter(Boolean)
          });
        }
        
        return isValid;
      }
    }
  });
  
  console.log("Valid records:");
  console.log(result);
  
  if (errors.length > 0) {
    console.log("\\nValidation errors:");
    errors.forEach(error => {
      console.log(\`  \${error.name}: \${error.issues.join(', ')}\`);
    });
  }
}

validatedETL().catch(console.error);`,
        }}
      />

      <h2>Complete ETL Example</h2>

      <p>
        A production-ready ETL pipeline with all features:
      </p>

      <PlaygroundExample
        template="node"
        activeFile="/index.js"
        preview={true}
        files={{
          '/index.js': `import { convertToString } from "convert-buddy-js";

class ETLPipeline {
  constructor(config) {
    this.config = config;
    this.stats = {
      totalRecords: 0,
      validRecords: 0,
      invalidRecords: 0,
      errors: []
    };
  }
  
  async extract(source) {
    console.log("Extracting data...");
    return source; // In real app, fetch from API/database
  }
  
  async transform(data) {
    console.log("Transforming data...");
    
    const result = await convertToString(data, {
      inputFormat: this.config.inputFormat,
      outputFormat: this.config.outputFormat,
      transform: this.config.transform,
      onProgress: (stats) => {
        this.stats.totalRecords = stats.recordsProcessed;
        this.stats.validRecords = stats.recordsProcessed - stats.recordsFiltered;
        this.stats.invalidRecords = stats.recordsFiltered;
      }
    });
    
    return result;
  }
  
  async load(data) {
    console.log("Loading data...");
    // In real app, write to database/file/API
    return data;
  }
  
  async run(source) {
    try {
      const extracted = await this.extract(source);
      const transformed = await this.transform(extracted);
      const loaded = await this.load(transformed);
      
      console.log("\\n=== ETL Complete ===");
      console.log(\`Total records: \${this.stats.totalRecords}\`);
      console.log(\`Valid: \${this.stats.validRecords}\`);
      console.log(\`Invalid: \${this.stats.invalidRecords}\`);
      
      return loaded;
    } catch (error) {
      console.error("ETL failed:", error.message);
      throw error;
    }
  }
}

async function run() {
  const sourceData = \`user_id,name,email,age,status
1,Alice,alice@example.com,30,active
2,Bob,bob@example.com,25,active
3,Charlie,charlie@example.com,35,inactive\`;
  
  const pipeline = new ETLPipeline({
    inputFormat: "csv",
    outputFormat: "json",
    transform: {
      fieldMap: {
        user_id: "id",
        name: true,
        email: true,
        age: true,
        status: true
      },
      coerce: {
        id: "number",
        age: "number"
      },
      filter: (record) => record.status === "active",
      computedFields: {
        isAdult: (record) => record.age >= 18
      }
    }
  });
  
  const result = await pipeline.run(sourceData);
  console.log("\\nFinal output:");
  console.log(result);
}

run().catch(console.error);`,
        }}
      />

      <h2>See Also</h2>

      <ul>
        <li><a href="/docs/reference/transform">Transform Reference</a> - Complete transform options</li>
        <li><a href="/docs/recipes/auto-detect-pipelines">Auto-Detect Pipelines</a> - Format-agnostic processing</li>
        <li><a href="/docs/recipes/large-files">Large Files</a> - Processing multi-GB datasets</li>
        <li><a href="/docs/performance/telemetry-and-stats">Telemetry and Stats</a> - Monitoring pipelines</li>
      </ul>
    </div>
  );
}
