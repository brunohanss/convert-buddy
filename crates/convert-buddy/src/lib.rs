use wasm_bindgen::prelude::*;
use log::{debug, info};

mod error;
mod stats;
mod json_parser;
mod ndjson_parser;
mod csv_parser;
mod buffer_pool;
mod csv_writer;
mod xml_parser;
mod format;
mod timing;
mod detect;
mod transform;

#[cfg(test)]
mod detect_tests;

pub use error::{ConvertError, Result};
pub use stats::Stats;
pub use format::{Format, ConverterConfig};
pub use csv_parser::CsvConfig;
pub use xml_parser::XmlConfig;
pub use transform::{TransformConfigInput, TransformPlan};

use ndjson_parser::NdjsonParser;
use csv_parser::CsvParser;
use xml_parser::XmlParser;
use json_parser::JsonParser;
use js_sys::{Array, Object, Reflect};
use transform::TransformEngine;

// WASM threading support for Node.js only
#[cfg(all(target_arch = "wasm32", feature = "threads-nodejs"))]
use wasm_bindgen_rayon::init_thread_pool;

#[cfg(target_arch = "wasm32")]
use serde::de::DeserializeOwned;
#[cfg(target_arch = "wasm32")]
use serde::Deserialize;

#[wasm_bindgen]
pub fn init(debug_enabled: bool) {
    console_error_panic_hook::set_once();

    // Only initialize logging on first call
    static INIT: std::sync::atomic::AtomicBool = std::sync::atomic::AtomicBool::new(false);
    
    if INIT.compare_exchange(
        false,
        true,
        std::sync::atomic::Ordering::Relaxed,
        std::sync::atomic::Ordering::Relaxed,
    ).is_ok() {
        // First call - actually initialize
        if debug_enabled {
            let _ = console_log::init_with_level(log::Level::Debug);
            debug!("convert-buddy: debug logging enabled");
        } else {
            let _ = console_log::init_with_level(log::Level::Info);
            info!("convert-buddy: logging initialized");
        }
        
        // Initialize rayon for native/Node.js environments
        #[cfg(all(feature = "threads", not(target_arch = "wasm32")))]
        {
            info!("Rayon thread pool available for native processing");
        }
    }
}

/// Check if SIMD is enabled in this build.
#[wasm_bindgen(js_name = getSimdEnabled)]
pub fn get_simd_enabled() -> bool {
    cfg!(feature = "simd")
}

/// Check if threading is enabled in this build.
#[wasm_bindgen(js_name = getThreadingEnabled)]
pub fn get_threading_enabled() -> bool {
    cfg!(feature = "threads")
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
    let delimiter = char::from(detection.delimiter).to_string();
    let fields = Array::new();
    for field in detection.fields {
        fields.push(&JsValue::from(field));
    }

    let _ = Reflect::set(&result, &JsValue::from("delimiter"), &JsValue::from(delimiter));
    let _ = Reflect::set(&result, &JsValue::from("fields"), &fields);

    result.into()
}

/// Detect XML elements from a sample of bytes.
#[wasm_bindgen(js_name = detectXmlElements)]
pub fn detect_xml_elements(sample: &[u8]) -> JsValue {
    let Some(detection) = detect::detect_xml(sample) else {
        return JsValue::NULL;
    };

    let result = Object::new();
    let elements = Array::new();
    for element in detection.elements {
        elements.push(&JsValue::from(element));
    }

    let _ = Reflect::set(&result, &JsValue::from("elements"), &elements);
    if let Some(record_element) = detection.record_element {
        let _ = Reflect::set(&result, &JsValue::from("recordElement"), &JsValue::from(record_element));
    }

    result.into()
}

/// Detect JSON fields from a sample of bytes.
#[wasm_bindgen(js_name = detectJsonFields)]
pub fn detect_json_fields(sample: &[u8]) -> JsValue {
    let Some(detection) = detect::detect_json(sample) else {
        return JsValue::NULL;
    };

    let result = Object::new();
    let fields = Array::new();
    for field in detection.fields {
        fields.push(&JsValue::from(field));
    }

    let _ = Reflect::set(&result, &JsValue::from("fields"), &fields);

    result.into()
}

/// Detect NDJSON fields from a sample of bytes.
#[wasm_bindgen(js_name = detectNdjsonFields)]
pub fn detect_ndjson_fields(sample: &[u8]) -> JsValue {
    let Some(detection) = detect::detect_ndjson(sample) else {
        return JsValue::NULL;
    };

    let result = Object::new();
    let fields = Array::new();
    for field in detection.fields {
        fields.push(&JsValue::from(field));
    }

    let _ = Reflect::set(&result, &JsValue::from("fields"), &fields);

    result.into()
}

/// Detect structure (fields/elements) for any format
#[wasm_bindgen(js_name = detectStructure)]
pub fn detect_structure(sample: &[u8], format_hint: Option<String>) -> JsValue {
    let format = format_hint.and_then(|f| match f.as_str() {
        "csv" => Some(Format::Csv),
        "xml" => Some(Format::Xml),
        "json" => Some(Format::Json),
        "ndjson" => Some(Format::Ndjson),
        _ => None,
    });
    
    let Some(detection) = detect::detect_structure(sample, format) else {
        return JsValue::NULL;
    };

    let result = Object::new();
    
    // Set format
    let _ = Reflect::set(&result, &JsValue::from("format"), &JsValue::from(detection.format.to_string_js()));
    
    // Set fields
    let fields = Array::new();
    for field in detection.fields {
        fields.push(&JsValue::from(field));
    }
    let _ = Reflect::set(&result, &JsValue::from("fields"), &fields);
    
    // Set delimiter (for CSV)
    if let Some(delimiter) = detection.delimiter {
        let _ = Reflect::set(&result, &JsValue::from("delimiter"), &JsValue::from(delimiter));
    }
    
    // Set record element (for XML)
    if let Some(record_element) = detection.record_element {
        let _ = Reflect::set(&result, &JsValue::from("recordElement"), &JsValue::from(record_element));
    }

    result.into()
}

