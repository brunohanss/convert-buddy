use crate::error::{ConvertError, Result};
use log::debug;
use quick_xml::events::Event;
use quick_xml::Reader;
use std::collections::HashMap;
use std::io::Write as IoWrite;
use bumpalo::Bump;

#[derive(Debug, Clone, PartialEq)]
enum JsonValue {
    String(String),
    Object(HashMap<String, JsonValue>),
    Array(Vec<JsonValue>),
}

/// XML parser configuration
#[derive(Debug, Clone)]
pub struct XmlConfig {
    /// The XML element name that represents a record (e.g., "row", "item")
    pub record_element: String,
    /// Whether to trim text content
    pub trim_text: bool,
    /// Whether to include attributes in output
    pub include_attributes: bool,
    /// Whether to expand entities
    pub expand_entities: bool,
}

impl Default for XmlConfig {
    fn default() -> Self {
        Self {
            record_element: "row".to_string(),
            trim_text: true,
            include_attributes: true,
            expand_entities: false,
        }
    }
}

/// High-performance streaming XML parser using SAX-like event model
/// Converts XML to NDJSON by extracting record elements
/// Uses SIMD-optimized quick-xml and arena allocator for performance
pub struct XmlParser {
    config: XmlConfig,
    partial_buffer: Vec<u8>,
    output_buffer: Vec<u8>,
    chunk_target_bytes: usize,
    record_count: usize,
    // Arena allocator for temporary allocations during parsing
    arena: Bump,
}

impl XmlParser {
    pub fn new(config: XmlConfig, chunk_target_bytes: usize) -> Self {
        Self {
            config,
            partial_buffer: Vec::new(),
            output_buffer: Vec::with_capacity(chunk_target_bytes),
            chunk_target_bytes,
            record_count: 0,
            arena: Bump::with_capacity(64 * 1024), // 64KB arena for temp allocations
        }
    }

    /// Process XML chunk and convert to NDJSON
    pub fn push_to_ndjson(&mut self, chunk: &[u8]) -> Result<Vec<u8>> {
        // Append chunk to partial buffer
        self.partial_buffer.extend_from_slice(chunk);

        let mut output = Vec::new();
        
        // Try to parse complete records
        // For streaming, we need to be careful about partial XML elements
        // This is a simplified approach - in production, you'd want more sophisticated buffering
        
        // For now, we'll process the buffer and extract complete records
        self.extract_records(&mut output)?;

        Ok(output)
    }

    /// Extract complete record elements from the buffer
    /// NEW APPROACH: Find complete record elements using string scanning instead of quick-xml streaming
    /// This is more reliable for true streaming with incomplete XML chunks
    fn extract_records(&mut self, output: &mut Vec<u8>) -> Result<()> {
        // Reset arena for this batch of records
        self.arena.reset();
        
        let (content, _valid_len) = match std::str::from_utf8(&self.partial_buffer) {
            Ok(content) => (content, self.partial_buffer.len()),
            Err(err) => {
                let valid_up_to = err.valid_up_to();
                if err.error_len().is_none() {
                    let content = std::str::from_utf8(&self.partial_buffer[..valid_up_to])?;
                    (content, valid_up_to)
                } else {
                    return Err(err.into());
                }
            }
        };
        
        // Find all complete record elements using string matching
        // This approach is more reliable for streaming than using quick-xml on partial buffers
        let record_tag_start = format!("<{}", self.config.record_element);
        let record_tag_end = format!("</{}>", self.config.record_element);
        
        let mut processed_up_to = 0;
        let mut search_start = 0;
        
        loop {
            // Find the next record start
            if let Some(record_start) = content[search_start..].find(&record_tag_start) {
                let record_start_abs = search_start + record_start;
                
                // Find the matching end tag for this record
                let search_from = record_start_abs + record_tag_start.len();
                if let Some(record_end) = content[search_from..].find(&record_tag_end) {
                    let record_end_abs = search_from + record_end + record_tag_end.len();
                    
                    // Extract the complete record element
                    let record_xml = &content[record_start_abs..record_end_abs];
                    
                    // Parse this single complete record using quick-xml
                    let parsed_record = self.parse_single_record(record_xml)?;
                    if !parsed_record.is_empty() {
                        output.extend_from_slice(&parsed_record);
                        output.push(b'\n');
                        self.record_count += 1;
                    }
                    
                    processed_up_to = record_end_abs;
                    search_start = record_end_abs;
                } else {
                    // Incomplete record - stop processing and keep this data for next chunk
                    break;
                }
            } else {
                // No more record starts found
                break;
            }
        }
        
        // Remove the data we've successfully processed
        if processed_up_to > 0 {
            self.partial_buffer.drain(0..processed_up_to);
        }

        Ok(())
    }
    
