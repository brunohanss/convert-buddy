use crate::error::Result;
use crate::json_parser::JsonParser;
use log::debug;
use memchr::memchr;

/// High-performance NDJSON (Newline Delimited JSON) parser
/// Uses memchr for fast line splitting and minimal allocations
pub struct NdjsonParser {
    json_parser: JsonParser,
    partial_line: Vec<u8>,
    output_buffer: Vec<u8>,
    chunk_target_bytes: usize,
}

impl NdjsonParser {
    pub fn new(chunk_target_bytes: usize) -> Self {
        Self {
            json_parser: JsonParser::new(),
            partial_line: Vec::new(),
            output_buffer: Vec::with_capacity(chunk_target_bytes),
            chunk_target_bytes,
        }
    }

    /// Process a chunk of NDJSON data
    /// Returns output bytes when buffer reaches target size
    pub fn push(&mut self, chunk: &[u8]) -> Result<Vec<u8>> {
        let mut output = Vec::new();

        // Combine with partial line if exists
        let input_data = if !self.partial_line.is_empty() {
            self.partial_line.extend_from_slice(chunk);
            self.partial_line.clone()
        } else {
            chunk.to_vec()
        };

        let mut start = 0;
        
        // Fast line splitting using memchr
        while let Some(pos) = memchr(b'\n', &input_data[start..]) {
            let line_end = start + pos;
            let line = &input_data[start..line_end];

            // Skip empty lines
            if !line.is_empty() && !line.iter().all(|&b| b.is_ascii_whitespace()) {
                self.process_line(line, &mut output)?;
            }

            start = line_end + 1;
        }

        // Handle remaining partial line
        self.partial_line.clear();
        if start < input_data.len() {
            self.partial_line.extend_from_slice(&input_data[start..]);
        }

        Ok(output)
    }

    /// Process a single JSON line
    fn process_line(&mut self, line: &[u8], output: &mut Vec<u8>) -> Result<()> {
        // Quick validation before full parse
        if !self.json_parser.quick_validate(line) {
            debug!("Skipping invalid JSON line");
            return Ok(());
        }

        // For NDJSON, we typically want to pass through or transform
        // For now, we'll validate and pass through
        #[cfg(feature = "simd")]
        {
            let mut mutable_line = line.to_vec();
            self.json_parser.parse_and_validate(&mut mutable_line)?;
            output.extend_from_slice(line);
        }
        
        #[cfg(not(feature = "simd"))]
        {
            self.json_parser.parse_and_validate(line)?;
            output.extend_from_slice(line);
        }
        
        output.push(b'\n');
        
        Ok(())
    }

    /// Finish processing and return any remaining buffered data
    pub fn finish(&mut self) -> Result<Vec<u8>> {
        let mut output = Vec::new();

        // Process any remaining partial line
        if !self.partial_line.is_empty() {
            let line = std::mem::take(&mut self.partial_line);
            if !line.iter().all(|&b| b.is_ascii_whitespace()) {
                self.process_line(&line, &mut output)?;
            }
        }

        // Flush output buffer
        if !self.output_buffer.is_empty() {
            output.append(&mut self.output_buffer);
        }

        Ok(output)
    }

    /// Get the current size of the partial line buffer
    pub fn partial_size(&self) -> usize {
        self.partial_line.len()
    }

    /// Convert NDJSON to JSON array
    pub fn to_json_array(&mut self, chunk: &[u8], is_first: bool, is_last: bool) -> Result<Vec<u8>> {
        let mut output = Vec::new();

        if is_first {
            output.push(b'[');
        }

        let mut first_item = is_first;

        // Combine with partial line if exists
        let input_data = if !self.partial_line.is_empty() {
            self.partial_line.extend_from_slice(chunk);
            self.partial_line.clone()
        } else {
            chunk.to_vec()
        };

        let mut start = 0;
        
        while let Some(pos) = memchr(b'\n', &input_data[start..]) {
            let line_end = start + pos;
            let line = &input_data[start..line_end];

            if !line.is_empty() && !line.iter().all(|&b| b.is_ascii_whitespace()) {
                if !first_item {
                    output.push(b',');
                }
                output.extend_from_slice(line);
                first_item = false;
            }

            start = line_end + 1;
        }

        // Handle remaining partial line
        self.partial_line.clear();
        if start < input_data.len() {
            self.partial_line.extend_from_slice(&input_data[start..]);
        }

        if is_last {
            // Process final partial line if exists
            if !self.partial_line.is_empty() {
                let line = std::mem::take(&mut self.partial_line);
                if !line.iter().all(|&b| b.is_ascii_whitespace()) {
                    if !first_item {
                        output.push(b',');
                    }
                    output.extend_from_slice(&line);
                }
            }
            output.push(b']');
        }

        Ok(output)
    }
}

impl Default for NdjsonParser {
    fn default() -> Self {
        Self::new(1024 * 1024) // 1MB default chunk target
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_ndjson_parsing() {
        let mut parser = NdjsonParser::new(1024);
        
        let input = b"{\"name\":\"Alice\"}\n{\"name\":\"Bob\"}\n";
        let result = parser.push(input).unwrap();
        
        assert!(!result.is_empty());
    }

    #[test]
    fn test_partial_line_handling() {
        let mut parser = NdjsonParser::new(1024);
        
        // First chunk with incomplete line
        let chunk1 = b"{\"name\":\"Ali";
        let _result1 = parser.push(chunk1).unwrap();
        
        // Second chunk completes the line
        let chunk2 = b"ce\"}\n";
        let result2 = parser.push(chunk2).unwrap();
        
        assert!(!result2.is_empty());
    }

    #[test]
    fn test_to_json_array() {
        let mut parser = NdjsonParser::new(1024);
        
        let input = b"{\"name\":\"Alice\"}\n{\"name\":\"Bob\"}\n";
        let result = parser.to_json_array(input, true, true).unwrap();
        
        let expected = b"[{\"name\":\"Alice\"},{\"name\":\"Bob\"}]";
        assert_eq!(result, expected);
    }

    #[test]
    fn test_skip_invalid_and_whitespace_lines() {
        let mut parser = NdjsonParser::new(1024);
        let input = b"\n   \noops\n{\"valid\":true}\n";
        let result = parser.push(input).unwrap();
        let output = String::from_utf8_lossy(&result);
        assert!(output.contains("{\"valid\":true}"));
        assert!(!output.contains("oops"));
    }

    #[test]
    fn test_to_json_array_partial_last() {
        let mut parser = NdjsonParser::new(1024);
        let input = b"{\"name\":\"Alice\"}\n{\"name\":\"Bob\"}";
        let result = parser.to_json_array(input, true, false).unwrap();
        let output = String::from_utf8_lossy(&result);
        assert!(output.starts_with('['));
        assert!(!output.ends_with(']'));
    }

    #[test]
    fn test_finish_flushes_output_buffer() {
        let mut parser = NdjsonParser::new(1024);
        parser.output_buffer.extend_from_slice(b"buffered");
        let output = parser.finish().unwrap();
        assert_eq!(output, b"buffered");
    }
}
