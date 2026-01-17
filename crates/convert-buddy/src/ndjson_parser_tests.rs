#[cfg(test)]
mod ndjson_parser_tests {
    use wasm_bindgen_test::*;
    use crate::ndjson_parser::NdjsonParser;

    #[wasm_bindgen_test]
    fn test_ndjson_parsing() {
        let mut parser = NdjsonParser::new(1024);
        
        let input = b"{\"name\":\"Alice\"}\n{\"name\":\"Bob\"}\n";
        let result = parser.push(input).unwrap();
        
        assert!(!result.is_empty());
    }

    #[wasm_bindgen_test]
    fn test_partial_line_handling() {
        let mut parser = NdjsonParser::new(1024);
        
        let chunk1 = b"{\"name\":\"Ali";
        let _result1 = parser.push(chunk1).unwrap();
        
        let chunk2 = b"ce\"}\n";
        let result2 = parser.push(chunk2).unwrap();
        
        assert!(!result2.is_empty());
    }

    #[wasm_bindgen_test]
    fn test_to_json_array() {
        let mut parser = NdjsonParser::new(1024);
        
        let input = b"{\"name\":\"Alice\"}\n{\"name\":\"Bob\"}\n";
        let result = parser.to_json_array(input, true, true).unwrap();
        
        let expected = b"[{\"name\":\"Alice\"},{\"name\":\"Bob\"}]";
        assert_eq!(result, expected);
    }

    #[wasm_bindgen_test]
    fn test_skip_invalid_and_whitespace_lines() {
        let mut parser = NdjsonParser::new(1024);
        let input = b"\n   \noops\n{\"valid\":true}\n";
        let result = parser.push(input).unwrap();
        let output = String::from_utf8_lossy(&result);
        assert!(output.contains("{\"valid\":true}"));
        assert!(!output.contains("oops"));
    }

    #[wasm_bindgen_test]
    fn test_to_json_array_partial_last() {
        let mut parser = NdjsonParser::new(1024);
        let input = b"{\"name\":\"Alice\"}\n{\"name\":\"Bob\"}";
        let result = parser.to_json_array(input, true, false).unwrap();
        let output = String::from_utf8_lossy(&result);
        assert!(output.starts_with('['));
        assert!(!output.ends_with(']'));
    }

    #[wasm_bindgen_test]
    fn test_finish_behavior() {
        let mut parser = NdjsonParser::new(1024);
        let input = b"{\"test\":true}";
        let result = parser.push(input).unwrap();
        
        let final_output = parser.finish().unwrap();
        let combined = [result, final_output].concat();
        
        assert!(!combined.is_empty());
    }
}