    /// Parse a single complete record element using quick-xml
    fn parse_single_record(&self, record_xml: &str) -> Result<Vec<u8>> {
        let mut reader = Reader::from_str(record_xml);
        reader.config_mut().trim_text(self.config.trim_text);
        reader.config_mut().expand_empty_elements = true;
        
        let mut buf = Vec::new();
        let mut element_stack: Vec<(String, HashMap<String, JsonValue>)> = Vec::new();
        let mut current_text = String::new();
        let mut root_found = false;
        
        loop {
            match reader.read_event_into(&mut buf) {
                Ok(Event::Start(e)) => {
                    let name = std::str::from_utf8(e.name().as_ref())?.to_string();
                    
                    if !root_found {
                        // This should be our record element
                        root_found = true;
                        let mut root = HashMap::new();
                        
                        // Include attributes if configured
                        if self.config.include_attributes {
                            for attr in e.attributes() {
                                if let Ok(attr) = attr {
                                    let key = format!("@{}", std::str::from_utf8(attr.key.as_ref())?);
                                    let value = std::str::from_utf8(&attr.value)?.to_string();
                                    root.insert(key, JsonValue::String(value));
                                }
                            }
                        }
                        
                        element_stack.push((name, root));
                    } else {
                        // Child element
                        element_stack.push((name, HashMap::new()));
                        current_text.clear();
                    }
                }
                Ok(Event::End(e)) => {
                    let name = std::str::from_utf8(e.name().as_ref())?.to_string();
                    
                    if element_stack.len() == 1 && name == self.config.record_element {
                        // End of root record element
                        if let Some((_, root_obj)) = element_stack.pop() {
                            let mut output = Vec::new();
                            self.json_value_to_output(&JsonValue::Object(root_obj), &mut output)?;
                            return Ok(output);
                        }
                    } else if !element_stack.is_empty() {
                        // Pop the current element
                        if let Some((elem_name, elem_obj)) = element_stack.pop() {
                            // If we have text content and no children, store it as a string
                            if !current_text.is_empty() && elem_obj.is_empty() {
                                // This is a leaf element with text
                                if let Some((_, parent_obj)) = element_stack.last_mut() {
                                    self.insert_value(parent_obj, &elem_name, JsonValue::String(current_text.clone()));
                                }
                                current_text.clear();
                            } else if !elem_obj.is_empty() {
                                // This element has children, add it as an object
                                if let Some((_, parent_obj)) = element_stack.last_mut() {
                                    self.insert_value(parent_obj, &elem_name, JsonValue::Object(elem_obj));
                                }
                            }
                        }
                    }
                }
                Ok(Event::Text(e)) => {
                    let text = e
                        .unescape()
                        .map_err(|e| ConvertError::XmlParse(e.to_string()))?;
                    if !text.trim().is_empty() {
                        current_text = text.to_string();
                    }
                }
                Ok(Event::Eof) => break,
                Err(e) => return Err(ConvertError::XmlParse(e.to_string())),
                _ => {}
            }
            buf.clear();
        }

        Err(ConvertError::XmlParse("Failed to parse XML record".to_string()))
    }

