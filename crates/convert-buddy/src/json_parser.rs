use crate::error::{ConvertError, Result};
use log::debug;

/// JSON parser that uses high-performance parsing when available
pub struct JsonParser {
    use_simd: bool,
}

impl JsonParser {
    pub fn new() -> Self {
        // Check if simd-json feature is enabled
        let use_simd = cfg!(feature = "simd");
        if use_simd {
            debug!("JsonParser: using simd-json (high-performance mode)");
        } else {
            debug!("JsonParser: using serde_json (portable mode)");
        }
        
        Self { use_simd }
    }

    /// Parse JSON bytes and validate structure
    /// Returns the parsed JSON as bytes (for zero-copy streaming)
    #[cfg(feature = "simd")]
    pub fn parse_and_validate(&self, data: &mut [u8]) -> Result<()> {
        // Mode B: High-performance simd-json
        simd_json::to_borrowed_value(data)
            .map_err(|e| ConvertError::JsonParse(e.to_string()))?;
        Ok(())
    }

    #[cfg(not(feature = "simd"))]
    pub fn parse_and_validate(&self, data: &[u8]) -> Result<()> {
        // Mode A: Portable serde_json
        serde_json::from_slice::<serde_json::Value>(data)
            .map_err(|e| ConvertError::JsonParse(e.to_string()))?;
        Ok(())
    }

    /// Parse JSON and convert to minified bytes (removes whitespace)
    #[cfg(feature = "simd")]
    pub fn parse_and_minify(&self, data: &mut [u8]) -> Result<Vec<u8>> {
        let capacity = data.len();
        let value = simd_json::to_borrowed_value(data)
            .map_err(|e| ConvertError::JsonParse(e.to_string()))?;
        
        let mut output = Vec::with_capacity(capacity);
        simd_json::to_writer(&mut output, &value)
            .map_err(|e| ConvertError::JsonParse(e.to_string()))?;
        
        Ok(output)
    }

    #[cfg(not(feature = "simd"))]
    pub fn parse_and_minify(&self, data: &[u8]) -> Result<Vec<u8>> {
        let value: serde_json::Value = serde_json::from_slice(data)
            .map_err(|e| ConvertError::JsonParse(e.to_string()))?;
        
        let mut output = Vec::with_capacity(data.len());
        serde_json::to_writer(&mut output, &value)
            .map_err(|e| ConvertError::JsonParse(e.to_string()))?;
        
        Ok(output)
    }

    /// Parse JSON and convert to pretty-printed bytes
    #[cfg(feature = "simd")]
    pub fn parse_and_prettify(&self, data: &mut [u8]) -> Result<Vec<u8>> {
        let capacity = data.len() * 2;
        let value = simd_json::to_borrowed_value(data)
            .map_err(|e| ConvertError::JsonParse(e.to_string()))?;
        
        let mut output = Vec::with_capacity(capacity);
        simd_json::to_writer_pretty(&mut output, &value)
            .map_err(|e| ConvertError::JsonParse(e.to_string()))?;
        
        Ok(output)
    }

    #[cfg(not(feature = "simd"))]
    pub fn parse_and_prettify(&self, data: &[u8]) -> Result<Vec<u8>> {
        let value: serde_json::Value = serde_json::from_slice(data)
            .map_err(|e| ConvertError::JsonParse(e.to_string()))?;
        
        let mut output = Vec::with_capacity(data.len() * 2);
        serde_json::to_writer_pretty(&mut output, &value)
            .map_err(|e| ConvertError::JsonParse(e.to_string()))?;
        
        Ok(output)
    }

    /// Check if a byte slice is likely valid JSON (fast heuristic check)
    pub fn quick_validate(&self, data: &[u8]) -> bool {
        if data.is_empty() {
            return false;
        }

        // Trim whitespace
        let trimmed = data.iter()
            .position(|&b| !matches!(b, b' ' | b'\t' | b'\n' | b'\r'))
            .and_then(|start| {
                data.iter()
                    .rposition(|&b| !matches!(b, b' ' | b'\t' | b'\n' | b'\r'))
                    .map(|end| &data[start..=end])
            });

        if let Some(trimmed) = trimmed {
            // Check if it starts with valid JSON markers
            matches!(trimmed[0], b'{' | b'[' | b'"' | b't' | b'f' | b'n' | b'-' | b'0'..=b'9')
        } else {
            false
        }
    }
}

impl Default for JsonParser {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_quick_validate() {
        let parser = JsonParser::new();
        
        assert!(parser.quick_validate(b"{\"key\": \"value\"}"));
        assert!(parser.quick_validate(b"[1, 2, 3]"));
        assert!(parser.quick_validate(b"\"string\""));
        assert!(parser.quick_validate(b"true"));
        assert!(parser.quick_validate(b"false"));
        assert!(parser.quick_validate(b"null"));
        assert!(parser.quick_validate(b"123"));
        assert!(parser.quick_validate(b"  {\"key\": \"value\"}  "));
        
        assert!(!parser.quick_validate(b""));
        assert!(!parser.quick_validate(b"   "));
    }

    #[test]
    fn test_parse_and_minify_and_prettify() {
        let parser = JsonParser::new();
        let data = br#" { "a": 1, "b": [true, false] } "#;

        let minified = parser.parse_and_minify(data).unwrap();
        assert_eq!(String::from_utf8_lossy(&minified), r#"{"a":1,"b":[true,false]}"#);

        let pretty = parser.parse_and_prettify(data).unwrap();
        let pretty_str = String::from_utf8_lossy(&pretty);
        assert!(pretty_str.contains("\n"));
        assert!(pretty_str.contains("\"a\""));
    }

    #[test]
    fn test_parse_and_validate_errors() {
        let parser = JsonParser::new();
        let invalid = br#"{ "a": "#;
        let result = parser.parse_and_validate(invalid);
        assert!(result.is_err());
    }
}
