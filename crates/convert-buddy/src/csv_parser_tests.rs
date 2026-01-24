#[cfg(test)]
mod csv_parser_tests {
    use wasm_bindgen_test::*;
    use crate::csv_parser::{CsvParser, CsvConfig};

    #[wasm_bindgen_test]
    fn test_simple_csv() {
        let config = CsvConfig::default();
        let mut parser = CsvParser::new(config, 1024);

        let input = b"name,age\nAlice,30\nBob,25\n";
        let result = parser.push_to_ndjson(input).unwrap();

        assert!(!result.is_empty());
        let output = String::from_utf8_lossy(&result);
        assert!(output.contains("Alice") || output.contains("Bob"));
    }

    #[wasm_bindgen_test]
    fn test_quoted_csv() {
        let config = CsvConfig::default();
        let mut parser = CsvParser::new(config, 1024);

        let input = b"name,description\n\"Alice\",\"Hello, World\"\n";
        let result = parser.push_to_ndjson(input).unwrap();

        assert!(!result.is_empty());
    }

    #[wasm_bindgen_test]
    fn test_multiple_records() {
        let config = CsvConfig::default();
        let mut parser = CsvParser::new(config, 1024);

        let input = b"name,age\nAlice,30\nBob,25\nCharlie,35\n";
        let result = parser.push_to_ndjson(input).unwrap();

        let output = String::from_utf8_lossy(&result);
        assert!(output.contains("Alice"));
        assert!(output.contains("Bob"));
    }

    #[wasm_bindgen_test]
    fn test_trim_whitespace_and_missing_headers() {
        let mut config = CsvConfig::default();
        config.has_headers = false;
        config.trim_whitespace = true;
        let mut parser = CsvParser::new(config, 1024);

        let input = b" Alice , 30 \n";
        let result = parser.push_to_ndjson(input).unwrap();
        let output = String::from_utf8_lossy(&result);

        assert!(output.contains("Alice"));
    }

    #[wasm_bindgen_test]
    fn test_quoted_fields_with_escapes() {
        let config = CsvConfig::default();
        let mut parser = CsvParser::new(config, 1024);

        let input = b"name,quote\r\n\"Alice\",\"She said \"\"Hi\"\"\"\r\n";
        let result = parser.push_to_ndjson(input).unwrap();
        let output = String::from_utf8_lossy(&result);

        assert!(output.contains("Alice"));
    }

    #[wasm_bindgen_test]
    fn test_backslash_escaped_quotes() {
        let config = CsvConfig::default();
        let mut parser = CsvParser::new(config, 1024);

        // Test backslash-escaped quotes
        let input = b"name,quote\n\"Gorwin \\\"Grog\\\" Oakenshield\",\"Value\"\n";
        let result = parser.push_to_ndjson(input).unwrap();
        let output = String::from_utf8_lossy(&result);

        // The output should preserve the quoted content with the inner escaped quotes
        assert!(output.contains("Gorwin"));
        assert!(output.contains("Grog"));
        assert!(output.contains("Oakenshield"));
    }

    #[wasm_bindgen_test]
    fn test_backslash_escaped_quotes_with_special_chars() {
        let config = CsvConfig::default();
        let mut parser = CsvParser::new(config, 1024);

        // Test backslash-escaped special characters: \n, \r, \t, \\
        let input = b"name,value\n\"test\\nline\",\"value\"\n";
        let result = parser.push_to_ndjson(input).unwrap();
        let output = String::from_utf8_lossy(&result);

        assert!(output.contains("test") && output.contains("line"));
    }

    #[wasm_bindgen_test]
    fn test_partial_line_and_finish() {
        let config = CsvConfig::default();
        let mut parser = CsvParser::new(config, 1024);

        let chunk = b"name,age\nAlice,30";
        let result = parser.push_to_ndjson(chunk).unwrap();
        
        let final_output = parser.finish().unwrap();
        let combined = [result, final_output].concat();
        let output = String::from_utf8_lossy(&combined);
        
        assert!(output.contains("Alice"));
    }
}