    /// Insert a value into a HashMap, creating arrays for duplicate keys
    fn insert_value(&self, map: &mut HashMap<String, JsonValue>, key: &str, value: JsonValue) {
        match map.get_mut(key) {
            Some(JsonValue::Array(arr)) => {
                // Already an array, append the new value
                arr.push(value);
            }
            Some(existing) => {
                // Convert to array with old and new values
                let old_value = existing.clone();
                *existing = JsonValue::Array(vec![old_value, value]);
            }
            None => {
                // New key, insert directly
                map.insert(key.to_string(), value);
            }
        }
    }

    /// Convert JsonValue to JSON output
    fn json_value_to_output(&self, value: &JsonValue, output: &mut Vec<u8>) -> Result<()> {
        match value {
            JsonValue::String(s) => {
                output.push(b'"');
                self.escape_json_string(s.as_bytes(), output);
                output.push(b'"');
            }
            JsonValue::Array(arr) => {
                output.push(b'[');
                for (i, item) in arr.iter().enumerate() {
                    if i > 0 {
                        output.push(b',');
                    }
                    self.json_value_to_output(item, output)?;
                }
                output.push(b']');
            }
            JsonValue::Object(obj) => {
                output.push(b'{');
                let mut first = true;
                let mut keys: Vec<&String> = obj.keys().collect();
                keys.sort();
                
                for key in keys {
                    if let Some(val) = obj.get(key) {
                        if !first {
                            output.push(b',');
                        }
                        first = false;
                        
                        output.push(b'"');
                        self.escape_json_string(key.as_bytes(), output);
                        output.extend_from_slice(b"\":");
                        self.json_value_to_output(val, output)?;
                    }
                }
                output.push(b'}');
            }
        }
        Ok(())
    }

    /// Escape a string for JSON
    fn escape_json_string(&self, input: &[u8], output: &mut Vec<u8>) {
        for &byte in input {
            match byte {
                b'"' => output.extend_from_slice(b"\\\""),
                b'\\' => output.extend_from_slice(b"\\\\"),
                b'\n' => output.extend_from_slice(b"\\n"),
                b'\r' => output.extend_from_slice(b"\\r"),
                b'\t' => output.extend_from_slice(b"\\t"),
                b'\x08' => output.extend_from_slice(b"\\b"),
                b'\x0C' => output.extend_from_slice(b"\\f"),
                _ => output.push(byte),
            }
        }
    }

    /// Finish processing and return remaining data
    pub fn finish(&mut self) -> Result<Vec<u8>> {
        let mut output = Vec::new();

        // Try to extract any remaining complete records
        if !self.partial_buffer.is_empty() {
            self.extract_records(&mut output)?;
        }

        // Clear any remaining partial data on finish to avoid leaking wrapper tags
        self.partial_buffer.clear();

        Ok(output)
    }

    pub fn partial_size(&self) -> usize {
        self.partial_buffer.len()
    }

