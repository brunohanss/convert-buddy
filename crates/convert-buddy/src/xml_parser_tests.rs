#[cfg(test)]
mod xml_parser_tests {
    use wasm_bindgen_test::*;
    use crate::xml_parser::{XmlParser, XmlConfig, XmlWriter};

    #[wasm_bindgen_test]
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

    #[wasm_bindgen_test]
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

    #[wasm_bindgen_test]
    fn test_xml_repeated_elements_as_array() {
        let config = XmlConfig {
            record_element: "row".to_string(),
            include_attributes: false,
            ..Default::default()
        };
        let mut parser = XmlParser::new(config, 1024);

        let input = b"<root><row><tag>one</tag><tag>two</tag></row></root>";
        let result = parser.push_to_ndjson(input).unwrap();
        let output = String::from_utf8_lossy(&result);

        assert!(output.contains("["));
        assert!(output.contains("one"));
        assert!(output.contains("two"));
    }

    #[wasm_bindgen_test]
    fn test_xml_finish_with_partial_buffer() {
        let config = XmlConfig {
            record_element: "row".to_string(),
            ..Default::default()
        };
        let mut parser = XmlParser::new(config, 1024);

        let input = b"<root><row><name>Alice</name></row></root>";
        let output = parser.push_to_ndjson(input).unwrap();
        let output_str = String::from_utf8_lossy(&output);
        assert!(output_str.contains("Alice"));

        let remaining = parser.finish().unwrap();
        assert!(remaining.is_empty());
        assert!(parser.partial_size() == 0);
    }

    #[wasm_bindgen_test]
    fn test_xml_rss_like_structure() {
        let config = XmlConfig {
            record_element: "item".to_string(),
            include_attributes: false,
            ..Default::default()
        };
        let mut parser = XmlParser::new(config, 1024);

        let input = br#"<?xml version="1.0"?>
<rss version="2.0">
  <channel>
    <title>Test Feed</title>
    <item>
      <id>1</id>
      <title>Article 1</title>
    </item>
    <item>
      <id>2</id>
      <title>Article 2</title>
    </item>
  </channel>
</rss>"#;

        let result = parser.push_to_ndjson(input).unwrap();
        let output_str = String::from_utf8_lossy(&result);
        
        assert_eq!(output_str.matches('\n').count(), 2);
        assert!(output_str.contains("Article 1"));
        assert!(output_str.contains("Article 2"));
        assert!(!output_str.contains("<?xml"));
        assert!(!output_str.contains("Test Feed"));
        assert_eq!(parser.record_count(), 2);
    }

    #[wasm_bindgen_test]
    fn test_xml_streaming_with_chunks() {
        let config = XmlConfig {
            record_element: "item".to_string(),
            include_attributes: false,
            ..Default::default()
        };
        let mut parser = XmlParser::new(config, 1024);

        let xml_content = br#"<?xml version="1.0"?>
<rss xmlns:g="http://example.com/ns/1.0" version="2.0">
    <channel>
        <title>Example Feed</title>
        <item>
            <g:id>A1</g:id>
            <g:title>Sample Product Title</g:title>
            <g:price>9.99 USD</g:price>
        </item>
    </channel>
</rss>"#;

        let chunk_size = 512;
        let mut total_output = Vec::new();
        
        for chunk in xml_content.chunks(chunk_size) {
            let output = parser.push_to_ndjson(chunk).unwrap();
            total_output.extend_from_slice(&output);
        }
        
        let final_output = parser.finish().unwrap();
        total_output.extend_from_slice(&final_output);
        
        let output_str = String::from_utf8_lossy(&total_output);
        
        assert_eq!(output_str.matches('\n').count(), 1);
        assert!(!output_str.contains("<?xml version=1.0?>"));
        assert!(output_str.contains("Sample Product Title"));
        assert!(output_str.contains("9.99 USD"));
        assert_eq!(parser.record_count(), 1);
    }

    #[wasm_bindgen_test]
    fn test_xml_simple_debug() {
        let config = XmlConfig {
            record_element: "item".to_string(),
            include_attributes: false,
            ..Default::default()
        };
        let mut parser = XmlParser::new(config, 1024);

        let xml_content = b"<root><item><id>1</id></item></root>";
        let result = parser.push_to_ndjson(xml_content).unwrap();
        let output_str = String::from_utf8_lossy(&result);
        
        assert!(!output_str.is_empty());
        assert!(output_str.contains("\"id\""));
    }

    #[wasm_bindgen_test]
    fn xml_writer_emits_header_and_records() {
        let mut writer = XmlWriter::new().with_elements("items".to_string(), "item".to_string());
        let output = writer
            .process_json_line(r#"{"name":"Widget","price":19.99,"active":true}"#)
            .unwrap();

        let output_str = String::from_utf8_lossy(&output);
        assert!(output_str.contains("<items>"));
        assert!(output_str.contains("<item>"));
        assert!(output_str.contains("<name>Widget</name>"));
        assert!(output_str.contains("<price>19.99</price>"));
        assert!(output_str.contains("<active>true</active>"));
    }

    #[wasm_bindgen_test]
    fn xml_writer_escapes_special_characters() {
        let mut writer = XmlWriter::new();
        let output = writer
            .process_json_line(r#"{"note":"fish & chips <tasty> \"yes\""}"#)
            .unwrap();

        let output_str = String::from_utf8_lossy(&output);
        assert!(output_str.contains("&amp;"));
        assert!(output_str.contains("&lt;tasty&gt;"));
        assert!(output_str.contains("&quot;yes&quot;"));
    }

    #[wasm_bindgen_test]
    fn xml_writer_finish_without_header_is_empty() {
        let writer = XmlWriter::new();
        let output = writer.finish().unwrap();
        assert!(output.is_empty());
    }
}
