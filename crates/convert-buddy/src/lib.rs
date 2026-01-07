use wasm_bindgen::prelude::*;
use log::{debug, info};

mod error;
mod stats;
mod json_parser;
mod ndjson_parser;
mod csv_parser;
mod xml_parser;
mod format;
mod timing;
mod detect;

pub use error::{ConvertError, Result};
pub use stats::Stats;
pub use format::{Format, ConverterConfig};
pub use csv_parser::CsvConfig;
pub use xml_parser::XmlConfig;

use ndjson_parser::NdjsonParser;
use csv_parser::CsvParser;
use xml_parser::XmlParser;
use json_parser::JsonParser;
use js_sys::{Array, Object, Reflect};

#[wasm_bindgen]
pub fn init(debug_enabled: bool) {
    console_error_panic_hook::set_once();

    if debug_enabled {
        let _ = console_log::init_with_level(log::Level::Debug);
        debug!("convert-buddy: debug logging enabled");
    } else {
        let _ = console_log::init_with_level(log::Level::Info);
        info!("convert-buddy: logging initialized");
    }
}

/// Detect the input format from a sample of bytes.
#[wasm_bindgen(js_name = detectFormat)]
pub fn detect_format(sample: &[u8]) -> Option<String> {
    detect::detect_format(sample).map(|format| format.to_string_js())
}

/// Detect CSV fields and delimiter from a sample of bytes.
#[wasm_bindgen(js_name = detectCsvFields)]
pub fn detect_csv_fields(sample: &[u8]) -> JsValue {
    let Some(detection) = detect::detect_csv(sample) else {
        return JsValue::NULL;
    };

    let result = Object::new();
    let delimiter = String::from_utf8_lossy(&[detection.delimiter]).to_string();
    let fields = Array::new();
    for field in detection.fields {
        fields.push(&JsValue::from(field));
    }

    let _ = Reflect::set(&result, &JsValue::from("delimiter"), &JsValue::from(delimiter));
    let _ = Reflect::set(&result, &JsValue::from("fields"), &fields);

    result.into()
}

/// Internal converter state
enum ConverterState {
    CsvToNdjson(CsvParser),
    NdjsonPassthrough(NdjsonParser),
    NdjsonToJson(NdjsonParser, bool), // (parser, is_first_chunk)
    XmlToNdjson(XmlParser),
    JsonPassthrough(JsonParser),
}

/// A streaming converter state machine.
/// Converts between CSV, NDJSON, JSON, and XML formats with high performance.
#[wasm_bindgen]
pub struct Converter {
    debug: bool,
    config: ConverterConfig,
    state: Option<ConverterState>,
    stats: Stats,
}

#[wasm_bindgen]
impl Converter {
    #[wasm_bindgen(constructor)]
    pub fn new(debug: bool) -> Converter {
        if debug {
            debug!("Converter::new(debug=true)");
        }
        
        let config = ConverterConfig::default();
        let state = Self::create_state(&config);
        
        Converter {
            debug,
            config,
            state: Some(state),
            stats: Stats::default(),
        }
    }

    /// Create a new converter with specific configuration
    #[wasm_bindgen(js_name = withConfig)]
    pub fn with_config(
        debug: bool,
        input_format: &str,
        output_format: &str,
        chunk_target_bytes: usize,
        enable_stats: bool,
        csv_config: Option<JsValue>,
        xml_config: Option<JsValue>,
    ) -> std::result::Result<Converter, JsValue> {
        let input = Format::from_string(input_format)
            .ok_or_else(|| ConvertError::InvalidConfig(format!("Invalid input format: {}", input_format)))?;
        
        let output = Format::from_string(output_format)
            .ok_or_else(|| ConvertError::InvalidConfig(format!("Invalid output format: {}", output_format)))?;

        let mut config = ConverterConfig::new(input, output)
            .with_chunk_size(chunk_target_bytes)
            .with_stats(enable_stats);

        if let Some(csv) = csv_config.and_then(parse_csv_config) {
            config = config.with_csv_config(csv);
        }

        if let Some(xml) = xml_config.and_then(parse_xml_config) {
            config = config.with_xml_config(xml);
        }

        let state = Self::create_state(&config);

        if debug {
            debug!("Converter::with_config({:?} -> {:?})", input, output);
        }

        Ok(Converter {
            debug,
            config,
            state: Some(state),
            stats: Stats::default(),
        })
    }

    /// Push a chunk of bytes. Returns converted output bytes for that chunk.
    pub fn push(&mut self, chunk: &[u8]) -> std::result::Result<Vec<u8>, JsValue> {
        if self.debug {
            debug!("Converter::push chunk_len={}", chunk.len());
        }

        // Record input stats
        if self.config.enable_stats {
            self.stats.record_chunk(chunk.len());
        }

        let start = crate::timing::Timer::new();

        let result = match self.state.as_mut() {
            Some(ConverterState::CsvToNdjson(parser)) => {
                parser.push_to_ndjson(chunk)?
            }
            Some(ConverterState::NdjsonPassthrough(parser)) => {
                parser.push(chunk)?
            }
            Some(ConverterState::NdjsonToJson(parser, is_first)) => {
                let is_first_chunk = *is_first;
                *is_first = false;
                parser.to_json_array(chunk, is_first_chunk, false)?
            }
            Some(ConverterState::XmlToNdjson(parser)) => {
                parser.push_to_ndjson(chunk)?
            }
            Some(ConverterState::JsonPassthrough(_parser)) => {
                // For JSON passthrough, we just validate
                chunk.to_vec()
            }
            None => {
                return Err(ConvertError::InvalidConfig("Converter already finished".to_string()).into());
            }
        };

        // Record output stats
        if self.config.enable_stats {
            self.stats.record_output(result.len());
            self.stats.record_parse_time(start.elapsed());
            
            // Update buffer sizes
            let partial_size = match self.state.as_ref() {
                Some(ConverterState::CsvToNdjson(p)) => p.partial_size(),
                Some(ConverterState::NdjsonPassthrough(p)) => p.partial_size(),
                Some(ConverterState::NdjsonToJson(p, _)) => p.partial_size(),
                Some(ConverterState::XmlToNdjson(p)) => p.partial_size(),
                _ => 0,
            };
            self.stats.update_buffer_size(partial_size);
        }

        Ok(result)
    }