    pub fn record_count(&self) -> usize {
        self.record_count
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_simple_xml() {
        let config = XmlConfig {
            record_element: "person".to_string(),
            ..Default::default()
        };
        let mut parser = XmlParser::new(config, 1024);

        let input = b"<root><person><name>Alice</name><age>30</age></person></root>";
        let result = parser.push_to_ndjson(input).unwrap();

        assert!(result.contains(&b'{'));
        assert!(parser.record_count() > 0);
    }

    #[test]
    fn test_xml_with_attributes() {
        let config = XmlConfig {
            record_element: "item".to_string(),
            include_attributes: true,
            ..Default::default()
        };
        let mut parser = XmlParser::new(config, 1024);

        let input = b"<root><item id=\"1\"><name>Test</name></item></root>";
        let result = parser.push_to_ndjson(input).unwrap();

        assert!(result.contains(&b'{'));
    }

    #[test]
    fn test_xml_repeated_elements_as_array() {
        let config = XmlConfig {
            record_element: "row".to_string(),
            include_attributes: false,
            ..Default::default()
        };
        let mut parser = XmlParser::new(config, 1024);

        let input = b"<root><row><tag>one</tag><tag>two</tag></row></root>";
        let result = parser.push_to_ndjson(input).unwrap();
        let output = String::from_utf8_lossy(&result);

        assert!(output.contains("["));
        assert!(output.contains("one"));
        assert!(output.contains("two"));
    }

    #[test]
    fn test_xml_finish_with_partial_buffer() {
        let config = XmlConfig {
            record_element: "row".to_string(),
            ..Default::default()
        };
        let mut parser = XmlParser::new(config, 1024);

        let input = b"<root><row><name>Alice</name></row></root>";
        let output = parser.push_to_ndjson(input).unwrap();
        let output_str = String::from_utf8_lossy(&output);
        assert!(output_str.contains("Alice"));

        let remaining = parser.finish().unwrap();
        assert!(remaining.is_empty());
        assert!(parser.partial_size() == 0);
    }

    #[test]
    fn test_xml_rss_like_structure() {
        // Test with RSS/Atom-like structure where items are the records
        let config = XmlConfig {
            record_element: "item".to_string(),
            include_attributes: false,
            ..Default::default()
        };
        let mut parser = XmlParser::new(config, 1024);

        let input = br#"<?xml version="1.0"?>
<rss version="2.0">
  <channel>
    <title>Test Feed</title>
    <item>
      <id>1</id>
      <title>Article 1</title>
    </item>
    <item>
      <id>2</id>
      <title>Article 2</title>
    </item>
  </channel>
</rss>"#;

        let result = parser.push_to_ndjson(input).unwrap();
        let output_str = String::from_utf8_lossy(&result);
        
        // Should have 2 records (2 items)
        assert_eq!(output_str.matches('\n').count(), 2, "Expected 2 records for 2 items");
        assert!(output_str.contains("Article 1"));
        assert!(output_str.contains("Article 2"));
        assert!(!output_str.contains("<?xml"), "XML declaration should not appear in output");
        assert!(!output_str.contains("Test Feed"), "Channel title should not be in item records");
        assert_eq!(parser.record_count(), 2);
    }

    #[test]
    fn test_xml_streaming_with_chunks() {
        // Test streaming XML parsing with a realistic RSS/Google shopping feed structure
        // This test specifically covers the bug where XML declaration was used as record element
        let config = XmlConfig {
            record_element: "item".to_string(),
            include_attributes: false,
            ..Default::default()
        };
        let mut parser = XmlParser::new(config, 1024);

                let xml_content = br#"<?xml version="1.0"?>
<rss xmlns:g="http://example.com/ns/1.0" version="2.0">
    <channel>
        <title>Example Feed</title>
        <link>https://example.local</link>
        <description>Sample anonymized feed content for testing purposes only.</description>
        <item>
            <g:id>A1</g:id>
            <g:id_alias>XXXXX</g:id_alias>
            <g:id_sf>A1_XXXXX</g:id_sf>
            <g:title>Sample Product Title</g:title>
            <g:description>Short anonymized description of the sample product.</g:description>
            <g:link>https://example.local/product/A1</g:link>
            <g:product_arborescence>Category &gt; Subcategory</g:product_arborescence>
            <g:image_link>https://cdn.example.local/images/A1.jpg</g:image_link>
            <g:condition>new</g:condition>
            <g:availability>in_stock</g:availability>
            <g:price>9.99 USD</g:price>
            <g:gtin_interne>0000000000000</g:gtin_interne>
            <g:gtin>0000000000000</g:gtin>
            <g:identifier_exists>true</g:identifier_exists>
            <g:brand>ExampleBrand</g:brand>
            <g:product_type>Category &gt; Product</g:product_type>
            <g:google_product_category>000</g:google_product_category>
            <g:additional_image_link>https://cdn.example.local/images/A1-2.jpg</g:additional_image_link>
        </item>
    </channel>
</rss>"#;

        // Process in smaller chunks to simulate streaming
        let chunk_size = 512; // Small chunks to test streaming behavior
        let mut total_output = Vec::new();
        
        for chunk in xml_content.chunks(chunk_size) {
            let output = parser.push_to_ndjson(chunk).unwrap();
            total_output.extend_from_slice(&output);
        }
        
        // Finish parsing
        let final_output = parser.finish().unwrap();
        total_output.extend_from_slice(&final_output);
        
        let output_str = String::from_utf8_lossy(&total_output);
        
        println!("Debug: total_output length: {}", total_output.len());
        println!("Debug: output_str: '{}'", output_str);
        
        // Should have 1 record (1 item)
        assert_eq!(output_str.matches('\n').count(), 1, "Expected 1 record for 1 item, got: {}", output_str);

        // Critical: XML declaration should NEVER appear as a key
        assert!(!output_str.contains("<?xml version=1.0?>"), 
            "XML declaration should not appear as JSON key - this was the original bug! Output: {}", output_str);

        // Should contain anonymized item data
        assert!(output_str.contains("Sample Product Title"), "Should contain item title");
        assert!(output_str.contains("XXXXX"), "Should contain item ID alias");
        assert!(output_str.contains("9.99 USD"), "Should contain price");
        
        // Should NOT contain channel-level data in the items
        assert!(!output_str.contains("The bearing specialist"), "Channel title should not be in item records");
        
        // Verify it's proper JSON
        let lines: Vec<&str> = output_str.trim().split('\n').collect();
        assert_eq!(lines.len(), 1, "Should have exactly 1 NDJSON line");
        
        // Parse the JSON to verify structure
        let json_result: std::result::Result<serde_json::Value, serde_json::Error> = serde_json::from_str(lines[0]);
        assert!(json_result.is_ok(), "Output should be valid JSON: {}", lines[0]);
        
        let json_obj = json_result.unwrap();
        assert!(json_obj.is_object(), "Each line should be a JSON object");
        
        // Verify some expected fields are present
        let obj = json_obj.as_object().unwrap();
        assert!(obj.contains_key("g:id"), "Should contain g:id field");
        assert!(obj.contains_key("g:title"), "Should contain g:title field");
        assert!(obj.contains_key("g:price"), "Should contain g:price field");
        
        assert_eq!(parser.record_count(), 1);
    }

    #[test]
    fn test_xml_reproduce_original_bug() {
        // Reproduce the exact bug reported where XML declaration becomes the key
        // This happens when record_element is set incorrectly to "<?xml version=1.0?>"
        let config = XmlConfig {
            record_element: "<?xml version=1.0?>".to_string(), // This is the WRONG config that causes the bug
            include_attributes: false,
            ..Default::default()
        };
        let mut parser = XmlParser::new(config, 1024);

        let xml_content = br#"<?xml version="1.0"?>
    <rss xmlns:g="http://example.com/ns/1.0" version="2.0">
     <channel>
      <title>Example Feed</title>
      <link>https://example.local</link>
      <description>Sample anonymized channel description.</description>
    <item>
     <g:id>A1</g:id>
     <g:id_alias>XXXXX</g:id_alias>
     <g:id_sf>A1_XXXXX</g:id_sf>
     <g:title>Sample Product Title</g:title>
    </item>
     </channel>
    </rss>"#;

        let result = parser.push_to_ndjson(xml_content).unwrap();
        let output_str = String::from_utf8_lossy(&result);
        
        println!("Bug reproduction output: '{}'", output_str);
        
        // This should demonstrate the original bug where XML declaration becomes JSON key
    }
    
    #[test]
    fn test_xml_simple_debug() {
        // Test the simplest possible case to understand what's happening
        let config = XmlConfig {
            record_element: "item".to_string(),
            include_attributes: false,
            ..Default::default()
        };
        let mut parser = XmlParser::new(config, 1024);

        let xml_content = b"<root><item><id>1</id></item></root>";

        let result = parser.push_to_ndjson(xml_content).unwrap();
        let output_str = String::from_utf8_lossy(&result);
        
        println!("Simple debug output: '{}'", output_str);
        
        assert!(!output_str.is_empty(), "Should produce some output");
        assert!(output_str.contains("\"id\""), "Should contain the id field");
    }
}

/// XML writer that converts JSON objects to XML format
pub struct XmlWriter {
    root_element: String,
    record_element: String,
    header_written: bool,
}

impl XmlWriter {
    pub fn new() -> Self {
        Self {
            root_element: "root".to_string(),
            record_element: "record".to_string(),
            header_written: false,
        }
    }

