use thiserror::Error;
use wasm_bindgen::prelude::*;

#[derive(Error, Debug)]
pub enum ConvertError {
    #[error("JSON parse error: {0}")]
    JsonParse(String),
    
    #[error("CSV parse error: {0}")]
    CsvParse(String),
    
    #[error("XML parse error: {0}")]
    XmlParse(String),
    
    #[error("UTF-8 decode error: {0}")]
    Utf8Error(#[from] std::str::Utf8Error),
    
    #[error("Invalid format configuration: {0}")]
    InvalidConfig(String),
    
    #[error("Buffer overflow: {0}")]
    BufferOverflow(String),
    
    #[error("IO error: {0}")]
    Io(String),
}

pub type Result<T> = std::result::Result<T, ConvertError>;

// Implement conversion to JsValue for WASM
impl From<ConvertError> for JsValue {
    fn from(error: ConvertError) -> Self {
        JsValue::from_str(&error.to_string())
    }
}
