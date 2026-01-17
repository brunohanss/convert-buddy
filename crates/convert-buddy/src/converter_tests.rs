#[cfg(test)]
mod converter_tests {
    use wasm_bindgen_test::*;
    use crate::{detect_format, get_simd_enabled};

    #[wasm_bindgen_test]
    fn test_detect_format_json() {
        let result = detect_format(br#"{"a":1}"#);
        assert_eq!(result, Some("json".to_string()));
    }

    #[wasm_bindgen_test]
    fn test_detect_format_ndjson() {
        let result = detect_format(b"{\"a\":1}\n{\"b\":2}\n");
        assert_eq!(result, Some("ndjson".to_string()));
    }

    #[wasm_bindgen_test]
    fn test_detect_format_csv() {
        let result = detect_format(b"name,age\nAlice,30\n");
        assert_eq!(result, Some("csv".to_string()));
    }

    #[wasm_bindgen_test]
    fn test_detect_format_xml() {
        let result = detect_format(b"<root><item>test</item></root>");
        assert_eq!(result, Some("xml".to_string()));
    }

    #[wasm_bindgen_test]
    fn test_detect_format_unknown() {
        let result = detect_format(b"xyz123!@#");
        // Unknown format returns None
        assert!(result.is_none() || result == Some("unknown".to_string()));
    }

    #[wasm_bindgen_test]
    fn test_simd_flag_disabled() {
        // SIMD is disabled by default in wasm32 target
        assert!(!get_simd_enabled());
    }

    #[wasm_bindgen_test]
    fn test_detect_json_object() {
        let result = detect_format(br#"{"name":"Alice","age":30}"#);
        assert_eq!(result, Some("json".to_string()));
    }

    #[wasm_bindgen_test]
    fn test_detect_json_array() {
        let result = detect_format(b"[1,2,3]");
        assert_eq!(result, Some("json".to_string()));
    }
}