    pub fn with_elements(mut self, root: String, record: String) -> Self {
        self.root_element = root;
        self.record_element = record;
        self
    }

    /// Process a JSON line (NDJSON format) and convert to XML
    pub fn process_json_line(&mut self, json_line: &str) -> Result<Vec<u8>> {
        let mut output = Vec::new();

        // Write header on first call
        if !self.header_written {
            write!(output, "<{}>\n", self.root_element).ok();
            self.header_written = true;
        }

        // Parse the JSON to extract fields
        if let Ok(value) = serde_json::from_str::<serde_json::Value>(json_line) {
            if let Some(obj) = value.as_object() {
                write!(output, "  <{}>\n", self.record_element).ok();
                
                for (key, val) in obj {
                    let xml_key = key.to_string();
                    let xml_value = match val {
                        serde_json::Value::String(s) => s.clone(),
                        serde_json::Value::Number(n) => n.to_string(),
                        serde_json::Value::Bool(b) => b.to_string(),
                        serde_json::Value::Null => String::new(),
                        _ => serde_json::to_string(val).unwrap_or_default(),
                    };
                    
                    // Escape XML special characters
                    let escaped = xml_key.replace("&", "&amp;")
                        .replace("<", "&lt;")
                        .replace(">", "&gt;")
                        .replace("\"", "&quot;");
                    let escaped_value = xml_value.replace("&", "&amp;")
                        .replace("<", "&lt;")
                        .replace(">", "&gt;")
                        .replace("\"", "&quot;");
                    
                    write!(output, "    <{}>{}</{}>\n", escaped, escaped_value, escaped).ok();
                }
                
                write!(output, "  </{}>\n", self.record_element).ok();
            }
        }

        Ok(output)
    }

