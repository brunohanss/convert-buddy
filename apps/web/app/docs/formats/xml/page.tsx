import React from 'react';
import SandpackExample from '@/components/mdx/Sandpack';

export default function XMLFormatPage() {
  return (
    <div>
      <h1>XML Format</h1>

      <p>
        XML (Extensible Markup Language) is a markup language for encoding documents. Convert Buddy
        supports data-oriented XML with repeating record elements, ideal for configuration files,
        data exports, and API responses.
      </p>

      <h2>Supported Structure</h2>

      <p>
        Convert Buddy expects XML with a repeating record element pattern:
      </p>

      <pre><code>{`<root>
  <person>
    <name>Alice</name>
    <age>30</age>
    <city>New York</city>
  </person>
  <person>
    <name>Bob</name>
    <age>25</age>
    <city>Los Angeles</city>
  </person>
</root>`}</code></pre>

      <p>
        The record element (<code>&lt;person&gt;</code>) is automatically detected or can be specified.
      </p>

      <h2>Basic Example</h2>

      <SandpackExample
        template="node"
        activeFile="/index.js"
        preview={false}
        enableFilePicker={true}
        files={{
          '/index.js': `import { convertToString } from "convert-buddy-js";

const xmlData = \`<people>
  <person>
    <name>Alice</name>
    <age>30</age>
    <city>New York</city>
  </person>
  <person>
    <name>Bob</name>
    <age>25</age>
    <city>Los Angeles</city>
  </person>
</people>\`;

async function run() {
  const json = await convertToString(xmlData, {
    inputFormat: "xml",
    outputFormat: "json"
  });
  
  console.log("Converted to JSON:");
  console.log(json);
}

run().catch(console.error);`,
        }}
      />

      <h2>XmlConfig Options</h2>

      <p>
        Customize XML parsing with <code>xmlConfig</code>:
      </p>

      <table>
        <thead>
          <tr>
            <th>Option</th>
            <th>Type</th>
            <th>Default</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>recordElement</code></td>
            <td>string</td>
            <td>Auto-detected</td>
            <td>Element name that represents a record</td>
          </tr>
          <tr>
            <td><code>trimText</code></td>
            <td>boolean</td>
            <td>true</td>
            <td>Remove leading/trailing whitespace from text content</td>
          </tr>
          <tr>
            <td><code>includeAttributes</code></td>
            <td>boolean</td>
            <td>false</td>
            <td>Include element attributes as fields (prefixed with @)</td>
          </tr>
          <tr>
            <td><code>expandEntities</code></td>
            <td>boolean</td>
            <td>true</td>
            <td>Expand XML entities (&amp;lt;, &amp;gt;, etc.)</td>
          </tr>
        </tbody>
      </table>

      <h2>Record Element Detection</h2>

      <p>
        Convert Buddy automatically finds the repeating element:
      </p>

      <SandpackExample
        template="node"
        activeFile="/index.js"
        preview={false}
        files={{
          '/index.js': `import { detectStructure } from "convert-buddy-js";

const xmlData = \`<products>
  <product>
    <name>Widget</name>
    <price>19.99</price>
  </product>
  <product>
    <name>Gadget</name>
    <price>29.99</price>
  </product>
</products>\`;

async function run() {
  const structure = await detectStructure(xmlData);
  console.log("Detected structure:");
  console.log(JSON.stringify(structure, null, 2));
  console.log("\nRecord element:", structure.xml?.recordElement);
}

run().catch(console.error);`,
        }}
      />

      <h2>Attributes Handling</h2>

      <p>
        Include element attributes as fields:
      </p>

      <SandpackExample
        template="node"
        activeFile="/index.js"
        preview={false}
        files={{
          '/index.js': `import { convertToString } from "convert-buddy-js";

const xmlData = \`<records>
  <record id="1" status="active">
    <name>Alice</name>
    <score>95</score>
  </record>
  <record id="2" status="inactive">
    <name>Bob</name>
    <score>87</score>
  </record>
</records>\`;

async function run() {
  const json = await convertToString(xmlData, {
    inputFormat: "xml",
    outputFormat: "json",
    xmlConfig: {
      includeAttributes: true
    }
  });
  
  console.log("With attributes:");
  console.log(json);
}

run().catch(console.error);`,
        }}
      />

      <h2>Limitations</h2>

      <p>
        Convert Buddy's XML parser is optimized for data conversion, with some limitations:
      </p>

      <ul>
        <li><strong>No namespaces:</strong> XML namespaces are not supported</li>
        <li><strong>No mixed content:</strong> Elements should contain either text or child elements, not both</li>
        <li><strong>Flat structures:</strong> Best for simple, data-oriented XML</li>
        <li><strong>No CDATA:</strong> CDATA sections are treated as regular text</li>
      </ul>

      <p>
        For document-oriented XML (like HTML or complex schemas), use a specialized XML library.
      </p>

      <h2>Transform Compatibility</h2>

      <p>
        XML supports transforms like other formats:
      </p>

      <SandpackExample
        template="node"
        activeFile="/index.js"
        preview={false}
        files={{
          '/index.js': `import { convertToString } from "convert-buddy-js";

const xmlData = \`<employees>
  <employee>
    <firstName>John</firstName>
    <lastName>Doe</lastName>
    <salary>50000</salary>
  </employee>
  <employee>
    <firstName>Jane</firstName>
    <lastName>Smith</lastName>
    <salary>60000</salary>
  </employee>
</employees>\`;

async function run() {
  const csv = await convertToString(xmlData, {
    inputFormat: "xml",
    outputFormat: "csv",
    transform: {
      fieldMap: {
        firstName: "first_name",
        lastName: "last_name",
        salary: true
      },
      coerce: {
        salary: "number"
      },
      computedFields: {
        full_name: (record) => \`\${record.first_name} \${record.last_name}\`
      }
    }
  });
  
  console.log("Transformed to CSV:");
  console.log(csv);
}

run().catch(console.error);`,
        }}
      />

      <h2>Performance</h2>

      <ul>
        <li><strong>Parsing:</strong> 20-60 MB/s (slower than other formats due to XML complexity)</li>
        <li><strong>Memory:</strong> Streaming parser maintains constant memory usage</li>
        <li><strong>Best for:</strong> Configuration files, API responses, moderate-sized datasets</li>
        <li><strong>Not ideal for:</strong> Multi-gigabyte data files (consider CSV/NDJSON instead)</li>
      </ul>

      <h2>Complex Nested Structures</h2>

      <SandpackExample
        template="node"
        activeFile="/index.js"
        preview={false}
        files={{
          '/index.js': `import { convertToString } from "convert-buddy-js";

const xmlData = \`<catalog>
  <book>
    <title>The Great Gatsby</title>
    <author>
      <name>F. Scott Fitzgerald</name>
      <born>1896</born>
    </author>
    <year>1925</year>
  </book>
  <book>
    <title>1984</title>
    <author>
      <name>George Orwell</name>
      <born>1903</born>
    </author>
    <year>1949</year>
  </book>
</catalog>\`;

async function run() {
  const json = await convertToString(xmlData, {
    inputFormat: "xml",
    outputFormat: "json"
  });
  
  console.log("Nested XML to JSON:");
  console.log(json);
}

run().catch(console.error);`,
        }}
      />

      <h2>See Also</h2>

      <ul>
        <li><a href="/docs/detection/detecting-structure">Structure Detection</a> - How record elements are detected</li>
        <li><a href="/docs/reference/configuration">Configuration Reference</a> - Complete XmlConfig options</li>
        <li><a href="/docs/performance/benchmarks">Performance Benchmarks</a> - XML parsing speed</li>
      </ul>
    </div>
  );
}
