use crate::error::Result;
use log::debug;
use quick_xml::events::Event;
use quick_xml::Reader;
use std::collections::HashMap;

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
pub struct XmlParser {
    config: XmlConfig,
    partial_buffer: Vec<u8>,
    output_buffer: Vec<u8>,
    chunk_target_bytes: usize,
    record_count: usize,
}

impl XmlParser {
    pub fn new(config: XmlConfig, chunk_target_bytes: usize) -> Self {
        Self {
            config,
            partial_buffer: Vec::new(),
            output_buffer: Vec::with_capacity(chunk_target_bytes),
            chunk_target_bytes,
            record_count: 0,
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
    fn extract_records(&mut self, output: &mut Vec<u8>) -> Result<()> {
        let mut reader = Reader::from_reader(&self.partial_buffer[..]);
        reader.config_mut().trim_text(self.config.trim_text);
        reader.config_mut().expand_empty_elements = true;

        let mut buf = Vec::new();
        let mut in_record = false;
        let mut element_stack: Vec<(String, HashMap<String, JsonValue>)> = Vec::new();
        let mut current_text = String::new();

        loop {
            match reader.read_event_into(&mut buf) {
                Ok(Event::Start(e)) => {
                    let name = String::from_utf8_lossy(e.name().as_ref()).to_string();
                    
                    if name == self.config.record_element && !in_record {
                        in_record = true;
                        let mut root = HashMap::new();
                        
                        // Include attributes if configured
                        if self.config.include_attributes {
                            for attr in e.attributes() {
                                if let Ok(attr) = attr {
                                    let key = format!("@{}", String::from_utf8_lossy(attr.key.as_ref()));
                                    let value = String::from_utf8_lossy(&attr.value).to_string();
                                    root.insert(key, JsonValue::String(value));
                                }
                            }
                        }
                        
                        element_stack.push((name, root));
                    } else if in_record {
                        // Push a new element onto the stack
                        element_stack.push((name, HashMap::new()));
                        current_text.clear();
                    }
                }
                Ok(Event::End(e)) => {
                    let name = String::from_utf8_lossy(e.name().as_ref()).to_string();
                    
                    if name == self.config.record_element && in_record {
                        // End of record - convert to JSON
                        if let Some((_, root_obj)) = element_stack.pop() {
                            self.json_value_to_output(&JsonValue::Object(root_obj), output)?;
                            output.push(b'\n');
                            self.record_count += 1;
                        }
                        in_record = false;
                        element_stack.clear();
                    } else if in_record && !element_stack.is_empty() {
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
                    if in_record {
                        let text = e.unescape().unwrap_or_default();
                        if !text.trim().is_empty() {
                            current_text = text.to_string();
                        }
                    }
                }
                Ok(Event::Empty(_e)) => {
                    // Handle empty elements if needed
                }
                Ok(Event::Eof) => break,
                Err(e) => {
                    debug!("XML parse error: {:?}", e);
                    break;
                }
                _ => {}
            }
            
            buf.clear();
        }

        // Clear processed data from buffer
        if self.record_count > 0 {
            self.partial_buffer.clear();
        }

        Ok(())
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
}
