use crate::error::Result;
use memchr::memchr;
use std::io::Write;

/// CSV parser configuration
#[derive(Debug, Clone)]
pub struct CsvConfig {
    pub delimiter: u8,
    pub quote: u8,
    pub escape: Option<u8>,
    pub has_headers: bool,
    pub trim_whitespace: bool,
}

impl Default for CsvConfig {
    fn default() -> Self {
        Self {
            delimiter: b',',
            quote: b'"',
            escape: Some(b'"'), // RFC 4180: double quote escapes quote
            has_headers: true,
            trim_whitespace: false,
        }
    }
}

/// High-performance CSV parser with two-tier approach:
/// - Fast path for unquoted fields
/// - Quoted path for fields with quotes/escapes
pub struct CsvParser {
    config: CsvConfig,
    partial_line: Vec<u8>,
    headers: Option<Vec<String>>,
    output_buffer: Vec<u8>,
    chunk_target_bytes: usize,
    record_count: usize,
}

impl CsvParser {
    pub fn new(config: CsvConfig, chunk_target_bytes: usize) -> Self {
        Self {
            config,
            partial_line: Vec::new(),
            headers: None,
            output_buffer: Vec::with_capacity(chunk_target_bytes),
            chunk_target_bytes,
            record_count: 0,
        }
    }

    /// Process a chunk of CSV data and convert to NDJSON
    pub fn push_to_ndjson(&mut self, chunk: &[u8]) -> Result<Vec<u8>> {
        let mut output = Vec::new();

        // Combine with partial line if exists
        let input_data = if !self.partial_line.is_empty() {
            self.partial_line.extend_from_slice(chunk);
            self.partial_line.clone()
        } else {
            chunk.to_vec()
        };

        let mut start = 0;
        
        // Process line by line
        while let Some(line_end) = self.find_line_end(&input_data[start..]) {
            let line = &input_data[start..start + line_end];
            
            if !line.is_empty() {
                self.process_csv_line(line, &mut output)?;
            }
            
            start += line_end + 1; // +1 for newline
        }

        // Store remaining partial line
        self.partial_line.clear();
        if start < input_data.len() {
            self.partial_line.extend_from_slice(&input_data[start..]);
        }

        Ok(output)
    }

    /// Find the end of a CSV line (handles quoted newlines)
    fn find_line_end(&self, data: &[u8]) -> Option<usize> {
        let mut pos = 0;
        let mut in_quotes = false;

        while pos < data.len() {
            let byte = data[pos];

            if byte == self.config.quote {
                // Check for escaped quote
                if let Some(escape) = self.config.escape {
                    if pos + 1 < data.len() && data[pos + 1] == escape {
                        pos += 2; // Skip escaped quote
                        continue;
                    }
                }
                in_quotes = !in_quotes;
            } else if byte == b'\n' && !in_quotes {
                return Some(pos);
            } else if byte == b'\r' && !in_quotes {
                // Handle \r\n
                if pos + 1 < data.len() && data[pos + 1] == b'\n' {
                    return Some(pos);
                }
                return Some(pos);
            }

            pos += 1;
        }

        None
    }

    /// Process a single CSV line and convert to NDJSON
    fn process_csv_line(&mut self, line: &[u8], output: &mut Vec<u8>) -> Result<()> {
        // Parse fields using fast or quoted path
        let fields = self.parse_fields(line)?;

        // Handle headers
        if self.config.has_headers && self.headers.is_none() {
            self.headers = Some(
                fields
                    .iter()
                    .map(|f| String::from_utf8_lossy(f).to_string())
                    .collect()
            );
            return Ok(());
        }

        // Convert to JSON object
        self.fields_to_json(&fields, output)?;
        output.push(b'\n');
        
        self.record_count += 1;
        Ok(())
    }

