use crate::csv_parser::CsvConfig;
use crate::xml_parser::XmlConfig;

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
}
