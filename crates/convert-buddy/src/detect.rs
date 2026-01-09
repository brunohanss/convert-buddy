use crate::format::Format;
use crate::json_parser::JsonParser;

const UTF8_BOM: &[u8] = &[0xEF, 0xBB, 0xBF];
const CSV_DELIMITERS: &[u8] = &[b',', b'\t', b';', b'|'];

#[derive(Debug)]
pub struct CsvDetection {
    pub delimiter: u8,
    pub fields: Vec<String>,
}

#[derive(Debug)]
pub struct XmlDetection {
    pub elements: Vec<String>,
    pub record_element: Option<String>,
}

pub fn detect_format(sample: &[u8]) -> Option<Format> {
    let sample = trim_ascii(sample);
    if sample.is_empty() {
        return None;
    }

    let sample = strip_bom(sample);
    if sample.is_empty() {
        return None;
    }

    let first = sample[0];
    if first == b'<' && looks_like_xml(sample) {
        return Some(Format::Xml);
    }

    let parser = JsonParser::new();
    if looks_like_ndjson(sample, &parser) {
        return Some(Format::Ndjson);
    }

    if parser.quick_validate(sample) {
        return Some(Format::Json);
    }

    if looks_like_csv(sample) {
        return Some(Format::Csv);
    }

    None
}

pub fn detect_csv(sample: &[u8]) -> Option<CsvDetection> {
    let sample = trim_ascii(sample);
    if sample.is_empty() {
        return None;
    }

    let sample = strip_bom(sample);
    let line = first_non_empty_line(sample)?;
    let delimiter = detect_delimiter(line);
    let fields = split_csv_fields(line, delimiter)
        .into_iter()
        .map(|field| String::from_utf8_lossy(&field).to_string())
        .collect::<Vec<String>>();

    Some(CsvDetection { delimiter, fields })
}

pub fn detect_xml(sample: &[u8]) -> Option<XmlDetection> {
    let sample = trim_ascii(sample);
    if sample.is_empty() {
        return None;
    }

    let sample = strip_bom(sample);
    let mut elements: std::collections::HashMap<String, usize> = std::collections::HashMap::new();
    let mut root_element: Option<String> = None;
    let mut depth_2_elements: std::collections::HashMap<String, usize> = std::collections::HashMap::new();
    let mut depth: i32 = 0;
    let mut i = 0;

    while i < sample.len() {
        if sample[i] == b'<' && i + 1 < sample.len() {
            let next = sample[i + 1];
            // Skip comments, declarations, and CDATA
            if next == b'!' || next == b'?' {
                i += 1;
                while i < sample.len() && sample[i] != b'>' {
                    i += 1;
                }
                i += 1;
                continue;
            }

            // Handle closing tags
            if next == b'/' {
                depth = depth.saturating_sub(1);
                i += 1;
                while i < sample.len() && sample[i] != b'>' {
                    i += 1;
                }
                i += 1;
                continue;
            }

            // Extract element name
            let start = i + 1;
            let mut end = start;
            while end < sample.len() && (sample[end].is_ascii_alphanumeric() || sample[end] == b'_' || sample[end] == b'-' || sample[end] == b':') {
                end += 1;
            }

            if end > start && end < sample.len() {
                if let Ok(element_name) = String::from_utf8(sample[start..end].to_vec()) {
                    if !element_name.is_empty() && element_name.chars().next().unwrap().is_alphabetic() {
                        // Track the first element as potential root
                        if root_element.is_none() {
                            root_element = Some(element_name.clone());
                        }
                        
                        // Track depth 2 elements (direct children of root) separately
                        if depth == 1 {
                            *depth_2_elements.entry(element_name.clone()).or_insert(0) += 1;
                        }
                        
                        // Count element occurrences
                        *elements.entry(element_name).or_insert(0) += 1;
                        
                        // Check if self-closing tag
                        let mut check_pos = end;
                        while check_pos < sample.len() && sample[check_pos].is_ascii_whitespace() {
                            check_pos += 1;
                        }
                        if check_pos < sample.len() && sample[check_pos] == b'/' {
                            // Self-closing, don't increment depth
                        } else {
                            depth += 1;
                        }
                    }
                }
            }
            i = end;
        } else {
            i += 1;
        }
    }

    // Get sorted elements (keep all elements for backward compatibility)
    let mut elements_vec: Vec<String> = elements.keys().cloned().collect();
    elements_vec.sort();

    // Find the record element - prefer direct children of root (depth 2)
    // If we have depth 2 elements, use the most frequent one
    // Otherwise, fall back to the most frequent non-root element
    let record_element = if !depth_2_elements.is_empty() {
        depth_2_elements
            .iter()
            .max_by_key(|(_, count)| *count)
            .map(|(name, _)| name.clone())
    } else {
        elements
            .iter()
            .filter(|(name, _)| {
                // Filter out the root element - we want a child element as the record
                root_element.as_ref().map_or(true, |root| *name != root)
            })
            .max_by_key(|(_, count)| *count)
            .map(|(name, _)| name.clone())
    };

    Some(XmlDetection {
        elements: elements_vec,
        record_element,
    })
}

