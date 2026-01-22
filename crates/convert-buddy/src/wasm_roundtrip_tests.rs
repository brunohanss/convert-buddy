// WASM-only roundtrip tests to ensure conversions preserve records/fields/values
#![cfg(all(test, target_arch = "wasm32"))]

use wasm_bindgen_test::*;
use super::*;

fn collect_json_records(s: &str) -> Vec<serde_json::Value> {
    let v: serde_json::Value = serde_json::from_str(s).unwrap_or_else(|_| serde_json::Value::Null);
    match v {
        serde_json::Value::Array(arr) => arr,
        serde_json::Value::Object(_) => vec![v],
        _ => vec![],
    }
}

// Helper: convert bytes via converter and return string
fn convert_bytes(input: &[u8], in_fmt: &str, out_fmt: &str) -> String {
    // Build converter similarly to integration_tests::create_test_converter
    let input_format = Format::from_string(in_fmt).expect("invalid input format");
    let output_format = Format::from_string(out_fmt).expect("invalid output format");

    let mut config = ConverterConfig::new(input_format, output_format)
        .with_chunk_size(1024 * 1024)
        .with_stats(false);

    config.csv_config = None;
    config.xml_config = None;

    let needs_detection = matches!(input_format, Format::Csv | Format::Xml);

    let state = if needs_detection {
        ConverterState::NeedsDetection(Vec::new())
    } else {
        Converter::create_state(&config)
    };

    let mut conv = Converter {
        debug: false,
        config,
        state: Some(state),
        stats: Stats::default(),
    };

    let out1 = conv.push(input).expect("push");
    let out2 = conv.finish().expect("finish");
    let combined = [out1, out2].concat();
    String::from_utf8_lossy(&combined).to_string()
}

#[wasm_bindgen_test]
fn roundtrip_ndjson_json_ndjson() {
    let ndjson = "{\"a\":1}\n{\"b\":2}\n";

    // NDJSON -> JSON
    let as_json = convert_bytes(ndjson.as_bytes(), "ndjson", "json");
    // JSON -> NDJSON
    let back = convert_bytes(as_json.as_bytes(), "json", "ndjson");

    // Compare record counts and values
    let orig_lines: Vec<&str> = ndjson.lines().filter(|l| !l.trim().is_empty()).collect();
    let back_lines: Vec<&str> = back.lines().filter(|l| !l.trim().is_empty()).collect();
    assert_eq!(orig_lines.len(), back_lines.len());

    for (o, b) in orig_lines.iter().zip(back_lines.iter()) {
        let vo: serde_json::Value = serde_json::from_str(o).unwrap();
        let vb: serde_json::Value = serde_json::from_str(b).unwrap();
        assert_eq!(vo, vb);
    }
}

#[wasm_bindgen_test]
fn roundtrip_csv_json_csv() {
    let csv = "id,name\n1,Alice\n2,Bob\n";

    // CSV -> JSON
    let as_json = convert_bytes(csv.as_bytes(), "csv", "json");
    // JSON -> CSV
    let back = convert_bytes(as_json.as_bytes(), "json", "csv");

    // Parse JSON array
    let records = collect_json_records(&as_json);
    // Parse back CSV lines (skip header)
    let mut back_lines: Vec<&str> = back.lines().collect();
    assert!(!back_lines.is_empty());
    let header = back_lines.remove(0);
    let headers: Vec<&str> = header.split(',').collect();

    assert_eq!(records.len(), back_lines.len());

    for (rec, line) in records.iter().zip(back_lines.iter()) {
        // compare fields by header names
        let vals: Vec<&str> = line.split(',').collect();
        for (i, key) in headers.iter().enumerate() {
            let expected = &rec[key.to_string()];
            let got = vals.get(i).map(|s| *s).unwrap_or("");
            let expected_str = if expected.is_string() {
                expected.as_str().unwrap_or("")
            } else {
                &expected.to_string()
            };
            assert_eq!(expected_str, got);
        }
    }
}

#[wasm_bindgen_test]
fn roundtrip_csv_ndjson_xml_json_csv_full_matrix() {
    // A small sample that exercises CSV/NDJSON/JSON/XML
    let csv = "id,product,price\n1,Widget,19.99\n2,Gadget,29.99\n";

    // CSV -> NDJSON -> XML -> JSON -> CSV
    let ndjson = convert_bytes(csv.as_bytes(), "csv", "ndjson");
    let xml = convert_bytes(ndjson.as_bytes(), "ndjson", "xml");
    let json = convert_bytes(xml.as_bytes(), "xml", "json");
    let back_csv = convert_bytes(json.as_bytes(), "json", "csv");

    // Compare record counts via NDJSON original and back CSV
    let nd_lines: Vec<&str> = ndjson.lines().filter(|l| !l.trim().is_empty()).collect();
    let back_lines: Vec<&str> = back_csv.lines().filter(|l| !l.trim().is_empty()).collect();
    // back_lines includes header, so subtract 1
    assert_eq!(nd_lines.len(), back_lines.len() - 1);

    // Compare values by parsing NDJSON and CSV->records
    let mut csv_records: Vec<Vec<String>> = vec![];
    let mut iter = back_csv.lines();
    let _header = iter.next().unwrap_or("");
    for l in iter {
        let cols: Vec<String> = l.split(',').map(|s| s.to_string()).collect();
        csv_records.push(cols);
    }

    for (i, line) in nd_lines.iter().enumerate() {
        let v: serde_json::Value = serde_json::from_str(line).unwrap();
        // compare fields id/product/price
        let id = v["id"].to_string().replace('"', "");
        let product = v["product"].as_str().unwrap_or("");
        let price = v["price"].to_string().replace('"', "");

        let rec = &csv_records[i];
        assert_eq!(id, rec[0]);
        assert_eq!(product, rec[1]);
        assert_eq!(price, rec[2]);
    }
}
