use crate::format::Format;
use crate::json_parser::JsonParser;

const UTF8_BOM: &[u8] = &[0xEF, 0xBB, 0xBF];
const CSV_DELIMITERS: &[u8] = &[b',', b'\t', b';', b'|'];

#[derive(Debug)]
pub struct CsvDetection {
    pub delimiter: u8,
    pub fields: Vec<String>,
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
}
