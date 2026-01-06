use crate::error::Result;
use log::debug;
use quick_xml::events::Event;
use quick_xml::Reader;

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
        let mut record_depth: usize = 0;
        let mut _current_record: Vec<u8> = Vec::new();
        let mut current_path: Vec<String> = Vec::new();
        let mut current_object: Vec<(String, String)> = Vec::new();
        let mut current_text = String::new();

        loop {
            match reader.read_event_into(&mut buf) {
                Ok(Event::Start(e)) => {
                    let name = String::from_utf8_lossy(e.name().as_ref()).to_string();
                    
                    if name == self.config.record_element && !in_record {
                        in_record = true;
                        record_depth = 0;
                        current_object.clear();
                        
                        // Include attributes if configured
                        if self.config.include_attributes {
                            for attr in e.attributes() {
                                if let Ok(attr) = attr {
                                    let key = format!("@{}", String::from_utf8_lossy(attr.key.as_ref()));
                                    let value = String::from_utf8_lossy(&attr.value).to_string();
                                    current_object.push((key, value));
                                }
                            }
                        }
                    } else if in_record {
                        current_path.push(name.clone());
                        record_depth += 1;
                        current_text.clear();
                    }
                }
                Ok(Event::End(e)) => {
                    let name = String::from_utf8_lossy(e.name().as_ref()).to_string();
                    
                    if name == self.config.record_element && in_record && record_depth == 0 {
                        // End of record - convert to JSON
                        self.object_to_json(&current_object, output)?;
                        output.push(b'\n');
                        
                        in_record = false;
                        current_object.clear();
                        self.record_count += 1;
                    } else if in_record {
                        // Store the text content with the element path
                        if !current_text.is_empty() {
                            let path = current_path.join(".");
                            current_object.push((path, current_text.clone()));
                            current_text.clear();
                        }
                        
                        if !current_path.is_empty() {
                            current_path.pop();
                            record_depth = record_depth.saturating_sub(1);
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
                Ok(Event::Empty(e)) => {
                    let name = String::from_utf8_lossy(e.name().as_ref()).to_string();
                    
                    if in_record {
                        let path = if current_path.is_empty() {
                            name.clone()
                        } else {
                            format!("{}.{}", current_path.join("."), name)
                        };
                        
                        // Empty element - store as empty string or with attributes
                        if self.config.include_attributes {
                            let mut attr_values = Vec::new();
                            for attr in e.attributes() {
                                if let Ok(attr) = attr {
                                    let key = String::from_utf8_lossy(attr.key.as_ref());
                                    let value = String::from_utf8_lossy(&attr.value);
                                    attr_values.push(format!("{}={}", key, value));
                                }
                            }
                            if !attr_values.is_empty() {
                                current_object.push((path, attr_values.join(", ")));
                            } else {
                                current_object.push((path, String::new()));
                            }
                        } else {
                            current_object.push((path, String::new()));
                        }
                    }
                }
                Ok(Event::Eof) => break,
                Err(e) => {
                    debug!("XML parse error: {:?}", e);
                    // For streaming, we might have incomplete XML, so we break and wait for more data
                    break;
                }
                _ => {}
            }
            
            buf.clear();
        }

        // Clear processed data from buffer
        // In a real implementation, you'd track how much was successfully parsed
        // and only remove that portion
        if self.record_count > 0 {
            self.partial_buffer.clear();
        }

        Ok(())
    }

    /// Convert object to JSON
    fn object_to_json(&self, object: &[(String, String)], output: &mut Vec<u8>) -> Result<()> {
        output.push(b'{');

        for (i, (key, value)) in object.iter().enumerate() {
            if i > 0 {
                output.push(b',');
            }

            // Write key
            output.push(b'"');
            self.escape_json_string(key.as_bytes(), output);
            output.extend_from_slice(b"\":");

            // Write value
            output.push(b'"');
            self.escape_json_string(value.as_bytes(), output);
            output.push(b'"');
        }

        output.push(b'}');
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