fn strip_bom(sample: &[u8]) -> &[u8] {
    if sample.starts_with(UTF8_BOM) {
        &sample[UTF8_BOM.len()..]
    } else {
        sample
    }
}

fn trim_ascii(sample: &[u8]) -> &[u8] {
    let Some(start) = sample
        .iter()
        .position(|b| !matches!(b, b' ' | b'\t' | b'\r' | b'\n'))
    else {
        return &[];
    };

    let Some(end) = sample
        .iter()
        .rposition(|b| !matches!(b, b' ' | b'\t' | b'\r' | b'\n'))
    else {
        return &[];
    };

    &sample[start..=end]
}

fn looks_like_xml(sample: &[u8]) -> bool {
    let sample = trim_ascii(sample);
    if !sample.starts_with(b"<") {
        return false;
    }

    sample.starts_with(b"<?xml")
        || sample.starts_with(b"<!DOCTYPE")
        || sample.iter().skip(1).any(|&b| b.is_ascii_alphabetic())
}

fn looks_like_ndjson(sample: &[u8], parser: &JsonParser) -> bool {
    let mut json_lines = 0;

    for line in sample.split(|&b| b == b'\n').take(32) {
        let line = trim_line(line);
        if line.is_empty() {
            continue;
        }

        if !parser.quick_validate(line) {
            return false;
        }

        json_lines += 1;
        if json_lines >= 2 {
            return true;
        }
    }

    false
}

fn looks_like_csv(sample: &[u8]) -> bool {
    let line = match first_non_empty_line(sample) {
        Some(line) => line,
        None => return false,
    };

    let delimiter = detect_delimiter(line);
    let field_count = count_fields(line, delimiter);
    field_count >= 2
}

fn first_non_empty_line(sample: &[u8]) -> Option<&[u8]> {
    for line in sample.split(|&b| b == b'\n').take(16) {
        let line = trim_line(line);
        if !line.is_empty() {
            return Some(line);
        }
    }
    None
}

fn trim_line(line: &[u8]) -> &[u8] {
    let line = if let Some(stripped) = line.strip_suffix(b"\r") {
        stripped
    } else {
        line
    };
    trim_ascii(line)
}

fn detect_delimiter(line: &[u8]) -> u8 {
    let mut best = (b',', 0usize);

    for &candidate in CSV_DELIMITERS {
        let count = count_delimiters(line, candidate);
        if count > best.1 {
            best = (candidate, count);
        }
    }

    if best.1 == 0 {
        b','
    } else {
        best.0
    }
}

fn count_fields(line: &[u8], delimiter: u8) -> usize {
    let mut count = 1usize;
    let mut in_quotes = false;
    let mut pos = 0;

    while pos < line.len() {
        let byte = line[pos];
        if byte == b'"' {
            if in_quotes && pos + 1 < line.len() && line[pos + 1] == b'"' {
                pos += 2;
                continue;
            }
            in_quotes = !in_quotes;
        } else if byte == delimiter && !in_quotes {
            count += 1;
        }
        pos += 1;
    }

    count
}

fn count_delimiters(line: &[u8], delimiter: u8) -> usize {
    let mut count = 0usize;
    let mut in_quotes = false;
    let mut pos = 0;

    while pos < line.len() {
        let byte = line[pos];
        if byte == b'"' {
            if in_quotes && pos + 1 < line.len() && line[pos + 1] == b'"' {
                pos += 2;
                continue;
            }
            in_quotes = !in_quotes;
        } else if byte == delimiter && !in_quotes {
            count += 1;
        }
        pos += 1;
    }

    count
}

