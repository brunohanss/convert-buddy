/**
 * Dataset generators for benchmarking
 */

export function generateCsvDataset(rows: number, cols: number): Uint8Array {
  const encoder = new TextEncoder();
  let csv = "";

  // Generate headers
  const headers = Array.from({ length: cols }, (_, i) => `column_${i}`);
  csv += headers.join(",") + "\n";

  // Generate rows
  for (let i = 0; i < rows; i++) {
    const row = Array.from({ length: cols }, (_, j) => {
      // Mix of data types
      if (j % 4 === 0) {
        return `"text_${i}_${j}"`; // Quoted string
      } else if (j % 4 === 1) {
        return i * j; // Number
      } else if (j % 4 === 2) {
        return `value_${i}`; // Unquoted string
      } else {
        return `"quoted, with comma ${i}"`; // Quoted with comma
      }
    });
    csv += row.join(",") + "\n";
  }

  return encoder.encode(csv);
}

export function generateNdjsonDataset(records: number, fields: number): Uint8Array {
  const encoder = new TextEncoder();
  let ndjson = "";

  for (let i = 0; i < records; i++) {
    const obj: Record<string, any> = {};
    
    for (let j = 0; j < fields; j++) {
      const key = `field_${j}`;
      
      // Mix of data types
      if (j % 5 === 0) {
        obj[key] = `string_value_${i}_${j}`;
      } else if (j % 5 === 1) {
        obj[key] = i * j;
      } else if (j % 5 === 2) {
        obj[key] = i % 2 === 0;
      } else if (j % 5 === 3) {
        obj[key] = null;
      } else {
        obj[key] = { nested: `value_${i}`, count: j };
      }
    }
    
    ndjson += JSON.stringify(obj) + "\n";
  }

  return encoder.encode(ndjson);
}

export function generateXmlDataset(records: number, fields: number): Uint8Array {
  const encoder = new TextEncoder();
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<root>\n';

  for (let i = 0; i < records; i++) {
    xml += `  <record id="${i}">\n`;
    
    for (let j = 0; j < fields; j++) {
      const value = `value_${i}_${j}`;
      xml += `    <field_${j}>${value}</field_${j}>\n`;
    }
    
    xml += `  </record>\n`;
  }

  xml += "</root>\n";
  return encoder.encode(xml);
}

export function generateJsonDataset(records: number, fields: number): Uint8Array {
  const encoder = new TextEncoder();
  const array = [];

  for (let i = 0; i < records; i++) {
    const obj: Record<string, any> = {};
    
    for (let j = 0; j < fields; j++) {
      const key = `field_${j}`;
      
      if (j % 4 === 0) {
        obj[key] = `string_value_${i}_${j}`;
      } else if (j % 4 === 1) {
        obj[key] = i * j;
      } else if (j % 4 === 2) {
        obj[key] = i % 2 === 0;
      } else {
        obj[key] = { nested: `value_${i}` };
      }
    }
    
    array.push(obj);
  }

  return encoder.encode(JSON.stringify(array));
}

// Generate realistic CSV with various edge cases
export function generateRealisticCsv(rows: number): Uint8Array {
  const encoder = new TextEncoder();
  let csv = "id,name,email,age,city,description\n";

  const cities = ["New York", "London", "Tokyo", "Paris", "Berlin"];
  const names = ["Alice", "Bob", "Charlie", "Diana", "Eve"];

  for (let i = 0; i < rows; i++) {
    const name = names[i % names.length];
    const email = `${name.toLowerCase()}${i}@example.com`;
    const age = 20 + (i % 50);
    const city = cities[i % cities.length];
    const description = `"This is a longer description with, commas and ""quotes"" for record ${i}"`;
    
    csv += `${i},${name},${email},${age},${city},${description}\n`;
  }

  return encoder.encode(csv);
}

// Generate wide CSV (many columns)
export function generateWideCsv(rows: number, cols: number = 100): Uint8Array {
  const encoder = new TextEncoder();
  
  // Headers
  const headers = Array.from({ length: cols }, (_, i) => `col_${i}`);
  let csv = headers.join(",") + "\n";

  // Data
  for (let i = 0; i < rows; i++) {
    const row = Array.from({ length: cols }, (_, j) => i * cols + j);
    csv += row.join(",") + "\n";
  }

  return encoder.encode(csv);
}

// Generate NDJSON with large objects
export function generateLargeObjectNdjson(records: number): Uint8Array {
  const encoder = new TextEncoder();
  let ndjson = "";

  for (let i = 0; i < records; i++) {
    const obj = {
      id: i,
      timestamp: new Date().toISOString(),
      user: {
        name: `User ${i}`,
        email: `user${i}@example.com`,
        profile: {
          age: 20 + (i % 50),
          city: "City",
          bio: "A".repeat(100), // Large string
        },
      },
      data: Array.from({ length: 10 }, (_, j) => ({
        key: `key_${j}`,
        value: i * j,
      })),
      metadata: {
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
        tags: ["tag1", "tag2", "tag3"],
      },
    };
    
    ndjson += JSON.stringify(obj) + "\n";
  }

  return encoder.encode(ndjson);
}