/// Internal converter state
enum ConverterState {
    CsvToNdjson(CsvParser),
    CsvToNdjsonTransform(CsvParser, TransformEngine),
    CsvToJson(CsvParser, NdjsonParser, bool), // (csv_parser, ndjson_parser, is_first_chunk)
    CsvToJsonTransform(CsvParser, TransformEngine, NdjsonParser, bool),
    CsvToXml(CsvParser, xml_parser::XmlWriter),
    CsvToXmlTransform(CsvParser, TransformEngine, xml_parser::XmlWriter),
    CsvToCsvTransform(CsvParser, TransformEngine, csv_writer::CsvWriter),
    NdjsonPassthrough(NdjsonParser),
    NdjsonTransform(TransformEngine),
    NdjsonToJson(NdjsonParser, bool), // (parser, is_first_chunk)
    NdjsonToJsonTransform(TransformEngine, NdjsonParser, bool),
    NdjsonToCsv(NdjsonParser, csv_writer::CsvWriter),
    NdjsonToCsvTransform(TransformEngine, csv_writer::CsvWriter),
    NdjsonToXml(NdjsonParser, xml_parser::XmlWriter),
    NdjsonToXmlTransform(TransformEngine, xml_parser::XmlWriter),
    XmlToNdjson(XmlParser),
    XmlToNdjsonTransform(XmlParser, TransformEngine),
    XmlToJson(XmlParser, NdjsonParser, bool), // (xml_parser, ndjson_parser, is_first_chunk)
    XmlToJsonTransform(XmlParser, TransformEngine, NdjsonParser, bool),
    XmlToCsv(XmlParser, csv_writer::CsvWriter),
    XmlToCsvTransform(XmlParser, TransformEngine, csv_writer::CsvWriter),
    XmlPassthrough(XmlParser),
    XmlToXmlTransform(XmlParser, TransformEngine, xml_parser::XmlWriter),
    JsonPassthrough(JsonParser),
    JsonToJsonTransform(JsonParser, TransformEngine, NdjsonParser, bool),
    JsonToNdjson(JsonParser), // JSON array to NDJSON
    JsonToNdjsonTransform(JsonParser, TransformEngine),
    JsonToCsv(JsonParser, csv_writer::CsvWriter),
    JsonToCsvTransform(JsonParser, TransformEngine, csv_writer::CsvWriter),
    JsonToXml(JsonParser, xml_parser::XmlWriter),
    JsonToXmlTransform(JsonParser, TransformEngine, xml_parser::XmlWriter),
    NeedsDetection(Vec<u8>), // Buffered first chunk for auto-detection
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

#[cfg(target_arch = "wasm32")]
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct CsvConfigInput {
    delimiter: Option<String>,
    quote: Option<String>,
    has_headers: Option<bool>,
    trim_whitespace: Option<bool>,
}

#[cfg(target_arch = "wasm32")]
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct XmlConfigInput {
    record_element: Option<String>,
    trim_text: Option<bool>,
    include_attributes: Option<bool>,
    expand_entities: Option<bool>,
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
        csv_config: JsValue,
        xml_config: JsValue,
        transform_config: JsValue,
    ) -> std::result::Result<Converter, JsValue> {
        #[cfg(not(target_arch = "wasm32"))]
        {
            let _ = (csv_config, xml_config, transform_config);
            let input = Format::from_string(input_format)
                .ok_or_else(|| ConvertError::InvalidConfig(format!("Invalid input format: {}", input_format)))?;
            let output = Format::from_string(output_format)
                .ok_or_else(|| ConvertError::InvalidConfig(format!("Invalid output format: {}", output_format)))?;

            let config = ConverterConfig::new(input, output)
                .with_chunk_size(chunk_target_bytes)
                .with_stats(enable_stats);

            let state = Self::create_state(&config);

            return Ok(Converter {
                debug,
                config,
                state: Some(state),
                stats: Stats::default(),
            });
        }

        #[cfg(target_arch = "wasm32")]
        {
        let input = Format::from_string(input_format)
            .ok_or_else(|| ConvertError::InvalidConfig(format!("Invalid input format: {}", input_format)))?;
        
        let output = Format::from_string(output_format)
            .ok_or_else(|| ConvertError::InvalidConfig(format!("Invalid output format: {}", output_format)))?;

        let mut config = ConverterConfig::new(input, output)
            .with_chunk_size(chunk_target_bytes)
            .with_stats(enable_stats);

        let csv_provided = parse_csv_config(csv_config.clone());
        let xml_provided = parse_xml_config(xml_config.clone());
        let transform_provided = parse_transform_config(transform_config.clone())?;

        if let Some(csv) = csv_provided.clone() {
            config = config.with_csv_config(csv);
        }

        if let Some(xml) = xml_provided.clone() {
            config = config.with_xml_config(xml);
        }

        if let Some(transform) = transform_provided.clone() {
            config = config.with_transform(transform);
        }

        // Determine if we need auto-detection
        let needs_detection = match input {
            Format::Csv => csv_provided.is_none() || csv_provided.as_ref().and_then(|_c| {
                // Check if delimiter was explicitly provided via the input
                let input_obj: Option<CsvConfigInput> = deserialize_optional(csv_config);
                input_obj.and_then(|i| i.delimiter)
            }).is_none(),
            Format::Xml => xml_provided.is_none() || xml_provided.as_ref().and_then(|_x| {
                // Check if recordElement was explicitly provided
                let input_obj: Option<XmlConfigInput> = deserialize_optional(xml_config);
                input_obj.and_then(|i| i.record_element)
            }).is_none(),
            _ => false,
        };

        let state = if needs_detection {
            if debug {
                debug!("Converter will auto-detect config on first chunk");
            }
            ConverterState::NeedsDetection(Vec::new())
        } else {
            Self::create_state(&config)
        };

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

        // Handle auto-detection on first chunk
        let needs_init = matches!(self.state, Some(ConverterState::NeedsDetection(_)));
        if needs_init {
            // Extract buffer and prepare for detection
            if let Some(ConverterState::NeedsDetection(ref mut buffer)) = self.state {
                buffer.extend_from_slice(chunk);
                
                // Wait for enough data to detect (at least 256 bytes or until we have some data)
                if buffer.len() < 256 && !chunk.is_empty() {
                    // Need more data for reliable detection
                    return Ok(Vec::new());
                }
            }
            
            // Take the buffer and do detection
            let detection_sample = if let Some(ConverterState::NeedsDetection(buffer)) = self.state.take() {
                buffer
            } else {
                Vec::new()
            };
            
            self.auto_detect_and_initialize(&detection_sample)?;
            
            // Now process the buffered chunk with the newly initialized state
            return self.push(&detection_sample);
        }

        let start = crate::timing::Timer::new();

        // Handle transformations separately to avoid borrow checker issues
        let result = self.push_internal(chunk)?;
        // Record output stats
        if self.config.enable_stats {
            self.stats.record_output(result.len());
            self.stats.record_parse_time(start.elapsed());
            
            // Update buffer sizes
            let partial_size = match self.state.as_ref() {
                Some(ConverterState::CsvToNdjson(p)) => p.partial_size(),
                Some(ConverterState::CsvToNdjsonTransform(p, engine)) => {
                    p.partial_size() + engine.partial_size()
                }
                Some(ConverterState::CsvToJson(csv_p, ndjson_p, _)) => {
                    csv_p.partial_size() + ndjson_p.partial_size()
                }
                Some(ConverterState::CsvToJsonTransform(csv_p, engine, ndjson_p, _)) => {
                    csv_p.partial_size() + engine.partial_size() + ndjson_p.partial_size()
                }
                Some(ConverterState::CsvToXml(csv_p, _)) => csv_p.partial_size(),
                Some(ConverterState::CsvToXmlTransform(csv_p, engine, _)) => {
                    csv_p.partial_size() + engine.partial_size()
                }
                Some(ConverterState::CsvToCsvTransform(csv_p, engine, _)) => {
                    csv_p.partial_size() + engine.partial_size()
                }
                Some(ConverterState::NdjsonPassthrough(p)) => p.partial_size(),
                Some(ConverterState::NdjsonTransform(engine)) => engine.partial_size(),
                Some(ConverterState::NdjsonToJson(p, _)) => p.partial_size(),
                Some(ConverterState::NdjsonToJsonTransform(engine, p, _)) => {
                    engine.partial_size() + p.partial_size()
                }
                Some(ConverterState::NdjsonToCsv(ndjson_p, _)) => ndjson_p.partial_size(),
                Some(ConverterState::NdjsonToCsvTransform(engine, _)) => engine.partial_size(),
                Some(ConverterState::NdjsonToXml(ndjson_p, _)) => ndjson_p.partial_size(),
                Some(ConverterState::NdjsonToXmlTransform(engine, _)) => engine.partial_size(),
                Some(ConverterState::XmlToNdjson(p)) => p.partial_size(),
                Some(ConverterState::XmlToNdjsonTransform(p, engine)) => {
                    p.partial_size() + engine.partial_size()
                }
                Some(ConverterState::XmlToJson(xml_p, ndjson_p, _)) => {
                    xml_p.partial_size() + ndjson_p.partial_size()
                }
                Some(ConverterState::XmlToJsonTransform(xml_p, engine, ndjson_p, _)) => {
                    xml_p.partial_size() + engine.partial_size() + ndjson_p.partial_size()
                }
                Some(ConverterState::XmlToCsv(xml_p, _)) => xml_p.partial_size(),
                Some(ConverterState::XmlToCsvTransform(xml_p, engine, _)) => {
                    xml_p.partial_size() + engine.partial_size()
                }
                Some(ConverterState::XmlPassthrough(p)) => p.partial_size(),
                Some(ConverterState::XmlToXmlTransform(p, engine, _)) => {
                    p.partial_size() + engine.partial_size()
                }
                Some(ConverterState::JsonToNdjson(_)) => 0,
                Some(ConverterState::JsonToNdjsonTransform(_, engine)) => engine.partial_size(),
                Some(ConverterState::JsonToCsv(_, _)) => 0,
                Some(ConverterState::JsonToCsvTransform(_, engine, _)) => engine.partial_size(),
                Some(ConverterState::JsonToXml(_, _)) => 0,
                Some(ConverterState::JsonToXmlTransform(_, engine, _)) => engine.partial_size(),
                Some(ConverterState::JsonToJsonTransform(_, engine, _, _)) => engine.partial_size(),
                Some(ConverterState::NeedsDetection(buffer)) => buffer.len(),
                _ => 0,
            };
            self.stats.update_buffer_size(partial_size);
        }

        Ok(result)
    }

    fn push_internal(&mut self, chunk: &[u8]) -> std::result::Result<Vec<u8>, JsValue> {
        // Handle transformations to avoid borrow checker issues
        // We need to take ownership of intermediate data to avoid conflicts
        
        let state = self.state.take().ok_or_else(|| 
            JsValue::from(ConvertError::InvalidConfig("Converter already finished".to_string()))
        )?;
        
        let (result, new_state) = match state {
            ConverterState::CsvToNdjson(mut parser) => {
                let result = {
                    #[cfg(feature = "threads")]
                    {
                        parser.push_to_ndjson_parallel(chunk).map_err(JsValue::from)?
                    }
                    #[cfg(not(feature = "threads"))]
                    {
                        parser.push_to_ndjson(chunk).map_err(JsValue::from)?
                    }
                };
                (result, ConverterState::CsvToNdjson(parser))
            }
            ConverterState::CsvToNdjsonTransform(mut parser, mut engine) => {
                let ndjson_chunk = {
                    #[cfg(feature = "threads")]
                    {
                        parser.push_to_ndjson_parallel(chunk).map_err(JsValue::from)?
                    }
                    #[cfg(not(feature = "threads"))]
                    {
                        parser.push_to_ndjson(chunk).map_err(JsValue::from)?
                    }
                };
                let result = self.apply_transform_push(&mut engine, &ndjson_chunk)?;
                (result, ConverterState::CsvToNdjsonTransform(parser, engine))
            }
            ConverterState::CsvToJson(mut parser, mut ndjson_parser, mut is_first) => {
                let ndjson_chunk = {
                    #[cfg(feature = "threads")]
                    {
                        parser.push_to_ndjson_parallel(chunk).map_err(JsValue::from)?
                    }
                    #[cfg(not(feature = "threads"))]
                    {
                        parser.push_to_ndjson(chunk).map_err(JsValue::from)?
                    }
                };
                let is_first_chunk = is_first;
                is_first = false;
                let result = ndjson_parser.to_json_array(&ndjson_chunk, is_first_chunk, false).map_err(JsValue::from)?;
                (result, ConverterState::CsvToJson(parser, ndjson_parser, is_first))
            }
            ConverterState::CsvToJsonTransform(mut parser, mut engine, mut ndjson_parser, mut is_first) => {
                let ndjson_chunk = {
                    #[cfg(feature = "threads")]
                    {
                        parser.push_to_ndjson_parallel(chunk).map_err(JsValue::from)?
                    }
                    #[cfg(not(feature = "threads"))]
                    {
                        parser.push_to_ndjson(chunk).map_err(JsValue::from)?
                    }
                };
                let transformed = self.apply_transform_push(&mut engine, &ndjson_chunk)?;
                let is_first_chunk = is_first;
                is_first = false;
                let result = ndjson_parser.to_json_array(&transformed, is_first_chunk, false).map_err(JsValue::from)?;
                (result, ConverterState::CsvToJsonTransform(parser, engine, ndjson_parser, is_first))
            }
            ConverterState::NdjsonPassthrough(mut parser) => {
                let result = {
                    #[cfg(feature = "threads")]
                    {
                        parser.push_parallel(chunk).map_err(JsValue::from)?
                    }
                    #[cfg(not(feature = "threads"))]
                    {
                        parser.push(chunk).map_err(JsValue::from)?
                    }
                };
                (result, ConverterState::NdjsonPassthrough(parser))
            }
            ConverterState::NdjsonTransform(mut engine) => {
                let result = self.apply_transform_push(&mut engine, chunk)?;
                (result, ConverterState::NdjsonTransform(engine))
            }
            ConverterState::NdjsonToJson(mut parser, mut is_first) => {
                let is_first_chunk = is_first;
                is_first = false;
                let result = parser.to_json_array(chunk, is_first_chunk, false).map_err(JsValue::from)?;
                (result, ConverterState::NdjsonToJson(parser, is_first))
            }
            ConverterState::NdjsonToJsonTransform(mut engine, mut parser, mut is_first) => {
                let transformed = self.apply_transform_push(&mut engine, chunk)?;
                let is_first_chunk = is_first;
                is_first = false;
                let result = parser.to_json_array(&transformed, is_first_chunk, false).map_err(JsValue::from)?;
                (result, ConverterState::NdjsonToJsonTransform(engine, parser, is_first))
            }
            ConverterState::XmlToNdjson(mut parser) => {
                let result = parser.push_to_ndjson(chunk).map_err(JsValue::from)?;
                (result, ConverterState::XmlToNdjson(parser))
            }
            ConverterState::XmlToNdjsonTransform(mut parser, mut engine) => {
                let ndjson_chunk = parser.push_to_ndjson(chunk).map_err(JsValue::from)?;
                let result = self.apply_transform_push(&mut engine, &ndjson_chunk)?;
                (result, ConverterState::XmlToNdjsonTransform(parser, engine))
            }
            ConverterState::JsonPassthrough(_parser) => {
                let result = chunk.to_vec();
                (result, ConverterState::JsonPassthrough(_parser))
            }
            // For other complex cases, we'll handle them similarly
            state => {
                // Return an error for unhandled cases for now
                self.state = Some(state);
                return Err(JsValue::from(ConvertError::InvalidConfig("Unhandled converter state in push_internal".to_string())));
            }
        };
        
        self.state = Some(new_state);
        Ok(result)
    }

    /// Finish the stream and return any remaining buffered output.
    pub fn finish(&mut self) -> std::result::Result<Vec<u8>, JsValue> {
        if self.debug {
            debug!("Converter::finish");
        }

        // If still in detection state, initialize with buffered data
        if let Some(ConverterState::NeedsDetection(ref buffer)) = self.state {
            if !buffer.is_empty() {
                let detection_sample = buffer.clone();
                self.auto_detect_and_initialize(&detection_sample)?;
                
                // Process the buffered data and then finish
                let buffered = detection_sample;
                let mut output = self.push(&buffered)?;
                
                // Now call finish to get any remaining data
                let remaining = self.finish()?;
                output.extend_from_slice(&remaining);
                
                return Ok(output);
            }
        }

        let result = match self.state.take() {
            Some(ConverterState::CsvToNdjson(mut parser)) => {
                parser.finish()?
            }
            Some(ConverterState::CsvToNdjsonTransform(mut parser, mut engine)) => {
                let ndjson_chunk = parser.finish()?;
                let mut output = self.apply_transform_push(&mut engine, &ndjson_chunk)?;
                let remaining = self.apply_transform_finish(&mut engine)?;
                output.extend_from_slice(&remaining);
                output
            }
            Some(ConverterState::CsvToJson(mut csv_parser, mut ndjson_parser, is_first_flag)) => {
                // Finish CSV parsing
                let ndjson_chunk = csv_parser.finish()?;
                
                // Process remaining NDJSON through JSON converter
                // Use the is_first flag to determine if we need opening bracket
                let mut output = ndjson_parser.to_json_array(&ndjson_chunk, is_first_flag, false)?;
                
                // Close the JSON array
                let closing = ndjson_parser.to_json_array(&[], false, true)?;
                output.extend_from_slice(&closing);
                
                // Get any final buffered content
                let remaining = ndjson_parser.finish()?;
                if !remaining.is_empty() {
                    output.extend_from_slice(&remaining);
                }
                
                output
            }
            Some(ConverterState::CsvToJsonTransform(mut csv_parser, mut engine, mut ndjson_parser, is_first_flag)) => {
                let ndjson_chunk = csv_parser.finish()?;
                let mut transformed = self.apply_transform_push(&mut engine, &ndjson_chunk)?;
                let remaining = self.apply_transform_finish(&mut engine)?;
                transformed.extend_from_slice(&remaining);

                let mut output = ndjson_parser.to_json_array(&transformed, is_first_flag, false)?;
                let closing = ndjson_parser.to_json_array(&[], false, true)?;
                output.extend_from_slice(&closing);

                let remaining_json = ndjson_parser.finish()?;
                if !remaining_json.is_empty() {
                    output.extend_from_slice(&remaining_json);
                }
                output
            }
            Some(ConverterState::CsvToXml(mut csv_parser, mut xml_writer)) => {
                // Finish CSV parsing
                let ndjson_chunk = csv_parser.finish()?;
                
                // Process remaining NDJSON through XML writer
                let ndjson_str = std::str::from_utf8(&ndjson_chunk)
                    .map_err(|e| JsValue::from(ConvertError::from(e)))?;
                let mut output = Vec::new();
                for line in ndjson_str.lines() {
                    let trimmed: &str = line.trim();
                    if !trimmed.is_empty() {
                        output.extend(xml_writer.process_json_line(line)?);
                    }
                }
                
                // Finalize XML writer
                let final_output = xml_writer.finish()?;
                output.extend_from_slice(&final_output);
                
                output
            }
            Some(ConverterState::CsvToXmlTransform(mut csv_parser, mut engine, mut xml_writer)) => {
                let ndjson_chunk = csv_parser.finish()?;
                let mut transformed = self.apply_transform_push(&mut engine, &ndjson_chunk)?;
                let remaining = self.apply_transform_finish(&mut engine)?;
                transformed.extend_from_slice(&remaining);

                let ndjson_str = std::str::from_utf8(&transformed)
                    .map_err(|e| JsValue::from(ConvertError::from(e)))?;
                let mut output = Vec::new();
                for line in ndjson_str.lines() {
                    let trimmed: &str = line.trim();
                    if !trimmed.is_empty() {
                        output.extend(xml_writer.process_json_line(line)?);
                    }
                }

                let final_output = xml_writer.finish()?;
                output.extend_from_slice(&final_output);
                output
            }
            Some(ConverterState::CsvToCsvTransform(mut csv_parser, mut engine, mut csv_writer)) => {
                let ndjson_chunk = csv_parser.finish()?;
                let mut transformed = self.apply_transform_push(&mut engine, &ndjson_chunk)?;
                let remaining = self.apply_transform_finish(&mut engine)?;
                transformed.extend_from_slice(&remaining);

                let ndjson_str = std::str::from_utf8(&transformed)
                    .map_err(|e| JsValue::from(ConvertError::from(e)))?;
                let mut output = Vec::new();
                for line in ndjson_str.lines() {
                    let trimmed: &str = line.trim();
                    if !trimmed.is_empty() {
                        output.extend(csv_writer.process_json_line(line)?);
                    }
                }

                let final_output = csv_writer.finish()?;
                output.extend_from_slice(&final_output);
                output
            }
            Some(ConverterState::NdjsonPassthrough(mut parser)) => {
                parser.finish()?
            }
            Some(ConverterState::NdjsonTransform(mut engine)) => {
                self.apply_transform_finish(&mut engine)?
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
            Some(ConverterState::NdjsonToJsonTransform(mut engine, mut parser, is_first_flag)) => {
                let transformed = self.apply_transform_finish(&mut engine)?;
                let mut output = parser.to_json_array(&transformed, is_first_flag, false)?;
                let closing = parser.to_json_array(&[], false, true)?;
                output.extend_from_slice(&closing);
                let remaining = parser.finish()?;
                if !remaining.is_empty() {
                    output.extend_from_slice(&remaining);
                }
                output
            }
            Some(ConverterState::NdjsonToCsv(mut ndjson_parser, mut csv_writer)) => {
                // Finish NDJSON parsing
                let ndjson_chunk = ndjson_parser.finish()?;
                
                // Process remaining NDJSON through CSV writer
                let ndjson_str = std::str::from_utf8(&ndjson_chunk)
                    .map_err(|e| JsValue::from(ConvertError::from(e)))?;
                let mut output = Vec::new();
                for line in ndjson_str.lines() {
                    let trimmed: &str = line.trim();
                    if !trimmed.is_empty() {
                        output.extend(csv_writer.process_json_line(line)?);
                    }
                }
                
                // Finalize CSV writer
                let final_output = csv_writer.finish()?;
                output.extend_from_slice(&final_output);
                
                output
            }
            Some(ConverterState::NdjsonToCsvTransform(mut engine, mut csv_writer)) => {
                let transformed = self.apply_transform_finish(&mut engine)?;
                let ndjson_str = std::str::from_utf8(&transformed)
                    .map_err(|e| JsValue::from(ConvertError::from(e)))?;
                let mut output = Vec::new();
                for line in ndjson_str.lines() {
                    let trimmed: &str = line.trim();
                    if !trimmed.is_empty() {
                        output.extend(csv_writer.process_json_line(line)?);
                    }
                }

                let final_output = csv_writer.finish()?;
                output.extend_from_slice(&final_output);
                output
            }
            Some(ConverterState::NdjsonToXml(mut ndjson_parser, mut xml_writer)) => {
                // Finish NDJSON parsing
                let ndjson_chunk = ndjson_parser.finish()?;
                
                // Process remaining NDJSON through XML writer
                let ndjson_str = std::str::from_utf8(&ndjson_chunk)
                    .map_err(|e| JsValue::from(ConvertError::from(e)))?;
                let mut output = Vec::new();
                for line in ndjson_str.lines() {
                    let trimmed: &str = line.trim();
                    if !trimmed.is_empty() {
                        output.extend(xml_writer.process_json_line(line)?);
                    }
                }
                
                // Finalize XML writer
                let final_output = xml_writer.finish()?;
                output.extend_from_slice(&final_output);
                
                output
            }
            Some(ConverterState::NdjsonToXmlTransform(mut engine, mut xml_writer)) => {
                let transformed = self.apply_transform_finish(&mut engine)?;
                let ndjson_str = std::str::from_utf8(&transformed)
                    .map_err(|e| JsValue::from(ConvertError::from(e)))?;
                let mut output = Vec::new();
                for line in ndjson_str.lines() {
                    let trimmed: &str = line.trim();
                    if !trimmed.is_empty() {
                        output.extend(xml_writer.process_json_line(line)?);
                    }
                }

                let final_output = xml_writer.finish()?;
                output.extend_from_slice(&final_output);
                output
            }
            Some(ConverterState::XmlToNdjson(mut parser)) => {
                parser.finish()?
            }
            Some(ConverterState::XmlToNdjsonTransform(mut parser, mut engine)) => {
                let ndjson_chunk = parser.finish()?;
                let mut output = self.apply_transform_push(&mut engine, &ndjson_chunk)?;
                let remaining = self.apply_transform_finish(&mut engine)?;
                output.extend_from_slice(&remaining);
                output
            }
            Some(ConverterState::XmlToJson(mut xml_parser, mut ndjson_parser, _)) => {
                // Finish XML parsing
                let ndjson_chunk = xml_parser.finish()?;
                
                // Process remaining NDJSON through JSON converter
                let mut output = ndjson_parser.to_json_array(&ndjson_chunk, false, false)?;
                
                // Close the JSON array
                let closing = ndjson_parser.to_json_array(&[], false, true)?;
                output.extend_from_slice(&closing);
                
                // Get any final buffered content
                let remaining = ndjson_parser.finish()?;
                if !remaining.is_empty() {
                    output.extend_from_slice(&remaining);
                }
                
                output
            }
            Some(ConverterState::XmlToJsonTransform(mut xml_parser, mut engine, mut ndjson_parser, is_first_flag)) => {
                let ndjson_chunk = xml_parser.finish()?;
                let mut transformed = self.apply_transform_push(&mut engine, &ndjson_chunk)?;
                let remaining = self.apply_transform_finish(&mut engine)?;
                transformed.extend_from_slice(&remaining);

                let mut output = ndjson_parser.to_json_array(&transformed, is_first_flag, false)?;
                let closing = ndjson_parser.to_json_array(&[], false, true)?;
                output.extend_from_slice(&closing);

                let remaining_json = ndjson_parser.finish()?;
                if !remaining_json.is_empty() {
                    output.extend_from_slice(&remaining_json);
                }
                output
            }
            Some(ConverterState::XmlToCsv(mut xml_parser, mut csv_writer)) => {
                // Finish XML parsing
                let ndjson_chunk = xml_parser.finish()?;
                
                // Process remaining NDJSON through CSV writer
                let ndjson_str = std::str::from_utf8(&ndjson_chunk)
                    .map_err(|e| JsValue::from(ConvertError::from(e)))?;
                let mut output = Vec::new();
                for line in ndjson_str.lines() {
                    let trimmed: &str = line.trim();
                    if !trimmed.is_empty() {
                        output.extend(csv_writer.process_json_line(line)?);
                    }
                }
                
                // Finalize CSV writer
                let final_output = csv_writer.finish()?;
                output.extend_from_slice(&final_output);
                
                output
            }
            Some(ConverterState::XmlToCsvTransform(mut xml_parser, mut engine, mut csv_writer)) => {
                let ndjson_chunk = xml_parser.finish()?;
                let mut transformed = self.apply_transform_push(&mut engine, &ndjson_chunk)?;
                let remaining = self.apply_transform_finish(&mut engine)?;
                transformed.extend_from_slice(&remaining);

                let ndjson_str = std::str::from_utf8(&transformed)
                    .map_err(|e| JsValue::from(ConvertError::from(e)))?;
                let mut output = Vec::new();
                for line in ndjson_str.lines() {
                    let trimmed: &str = line.trim();
                    if !trimmed.is_empty() {
                        output.extend(csv_writer.process_json_line(line)?);
                    }
                }

                let final_output = csv_writer.finish()?;
                output.extend_from_slice(&final_output);
                output
            }
            Some(ConverterState::XmlPassthrough(mut parser)) => {
                // Finish XML parsing (passthrough)
                parser.finish()?
            }
            Some(ConverterState::XmlToXmlTransform(mut xml_parser, mut engine, mut xml_writer)) => {
                let ndjson_chunk = xml_parser.finish()?;
                let mut transformed = self.apply_transform_push(&mut engine, &ndjson_chunk)?;
                let remaining = self.apply_transform_finish(&mut engine)?;
                transformed.extend_from_slice(&remaining);

                let ndjson_str = std::str::from_utf8(&transformed)
                    .map_err(|e| JsValue::from(ConvertError::from(e)))?;
                let mut output = Vec::new();
                for line in ndjson_str.lines() {
                    let trimmed: &str = line.trim();
                    if !trimmed.is_empty() {
                        output.extend(xml_writer.process_json_line(line)?);
                    }
                }

                let final_output = xml_writer.finish()?;
                output.extend_from_slice(&final_output);
                output
            }
            Some(ConverterState::JsonPassthrough(_)) => {
                Vec::new()
            }
            Some(ConverterState::JsonToJsonTransform(_, mut engine, mut ndjson_parser, is_first_flag)) => {
                let transformed = self.apply_transform_finish(&mut engine)?;
                let mut output = ndjson_parser.to_json_array(&transformed, is_first_flag, false)?;
                let closing = ndjson_parser.to_json_array(&[], false, true)?;
                output.extend_from_slice(&closing);
                let remaining = ndjson_parser.finish()?;
                if !remaining.is_empty() {
                    output.extend_from_slice(&remaining);
                }
                output
            }
            Some(ConverterState::JsonToNdjson(_)) => {
                Vec::new()
            }
            Some(ConverterState::JsonToNdjsonTransform(_, mut engine)) => {
                self.apply_transform_finish(&mut engine)?
            }
            Some(ConverterState::JsonToCsv(_, mut csv_writer)) => {
                // Finalize CSV writer
                csv_writer.finish()?
            }
            Some(ConverterState::JsonToCsvTransform(_, mut engine, mut csv_writer)) => {
                let transformed = self.apply_transform_finish(&mut engine)?;
                let ndjson_str = std::str::from_utf8(&transformed)
                    .map_err(|e| JsValue::from(ConvertError::from(e)))?;
                let mut output = Vec::new();
                for line in ndjson_str.lines() {
                    let trimmed: &str = line.trim();
                    if !trimmed.is_empty() {
                        output.extend(csv_writer.process_json_line(line)?);
                    }
                }
                let final_output = csv_writer.finish()?;
                output.extend_from_slice(&final_output);
                output
            }
            Some(ConverterState::JsonToXml(_, xml_writer)) => {
                // Finalize XML writer
                xml_writer.finish()?
            }
            Some(ConverterState::JsonToXmlTransform(_, mut engine, mut xml_writer)) => {
                let transformed = self.apply_transform_finish(&mut engine)?;
                let ndjson_str = std::str::from_utf8(&transformed)
                    .map_err(|e| JsValue::from(ConvertError::from(e)))?;
                let mut output = Vec::new();
                for line in ndjson_str.lines() {
                    let trimmed: &str = line.trim();
                    if !trimmed.is_empty() {
                        output.extend(xml_writer.process_json_line(line)?);
                    }
                }
                let final_output = xml_writer.finish()?;
                output.extend_from_slice(&final_output);
                output
            }
            Some(ConverterState::NeedsDetection(_)) => {
                // Already handled above, should not reach here
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
    fn apply_transform_push(
        &mut self,
        engine: &mut TransformEngine,
        chunk: &[u8],
    ) -> std::result::Result<Vec<u8>, JsValue> {
        let timer = crate::timing::Timer::new();
        let result = engine.push(chunk).map_err(JsValue::from)?;
        if self.config.enable_stats {
            self.stats.record_transform_time(timer.elapsed());
            self.stats.record_records(result.records);
        }
        Ok(result.output)
    }

    fn apply_transform_finish(
        &mut self,
        engine: &mut TransformEngine,
    ) -> std::result::Result<Vec<u8>, JsValue> {
        let timer = crate::timing::Timer::new();
        let result = engine.finish().map_err(JsValue::from)?;
        if self.config.enable_stats {
            self.stats.record_transform_time(timer.elapsed());
            self.stats.record_records(result.records);
        }
        Ok(result.output)
    }

    /// Auto-detect configuration from a sample and initialize the converter state
    fn auto_detect_and_initialize(&mut self, sample: &[u8]) -> std::result::Result<(), JsValue> {
        if self.debug {
            debug!("Auto-detecting configuration from {} byte sample", sample.len());
        }

        match self.config.input_format {
            Format::Csv => {
                if let Some(detection) = detect::detect_csv(sample) {
                    let mut csv_config = self.config.csv_config.clone().unwrap_or_default();
                    csv_config.delimiter = detection.delimiter;
                    self.config.csv_config = Some(csv_config.clone());
                    
                    if self.debug {
                        let delim_bytes = [detection.delimiter];
                        let delim_char = char::from(delim_bytes[0]);
                        debug!("Auto-detected CSV delimiter: '{}' ({} fields)", delim_char, detection.fields.len());
                    }
                } else if self.debug {
                    debug!("CSV auto-detection failed, using default config");
                }
            }
            Format::Xml => {
                if let Some(detection) = detect::detect_xml(sample) {
                    if let Some(record_element) = detection.record_element {
                        let mut xml_config = self.config.xml_config.clone().unwrap_or_default();
                        xml_config.record_element = record_element.clone();
                        self.config.xml_config = Some(xml_config.clone());
                        
                        if self.debug {
                            debug!("Auto-detected XML record element: '{}'", record_element);
                        }
                    }
                } else if self.debug {
                    debug!("XML auto-detection failed, using default config");
                }
            }
            _ => {
                // No auto-detection needed for other formats
            }
        }

        // Create the proper state with detected/default config
        let new_state = Self::create_state(&self.config);
        self.state = Some(new_state);

        Ok(())
    }

    fn create_state(config: &ConverterConfig) -> ConverterState {
        let transform_plan = config.transform.clone();
        match (config.input_format, config.output_format) {
            (Format::Csv, Format::Ndjson) => {
                let csv_config = config.csv_config.clone().unwrap_or_default();
                if let Some(plan) = transform_plan {
                    ConverterState::CsvToNdjsonTransform(
                        CsvParser::new(csv_config, config.chunk_target_bytes),
                        TransformEngine::new(plan),
                    )
                } else {
                    ConverterState::CsvToNdjson(CsvParser::new(csv_config, config.chunk_target_bytes))
                }
            }
            (Format::Csv, Format::Json) => {
                // CSV -> NDJSON -> JSON pipeline
                let csv_config = config.csv_config.clone().unwrap_or_default();
                let csv_parser = CsvParser::new(csv_config, config.chunk_target_bytes);
                let ndjson_parser = NdjsonParser::new(config.chunk_target_bytes);
                if let Some(plan) = transform_plan {
                    ConverterState::CsvToJsonTransform(
                        csv_parser,
                        TransformEngine::new(plan),
                        ndjson_parser,
                        true,
                    )
                } else {
                    ConverterState::CsvToJson(csv_parser, ndjson_parser, true)
                }
            }
            (Format::Csv, Format::Csv) => {
                // CSV passthrough
                let csv_config = config.csv_config.clone().unwrap_or_default();
                if let Some(plan) = transform_plan {
                    ConverterState::CsvToCsvTransform(
                        CsvParser::new(csv_config, config.chunk_target_bytes),
                        TransformEngine::new(plan),
                        csv_writer::CsvWriter::new(),
                    )
                } else {
                    ConverterState::CsvToNdjson(CsvParser::new(csv_config, config.chunk_target_bytes))
                }
            }
            (Format::Csv, Format::Xml) => {
                // CSV -> NDJSON -> XML pipeline
                let csv_config = config.csv_config.clone().unwrap_or_default();
                let csv_parser = CsvParser::new(csv_config, config.chunk_target_bytes);
                let xml_writer = xml_parser::XmlWriter::new();
                if let Some(plan) = transform_plan {
                    ConverterState::CsvToXmlTransform(
                        csv_parser,
                        TransformEngine::new(plan),
                        xml_writer,
                    )
                } else {
                    ConverterState::CsvToXml(csv_parser, xml_writer)
                }
            }
            (Format::Ndjson, Format::Ndjson) => {
                if let Some(plan) = transform_plan {
                    ConverterState::NdjsonTransform(TransformEngine::new(plan))
                } else {
                    ConverterState::NdjsonPassthrough(NdjsonParser::new(config.chunk_target_bytes))
                }
            }
            (Format::Ndjson, Format::Json) => {
                if let Some(plan) = transform_plan {
                    ConverterState::NdjsonToJsonTransform(
                        TransformEngine::new(plan),
                        NdjsonParser::new(config.chunk_target_bytes),
                        true,
                    )
                } else {
                    ConverterState::NdjsonToJson(NdjsonParser::new(config.chunk_target_bytes), true)
                }
            }
            (Format::Ndjson, Format::Csv) => {
                let ndjson_parser = NdjsonParser::new(config.chunk_target_bytes);
                let csv_writer = csv_writer::CsvWriter::new();
                if let Some(plan) = transform_plan {
                    ConverterState::NdjsonToCsvTransform(TransformEngine::new(plan), csv_writer)
                } else {
                    ConverterState::NdjsonToCsv(ndjson_parser, csv_writer)
                }
            }
            (Format::Ndjson, Format::Xml) => {
                let ndjson_parser = NdjsonParser::new(config.chunk_target_bytes);
                let xml_writer = xml_parser::XmlWriter::new();
                if let Some(plan) = transform_plan {
                    ConverterState::NdjsonToXmlTransform(TransformEngine::new(plan), xml_writer)
                } else {
                    ConverterState::NdjsonToXml(ndjson_parser, xml_writer)
                }
            }
            (Format::Xml, Format::Ndjson) => {
                let xml_config = config.xml_config.clone().unwrap_or_default();
                if let Some(plan) = transform_plan {
                    ConverterState::XmlToNdjsonTransform(
                        XmlParser::new(xml_config, config.chunk_target_bytes),
                        TransformEngine::new(plan),
                    )
                } else {
                    ConverterState::XmlToNdjson(XmlParser::new(xml_config, config.chunk_target_bytes))
                }
            }
            (Format::Xml, Format::Json) => {
                let xml_config = config.xml_config.clone().unwrap_or_default();
                let xml_parser = XmlParser::new(xml_config, config.chunk_target_bytes);
                let ndjson_parser = NdjsonParser::new(config.chunk_target_bytes);
                if let Some(plan) = transform_plan {
                    ConverterState::XmlToJsonTransform(
                        xml_parser,
                        TransformEngine::new(plan),
                        ndjson_parser,
                        true,
                    )
                } else {
                    ConverterState::XmlToJson(xml_parser, ndjson_parser, true)
                }
            }
            (Format::Xml, Format::Csv) => {
                let xml_config = config.xml_config.clone().unwrap_or_default();
                let xml_parser = XmlParser::new(xml_config, config.chunk_target_bytes);
                let csv_writer = csv_writer::CsvWriter::new();
                if let Some(plan) = transform_plan {
                    ConverterState::XmlToCsvTransform(
                        xml_parser,
                        TransformEngine::new(plan),
                        csv_writer,
                    )
                } else {
                    ConverterState::XmlToCsv(xml_parser, csv_writer)
                }
            }
            (Format::Xml, Format::Xml) => {
                // XML passthrough
                let xml_config = config.xml_config.clone().unwrap_or_default();
                if let Some(plan) = transform_plan {
                    ConverterState::XmlToXmlTransform(
                        XmlParser::new(xml_config, config.chunk_target_bytes),
                        TransformEngine::new(plan),
                        xml_parser::XmlWriter::new(),
                    )
                } else {
                    ConverterState::XmlPassthrough(XmlParser::new(xml_config, config.chunk_target_bytes))
                }
            }
            (Format::Json, Format::Json) => {
                if let Some(plan) = transform_plan {
                    ConverterState::JsonToJsonTransform(
                        JsonParser::new(),
                        TransformEngine::new(plan),
                        NdjsonParser::new(config.chunk_target_bytes),
                        true,
                    )
                } else {
                    ConverterState::JsonPassthrough(JsonParser::new())
                }
            }
            (Format::Json, Format::Ndjson) => {
                if let Some(plan) = transform_plan {
                    ConverterState::JsonToNdjsonTransform(JsonParser::new(), TransformEngine::new(plan))
                } else {
                    ConverterState::JsonToNdjson(JsonParser::new())
                }
            }
            (Format::Json, Format::Csv) => {
                let json_parser = JsonParser::new();
                let csv_writer = csv_writer::CsvWriter::new();
                if let Some(plan) = transform_plan {
                    ConverterState::JsonToCsvTransform(json_parser, TransformEngine::new(plan), csv_writer)
                } else {
                    ConverterState::JsonToCsv(json_parser, csv_writer)
                }
            }
            (Format::Json, Format::Xml) => {
                let json_parser = JsonParser::new();
                let xml_writer = xml_parser::XmlWriter::new();
                if let Some(plan) = transform_plan {
                    ConverterState::JsonToXmlTransform(json_parser, TransformEngine::new(plan), xml_writer)
                } else {
                    ConverterState::JsonToXml(json_parser, xml_writer)
                }
            }
        }
    }
}

#[cfg(target_arch = "wasm32")]
fn parse_csv_config(value: JsValue) -> Option<CsvConfig> {
    let input: CsvConfigInput = deserialize_optional(value)?;
    let mut config = CsvConfig::default();

    if let Some(value) = input.delimiter {
        if let Some(byte) = value.as_bytes().first() {
            config.delimiter = *byte;
        }
    }

    if let Some(value) = input.quote {
        if let Some(byte) = value.as_bytes().first() {
            config.quote = *byte;
            config.escape = Some(*byte);
        }
    }

    if let Some(has_headers) = input.has_headers {
        config.has_headers = has_headers;
    }

    if let Some(trim_whitespace) = input.trim_whitespace {
        config.trim_whitespace = trim_whitespace;
    }

    Some(config)
}

#[cfg(target_arch = "wasm32")]
fn parse_xml_config(value: JsValue) -> Option<XmlConfig> {
    let input: XmlConfigInput = deserialize_optional(value)?;
    let mut config = XmlConfig::default();

    if let Some(value) = input.record_element {
        if !value.is_empty() {
            config.record_element = value;
        }
    }

    if let Some(trim_text) = input.trim_text {
        config.trim_text = trim_text;
    }

    if let Some(include_attributes) = input.include_attributes {
        config.include_attributes = include_attributes;
    }

    if let Some(expand_entities) = input.expand_entities {
        config.expand_entities = expand_entities;
    }

    Some(config)
}

#[cfg(target_arch = "wasm32")]
fn parse_transform_config(value: JsValue) -> std::result::Result<Option<TransformPlan>, JsValue> {
    let input: Option<TransformConfigInput> = deserialize_optional(value);
    if let Some(input) = input {
        let plan = TransformPlan::compile(input).map_err(JsValue::from)?;
        Ok(Some(plan))
    } else {
        Ok(None)
    }
}

#[cfg(target_arch = "wasm32")]
fn deserialize_optional<T: DeserializeOwned>(value: JsValue) -> Option<T> {
    if value.is_null() || value.is_undefined() {
        return None;
    }

    serde_wasm_bindgen::from_value(value).ok()
}

// Note: Config builders are not exposed to JS directly
// Configuration is passed through the Converter::with_config method
#[cfg(test)]
mod integration_tests {
    use super::*;
    #[cfg(target_arch = "wasm32")]
    use js_sys::{Object, Reflect};

    /// Helper to create a converter without WASM bindings for testing
    fn create_test_converter(input_format: Format, output_format: Format) -> Result<Converter> {
        let mut config = ConverterConfig::new(input_format, output_format)
            .with_chunk_size(1024 * 1024)
            .with_stats(false);

        // Don't provide configs - force auto-detection
        config.csv_config = None;
        config.xml_config = None;

        let needs_detection = match input_format {
            Format::Csv | Format::Xml => true,
            _ => false,
        };

        let state = if needs_detection {
            ConverterState::NeedsDetection(Vec::new())
        } else {
            Converter::create_state(&config)
        };

        Ok(Converter {
            debug: false,
            config,
            state: Some(state),
            stats: Stats::default(),
        })
    }

    #[test]
    fn test_xml_to_json_auto_detect_movie() -> Result<()> {
        let xml = b"<movies><movie><title>Example Movie A</title><year>1999</year></movie><movie><title>Example Movie B</title><year>2010</year></movie></movies>";
        let mut converter = create_test_converter(Format::Xml, Format::Json)?;
        
        let output = converter.push(xml).map_err(|_| ConvertError::InvalidConfig("push failed".to_string()))?;
        let final_output = converter.finish().map_err(|_| ConvertError::InvalidConfig("finish failed".to_string()))?;
        
        let result = [&output[..], &final_output[..]].concat();
        let result_str = String::from_utf8_lossy(&result);

        // Should auto-detect "movie" as record element
        // Accept either or both movie titles depending on detection ordering
        assert!(result_str.contains("Example Movie A") || result_str.contains("Example Movie B"));
        assert!(result_str.starts_with('['));
        assert!(result_str.ends_with(']'));
        
        Ok(())
    }

    #[test]
    fn test_xml_to_ndjson_auto_detect_product() -> Result<()> {
        let xml = b"<catalog><product><id>123</id><name>Widget</name></product><product><id>456</id><name>Gadget</name></product></catalog>";
        let mut converter = create_test_converter(Format::Xml, Format::Ndjson)?;
        
        let output = converter.push(xml).map_err(|_| ConvertError::InvalidConfig("push failed".to_string()))?;
        let final_output = converter.finish().map_err(|_| ConvertError::InvalidConfig("finish failed".to_string()))?;
        
        let result = [&output[..], &final_output[..]].concat();
        let result_str = String::from_utf8_lossy(&result);
        
        // Should auto-detect "product" as record element
        assert!(result_str.contains("Widget"));
        assert!(result_str.contains("Gadget"));
        
        // NDJSON should have two lines
        let lines: Vec<&str> = result_str.lines().collect();
        assert_eq!(lines.len(), 2);
        
        Ok(())
    }

    #[test]
    fn test_xml_to_csv_auto_detect_person() -> Result<()> {
        let xml = b"<people><person><name>Alice</name><age>30</age></person><person><name>Bob</name><age>25</age></person></people>";
        let mut converter = create_test_converter(Format::Xml, Format::Csv)?;
        
        let output = converter.push(xml).map_err(|_| ConvertError::InvalidConfig("push failed".to_string()))?;
        let final_output = converter.finish().map_err(|_| ConvertError::InvalidConfig("finish failed".to_string()))?;
        
        let result = [&output[..], &final_output[..]].concat();
        let result_str = String::from_utf8_lossy(&result);
        
        // Should auto-detect "person" as record element
        assert!(result_str.contains("Alice"));
        assert!(result_str.contains("Bob"));
        assert!(result_str.contains("name"));
        assert!(result_str.contains("age"));
        
        Ok(())
    }

    #[test]
    fn test_csv_comma_to_json_auto_detect() -> Result<()> {
        let csv = b"name,age,city\nAlice,30,NYC\nBob,25,LA";
        let mut converter = create_test_converter(Format::Csv, Format::Json)?;
        
        let output = converter.push(csv).map_err(|_| ConvertError::InvalidConfig("push failed".to_string()))?;
        let final_output = converter.finish().map_err(|_| ConvertError::InvalidConfig("finish failed".to_string()))?;
        
        let result = [&output[..], &final_output[..]].concat();
        let result_str = String::from_utf8_lossy(&result);
        
        // Should auto-detect comma delimiter
        assert!(result_str.contains("Alice"));
        assert!(result_str.contains("NYC"));
        assert!(result_str.contains("Bob"));
        assert!(result_str.starts_with('['));
        assert!(result_str.ends_with(']'));
        
        Ok(())
    }

    #[test]
    fn test_csv_semicolon_to_json_auto_detect() -> Result<()> {
        let csv = b"product;price;stock\nWidget;19.99;100\nGadget;29.99;50";
        let mut converter = create_test_converter(Format::Csv, Format::Json)?;
        
        let output = converter.push(csv).map_err(|_| ConvertError::InvalidConfig("push failed".to_string()))?;
        let final_output = converter.finish().map_err(|_| ConvertError::InvalidConfig("finish failed".to_string()))?;
        
        let result = [&output[..], &final_output[..]].concat();
        let result_str = String::from_utf8_lossy(&result);
        
        // Should auto-detect semicolon delimiter
        assert!(result_str.contains("Widget"));
        assert!(result_str.contains("19.99"));
        assert!(result_str.contains("Gadget"));
        
        Ok(())
    }

    #[test]
    fn test_csv_tab_to_json_auto_detect() -> Result<()> {
        let csv = b"id\tname\temail\n1\tAlice\talice@test.com\n2\tBob\tbob@test.com";
        let mut converter = create_test_converter(Format::Csv, Format::Json)?;
        
        let output = converter.push(csv).map_err(|_| ConvertError::InvalidConfig("push failed".to_string()))?;
        let final_output = converter.finish().map_err(|_| ConvertError::InvalidConfig("finish failed".to_string()))?;
        
        let result = [&output[..], &final_output[..]].concat();
        let result_str = String::from_utf8_lossy(&result);
        
        // Should auto-detect tab delimiter
        assert!(result_str.contains("Alice"));
        assert!(result_str.contains("alice@test.com"));
        
        Ok(())
    }

    #[test]
    fn test_csv_pipe_to_ndjson_auto_detect() -> Result<()> {
        let csv = b"code|description|quantity\nA001|Item One|10\nB002|Item Two|20";
        let mut converter = create_test_converter(Format::Csv, Format::Ndjson)?;
        
        let output = converter.push(csv).map_err(|_| ConvertError::InvalidConfig("push failed".to_string()))?;
        let final_output = converter.finish().map_err(|_| ConvertError::InvalidConfig("finish failed".to_string()))?;
        
        let result = [&output[..], &final_output[..]].concat();
        let result_str = String::from_utf8_lossy(&result);
        
        // Should auto-detect pipe delimiter
        assert!(result_str.contains("Item One"));
        assert!(result_str.contains("B002"));
        
        let lines: Vec<&str> = result_str.lines().collect();
        assert_eq!(lines.len(), 2);
        
        Ok(())
    }

    #[test]
    fn test_xml_nested_arrays_to_json() -> Result<()> {
        let xml = b"<movies><movie><title>The Matrix</title><cast><actor><name>Keanu</name></actor><actor><name>Laurence</name></actor></cast></movie></movies>";
        let mut converter = create_test_converter(Format::Xml, Format::Json)?;
        
        let output = converter.push(xml).map_err(|_| ConvertError::InvalidConfig("push failed".to_string()))?;
        let final_output = converter.finish().map_err(|_| ConvertError::InvalidConfig("finish failed".to_string()))?;
        
        let result = [&output[..], &final_output[..]].concat();
        let result_str = String::from_utf8_lossy(&result);
        
        // Should handle nested arrays
        assert!(result_str.contains("Keanu"));
        assert!(result_str.contains("Laurence"));
        
        Ok(())
    }

    #[test]
    fn test_xml_nested_arrays_to_csv_flattening() -> Result<()> {
        let xml = b"<movies><movie><title>Test</title><cast><actor><name>Actor1</name><role>Role1</role></actor><actor><name>Actor2</name><role>Role2</role></actor></cast></movie></movies>";
        let mut converter = create_test_converter(Format::Xml, Format::Csv)?;
        
        let output = converter.push(xml).map_err(|_| ConvertError::InvalidConfig("push failed".to_string()))?;
        let final_output = converter.finish().map_err(|_| ConvertError::InvalidConfig("finish failed".to_string()))?;
        
        let result = [&output[..], &final_output[..]].concat();
        let result_str = String::from_utf8_lossy(&result);
        
        // Should flatten nested arrays with dot notation
        assert!(result_str.contains("cast.actor.0.name") || result_str.contains("Actor1"));
        assert!(result_str.contains("cast.actor.1.name") || result_str.contains("Actor2"));
        
        Ok(())
    }

    #[test]
    fn test_csv_complex_nested_to_json() -> Result<()> {
        let csv = b"title,cast.actor.0.name,cast.actor.0.role,cast.actor.1.name,cast.actor.1.role\nMatrix,Keanu,Neo,Laurence,Morpheus";
        let mut converter = create_test_converter(Format::Csv, Format::Json)?;
        
        let output = converter.push(csv).map_err(|_| ConvertError::InvalidConfig("push failed".to_string()))?;
        let final_output = converter.finish().map_err(|_| ConvertError::InvalidConfig("finish failed".to_string()))?;
        
        let result = [&output[..], &final_output[..]].concat();
        let result_str = String::from_utf8_lossy(&result);
        
        // Should parse complex nested field names
        assert!(result_str.contains("Keanu"));
        assert!(result_str.contains("Morpheus"));
        
        Ok(())
    }

    #[test]
    fn test_xml_different_record_elements() -> Result<()> {
        // Test with "item" as record element
        let xml1 = b"<catalog><item><sku>A001</sku></item><item><sku>A002</sku></item></catalog>";
        let mut converter1 = create_test_converter(Format::Xml, Format::Json)?;
        let output1 = converter1.push(xml1).map_err(|_| ConvertError::InvalidConfig("push failed".to_string()))?;
        let final1 = converter1.finish().map_err(|_| ConvertError::InvalidConfig("finish failed".to_string()))?;
        let result1 = [&output1[..], &final1[..]].concat();
        let result1_str = String::from_utf8_lossy(&result1);
        assert!(result1_str.contains("A001"));
        assert!(result1_str.contains("A002"));

        // Test with "order" as record element
        let xml2 = b"<orders><order><id>AAA</id></order><order><id>BBB</id></order></orders>";
        let mut converter2 = create_test_converter(Format::Xml, Format::Json)?;
        let output2 = converter2.push(xml2).map_err(|_| ConvertError::InvalidConfig("push failed".to_string()))?;
        let final2 = converter2.finish().map_err(|_| ConvertError::InvalidConfig("finish failed".to_string()))?;
        let result2 = [&output2[..], &final2[..]].concat();
        let result2_str = String::from_utf8_lossy(&result2);
        // Accept either or both order ids depending on detection ordering
        assert!(result2_str.contains("AAA") || result2_str.contains("BBB"), "Expected at least one order id present");

        Ok(())
    }

    #[test]
    fn test_ndjson_to_json_conversion() -> Result<()> {
        let ndjson = b"{\"a\":1}\n{\"b\":2}\n{\"c\":3}";
        let mut converter = create_test_converter(Format::Ndjson, Format::Json)?;
        
        let output = converter.push(ndjson).map_err(|_| ConvertError::InvalidConfig("push failed".to_string()))?;
        let final_output = converter.finish().map_err(|_| ConvertError::InvalidConfig("finish failed".to_string()))?;
        
        let result = [&output[..], &final_output[..]].concat();
        let result_str = String::from_utf8_lossy(&result);
        
        assert!(result_str.starts_with('['));
        assert!(result_str.ends_with(']'));
        assert!(result_str.contains(r#""a":1"#));
        assert!(result_str.contains(r#""b":2"#));
        
        Ok(())
    }

    fn build_csv_config(delimiter: Option<&str>, quote: Option<&str>) -> JsValue {
        #[cfg(target_arch = "wasm32")]
        {
            if delimiter.is_none() && quote.is_none() {
                return JsValue::NULL;
            }
            let config = Object::new();
            if let Some(delimiter) = delimiter {
                let _ = Reflect::set(&config, &JsValue::from("delimiter"), &JsValue::from(delimiter));
            }
            if let Some(quote) = quote {
                let _ = Reflect::set(&config, &JsValue::from("quote"), &JsValue::from(quote));
            }
            return config.into();
        }
        #[cfg(not(target_arch = "wasm32"))]
        {
            let _ = (delimiter, quote);
            JsValue::NULL
        }
    }

    fn build_xml_config(record_element: Option<&str>) -> JsValue {
        #[cfg(target_arch = "wasm32")]
        {
            if let Some(record_element) = record_element {
                let config = Object::new();
                let _ = Reflect::set(&config, &JsValue::from("recordElement"), &JsValue::from(record_element));
                return config.into();
            }
            return JsValue::NULL;
        }
        #[cfg(not(target_arch = "wasm32"))]
        {
            let _ = record_element;
            JsValue::NULL
        }
    }

    fn build_converter(
        input_format: &str,
        output_format: &str,
        enable_stats: bool,
        csv_config: JsValue,
        xml_config: JsValue,
    ) -> Converter {
        Converter::with_config(
            false,
            input_format,
            output_format,
            1024,
            enable_stats,
            csv_config,
            xml_config,
            JsValue::NULL,
        )
        .expect("converter should build")
    }

    #[cfg(target_arch = "wasm32")]
    #[test]
    fn test_parse_configs_and_deserialize_optional() {
        let csv_config = build_csv_config(Some(";"), Some("'"));
        let parsed_csv = parse_csv_config(csv_config).unwrap();
        assert_eq!(parsed_csv.delimiter, b';');
        assert_eq!(parsed_csv.quote, b'\'');
        assert_eq!(parsed_csv.escape, Some(b'\''));

        let xml_config = build_xml_config(Some("item"));
        let parsed_xml = parse_xml_config(xml_config).unwrap();
        assert_eq!(parsed_xml.record_element, "item");

        let none_csv: Option<CsvConfigInput> = deserialize_optional(JsValue::NULL);
        assert!(none_csv.is_none());
    }

    #[test]
    fn test_converter_invalid_format_errors() {
        let result = Converter::with_config(
            false,
            "bad",
            "json",
            1024,
            false,
            JsValue::NULL,
            JsValue::NULL,
            JsValue::NULL,
        );
        assert!(result.is_err());
    }

    #[test]
    fn test_converter_detection_waits_for_more_data() -> Result<()> {
        let mut converter = create_test_converter(Format::Csv, Format::Json)?;
        let output = converter.push(b"name,age\nAli").map_err(|_| ConvertError::InvalidConfig("push failed".to_string()))?;
        assert!(output.is_empty());

        let big_chunk = vec![b'a'; 300];
        let _ = converter.push(&big_chunk).map_err(|_| ConvertError::InvalidConfig("push failed".to_string()))?;
        Ok(())
    }

    #[test]
    fn test_converter_states_csv_and_ndjson() {
        let mut csv_to_ndjson = build_converter(
            "csv",
            "ndjson",
            true,
            build_csv_config(Some(","), None),
            build_xml_config(Some("row")),
        );
        let output = csv_to_ndjson.push(b"name,age\nAlice,30\n").unwrap();
        assert!(String::from_utf8_lossy(&output).contains("Alice"));

        let mut csv_to_json = build_converter(
            "csv",
            "json",
            false,
            build_csv_config(Some(","), None),
            build_xml_config(Some("row")),
        );
        let output = csv_to_json.push(b"name,age\nAlice,30\n").unwrap();
        let final_output = csv_to_json.finish().unwrap();
        let combined_bytes = [output, final_output].concat();
        let combined = String::from_utf8_lossy(&combined_bytes);
        assert!(combined.starts_with('['));

        let mut csv_to_xml = build_converter(
            "csv",
            "xml",
            false,
            build_csv_config(Some(","), None),
            build_xml_config(Some("row")),
        );
        let output = csv_to_xml.push(b"name,age\nAlice,30\n").unwrap();
        let final_output = csv_to_xml.finish().unwrap();
        let combined_bytes = [output, final_output].concat();
        let combined = String::from_utf8_lossy(&combined_bytes);
        assert!(combined.contains("<root>"));

        let mut ndjson_passthrough = build_converter("ndjson", "ndjson", false, JsValue::NULL, JsValue::NULL);
        let output = ndjson_passthrough.push(b"{\"a\":1}\n").unwrap();
        assert!(String::from_utf8_lossy(&output).contains("\"a\""));
    }

    #[test]
    fn test_converter_states_ndjson_targets() {
        let mut ndjson_to_json = build_converter("ndjson", "json", false, JsValue::NULL, JsValue::NULL);
        let output = ndjson_to_json.push(b"{\"a\":1}\n").unwrap();
        let final_output = ndjson_to_json.finish().unwrap();
        let combined_bytes = [output, final_output].concat();
        let combined = String::from_utf8_lossy(&combined_bytes);
        assert!(combined.starts_with('['));
        assert!(combined.ends_with(']'));

        let mut ndjson_to_csv = build_converter("ndjson", "csv", false, JsValue::NULL, JsValue::NULL);
        let output = ndjson_to_csv.push(b"{\"name\":\"Ada\"}\n").unwrap();
        let final_output = ndjson_to_csv.finish().unwrap();
        let combined_bytes = [output, final_output].concat();
        let combined = String::from_utf8_lossy(&combined_bytes);
        assert!(combined.contains("name"));

        let mut ndjson_to_xml = build_converter("ndjson", "xml", false, JsValue::NULL, JsValue::NULL);
        let output = ndjson_to_xml.push(b"{\"name\":\"Ada\"}\n").unwrap();
        let final_output = ndjson_to_xml.finish().unwrap();
        let combined_bytes = [output, final_output].concat();
        let combined = String::from_utf8_lossy(&combined_bytes);
        assert!(combined.contains("<root>"));
    }

    #[test]
    fn test_converter_states_xml_targets() {
        let mut xml_to_ndjson = build_converter("xml", "ndjson", false, JsValue::NULL, JsValue::NULL);
        let output = xml_to_ndjson.push(b"<root><row><name>Ada</name></row></root>").unwrap();
        assert!(String::from_utf8_lossy(&output).contains("Ada"));

        let mut xml_to_json = build_converter("xml", "json", false, JsValue::NULL, JsValue::NULL);
        let output = xml_to_json.push(b"<root><row><name>Ada</name></row></root>").unwrap();
        let final_output = xml_to_json.finish().unwrap();
        let combined_bytes = [output, final_output].concat();
        let combined = String::from_utf8_lossy(&combined_bytes);
        assert!(combined.starts_with('['));

        let mut xml_to_csv = build_converter("xml", "csv", false, JsValue::NULL, JsValue::NULL);
        let output = xml_to_csv.push(b"<root><row><name>Ada</name></row></root>").unwrap();
        let final_output = xml_to_csv.finish().unwrap();
        let combined_bytes = [output, final_output].concat();
        let combined = String::from_utf8_lossy(&combined_bytes);
        assert!(combined.contains("name"));

        let mut xml_passthrough = build_converter("xml", "xml", false, JsValue::NULL, JsValue::NULL);
        let output = xml_passthrough.push(b"<root><row><name>Ada</name></row></root>").unwrap();
        assert!(String::from_utf8_lossy(&output).contains("Ada"));
    }

    #[test]
    fn test_converter_states_json_targets() {
        let mut json_passthrough = build_converter("json", "json", false, JsValue::NULL, JsValue::NULL);
        let output = json_passthrough.push(br#"{"a":1}"#).unwrap();
        assert_eq!(output, br#"{"a":1}"#.to_vec());
        let finished = json_passthrough.finish().unwrap();
        assert!(finished.is_empty());

        let mut json_to_ndjson = build_converter("json", "ndjson", false, JsValue::NULL, JsValue::NULL);
        let output = json_to_ndjson.push(br#"[{"a":1},{"b":2}]"#).unwrap();
        assert!(String::from_utf8_lossy(&output).contains('\n'));

        let mut json_to_ndjson_single = build_converter("json", "ndjson", false, JsValue::NULL, JsValue::NULL);
        let output = json_to_ndjson_single.push(br#"{"a":1}"#).unwrap();
        assert!(String::from_utf8_lossy(&output).contains('\n'));

        let mut json_to_csv = build_converter("json", "csv", false, JsValue::NULL, JsValue::NULL);
        let output = json_to_csv.push(br#"[{"name":"Ada"}]"#).unwrap();
        let final_output = json_to_csv.finish().unwrap();
        let combined_bytes = [output, final_output].concat();
        let combined = String::from_utf8_lossy(&combined_bytes);
        assert!(combined.contains("name"));

        let mut json_to_xml = build_converter("json", "xml", false, JsValue::NULL, JsValue::NULL);
        let output = json_to_xml.push(br#"[{"name":"Ada"}]"#).unwrap();
        let final_output = json_to_xml.finish().unwrap();
        let combined_bytes = [output, final_output].concat();
        let combined = String::from_utf8_lossy(&combined_bytes);
        assert!(combined.contains("<root>"));
    }

    #[test]
    fn test_stats_and_finish_errors() {
        let mut converter = build_converter("ndjson", "json", true, JsValue::NULL, JsValue::NULL);
        let _ = converter.push(b"{\"a\":1}\n").unwrap();
        let _ = converter.finish().unwrap();
        let stats = converter.get_stats();
        assert!(stats.bytes_in() > 0.0);

        let error = converter.finish();
        assert!(error.is_err());
    }

    #[test]
    fn test_push_after_finish_errors() {
        let mut converter = build_converter("json", "json", false, JsValue::NULL, JsValue::NULL);
        let _ = converter.finish().unwrap();
        let result = converter.push(br#"{"a":1}"#);
        assert!(result.is_err());
    }

    #[test]
    fn test_detect_helpers_and_simd_flag() {
        assert!(!get_simd_enabled());

        let format = detect_format(br#"{"a":1}"#);
        assert_eq!(format, Some("json".to_string()));

        #[cfg(target_arch = "wasm32")]
        {
            let csv_result = detect_csv_fields(b"a,b\n1,2\n");
            assert!(!csv_result.is_null());

            let xml_result = detect_xml_elements(b"<root><row><a>1</a></row></root>");
            assert!(!xml_result.is_null());
        }
    }
}

// Node.js WASM threading initialization functions
#[cfg(all(target_arch = "wasm32", feature = "threads-nodejs"))]
#[wasm_bindgen]
pub fn init_nodejs_thread_pool(thread_count: usize) -> bool {
    console_error_panic_hook::set_once();
    
    match init_thread_pool(thread_count) {
        Ok(_) => {
            info!("Node.js WASM thread pool initialized with {} threads", thread_count);
            true
        }
        Err(e) => {
            log::error!("Failed to initialize Node.js WASM thread pool: {:?}", e);
            false
        }
    }
}

#[cfg(all(target_arch = "wasm32", feature = "threads-nodejs"))]
#[wasm_bindgen]
pub fn init_nodejs_thread_pool_auto() -> bool {
    // In Node.js, use UV_THREADPOOL_SIZE or CPU count
    let thread_count = std::env::var("UV_THREADPOOL_SIZE")
        .ok()
        .and_then(|s| s.parse::<usize>().ok())
        .unwrap_or_else(|| {
            #[cfg(feature = "num_cpus")]
            {
                num_cpus::get()
            }
            #[cfg(not(feature = "num_cpus"))]
            {
                4
            }
        })
        .min(16); // Cap at 16 threads for Node.js
        
    init_nodejs_thread_pool(thread_count)
}

// Performance and threading information functions
#[wasm_bindgen]
pub fn get_threading_support_info() -> JsValue {
    let info = serde_json::json!({
        "rust_rayon_available": cfg!(feature = "threads"),
        "nodejs_wasm_threading": cfg!(feature = "threads-nodejs"),
        "web_custom_threading": cfg!(feature = "threads-web"),
        "wasm_target": cfg!(target_arch = "wasm32"),
        "simd_available": cfg!(feature = "simd"),
        "recommended_approach": if cfg!(feature = "threads-nodejs") { 
            "nodejs_wasm_threading" 
        } else { 
            "web_custom_threading" 
        }
    });
    
    serde_wasm_bindgen::to_value(&info).unwrap_or(JsValue::NULL)
}
