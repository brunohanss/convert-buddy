use crate::error::{ConvertError, Result};
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