fn split_csv_fields(line: &[u8], delimiter: u8) -> Vec<Vec<u8>> {
    let mut fields = Vec::new();
    let mut field = Vec::new();
    let mut pos = 0;
    let mut in_quotes = false;

    while pos < line.len() {
        let byte = line[pos];
        if byte == b'"' {
            if in_quotes && pos + 1 < line.len() && line[pos + 1] == b'"' {
                field.push(b'"');
                pos += 2;
                continue;
            }
            in_quotes = !in_quotes;
        } else if byte == delimiter && !in_quotes {
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn detect_format_json() {
        let sample = br#"{ "name": "Ada" }"#;
        assert_eq!(detect_format(sample), Some(Format::Json));
    }

    #[test]
    fn detect_format_ndjson() {
        let sample = br#"{"a":1}
{"b":2}
"#;
        assert_eq!(detect_format(sample), Some(Format::Ndjson));
    }

    #[test]
    fn detect_format_xml() {
        let sample = br#"<?xml version="1.0"?><root></root>"#;
        assert_eq!(detect_format(sample), Some(Format::Xml));
    }

    #[test]
    fn detect_csv_fields_and_delimiter() {
        let sample = b"col_a;col_b;col_c\n1;2;3\n";
        let detection = detect_csv(sample).unwrap();
        assert_eq!(detection.delimiter, b';');
        assert_eq!(detection.fields, vec!["col_a", "col_b", "col_c"]);
    }

    #[test]
    fn detect_pipe_delimited_quoted_csv() {
        let sample = b"\"ProductID\"|\"Code\"|\"Name\"|\"Description\"|\"URL\"|\"ImageURL\"|\"Category\"|\"Variant\"|\"Amount\"|\"Discount\"|\"Related\"\n";
        let detection = detect_csv(sample).unwrap();
        assert_eq!(detection.delimiter, b'|');
        assert_eq!(detection.fields.len(), 11);
    }

    #[test]
    fn detect_pipe_delimited_complex_data() {
        // Test with pipe-delimited CSV containing quoted fields and complex data
        let sample = b"\"ProductID\"|\"Code\"|\"Name\"|\"Description\"|\"URL\"|\"ImageURL\"|\"Category\"|\"Variant\"|\"Amount\"|\"Discount\"|\"Related\"\n\"SKU987654321\"|\"123456789ABC\"|\"Item X\"|\"<ul>Item description <ul>\"|\"https://example.com/product/SKU987654321\"|\"https://example.com/image/v2/PROD/default/item-x-variant-sku987654321.jpg\"|\"Merchandise > Items > Item Category\"|\"BLUE , M\"|\"99\"|\"\"|\"\"\n";
        let detection = detect_csv(sample).unwrap();
        assert_eq!(detection.delimiter, b'|');
    }

    #[test]
    fn detect_csv_comma_delimiter() {
        let sample = b"name,age,email\nJohn,30,john@example.com\n";
        let detection = detect_csv(sample).unwrap();
        assert_eq!(detection.delimiter, b',');
        assert_eq!(detection.fields, vec!["name", "age", "email"]);
    }

    #[test]
    fn detect_csv_tab_delimiter() {
        let sample = b"id\tname\tcity\n1\tAlice\tNY\n";
        let detection = detect_csv(sample).unwrap();
        assert_eq!(detection.delimiter, b'\t');
        assert_eq!(detection.fields, vec!["id", "name", "city"]);
    }

    #[test]
    fn detect_csv_single_column() {
        let sample = b"product\nLaptop\nMouse\nKeyboard\n";
        let detection = detect_csv(sample).unwrap();
        assert_eq!(detection.fields.len(), 1);
        assert_eq!(detection.fields[0], "product");
    }

    #[test]
    fn detect_csv_quoted_fields_with_commas() {
        let sample = b"name,description,price\n\"Product A\",\"Desc, with comma\",99.99\n";
        let detection = detect_csv(sample).unwrap();
        assert_eq!(detection.delimiter, b',');
        assert_eq!(detection.fields, vec!["name", "description", "price"]);
    }

    #[test]
    fn detect_csv_quoted_fields_with_newlines() {
        let sample = b"name,description\n\"Product A\",\"Line1\nLine2\"\n";
        let detection = detect_csv(sample).unwrap();
        assert_eq!(detection.delimiter, b',');
        assert_eq!(detection.fields.len(), 2);
    }

    #[test]
    fn detect_csv_escaped_quotes() {
        let sample = b"name,comment\nAlice,\"She said \"\"Hello\"\"\"\nBob,Normal comment\n";
        let detection = detect_csv(sample).unwrap();
        assert_eq!(detection.delimiter, b',');
        assert_eq!(detection.fields, vec!["name", "comment"]);
    }

    #[test]
    fn detect_csv_mixed_quoted_unquoted() {
        let sample = b"id,name,description\n1,Alice,Normal\n2,\"Bob\",\"Special, field\"\n";
        let detection = detect_csv(sample).unwrap();
        assert_eq!(detection.delimiter, b',');
        assert_eq!(detection.fields, vec!["id", "name", "description"]);
    }

    #[test]
    fn detect_csv_empty_fields() {
        let sample = b"name,age,email\nAlice,,alice@test.com\n";
        let detection = detect_csv(sample).unwrap();
        assert_eq!(detection.delimiter, b',');
        assert_eq!(detection.fields, vec!["name", "age", "email"]);
    }

    #[test]
    fn detect_csv_trailing_comma() {
        let sample = b"a,b,c,\n1,2,3,\n";
        let detection = detect_csv(sample).unwrap();
        // Should detect 4 fields due to trailing comma
        assert_eq!(detection.fields.len(), 4);
    }

    #[test]
    fn detect_csv_many_columns() {
        let mut sample = String::from("col1");
        for i in 2..=100 {
            sample.push(',');
            sample.push_str(&format!("col{}", i));
        }
        sample.push('\n');
        let detection = detect_csv(sample.as_bytes()).unwrap();
        assert_eq!(detection.delimiter, b',');
        assert_eq!(detection.fields.len(), 100);
    }

    #[test]
    fn detect_csv_unicode_fields() {
        let sample = "名前,年齢,都市\n太郎,25,東京\n".as_bytes();
        let detection = detect_csv(sample).unwrap();
        assert_eq!(detection.delimiter, b',');
        assert_eq!(detection.fields, vec!["名前", "年齢", "都市"]);
    }

    #[test]
    fn detect_csv_numeric_header() {
        let sample = b"1,2,3,4,5\na,b,c,d,e\n";
        let detection = detect_csv(sample).unwrap();
        assert_eq!(detection.delimiter, b',');
        assert_eq!(detection.fields, vec!["1", "2", "3", "4", "5"]);
    }

    #[test]
    fn detect_csv_special_characters_in_fields() {
        let sample = b"id,description,notes\n1,Item@Product,Note-123\n";
        let detection = detect_csv(sample).unwrap();
        assert_eq!(detection.delimiter, b',');
        assert_eq!(detection.fields, vec!["id", "description", "notes"]);
    }

    #[test]
    fn detect_csv_whitespace_handling() {
        let sample = b"name , age , city\nAlice , 30 , NYC\n";
        let detection = detect_csv(sample).unwrap();
        assert_eq!(detection.delimiter, b',');
        // Fields include whitespace as they appear
        assert_eq!(detection.fields.len(), 3);
    }

    #[test]
    fn detect_csv_delimiter_priority() {
        // Tab should be chosen over comma if it appears more frequently
        let sample = b"a\tb\tc\n1\t2\t3\n4\t5\t6\n";
        let detection = detect_csv(sample).unwrap();
        assert_eq!(detection.delimiter, b'\t');
    }

    #[test]
    fn detect_csv_no_newline_at_end() {
        let sample = b"col1,col2,col3\nval1,val2,val3";
        let detection = detect_csv(sample).unwrap();
        assert_eq!(detection.delimiter, b',');
        assert_eq!(detection.fields, vec!["col1", "col2", "col3"]);
    }

    #[test]
    fn detect_xml_simple() {
        let sample = b"<root><item>test</item></root>";
        let detection = detect_xml(sample).unwrap();
        assert!(detection.elements.contains(&"root".to_string()));
        assert!(detection.elements.contains(&"item".to_string()));
    }

    #[test]
    fn detect_xml_with_declaration() {
        let sample = br#"<?xml version="1.0"?><movies><movie><title>Test</title></movie></movies>"#;
        let detection = detect_xml(sample).unwrap();
        assert!(detection.elements.contains(&"movies".to_string()));
        assert!(detection.elements.contains(&"movie".to_string()));
        assert!(detection.elements.contains(&"title".to_string()));
    }

    #[test]
    fn detect_xml_with_attributes() {
        let sample = br#"<root id="123"><person name="Ada" age="36"><skill>Rust</skill></person></root>"#;
        let detection = detect_xml(sample).unwrap();
        assert!(detection.elements.contains(&"root".to_string()));
        assert!(detection.elements.contains(&"person".to_string()));
        assert!(detection.elements.contains(&"skill".to_string()));
        assert_eq!(detection.elements.len(), 3);
    }

    #[test]
    fn detect_xml_complex_movies() {
        let sample = b"<movies><movie><title>The Shawshank Redemption</title><genre>Drama</genre><year>1994</year><cast><actor><name>Tim Robbins</name><role>Andy Dufresne</role></actor></cast></movie></movies>";
        let detection = detect_xml(sample).unwrap();
        assert!(detection.elements.contains(&"movies".to_string()));
        assert!(detection.elements.contains(&"movie".to_string()));
        assert!(detection.elements.contains(&"title".to_string()));
        assert!(detection.elements.contains(&"genre".to_string()));
        assert!(detection.elements.contains(&"year".to_string()));
        assert!(detection.elements.contains(&"cast".to_string()));
        assert!(detection.elements.contains(&"actor".to_string()));
        assert!(detection.elements.contains(&"name".to_string()));
        assert!(detection.elements.contains(&"role".to_string()));
    }

    #[test]
    fn detect_xml_with_namespaces() {
        let sample = br#"<root xmlns:custom="http://example.com"><custom:item>test</custom:item></root>"#;
        let detection = detect_xml(sample).unwrap();
        assert!(detection.elements.contains(&"root".to_string()));
        // Namespaced elements should be included
        assert!(detection.elements.len() >= 1);
    }

    #[test]
    fn detect_xml_no_duplicates() {
        let sample = b"<root><item>1</item><item>2</item><item>3</item></root>";
        let detection = detect_xml(sample).unwrap();
        // Count occurrences of "item" in the elements vec - should be exactly 1
        let item_count = detection.elements.iter().filter(|e| *e == "item").count();
        assert_eq!(item_count, 1);
    }

    #[test]
    fn detect_xml_sorted() {
        let sample = b"<root><zebra/><apple/><monkey/></root>";
        let detection = detect_xml(sample).unwrap();
        assert_eq!(detection.elements, vec!["apple", "monkey", "root", "zebra"]);
    }

    #[test]
    fn detect_xml_record_element_movie() {
        let sample = b"<movies><movie><title>Test</title></movie><movie><title>Test2</title></movie></movies>";
        let detection = detect_xml(sample).unwrap();
        // Should detect "movie" as the record element (direct child of root, repeating)
        assert_eq!(detection.record_element, Some("movie".to_string()));
    }

    #[test]
    fn detect_xml_record_element_product() {
        let sample = b"<catalog><product><id>1</id></product><product><id>2</id></product><product><id>3</id></product></catalog>";
        let detection = detect_xml(sample).unwrap();
        assert_eq!(detection.record_element, Some("product".to_string()));
    }

    #[test]
    fn detect_xml_record_element_person() {
        let sample = b"<people><person><name>Alice</name></person><person><name>Bob</name></person></people>";
        let detection = detect_xml(sample).unwrap();
        assert_eq!(detection.record_element, Some("person".to_string()));
    }

    #[test]
    fn detect_xml_record_element_with_nested_arrays() {
        // Should detect "movie" not "actor" even though actor appears more times
        let sample = b"<movies><movie><cast><actor><name>A</name></actor><actor><name>B</name></actor></cast></movie><movie><cast><actor><name>C</name></actor><actor><name>D</name></actor></cast></movie></movies>";
        let detection = detect_xml(sample).unwrap();
        assert_eq!(detection.record_element, Some("movie".to_string()));
    }

    #[test]
    fn detect_xml_record_element_item() {
        let sample = b"<inventory><item><sku>A001</sku></item><item><sku>A002</sku></item></inventory>";
        let detection = detect_xml(sample).unwrap();
        assert_eq!(detection.record_element, Some("item".to_string()));
    }

    #[test]
    fn detect_xml_record_element_order() {
        let sample = b"<orders><order><id>123</id></order><order><id>456</id></order></orders>";
        let detection = detect_xml(sample).unwrap();
        assert_eq!(detection.record_element, Some("order".to_string()));
    }

    #[test]
    fn detect_xml_record_element_book() {
        let sample = b"<library><book><title>Book1</title></book><book><title>Book2</title></book></library>";
        let detection = detect_xml(sample).unwrap();
        assert_eq!(detection.record_element, Some("book".to_string()));
    }

    #[test]
    fn detect_xml_record_element_user() {
        let sample = b"<users><user><email>a@test.com</email></user><user><email>b@test.com</email></user></users>";
        let detection = detect_xml(sample).unwrap();
        assert_eq!(detection.record_element, Some("user".to_string()));
    }

    #[test]
    fn detect_xml_record_element_row() {
        let sample = b"<data><row><col1>val1</col1></row><row><col1>val2</col1></row></data>";
        let detection = detect_xml(sample).unwrap();
        assert_eq!(detection.record_element, Some("row".to_string()));
    }
}
