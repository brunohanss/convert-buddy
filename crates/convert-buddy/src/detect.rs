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

#[derive(Debug)]
pub struct JsonDetection {
    pub fields: Vec<String>,
}

#[derive(Debug)]
pub struct NdjsonDetection {
    pub fields: Vec<String>,
}

#[derive(Debug)]
pub struct StructureDetection {
    pub format: Format,
    pub fields: Vec<String>,
    pub delimiter: Option<String>,      // For CSV
    pub record_element: Option<String>, // For XML
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
    
    // If it starts with { or [, it's likely JSON/NDJSON, not CSV
    if first == b'{' || first == b'[' {
        if looks_like_ndjson(sample, &parser) {
            return Some(Format::Ndjson);
        }
        if parser.quick_validate(sample) {
            return Some(Format::Json);
        }
    }
    
    // Check for CSV (important for quoted fields with delimiters like: "field1"|"field2")
    if looks_like_csv(sample) {
        return Some(Format::Csv);
    }
    
    // For other starting characters, check NDJSON and JSON
    if looks_like_ndjson(sample, &parser) {
        return Some(Format::Ndjson);
    }

    if parser.quick_validate(sample) {
        return Some(Format::Json);
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
    let delimiter = detect_delimiter(sample);
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
    let mut element_depths: std::collections::HashMap<String, i32> = std::collections::HashMap::new();
    let mut element_children: std::collections::HashMap<String, std::collections::HashSet<String>> = std::collections::HashMap::new();
    let mut depth: i32 = 0;
    let mut i = 0;
    let mut parent_at_depth: [Option<String>; 10] = Default::default();

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
                if depth > 0 {
                    parent_at_depth[depth as usize] = None;
                }
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
                        
                        // Track the shallowest depth at which each element appears
                        element_depths.entry(element_name.clone())
                            .and_modify(|d| if depth < *d { *d = depth })
                            .or_insert(depth);
                        
                        // Track which elements are children of which parent
                        if depth > 0 {
                            if let Some(parent) = &parent_at_depth[depth as usize] {
                                element_children
                                    .entry(parent.clone())
                                    .or_insert_with(std::collections::HashSet::new)
                                    .insert(element_name.clone());
                            }
                        }
                        
                        // Count element occurrences
                        *elements.entry(element_name.clone()).or_insert(0) += 1;
                        
                        // Check if self-closing tag
                        let mut check_pos = end;
                        while check_pos < sample.len() && sample[check_pos].is_ascii_whitespace() {
                            check_pos += 1;
                        }
                        if check_pos < sample.len() && sample[check_pos] == b'/' {
                            // Self-closing, don't increment depth
                        } else {
                            depth += 1;
                            if (depth as usize) < parent_at_depth.len() {
                                parent_at_depth[depth as usize] = Some(element_name.clone());
                            }
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

    // Find the record element.
    // Strategy: Look for repeating elements at any depth (except root).
    // Prefer elements that:
    // 1. Repeat more than once (count > 1)
    // 2. Have child elements (are containers, not leaf nodes)
    // 3. Appear at shallower depths (prefer direct children of root)
    // 4. Among same-depth containers, pick the one that repeats most
    let record_element = {
        // Find all elements that repeat (count > 1) and are not the root
        let repeating: Vec<_> = elements
            .iter()
            .filter(|(name, count)| {
                **count > 1 && root_element.as_ref().map_or(true, |root| *name != root)
            })
            .collect();

        if !repeating.is_empty() {
            // Among repeating elements, prefer those with children
            let with_children: Vec<_> = repeating
                .iter()
                .filter(|(name, _)| {
                    // An element has children if other element names nest under it
                    element_children.get(*name).map_or(false, |children| !children.is_empty())
                })
                .collect();

            if !with_children.is_empty() {
                // Sort by depth (shallower first), then by count (more repeating first)
                let mut sorted = with_children;
                sorted.sort_by(|a, b| {
                    let depth_a = element_depths.get(a.0).copied().unwrap_or(999);
                    let depth_b = element_depths.get(b.0).copied().unwrap_or(999);
                    
                    match depth_a.cmp(&depth_b) {
                        std::cmp::Ordering::Equal => {
                            // Same depth, prefer more repeating
                            b.1.cmp(a.1)
                        }
                        other => other,
                    }
                });
                
                sorted.first().map(|(name, _)| (*name).clone())
            } else {
                // No repeating element with children, pick the most repeating non-root element
                repeating
                    .iter()
                    .max_by_key(|(_, count)| *count)
                    .map(|(name, _)| (*name).clone())
            }
        } else {
            // No repeating elements (shouldn't happen in well-formed record data)
            None
        }
    };

    Some(XmlDetection {
        elements: elements_vec,
        record_element,
    })
}

pub fn detect_json(sample: &[u8]) -> Option<JsonDetection> {
    let sample = trim_ascii(sample);
    if sample.is_empty() {
        return None;
    }

    let sample = strip_bom(sample);
    
    // Parse the JSON to extract field names
    let parser = JsonParser::new();
    if !parser.quick_validate(sample) {
        return None;
    }
    
    let json_str = String::from_utf8_lossy(sample);
    let fields = extract_json_fields(&json_str);
    
    Some(JsonDetection { fields })
}

pub fn detect_ndjson(sample: &[u8]) -> Option<NdjsonDetection> {
    let sample = trim_ascii(sample);
    if sample.is_empty() {
        return None;
    }

    let sample = strip_bom(sample);
    let sample_str = String::from_utf8_lossy(sample);
    
    // Parse each line as JSON and extract field names
    let parser = JsonParser::new();
    let mut all_fields = std::collections::HashSet::new();
    let mut valid_lines = 0;
    
    for line in sample_str.lines().take(10) { // Sample first 10 lines
        let line = line.trim();
        if line.is_empty() {
            continue;
        }
        
        // Validate that it's a JSON object or array
        if !parser.quick_validate(line.as_bytes()) {
            continue;
        }
        
        let fields = extract_json_fields(line);
        for field in fields {
            all_fields.insert(field);
        }
        valid_lines += 1;
    }
    
    // Must have at least one valid line to be considered NDJSON
    if valid_lines == 0 {
        return None;
    }
    
    let mut fields_vec: Vec<String> = all_fields.into_iter().collect();
    fields_vec.sort();
    
    Some(NdjsonDetection { fields: fields_vec })
}

fn extract_json_fields(json_str: &str) -> Vec<String> {
    let mut fields = std::collections::HashSet::new();
    
    // Simple JSON field extraction - look for quoted keys
    // This is a lightweight approach that doesn't require a full JSON parser
    let bytes = json_str.as_bytes();
    let mut i = 0;
    
    while i < bytes.len() {
        if bytes[i] == b'"' {
            // Start of a potential key
            let mut key_start = i + 1;
            let mut key_end = key_start;
            
            // Find the end of the quoted string
            while key_end < bytes.len() && bytes[key_end] != b'"' {
                if bytes[key_end] == b'\\' && key_end + 1 < bytes.len() {
                    // Skip escaped character
                    key_end += 2;
                } else {
                    key_end += 1;
                }
            }
            
            if key_end < bytes.len() && bytes[key_end] == b'"' {
                // Check if this is followed by a colon (making it a key)
                let mut colon_pos = key_end + 1;
                while colon_pos < bytes.len() && bytes[colon_pos].is_ascii_whitespace() {
                    colon_pos += 1;
                }
                
                if colon_pos < bytes.len() && bytes[colon_pos] == b':' {
                    // This is a key
                    if let Ok(key) = String::from_utf8(bytes[key_start..key_end].to_vec()) {
                        // Simple nested field support - extract only top-level fields for now
                        if key.chars().all(|c| c.is_alphanumeric() || c == '_' || c == '-') {
                            fields.insert(key);
                        }
                    }
                }
                
                i = key_end + 1;
            } else {
                i += 1;
            }
        } else {
            i += 1;
        }
    }
    
    let mut fields_vec: Vec<String> = fields.into_iter().collect();
    fields_vec.sort();
    fields_vec
}

pub fn detect_structure(sample: &[u8], format: Option<Format>) -> Option<StructureDetection> {
    let sample = trim_ascii(sample);
    if sample.is_empty() {
        return None;
    }

    let sample = strip_bom(sample);
    
    // Auto-detect format if not provided
    let detected_format = match format {
        Some(f) => f,
        None => detect_format(sample)?,
    };
    
    match detected_format {
        Format::Csv => {
            if let Some(csv_detection) = detect_csv(sample) {
                Some(StructureDetection {
                    format: Format::Csv,
                    fields: csv_detection.fields,
                    delimiter: Some(String::from_utf8_lossy(&[csv_detection.delimiter]).to_string()),
                    record_element: None,
                })
            } else {
                None
            }
        }
        Format::Xml => {
            if let Some(xml_detection) = detect_xml(sample) {
                Some(StructureDetection {
                    format: Format::Xml,
                    fields: xml_detection.elements,
                    delimiter: None,
                    record_element: xml_detection.record_element,
                })
            } else {
                None
            }
        }
        Format::Json => {
            if let Some(json_detection) = detect_json(sample) {
                Some(StructureDetection {
                    format: Format::Json,
                    fields: json_detection.fields,
                    delimiter: None,
                    record_element: None,
                })
            } else {
                None
            }
        }
        Format::Ndjson => {
            if let Some(ndjson_detection) = detect_ndjson(sample) {
                Some(StructureDetection {
                    format: Format::Ndjson,
                    fields: ndjson_detection.fields,
                    delimiter: None,
                    record_element: None,
                })
            } else {
                None
            }
        }
    }
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

        // NDJSON lines must be JSON objects or arrays, not plain strings or numbers
        if line.is_empty() || (line[0] != b'{' && line[0] != b'[') {
            return false;
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

    let delimiter = detect_delimiter(sample);
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

fn detect_delimiter(sample: &[u8]) -> u8 {
    // Analyze multiple lines to detect the most likely delimiter
    let mut delimiter_scores: std::collections::HashMap<u8, (usize, usize, usize)> = 
        std::collections::HashMap::new();
    
    // Initialize scores for all candidates
    for &delim in CSV_DELIMITERS {
        delimiter_scores.insert(delim, (0, 0, 0)); // (total_count, line_count, field_consistency)
    }
    
    // Analyze the first few lines (up to 10)
    let mut line_count = 0;
    for line in sample.split(|&b| b == b'\n').take(10) {
        let line = trim_line(line);
        if line.is_empty() {
            continue;
        }
        
        line_count += 1;
        
        for &candidate in CSV_DELIMITERS {
            let count = count_delimiters(line, candidate);
            if let Some(entry) = delimiter_scores.get_mut(&candidate) {
                entry.0 += count;
                if count > 0 {
                    entry.1 += 1;
                }
            }
        }
    }
    
    if line_count == 0 {
        return b',';
    }
    
    // Score each delimiter based on:
    // 1. Whether it appears in most lines (consistency)
    // 2. The total count of delimiters
    let mut best = (b',', 0.0);
    
    for &candidate in CSV_DELIMITERS {
        if let Some((total_count, lines_with_delim, _)) = delimiter_scores.get(&candidate) {
            if *total_count == 0 {
                continue;
            }
            
            // Score: appears in many lines AND has high total count
            let consistency = *lines_with_delim as f64 / line_count as f64;
            let score = consistency * (*total_count as f64);
            
            if score > best.1 {
                best = (candidate, score);
            }
        }
    }
    
    if best.1 == 0.0 {
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

    #[test]
    fn detect_pipe_delimited_with_trailing_commas() {
        // Pipe-delimited format with trailing empty comma-separated fields
        // This tests that consistent pipe delimiters are detected correctly
        let sample = b"col_a|col_b|col_c|col_d|col_e\n001|value1|description1|category1|type1\n002|value2|description2|category2|type2\n,,,,,,,,";
        let detection = detect_csv(sample).unwrap();
        assert_eq!(detection.delimiter, b'|');
        assert_eq!(detection.fields.len(), 5);
        assert_eq!(detection.fields[0], "col_a");
        assert_eq!(detection.fields[4], "col_e");
    }

    #[test]
    fn detect_pipe_delimited_complex_header() {
        // Pipe-delimited CSV with multiple columns
        let sample = b"col_id|col_name|col_desc|col_category|col_type|col_url|col_price|col_discount\n001|product_a|content_a|category_a|type_a|http://example.com|100.00|80.00\n002|product_b|content_b|category_b|type_b|http://example.com|200.00|150.00\n";
        let detection = detect_csv(sample).unwrap();
        assert_eq!(detection.delimiter, b'|');
        assert_eq!(detection.fields.len(), 8);
        assert_eq!(detection.fields[0], "col_id");
        assert_eq!(detection.fields[7], "col_discount");
    }

    #[test]
    fn detect_pipe_preferred_over_comma_when_close() {
        // When pipes appear in multiple lines consistently, prefer pipes
        // even if comma count is higher in a single line
        let sample = b"a|b|c\n1|2|3\n4|5|6\n7|8|9\n,,,\n";
        let detection = detect_csv(sample).unwrap();
        // Pipes should be detected since they're consistent across most lines
        assert_eq!(detection.delimiter, b'|');
        assert_eq!(detection.fields.len(), 3);
    }

    #[test]
    fn detect_comma_vs_pipe_more_pipes() {
        // When one delimiter clearly dominates, it should be chosen
        let sample = b"a|b|c|d|e\n1|2|3|4|5\n";
        let detection = detect_csv(sample).unwrap();
        assert_eq!(detection.delimiter, b'|');
        assert_eq!(detection.fields.len(), 5);
    }

    #[test]
    fn detect_comma_vs_pipe_more_commas() {
        // Commas are still chosen when they're more frequent
        let sample = b"a,b,c,d,e,f\n1,2,3,4,5,6\n";
        let detection = detect_csv(sample).unwrap();
        assert_eq!(detection.delimiter, b',');
        assert_eq!(detection.fields.len(), 6);
    }

    #[test]
    fn detect_rss_item_element() {
        // Test detection of RSS feed structure with item records
        let sample = br#"<?xml version="1.0"?>
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

        let detection = detect_xml(sample).expect("Should detect XML");
        assert!(detection.record_element.is_some(), "Should detect a record element");
        assert_eq!(detection.record_element, Some("item".to_string()), 
                  "Should detect 'item' as the record element, got {:?}", detection.record_element);
    }
}