    /// Parse CSV fields with fast path optimization
    fn parse_fields(&self, line: &[u8]) -> Result<Vec<Vec<u8>>> {
        let mut fields = Vec::new();
        let mut field = Vec::new();
        let mut pos = 0;
        let mut in_quotes = false;

        // Quick check: does this line contain any quotes?
        let has_quotes = memchr(self.config.quote, line).is_some();

        if !has_quotes {
            // Fast path: no quotes, simple delimiter splitting
            return Ok(self.parse_fields_fast(line));
        }

        // Quoted path: state machine
        while pos < line.len() {
            let byte = line[pos];

            if byte == self.config.quote {
                if in_quotes {
                    // Check for escaped quote
                    if let Some(escape) = self.config.escape {
                        if pos + 1 < line.len() && line[pos + 1] == escape {
                            field.push(escape);
                            pos += 2;
                            continue;
                        }
                    }
                    in_quotes = false;
                } else {
                    in_quotes = true;
                }
            } else if byte == self.config.delimiter && !in_quotes {
                fields.push(self.finalize_field(field));
                field = Vec::new();
            } else {
                field.push(byte);
            }

            pos += 1;
        }

        // Add last field
        fields.push(self.finalize_field(field));

        Ok(fields)
    }

    /// Fast path: parse unquoted CSV fields
    fn parse_fields_fast(&self, line: &[u8]) -> Vec<Vec<u8>> {
        let mut fields = Vec::new();
        let mut start = 0;

        while let Some(pos) = memchr(self.config.delimiter, &line[start..]) {
            let field = &line[start..start + pos];
            fields.push(self.finalize_field(field.to_vec()));
            start += pos + 1;
        }

        // Add last field
        if start <= line.len() {
            fields.push(self.finalize_field(line[start..].to_vec()));
        }

        fields
    }

    /// Finalize a field (trim if configured)
    fn finalize_field(&self, mut field: Vec<u8>) -> Vec<u8> {
        if self.config.trim_whitespace {
            // Trim leading whitespace
            while field.first() == Some(&b' ') || field.first() == Some(&b'\t') {
                field.remove(0);
            }
            // Trim trailing whitespace
            while field.last() == Some(&b' ') || field.last() == Some(&b'\t') {
                field.pop();
            }
        }
        field
    }

    /// Convert fields to JSON object
    fn fields_to_json(&self, fields: &[Vec<u8>], output: &mut Vec<u8>) -> Result<()> {
        output.push(b'{');

        let headers = self.headers.as_ref();
        let _field_count = fields.len();

        for (i, field) in fields.iter().enumerate() {
            if i > 0 {
                output.push(b',');
            }

            // Write key
            output.push(b'"');
            if let Some(headers) = headers {
                if i < headers.len() {
                    output.extend_from_slice(headers[i].as_bytes());
                } else {
                    write!(output, "field_{}", i).unwrap();
                }
            } else {
                write!(output, "field_{}", i).unwrap();
            }
            output.extend_from_slice(b"\":");

            // Write value (always as string for safety)
            output.push(b'"');
            self.escape_json_string(field, output);
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

        // Process any remaining partial line
        if !self.partial_line.is_empty() {
            let line = std::mem::take(&mut self.partial_line);
            self.process_csv_line(&line, &mut output)?;
        }

        Ok(output)
    }

    pub fn partial_size(&self) -> usize {
        self.partial_line.len()
    }

    pub fn record_count(&self) -> usize {
        self.record_count
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_simple_csv() {
        let config = CsvConfig::default();
        let mut parser = CsvParser::new(config, 1024);

        let input = b"name,age\nAlice,30\nBob,25\n";
        let result = parser.push_to_ndjson(input).unwrap();

        assert!(result.contains(&b'{'));
        assert!(parser.record_count() == 2);
    }

    #[test]
    fn test_quoted_csv() {
        let config = CsvConfig::default();
        let mut parser = CsvParser::new(config, 1024);

        let input = b"name,description\n\"Alice\",\"Hello, World\"\n";
        let result = parser.push_to_ndjson(input).unwrap();

        assert!(result.contains(&b'{'));
    }

    #[test]
    fn test_fast_path() {
        let config = CsvConfig::default();
        let parser = CsvParser::new(config, 1024);

        let line = b"Alice,30,Engineer";
        let fields = parser.parse_fields_fast(line);

        assert_eq!(fields.len(), 3);
        assert_eq!(fields[0], b"Alice");
        assert_eq!(fields[1], b"30");
        assert_eq!(fields[2], b"Engineer");
    }
}
