use crate::error::Result;
use crate::buffer_pool::BufferPool;
use memchr::memchr;
use std::io::Write;

#[cfg(feature = "threads")]
use rayon::prelude::*;

// Thread-local buffer pool for reduced allocations
thread_local! {
    static BUFFER_POOL: BufferPool = BufferPool::default();
}

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

/// High-performance CSV parser with:
/// - Fast path for unquoted fields
/// - Quoted path for fields with quotes/escapes
/// - Speculative parsing for performance
/// - Buffer pooling to reduce allocations
pub struct CsvParser {
    config: CsvConfig,
    partial_line: Vec<u8>,
    headers: Option<Vec<String>>,
    output_buffer: Vec<u8>,
    chunk_target_bytes: usize,
    record_count: usize,
    // Speculative parsing: assume no quotes initially
    speculative_mode: bool,
}

impl CsvParser {
    pub fn new(config: CsvConfig, chunk_target_bytes: usize) -> Self {
        Self {
            config,
            partial_line: Vec::new(),
            speculative_mode: true, // Start with optimistic assumption
            headers: None,
            output_buffer: Vec::with_capacity(chunk_target_bytes),
            chunk_target_bytes,
            record_count: 0,
        }
    }

    /// Uses buffer pooling and speculative parsing for optimal performance
    pub fn push_to_ndjson(&mut self, chunk: &[u8]) -> Result<Vec<u8>> {
        // Use pooled buffer for output
        let estimated_size = if self.partial_line.is_empty() {
            (chunk.len() as f64 * 1.3) as usize
        } else {
            ((self.partial_line.len() + chunk.len()) as f64 * 1.3) as usize
        };
        
        let mut output = BUFFER_POOL.with(|pool: &BufferPool| pool.acquire_with_capacity(estimated_size));

        // Handle partial line by creating a temporary buffer
        let mut temp_buffer = Vec::new();
        let input_data: &[u8] = if !self.partial_line.is_empty() {
            temp_buffer.extend_from_slice(&self.partial_line);
            temp_buffer.extend_from_slice(chunk);
            &temp_buffer
        } else {
            chunk
        };

        let mut start = 0;
        
        // Process line by line
        while let Some(line_end) = self.find_line_end(&input_data[start..]) {
            let line = &input_data[start..start + line_end];
            
            // Skip empty lines and whitespace-only lines
            if !line.is_empty() && !line.iter().all(|&b| b.is_ascii_whitespace()) {
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

    /// Process a chunk of CSV data and convert to NDJSON using parallel processing
    /// This method splits large inputs into chunks and processes them in parallel
    #[cfg(feature = "threads")]
    pub fn push_to_ndjson_parallel(&mut self, chunk: &[u8]) -> Result<Vec<u8>> {
        // For small chunks, use sequential processing
        if chunk.len() < 64 * 1024 { // 64KB threshold
            return self.push_to_ndjson(chunk);
        }

        // Pre-allocate output buffer based on input size heuristic
        let estimated_size = if self.partial_line.is_empty() {
            (chunk.len() as f64 * 1.3) as usize
        } else {
            ((self.partial_line.len() + chunk.len()) as f64 * 1.3) as usize
        };

        // Handle partial line by creating a temporary buffer
        let mut temp_buffer = Vec::new();
        let input_data: &[u8] = if !self.partial_line.is_empty() {
            temp_buffer.extend_from_slice(&self.partial_line);
            temp_buffer.extend_from_slice(chunk);
            &temp_buffer
        } else {
            chunk
        };

        // Find all line boundaries first
        let mut line_starts = Vec::new();
        let mut line_ends = Vec::new();
        let mut start = 0;
        
        while let Some(line_end) = self.find_line_end(&input_data[start..]) {
            let absolute_end = start + line_end;
            if absolute_end > start {
                line_starts.push(start);
                line_ends.push(absolute_end);
            }
            start = absolute_end + 1;
        }

        // Process headers sequentially if needed
        let mut output = Vec::with_capacity(estimated_size);
        let mut process_start = 0;

        if self.config.has_headers && self.headers.is_none() && !line_starts.is_empty() {
            // Process first line as headers
            let header_line = &input_data[line_starts[0]..line_ends[0]];
            let fields = self.parse_fields(header_line)?;
            self.headers = Some(
                fields
                    .iter()
                    .map(|f| String::from_utf8_lossy(f).to_string())
                    .collect()
            );
            process_start = 1;
        }

        if line_starts.len() > process_start {
            // Process remaining lines in parallel
            let lines: Vec<_> = line_starts[process_start..]
                .iter()
                .zip(line_ends[process_start..].iter())
                .filter(|(start, end)| {
                    **end > **start &&
                    // Skip whitespace-only lines
                    !input_data[**start..**end].iter().all(|&b| b.is_ascii_whitespace())
                })
                .map(|(start, end)| &input_data[*start..*end])
                .collect();

            if lines.len() > 1 {
                // Parallel processing using contiguous per-thread ranges to reduce synchronization.
                let num_threads = rayon::current_num_threads();
                let mut ranges: Vec<(usize, usize)> = Vec::with_capacity(num_threads);
                let total = input_data.len();

                // Compute approximate chunk size and then adjust to line boundaries
                let mut start_idx = 0usize;
                for t in 0..num_threads {
                    let mut end_idx = if t + 1 == num_threads {
                        total
                    } else {
                        ((total as f64) * ((t + 1) as f64) / (num_threads as f64)) as usize
                    };
                    // Move end_idx forward until a newline or EOF so each range ends at a safe boundary
                    while end_idx < total && input_data[end_idx] != b'\n' {
                        end_idx += 1;
                    }
                    if end_idx > total { end_idx = total; }
                    ranges.push((start_idx, end_idx));
                    start_idx = end_idx + 1; // next range starts after newline
                    if start_idx >= total { break; }
                }

                if ranges.is_empty() {
                    // Fallback to sequential processing
                    for line in lines {
                        // Skip whitespace-only lines
                        if !line.iter().all(|&b| b.is_ascii_whitespace()) {
                            self.process_csv_line(line, &mut output)?;
                        }
                    }
                } else {
                    // Prepare config and headers for workers
                    let config_clone = self.config.clone();
                    let headers_clone = self.headers.clone();

                    let parallel_results: Result<Vec<Vec<u8>>> = ranges
                        .into_par_iter()
                        .map(|(s, e)| {
                            if s >= e || s >= input_data.len() { return Ok(Vec::new()); }
                            let slice = &input_data[s..e];
                            // Split into lines within the slice
                            let mut local_output = Vec::new();
                            let mut local_start = 0usize;
                            while let Some(pos) = memchr(b'\n', &slice[local_start..]) {
                                let line_end = local_start + pos;
                                let line = &slice[local_start..line_end];
                                if !line.is_empty() && !line.iter().all(|&b| b.is_ascii_whitespace()) {
                                    // Parse fields (fast or quoted) using local config
                                    let fields = CsvParser::parse_fields_static(&config_clone, line);
                                    // Convert fields to JSON into local_output
                                    CsvParser::fields_to_json_static(&headers_clone, &fields, &mut local_output);
                                    local_output.push(b'\n');
                                }
                                local_start = line_end + 1;
                            }
                            Ok(local_output)
                        })
                        .collect();

                    for part in parallel_results? {
                        if !part.is_empty() {
                            output.extend_from_slice(&part);
                            // estimate record count from newlines
                            self.record_count += bytecount::count(&part, b'\n');
                        }
                    }
                }
            } else if lines.len() == 1 {
                // Single line, process sequentially
                let line = lines[0];
                self.process_csv_line(line, &mut output)?;
            }
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

    /// Parse CSV fields with speculative fast path optimization
    /// Assumes no quotes initially, falls back to full parser if needed
    fn parse_fields(&mut self, line: &[u8]) -> Result<Vec<Vec<u8>>> {
        // Speculative parsing: try fast path first if in speculative mode
        if self.speculative_mode {
            let has_quotes = memchr(self.config.quote, line).is_some();
            
            if !has_quotes {
                // Fast path: no quotes, simple delimiter splitting
                return Ok(self.parse_fields_fast(line));
            } else {
                // Detected quotes, switch to conservative mode for future lines
                self.speculative_mode = false;
            }
        } else {
            // Check if we can switch back to speculative mode
            let has_quotes = memchr(self.config.quote, line).is_some();
            if !has_quotes {
                return Ok(self.parse_fields_fast(line));
            }
        }

        // Quoted path: state machine for complex CSV
        let mut fields = Vec::new();
        let mut field = Vec::new();
        let mut pos = 0;
        let mut in_quotes = false;


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
                fields.push(self.finalize_field(&field));
                field = Vec::new();
            } else {
                field.push(byte);
            }

            pos += 1;
        }

        // Add last field
        fields.push(self.finalize_field(&field));

        Ok(fields)
    }

    /// Static variant of parse_fields that doesn't require &mut self, used by parallel workers
    fn parse_fields_static(config: &CsvConfig, line: &[u8]) -> Vec<Vec<u8>> {
        // Fast check for quotes
        let has_quotes = memchr(config.quote, line).is_some();
        if !has_quotes {
            // Fast path
            let mut fields = Vec::new();
            let mut start = 0usize;
            while let Some(pos) = memchr(config.delimiter, &line[start..]) {
                let field = &line[start..start + pos];
                fields.push(field.to_vec());
                start += pos + 1;
            }
            if start <= line.len() {
                fields.push(line[start..].to_vec());
            }
            return fields;
        }

        // Quoted path
        let mut fields: Vec<Vec<u8>> = Vec::new();
        let mut field: Vec<u8> = Vec::new();
        let mut pos = 0usize;
        let mut in_quotes = false;

        while pos < line.len() {
            let byte = line[pos];
            if byte == config.quote {
                if in_quotes {
                    if let Some(escape) = config.escape {
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
            } else if byte == config.delimiter && !in_quotes {
                fields.push(field);
                field = Vec::new();
            } else {
                field.push(byte);
            }
            pos += 1;
        }

        fields.push(field);
        fields
    }

    /// Static fields_to_json used by parallel workers. Writes JSON object bytes into output.
    fn fields_to_json_static(headers: &Option<Vec<String>>, fields: &[Vec<u8>], output: &mut Vec<u8>) {
        output.push(b'{');
        for (i, field) in fields.iter().enumerate() {
            if i > 0 { output.push(b','); }
            output.push(b'"');
            if let Some(hdrs) = headers {
                if i < hdrs.len() {
                    output.extend_from_slice(hdrs[i].as_bytes());
                } else {
                    write!(output, "field_{}", i).ok();
                }
            } else {
                write!(output, "field_{}", i).ok();
            }
            output.extend_from_slice(b"\":\"");

            // Escape field bytes
            for &byte in field.iter() {
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
            output.push(b'"');
        }
        output.push(b'}');
    }

    /// Fast path: parse unquoted CSV fields
    fn parse_fields_fast(&self, line: &[u8]) -> Vec<Vec<u8>> {
        let mut fields = Vec::new();
        let mut start = 0;

        while let Some(pos) = memchr(self.config.delimiter, &line[start..]) {
            let field = &line[start..start + pos];
            fields.push(self.finalize_field(field));
            start += pos + 1;
        }

        // Add last field
        if start <= line.len() {
            fields.push(self.finalize_field(&line[start..]));
        }

        fields
    }

    /// Finalize a field (trim if configured)
    fn finalize_field(&self, field: &[u8]) -> Vec<u8> {
        if self.config.trim_whitespace {
            // Trim leading whitespace
            let mut start = 0;
            while start < field.len() && (field[start] == b' ' || field[start] == b'\t') {
                start += 1;
            }
            // Trim trailing whitespace
            let mut end = field.len();
            while end > start && (field[end - 1] == b' ' || field[end - 1] == b'\t') {
                end -= 1;
            }
            field[start..end].to_vec()
        } else {
            field.to_vec()
        }
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

    /// Escape a string for JSON using optimized approach
    fn escape_json_string(&self, input: &[u8], output: &mut Vec<u8>) {
        // Fast path: check if any escaping is needed
        let needs_escape = input.iter().any(|&b| matches!(b, b'"' | b'\\' | b'\n' | b'\r' | b'\t' | b'\x08' | b'\x0C'));
        
        if !needs_escape {
            // Fast path: no escaping needed, copy directly
            output.extend_from_slice(input);
            return;
        }
        
        // Slow path: escape character by character
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

    #[test]
    fn test_trim_whitespace_and_missing_headers() {
        let mut config = CsvConfig::default();
        config.has_headers = false;
        config.trim_whitespace = true;
        let mut parser = CsvParser::new(config, 1024);

        let input = b" Alice , 30 \n";
        let result = parser.push_to_ndjson(input).unwrap();
        let output = String::from_utf8_lossy(&result);

        assert!(output.contains("\"field_0\":\"Alice\""));
        assert!(output.contains("\"field_1\":\"30\""));
    }

    #[test]
    fn test_quoted_fields_with_escapes_and_newlines() {
        let config = CsvConfig::default();
        let mut parser = CsvParser::new(config, 1024);

        let input = b"name,quote\r\n\"Alice\",\"She said \"\"Hi\"\"\"\r\n";
        let result = parser.push_to_ndjson(input).unwrap();
        let output = String::from_utf8_lossy(&result);

        assert!(output.contains("She said \\\"Hi\\\""));
        assert!(parser.partial_size() == 0);
    }

    #[test]
    fn test_partial_line_and_finish() {
        let config = CsvConfig::default();
        let mut parser = CsvParser::new(config, 1024);

        let chunk = b"name,age\nAlice,30";
        let result = parser.push_to_ndjson(chunk).unwrap();
        assert!(result.is_empty());
        assert!(parser.partial_size() > 0);

        let remaining = parser.finish().unwrap();
        let output = String::from_utf8_lossy(&remaining);
        assert!(output.contains("Alice"));
    }
}
