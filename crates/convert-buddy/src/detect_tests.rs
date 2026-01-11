#[cfg(test)]
mod pipe_delimited_csv_tests {
    use crate::detect::{detect_format, detect_csv};
    use crate::format::Format;

    #[test]
    fn test_pipe_delimited_csv_detection() {
        // Test data: pipe-delimited CSV with quoted fields
        let csv_data = br#""ProductID"|"SKU"|"ProductName"|"Description"|"URL"|"ImageURL"|"Category"|"Size"|"Price"|"DiscountPrice"|"Stock"
"SKU001"|"PROD-2024-001"|"Blue Winter Jacket"|"<ul>A warm jacket for winter</ul>"|"https://example.com/jacket"|"https://example.com/jacket.jpg"|"Clothing > Outerwear > Jackets"|"M, L, XL"|"89.99"|""|"150"
"SKU002"|"PROD-2024-002"|"Cotton T-Shirt"|"<ul>Comfortable daily wear</ul>"|"https://example.com/tshirt"|"https://example.com/tshirt.jpg"|"Clothing > Tops > T-Shirts"|"S, M, L, XL, XXL"|"24.99"|"19.99"|"500"
"SKU003"|"PROD-2024-003"|"Black Jeans"|"<ul>Classic denim pants</ul>"|"https://example.com/jeans"|"https://example.com/jeans.jpg"|"Clothing > Bottoms > Jeans"|"28, 30, 32, 34, 36"|"59.99"|""|"200""#;

        let format = detect_format(csv_data);
        assert_eq!(format, Some(Format::Csv), "Should detect pipe-delimited CSV as CSV, not NDJSON");

        // Also verify CSV detection works
        let csv_info = detect_csv(csv_data);
        assert!(csv_info.is_some(), "Should detect CSV info");
        
        let csv_info = csv_info.unwrap();
        assert_eq!(csv_info.delimiter, b'|', "Delimiter should be pipe");
        assert_eq!(csv_info.fields.len(), 11, "Should have 11 fields");
        assert_eq!(csv_info.fields[0], "ProductID");
        assert_eq!(csv_info.fields[2], "ProductName");
    }

    #[test]
    fn test_pipe_delimited_csv_with_html_content() {
        // Test with complex HTML content in fields
        let csv_data = br#""ItemID"|"Barcode"|"ItemName"|"LongDescription"|"Link"|"PictureLink"|"ProductCategory"|"Variant"|"RegularPrice"|"SalePrice"|"Quantity"
"101"|"EAN-123456"|"Gaming Mouse"|"<div>High performance mouse with RGB lighting</div>"|"https://shop.com/mouse"|"https://shop.com/img/mouse.jpg"|"Electronics > Peripherals > Mice"|"Black, RGB"|"49.99"|"39.99"|"250"
"102"|"EAN-654321"|"Wireless Keyboard"|"<div>Ergonomic design for long typing sessions</div>"|"https://shop.com/keyboard"|"https://shop.com/img/keyboard.jpg"|"Electronics > Peripherals > Keyboards"|"White"|"79.99"|""|"100""#;

        let format = detect_format(csv_data);
        assert_eq!(format, Some(Format::Csv), "Should detect pipe-delimited CSV with HTML as CSV");
    }

    #[test]
    fn test_pipe_delimited_csv_single_column() {
        // Edge case: single column with pipe-delimited data
        let csv_data = br#""Name"
"Alice"
"Bob"
"Charlie""#;

        let format = detect_format(csv_data);
        // Single column won't be detected as CSV since we require >= 2 fields
        // But let's ensure it doesn't falsely detect as NDJSON
        assert_ne!(format, Some(Format::Ndjson), "Single column should not be detected as NDJSON");
    }

    #[test]
    fn test_quoted_strings_not_ndjson() {
        // This is the original failing case - quoted strings should not be treated as NDJSON
        let csv_data = br#""Field1"|"Field2"|"Field3"
"Value1"|"Value2"|"Value3"
"Value4"|"Value5"|"Value6""#;

        let format = detect_format(csv_data);
        assert_eq!(format, Some(Format::Csv), "Quoted strings with delimiters should be CSV, not NDJSON");
    }

    #[test]
    fn test_actual_ndjson_still_detected() {
        // Ensure that real NDJSON is still properly detected
        let ndjson_data = br#"{"id": 1, "name": "Alice", "age": 30}
{"id": 2, "name": "Bob", "age": 25}
{"id": 3, "name": "Charlie", "age": 35}"#;

        let format = detect_format(ndjson_data);
        assert_eq!(format, Some(Format::Ndjson), "Should still detect real NDJSON");
    }

    #[test]
    fn test_json_array_not_ndjson() {
        // Single JSON array should be detected as JSON, not NDJSON
        let json_data = br#"[{"id": 1, "name": "Alice"}, {"id": 2, "name": "Bob"}]"#;

        let format = detect_format(json_data);
        assert_eq!(format, Some(Format::Json), "JSON array should be detected as JSON, not NDJSON");
    }

    #[test]
    fn test_csv_with_various_delimiters() {
        // Verify comma-delimited CSV still works
        let comma_csv = br#""Name","Age","City"
"Alice","30","New York"
"Bob","25","Los Angeles""#;

        let format = detect_format(comma_csv);
        assert_eq!(format, Some(Format::Csv));

        // Tab-delimited CSV
        let tab_csv = b"\"Name\"\t\"Age\"\t\"City\"\n\"Alice\"\t\"30\"\t\"New York\"\n\"Bob\"\t\"25\"\t\"Los Angeles\"";
        let format = detect_format(tab_csv);
        assert_eq!(format, Some(Format::Csv));

        // Semicolon-delimited CSV
        let semi_csv = br#""Name";"Age";"City"
"Alice";"30";"New York"
"Bob";"25";"Los Angeles""#;

        let format = detect_format(semi_csv);
        assert_eq!(format, Some(Format::Csv));
    }
}