    /// Finish the stream and return any remaining buffered output.
    pub fn finish(&mut self) -> std::result::Result<Vec<u8>, JsValue> {
        if self.debug {
            debug!("Converter::finish");
        }

        let result = match self.state.take() {
            Some(ConverterState::CsvToNdjson(mut parser)) => {
                parser.finish()?
            }
            Some(ConverterState::NdjsonPassthrough(mut parser)) => {
                parser.finish()?
            }
            Some(ConverterState::NdjsonToJson(mut parser, _)) => {
                // Close the JSON array
                let mut output = parser.to_json_array(&[], false, true)?;
                
                let remaining = parser.finish()?;
                
                if !remaining.is_empty() {
                    output.extend_from_slice(&remaining);
                }
                output
            }
            Some(ConverterState::XmlToNdjson(mut parser)) => {
                parser.finish()?
            }
            Some(ConverterState::JsonPassthrough(_)) => {
                Vec::new()
            }
            None => {
                return Err(ConvertError::InvalidConfig("Converter already finished".to_string()).into());
            }
        };

        if self.config.enable_stats {
            self.stats.record_output(result.len());
        }

        Ok(result)
    }

    /// Get performance statistics
    #[wasm_bindgen(js_name = getStats)]
    pub fn get_stats(&self) -> Stats {
        self.stats.clone()
    }
}

impl Converter {
    fn create_state(config: &ConverterConfig) -> ConverterState {
        match (config.input_format, config.output_format) {
            (Format::Csv, Format::Ndjson) => {
                let csv_config = config.csv_config.clone().unwrap_or_default();
                ConverterState::CsvToNdjson(CsvParser::new(csv_config, config.chunk_target_bytes))
            }
            (Format::Ndjson, Format::Ndjson) => {
                ConverterState::NdjsonPassthrough(NdjsonParser::new(config.chunk_target_bytes))
            }
            (Format::Ndjson, Format::Json) => {
                ConverterState::NdjsonToJson(NdjsonParser::new(config.chunk_target_bytes), true)
            }
            (Format::Xml, Format::Ndjson) => {
                let xml_config = config.xml_config.clone().unwrap_or_default();
                ConverterState::XmlToNdjson(XmlParser::new(xml_config, config.chunk_target_bytes))
            }
            (Format::Json, Format::Json) => {
                ConverterState::JsonPassthrough(JsonParser::new())
            }
            _ => {
                // Default to passthrough for unsupported conversions
                info!("Unsupported conversion: {:?} -> {:?}, using passthrough", 
                      config.input_format, config.output_format);
                ConverterState::JsonPassthrough(JsonParser::new())
            }
        }
    }
}

fn parse_csv_config(value: JsValue) -> Option<CsvConfig> {
    if value.is_null() || value.is_undefined() || !value.is_object() {
        return None;
    }

    let obj = Object::from(value);
    let mut config = CsvConfig::default();

    if let Ok(delimiter) = Reflect::get(&obj, &JsValue::from_str("delimiter")) {
        if let Some(value) = delimiter.as_string() {
            if let Some(byte) = value.as_bytes().first() {
                config.delimiter = *byte;
            }
        }
    }

    if let Ok(quote) = Reflect::get(&obj, &JsValue::from_str("quote")) {
        if let Some(value) = quote.as_string() {
            if let Some(byte) = value.as_bytes().first() {
                config.quote = *byte;
                config.escape = Some(*byte);
            }
        }
    }

    if let Ok(has_headers) = Reflect::get(&obj, &JsValue::from_str("hasHeaders")) {
        if let Some(value) = has_headers.as_bool() {
            config.has_headers = value;
        }
    }

    if let Ok(trim_whitespace) = Reflect::get(&obj, &JsValue::from_str("trimWhitespace")) {
        if let Some(value) = trim_whitespace.as_bool() {
            config.trim_whitespace = value;
        }
    }

    Some(config)
}

fn parse_xml_config(value: JsValue) -> Option<XmlConfig> {
    if value.is_null() || value.is_undefined() || !value.is_object() {
        return None;
    }

    let obj = Object::from(value);
    let mut config = XmlConfig::default();

    if let Ok(record_element) = Reflect::get(&obj, &JsValue::from_str("recordElement")) {
        if let Some(value) = record_element.as_string() {
            if !value.is_empty() {
                config.record_element = value;
            }
        }
    }

    if let Ok(trim_text) = Reflect::get(&obj, &JsValue::from_str("trimText")) {
        if let Some(value) = trim_text.as_bool() {
            config.trim_text = value;
        }
    }

    if let Ok(include_attributes) = Reflect::get(&obj, &JsValue::from_str("includeAttributes")) {
        if let Some(value) = include_attributes.as_bool() {
            config.include_attributes = value;
        }
    }

    if let Ok(expand_entities) = Reflect::get(&obj, &JsValue::from_str("expandEntities")) {
        if let Some(value) = expand_entities.as_bool() {
            config.expand_entities = value;
        }
    }

    Some(config)
}

// Note: Config builders are not exposed to JS directly
// Configuration is passed through the Converter::with_config method
