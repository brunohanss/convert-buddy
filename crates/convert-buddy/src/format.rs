use crate::csv_parser::CsvConfig;
use crate::xml_parser::XmlConfig;
use crate::transform::TransformPlan;

/// Supported input/output formats
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Format {
    Csv,
    Ndjson,
    Json,
    Xml,
}

impl Format {
    pub fn from_string(s: &str) -> Option<Format> {
        match s.to_lowercase().as_str() {
            "csv" => Some(Format::Csv),
            "ndjson" | "jsonl" => Some(Format::Ndjson),
            "json" => Some(Format::Json),
            "xml" => Some(Format::Xml),
            _ => None,
        }
    }

    pub fn to_string_js(&self) -> String {
        match self {
            Format::Csv => "csv".to_string(),
            Format::Ndjson => "ndjson".to_string(),
            Format::Json => "json".to_string(),
            Format::Xml => "xml".to_string(),
        }
    }
}

/// Converter configuration
#[derive(Debug, Clone)]
pub struct ConverterConfig {
    pub input_format: Format,
    pub output_format: Format,
    pub chunk_target_bytes: usize,
    pub enable_stats: bool,
    pub csv_config: Option<CsvConfig>,
    pub xml_config: Option<XmlConfig>,
    pub transform: Option<TransformPlan>,
}

impl Default for ConverterConfig {
    fn default() -> Self {
        Self {
            input_format: Format::Csv,
            output_format: Format::Ndjson,
            chunk_target_bytes: 1024 * 1024, // 1MB
            enable_stats: false,
            csv_config: Some(CsvConfig::default()),
            xml_config: Some(XmlConfig::default()),
            transform: None,
        }
    }
}

impl ConverterConfig {
    pub fn new(input_format: Format, output_format: Format) -> Self {
        Self {
            input_format,
            output_format,
            ..Default::default()
        }
    }

    pub fn with_chunk_size(mut self, bytes: usize) -> Self {
        self.chunk_target_bytes = bytes;
        self
    }

    pub fn with_stats(mut self, enable: bool) -> Self {
        self.enable_stats = enable;
        self
    }

    pub fn with_csv_config(mut self, config: CsvConfig) -> Self {
        self.csv_config = Some(config);
        self
    }

    pub fn with_xml_config(mut self, config: XmlConfig) -> Self {
        self.xml_config = Some(config);
        self
    }

    pub fn with_transform(mut self, transform: TransformPlan) -> Self {
        self.transform = Some(transform);
        self
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn format_string_round_trip() {
        assert_eq!(Format::from_string("csv"), Some(Format::Csv));
        assert_eq!(Format::from_string("ndjson"), Some(Format::Ndjson));
        assert_eq!(Format::from_string("jsonl"), Some(Format::Ndjson));
        assert_eq!(Format::from_string("json"), Some(Format::Json));
        assert_eq!(Format::from_string("xml"), Some(Format::Xml));
        assert_eq!(Format::from_string("unknown"), None);

        assert_eq!(Format::Csv.to_string_js(), "csv");
        assert_eq!(Format::Ndjson.to_string_js(), "ndjson");
        assert_eq!(Format::Json.to_string_js(), "json");
        assert_eq!(Format::Xml.to_string_js(), "xml");
    }

    #[test]
    fn converter_config_builders() {
        let csv_config = CsvConfig::default();
        let xml_config = XmlConfig::default();

        let config = ConverterConfig::new(Format::Json, Format::Csv)
            .with_chunk_size(4096)
            .with_stats(true)
            .with_csv_config(csv_config.clone())
            .with_xml_config(xml_config.clone());

        assert_eq!(config.input_format, Format::Json);
        assert_eq!(config.output_format, Format::Csv);
        assert_eq!(config.chunk_target_bytes, 4096);
        assert!(config.enable_stats);
        let config_csv = config.csv_config.expect("csv config");
        let config_xml = config.xml_config.expect("xml config");
        assert_eq!(config_csv.delimiter, csv_config.delimiter);
        assert_eq!(config_csv.quote, csv_config.quote);
        assert_eq!(config_xml.record_element, xml_config.record_element);
    }
}