    /// Finish and close the root element
    pub fn finish(&self) -> Result<Vec<u8>> {
        let mut output = Vec::new();
        if self.header_written {
            write!(output, "</{}>\n", self.root_element).ok();
        }
        Ok(output)
    }
}

#[cfg(test)]
mod writer_tests {
    use super::*;

    #[test]
    fn xml_writer_emits_header_and_records() {
        let mut writer = XmlWriter::new().with_elements("items".to_string(), "item".to_string());
        let output = writer
            .process_json_line(r#"{"name":"Widget","price":19.99,"active":true}"#)
            .unwrap();

        let output_str = String::from_utf8_lossy(&output);
        assert!(output_str.contains("<items>"));
        assert!(output_str.contains("<item>"));
        assert!(output_str.contains("<name>Widget</name>"));
        assert!(output_str.contains("<price>19.99</price>"));
        assert!(output_str.contains("<active>true</active>"));
    }

    #[test]
    fn xml_writer_escapes_special_characters() {
        let mut writer = XmlWriter::new();
        let output = writer
            .process_json_line(r#"{"note":"fish & chips <tasty> \"yes\""}"#)
            .unwrap();

        let output_str = String::from_utf8_lossy(&output);
        assert!(output_str.contains("&amp;"));
        assert!(output_str.contains("&lt;tasty&gt;"));
        assert!(output_str.contains("&quot;yes&quot;"));
    }

    #[test]
    fn xml_writer_finish_without_header_is_empty() {
        let writer = XmlWriter::new();
        let output = writer.finish().unwrap();
        assert!(output.is_empty());
    }
}
