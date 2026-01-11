use crate::error::Result;
use std::collections::{HashMap, HashSet};

/// CSV writer that converts JSON objects to CSV format
pub struct CsvWriter {
    headers: Vec<String>,
    headers_written: bool,
}

impl CsvWriter {
    pub fn new() -> Self {
        Self {
            headers: Vec::new(),
            headers_written: false,
        }
    }

    /// Process a JSON line (NDJSON format) and convert to CSV
    pub fn process_json_line(&mut self, json_line: &str) -> Result<Vec<u8>> {
        let mut output = Vec::new();
        
        // Parse the JSON to extract fields
        if let Ok(value) = serde_json::from_str::<serde_json::Value>(json_line) {
            if let Some(obj) = value.as_object() {
                // Extract all keys (flattened)
                let mut fields = HashMap::new();
                self.flatten_object("", obj, &mut fields);
                
                // Update headers if this is the first row or we found new fields
                let mut all_keys: HashSet<String> = fields.keys().cloned().collect();
                for header in &self.headers {
                    all_keys.insert(header.clone());
                }
                let mut sorted_keys: Vec<String> = all_keys.into_iter().collect();
                sorted_keys.sort();
                
                // Write headers if not written yet
                if !self.headers_written {
                    self.headers = sorted_keys.clone();
                    self.write_csv_row(&self.headers, &mut output);
                    self.headers_written = true;
                }
                
                // Write data row
                let mut row_values = Vec::new();
                for header in &self.headers {
                    let value = fields.get(header).cloned().unwrap_or_default();
                    row_values.push(value);
                }
                self.write_csv_row(&row_values, &mut output);
            }
        }
        
        Ok(output)
    }

    /// Flatten a JSON object into dot-notation keys with indexed arrays
    fn flatten_object(&self, prefix: &str, obj: &serde_json::Map<String, serde_json::Value>, result: &mut HashMap<String, String>) {
        for (key, value) in obj {
            let new_key = if prefix.is_empty() {
                key.clone()
            } else {
                format!("{}.{}", prefix, key)
            };
            
            match value {
                serde_json::Value::Object(nested) => {
                    self.flatten_object(&new_key, nested, result);
                }
                serde_json::Value::Array(arr) => {
                    // Flatten array with indexed keys: field.0, field.1, etc.
                    for (idx, item) in arr.iter().enumerate() {
                        let indexed_key = format!("{}.{}", new_key, idx);
                        match item {
                            serde_json::Value::Object(nested) => {
                                self.flatten_object(&indexed_key, nested, result);
                            }
                            serde_json::Value::String(s) => {
                                result.insert(indexed_key, s.clone());
                            }
                            serde_json::Value::Number(n) => {
                                result.insert(indexed_key, n.to_string());
                            }
                            serde_json::Value::Bool(b) => {
                                result.insert(indexed_key, b.to_string());
                            }
                            serde_json::Value::Null => {
                                result.insert(indexed_key, String::new());
                            }
                            serde_json::Value::Array(nested_arr) => {
                                // Nested arrays: serialize as JSON string
                                result.insert(indexed_key, serde_json::to_string(nested_arr).unwrap_or_default());
                            }
                        }
                    }
                }
                serde_json::Value::String(s) => {
                    result.insert(new_key, s.clone());
                }
                serde_json::Value::Number(n) => {
                    result.insert(new_key, n.to_string());
                }
                serde_json::Value::Bool(b) => {
                    result.insert(new_key, b.to_string());
                }
                serde_json::Value::Null => {
                    result.insert(new_key, String::new());
                }
            }
        }
    }

    /// Write a CSV row
    fn write_csv_row(&self, values: &[String], output: &mut Vec<u8>) {
        for (i, value) in values.iter().enumerate() {
            if i > 0 {
                output.push(b',');
            }
            
            // Quote and escape if necessary
            if value.contains(',') || value.contains('"') || value.contains('\n') {
                output.push(b'"');
                for ch in value.chars() {
                    if ch == '"' {
                        output.extend_from_slice(b"\"\"");
                    } else {
                        let mut buf = [0u8; 4];
                        let s = ch.encode_utf8(&mut buf);
                        output.extend_from_slice(s.as_bytes());
                    }
                }
                output.push(b'"');
            } else {
                output.extend_from_slice(value.as_bytes());
            }
        }
        output.push(b'\n');
    }

    pub fn finish(&mut self) -> Result<Vec<u8>> {
        Ok(Vec::new())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn writes_headers_and_rows_with_escaping() {
        let mut writer = CsvWriter::new();
        let json_line = r#"{"name":"Alice","note":"Hello, \"world\"","value":1}"#;
        let output = writer.process_json_line(json_line).unwrap();
        let output_str = String::from_utf8_lossy(&output);

        assert!(output_str.contains("name"));
        assert!(output_str.contains("\"Hello, \"\"world\"\"\""));
        assert!(writer.headers_written);
    }

    #[test]
    fn flattens_nested_objects_and_arrays() {
        let mut writer = CsvWriter::new();
        let json_line = r#"{"parent":{"child":"value"},"items":[{"id":1},{"id":2}],"tags":["a","b"]}"#;
        let output = writer.process_json_line(json_line).unwrap();
        let output_str = String::from_utf8_lossy(&output);

        assert!(output_str.contains("parent.child"));
        assert!(output_str.contains("items.0.id"));
        assert!(output_str.contains("tags.1"));
    }

    #[test]
    fn finish_returns_empty() {
        let mut writer = CsvWriter::new();
        let output = writer.finish().unwrap();
        assert!(output.is_empty());
    }
}
