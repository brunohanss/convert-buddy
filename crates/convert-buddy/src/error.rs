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
        #[cfg(target_arch = "wasm32")]
        {
            JsValue::from_str(&error.to_string())
        }
        #[cfg(not(target_arch = "wasm32"))]
        {
            let _ = error;
            JsValue::NULL
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn converts_errors_to_js_value_string() {
        let error = ConvertError::JsonParse("bad json".to_string());
        let _js_value: JsValue = error.into();
        #[cfg(target_arch = "wasm32")]
        {
            assert!(_js_value.as_string().unwrap().contains("bad json"));
        }
    }

    #[test]
    fn error_messages_render() {
        let errors = vec![
            ConvertError::CsvParse("bad csv".to_string()),
            ConvertError::XmlParse("bad xml".to_string()),
            ConvertError::InvalidConfig("invalid".to_string()),
            ConvertError::BufferOverflow("overflow".to_string()),
            ConvertError::Io("io".to_string()),
        ];

        for error in errors {
            let message = error.to_string();
            assert!(!message.is_empty());
        }
    }
}
