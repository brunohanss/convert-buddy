use crate::error::{ConvertError, Result};
use memchr::memchr;
use serde::Deserialize;
use serde_json::{Map, Number, Value};

#[derive(Debug, Clone, Copy, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum TransformMode {
    Replace,
    Augment,
}

impl Default for TransformMode {
    fn default() -> Self {
        TransformMode::Replace
    }
}

#[derive(Debug, Clone, Copy, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum MissingFieldPolicy {
    Error,
    Null,
    Drop,
}

impl Default for MissingFieldPolicy {
    fn default() -> Self {
        MissingFieldPolicy::Error
    }
}

#[derive(Debug, Clone, Copy, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum MissingRequiredPolicy {
    Error,
    Abort,
}

impl Default for MissingRequiredPolicy {
    fn default() -> Self {
        MissingRequiredPolicy::Error
    }
}

#[derive(Debug, Clone, Copy, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum CoerceErrorPolicy {
    Error,
    Null,
    DropRecord,
}

impl Default for CoerceErrorPolicy {
    fn default() -> Self {
        CoerceErrorPolicy::Error
    }
}

#[derive(Debug, Clone, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum CoerceSpec {
    String,
    I64,
    F64,
    Bool,
    TimestampMs { format: Option<TimestampFormat> },
}

#[derive(Debug, Clone, Copy, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum TimestampFormat {
    Iso8601,
    UnixMs,
    UnixS,
}

impl Default for TimestampFormat {
    fn default() -> Self {
        TimestampFormat::Iso8601
    }
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FieldMapInput {
    pub target_field_name: String,
    pub origin_field_name: Option<String>,
    pub required: Option<bool>,
    pub default_value: Option<Value>,
    pub coerce: Option<CoerceSpec>,
    pub compute: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TransformConfigInput {
    #[serde(default)]
    pub mode: TransformMode,
    pub fields: Vec<FieldMapInput>,
    pub on_missing_field: Option<MissingFieldPolicy>,
    pub on_missing_required: Option<MissingRequiredPolicy>,
    pub on_coerce_error: Option<CoerceErrorPolicy>,
}

#[derive(Debug, Clone)]
pub struct TransformPlan {
    mode: TransformMode,
    fields: Vec<TransformField>,
    on_missing_field: MissingFieldPolicy,
    on_missing_required: MissingRequiredPolicy,
    on_coerce_error: CoerceErrorPolicy,
}

#[derive(Debug, Clone)]
pub struct TransformField {
    target_field_name: String,
    origin_field_name: String,
    required: bool,
    default_value: Option<Value>,
    coerce: Option<CoerceSpec>,
    compute: Option<Expr>,
}

impl TransformPlan {
    pub fn compile(input: TransformConfigInput) -> Result<Self> {
        if input.fields.is_empty() {
            return Err(ConvertError::InvalidConfig(
                "transform.fields must contain at least one field".to_string(),
            ));
        }

        let mut fields = Vec::with_capacity(input.fields.len());
        for field in input.fields {
            let origin = field
                .origin_field_name
                .clone()
                .unwrap_or_else(|| field.target_field_name.clone());
            let compute = match field.compute {
                Some(expr) => Some(parse_expression(&expr).map_err(|e| {
                    ConvertError::InvalidConfig(format!("Invalid compute expression: {e}"))
                })?),
                None => None,
            };

            fields.push(TransformField {
                target_field_name: field.target_field_name,
                origin_field_name: origin,
                required: field.required.unwrap_or(false),
                default_value: field.default_value,
                coerce: field.coerce,
                compute,
            });
        }

        Ok(Self {
            mode: input.mode,
            fields,
            on_missing_field: input.on_missing_field.unwrap_or_default(),
            on_missing_required: input.on_missing_required.unwrap_or_default(),
            on_coerce_error: input.on_coerce_error.unwrap_or_default(),
        })
    }

    pub fn apply_to_value(&self, value: &Value) -> Result<Option<Value>> {
        let record = value.as_object().ok_or_else(|| {
            ConvertError::InvalidConfig("Transform expects object records".to_string())
        })?;
        self.apply_to_record(record)
    }

    fn apply_to_record(&self, record: &Map<String, Value>) -> Result<Option<Value>> {
        let mut output = match self.mode {
            TransformMode::Replace => Map::new(),
            TransformMode::Augment => record.clone(),
        };

        for field in &self.fields {
            let mut value = if let Some(expr) = &field.compute {
                Some(expr.evaluate(record)? )
            } else {
                record.get(&field.origin_field_name).cloned()
            };

            if value.as_ref().map(|v| v.is_null()).unwrap_or(true) {
                if let Some(default_value) = &field.default_value {
                    value = Some(default_value.clone());
                } else if field.required {
                    match self.on_missing_required {
                        MissingRequiredPolicy::Error | MissingRequiredPolicy::Abort => {
                            return Err(ConvertError::InvalidConfig(format!(
                                "Missing required field '{}'",
                                field.origin_field_name
                            )))
                        }
                    }
                } else {
                    match self.on_missing_field {
                        MissingFieldPolicy::Error => {
                            return Err(ConvertError::InvalidConfig(format!(
                                "Missing field '{}'",
                                field.origin_field_name
                            )))
                        }
                        MissingFieldPolicy::Null => {
                            value = Some(Value::Null);
                        }
                        MissingFieldPolicy::Drop => {
                            continue;
                        }
                    }
                }
            }

            let mut value = value.unwrap_or(Value::Null);
            if let Some(coerce) = &field.coerce {
                match coerce_value(&value, coerce) {
                    Ok(coerced) => {
                        value = coerced;
                    }
                    Err(err) => match self.on_coerce_error {
                        CoerceErrorPolicy::Error => return Err(err),
                        CoerceErrorPolicy::Null => {
                            value = Value::Null;
                        }
                        CoerceErrorPolicy::DropRecord => return Ok(None),
                    },
                }
            }

            output.insert(field.target_field_name.clone(), value);
        }

        Ok(Some(Value::Object(output)))
    }
}

#[derive(Debug)]
pub struct TransformResult {
    pub output: Vec<u8>,
    pub records: usize,
}

pub struct TransformEngine {
    plan: TransformPlan,
    partial_line: Vec<u8>,
}

impl TransformEngine {
    pub fn new(plan: TransformPlan) -> Self {
        Self {
            plan,
            partial_line: Vec::new(),
        }
    }

    pub fn push(&mut self, chunk: &[u8]) -> Result<TransformResult> {
        let mut output = Vec::with_capacity(chunk.len() + 64);
        let mut records = 0;

        let mut temp_buffer = Vec::new();
        let input_data: &[u8] = if !self.partial_line.is_empty() {
            temp_buffer.extend_from_slice(&self.partial_line);
            temp_buffer.extend_from_slice(chunk);
            &temp_buffer
        } else {
            chunk
        };

        let mut start = 0;
        while let Some(pos) = memchr(b'\n', &input_data[start..]) {
            let line_end = start + pos;
            let line = &input_data[start..line_end];

            if !line.is_empty() && !line.iter().all(|&b| b.is_ascii_whitespace()) {
                if let Some(transformed) = self.transform_line(line)? {
                    output.extend_from_slice(&transformed);
                    output.push(b'\n');
                    records += 1;
                }
            }

            start = line_end + 1;
        }

        self.partial_line.clear();
        if start < input_data.len() {
            self.partial_line.extend_from_slice(&input_data[start..]);
        }

        Ok(TransformResult { output, records })
    }

    pub fn finish(&mut self) -> Result<TransformResult> {
        let mut output = Vec::new();
        let mut records = 0;

        if !self.partial_line.is_empty() {
            let line = std::mem::take(&mut self.partial_line);
            if !line.iter().all(|&b| b.is_ascii_whitespace()) {
                if let Some(transformed) = self.transform_line(&line)? {
                    output.extend_from_slice(&transformed);
                    output.push(b'\n');
                    records += 1;
                }
            }
        }

        Ok(TransformResult { output, records })
    }

    pub fn partial_size(&self) -> usize {
        self.partial_line.len()
    }

    pub fn plan(&self) -> &TransformPlan {
        &self.plan
    }

    fn transform_line(&self, line: &[u8]) -> Result<Option<Vec<u8>>> {
        let value: Value = serde_json::from_slice(line)
            .map_err(|e| ConvertError::JsonParse(e.to_string()))?;
        let transformed = self.plan.apply_to_value(&value)?;
        if let Some(output_value) = transformed {
            let output = serde_json::to_vec(&output_value)
                .map_err(|e| ConvertError::JsonParse(e.to_string()))?;
            Ok(Some(output))
        } else {
            Ok(None)
        }
    }
}

#[derive(Debug, Clone)]
enum Expr {
    Literal(Value),
    Field(String),
    Binary {
        op: BinaryOp,
        left: Box<Expr>,
        right: Box<Expr>,
    },
    Function {
        name: String,
        args: Vec<Expr>,
    },
    UnaryNeg(Box<Expr>),
}

#[derive(Debug, Clone, Copy)]
enum BinaryOp {
    Add,
    Subtract,
    Multiply,
    Divide,
}

impl Expr {
    fn evaluate(&self, record: &Map<String, Value>) -> Result<Value> {
        match self {
            Expr::Literal(value) => Ok(value.clone()),
            Expr::Field(name) => Ok(record.get(name).cloned().unwrap_or(Value::Null)),
            Expr::UnaryNeg(expr) => {
                let value = expr.evaluate(record)?;
                let number = to_f64(&value).ok_or_else(|| {
                    ConvertError::InvalidConfig("Unary '-' expects a numeric value".to_string())
                })?;
                Ok(Value::Number(Number::from_f64(-number).unwrap_or_else(|| Number::from(0))))
            }
            Expr::Binary { op, left, right } => {
                let left_val = left.evaluate(record)?;
                let right_val = right.evaluate(record)?;
                let left_num = to_f64(&left_val).ok_or_else(|| {
                    ConvertError::InvalidConfig("Binary operator expects numeric values".to_string())
                })?;
                let right_num = to_f64(&right_val).ok_or_else(|| {
                    ConvertError::InvalidConfig("Binary operator expects numeric values".to_string())
                })?;
                let result = match op {
                    BinaryOp::Add => left_num + right_num,
                    BinaryOp::Subtract => left_num - right_num,
                    BinaryOp::Multiply => left_num * right_num,
                    BinaryOp::Divide => left_num / right_num,
                };
                Ok(Value::Number(Number::from_f64(result).unwrap_or_else(|| Number::from(0))))
            }
            Expr::Function { name, args } => evaluate_function(name, args, record),
        }
    }
}

fn evaluate_function(name: &str, args: &[Expr], record: &Map<String, Value>) -> Result<Value> {
    match name {
        "concat" => {
            let mut output = String::new();
            for arg in args {
                let value = arg.evaluate(record)?;
                match value {
                    Value::Null => {}
                    Value::String(s) => output.push_str(&s),
                    other => output.push_str(&other.to_string()),
                }
            }
            Ok(Value::String(output))
        }
        "lower" => {
            let value = single_arg(name, args, record)?;
            let text = value.as_str().ok_or_else(|| {
                ConvertError::InvalidConfig("lower() expects a string".to_string())
            })?;
            Ok(Value::String(text.to_lowercase()))
        }
        "upper" => {
            let value = single_arg(name, args, record)?;
            let text = value.as_str().ok_or_else(|| {
                ConvertError::InvalidConfig("upper() expects a string".to_string())
            })?;
            Ok(Value::String(text.to_uppercase()))
        }
        "trim" => {
            let value = single_arg(name, args, record)?;
            let text = value.as_str().ok_or_else(|| {
                ConvertError::InvalidConfig("trim() expects a string".to_string())
            })?;
            Ok(Value::String(text.trim().to_string()))
        }
        "coalesce" => {
            for arg in args {
                let value = arg.evaluate(record)?;
                if !value.is_null() {
                    return Ok(value);
                }
            }
            Ok(Value::Null)
        }
        _ => Err(ConvertError::InvalidConfig(format!(
            "Unknown function '{name}'"
        ))),
    }
}

fn single_arg(name: &str, args: &[Expr], record: &Map<String, Value>) -> Result<Value> {
    if args.len() != 1 {
        return Err(ConvertError::InvalidConfig(format!(
            "{name}() expects 1 argument"
        )));
    }
    args[0].evaluate(record)
}

fn to_f64(value: &Value) -> Option<f64> {
    match value {
        Value::Number(num) => num.as_f64(),
        Value::String(text) => text.parse::<f64>().ok(),
        Value::Bool(flag) => Some(if *flag { 1.0 } else { 0.0 }),
        _ => None,
    }
}

fn coerce_value(value: &Value, spec: &CoerceSpec) -> Result<Value> {
    match spec {
        CoerceSpec::String => Ok(Value::String(match value {
            Value::String(s) => s.clone(),
            Value::Number(num) => num.to_string(),
            Value::Bool(flag) => flag.to_string(),
            Value::Null => "".to_string(),
            other => other.to_string(),
        })),
        CoerceSpec::I64 => {
            let number = match value {
                Value::Number(num) => num.as_i64().or_else(|| num.as_f64().map(|f| f as i64)),
                Value::String(text) => text.parse::<i64>().ok(),
                Value::Bool(flag) => Some(if *flag { 1 } else { 0 }),
                _ => None,
            }
            .ok_or_else(|| ConvertError::InvalidConfig("Unable to coerce to i64".to_string()))?;
            Ok(Value::Number(Number::from(number)))
        }
        CoerceSpec::F64 => {
            let number = to_f64(value)
                .ok_or_else(|| ConvertError::InvalidConfig("Unable to coerce to f64".to_string()))?;
            Ok(Value::Number(Number::from_f64(number).unwrap_or_else(|| Number::from(0))))
        }
        CoerceSpec::Bool => {
            let bool_value = match value {
                Value::Bool(flag) => Some(*flag),
                Value::Number(num) => num.as_i64().map(|n| n != 0),
                Value::String(text) => match text.to_lowercase().as_str() {
                    "true" | "1" => Some(true),
                    "false" | "0" => Some(false),
                    _ => None,
                },
                _ => None,
            }
            .ok_or_else(|| ConvertError::InvalidConfig("Unable to coerce to bool".to_string()))?;
            Ok(Value::Bool(bool_value))
        }
        CoerceSpec::TimestampMs { format } => {
            let format = format.unwrap_or_default();
            match format {
                TimestampFormat::Iso8601 => {
                    let text = value.as_str().ok_or_else(|| {
                        ConvertError::InvalidConfig("timestamp_ms expects ISO8601 string".to_string())
                    })?;
                    let dt = chrono::DateTime::parse_from_rfc3339(text)
                        .map_err(|e| ConvertError::InvalidConfig(e.to_string()))?;
                    Ok(Value::Number(Number::from(dt.timestamp_millis())))
                }
                TimestampFormat::UnixMs => {
                    let number = to_i64(value)
                        .ok_or_else(|| ConvertError::InvalidConfig("timestamp_ms expects unix_ms".to_string()))?;
                    Ok(Value::Number(Number::from(number)))
                }
                TimestampFormat::UnixS => {
                    let number = to_i64(value)
                        .ok_or_else(|| ConvertError::InvalidConfig("timestamp_ms expects unix_s".to_string()))?;
                    Ok(Value::Number(Number::from(number * 1000)))
                }
            }
        }
    }
}

fn to_i64(value: &Value) -> Option<i64> {
    match value {
        Value::Number(num) => num.as_i64().or_else(|| num.as_f64().map(|f| f as i64)),
        Value::String(text) => text.parse::<i64>().ok(),
        Value::Bool(flag) => Some(if *flag { 1 } else { 0 }),
        _ => None,
    }
}

#[derive(Debug, Clone, PartialEq)]
enum Token {
    Identifier(String),
    StringLiteral(String),
    Number(f64),
    Bool(bool),
    Null,
    Comma,
    LParen,
    RParen,
    Plus,
    Minus,
    Star,
    Slash,
}

fn parse_expression(input: &str) -> std::result::Result<Expr, String> {
    let mut lexer = Lexer::new(input);
    let tokens = lexer.tokenize()?;
    let mut parser = Parser::new(tokens);
    let expr = parser.parse_expression()?;
    if parser.has_remaining() {
        return Err("Unexpected tokens after expression".to_string());
    }
    Ok(expr)
}

struct Lexer<'a> {
    chars: std::str::Chars<'a>,
    current: Option<char>,
}

impl<'a> Lexer<'a> {
    fn new(input: &'a str) -> Self {
        let mut chars = input.chars();
        let current = chars.next();
        Self { chars, current }
    }

    fn tokenize(&mut self) -> std::result::Result<Vec<Token>, String> {
        let mut tokens = Vec::new();
        while let Some(ch) = self.current {
            match ch {
                ' ' | '\t' | '\n' | '\r' => {
                    self.advance();
                }
                '(' => {
                    tokens.push(Token::LParen);
                    self.advance();
                }
                ')' => {
                    tokens.push(Token::RParen);
                    self.advance();
                }
                ',' => {
                    tokens.push(Token::Comma);
                    self.advance();
                }
                '+' => {
                    tokens.push(Token::Plus);
                    self.advance();
                }
                '-' => {
                    tokens.push(Token::Minus);
                    self.advance();
                }
                '*' => {
                    tokens.push(Token::Star);
                    self.advance();
                }
                '/' => {
                    tokens.push(Token::Slash);
                    self.advance();
                }
                '"' => {
                    tokens.push(Token::StringLiteral(self.read_string()?));
                }
                '0'..='9' => {
                    tokens.push(Token::Number(self.read_number()?));
                }
                'a'..='z' | 'A'..='Z' | '_' => {
                    let ident = self.read_identifier();
                    let token = match ident.as_str() {
                        "true" => Token::Bool(true),
                        "false" => Token::Bool(false),
                        "null" => Token::Null,
                        _ => Token::Identifier(ident),
                    };
                    tokens.push(token);
                }
                _ => {
                    return Err(format!("Unexpected character '{ch}'"));
                }
            }
        }
        Ok(tokens)
    }

    fn advance(&mut self) {
        self.current = self.chars.next();
    }

    fn read_string(&mut self) -> std::result::Result<String, String> {
        self.advance();
        let mut out = String::new();
        while let Some(ch) = self.current {
            match ch {
                '"' => {
                    self.advance();
                    return Ok(out);
                }
                '\\' => {
                    self.advance();
                    let escaped = self.current.ok_or("Unterminated escape sequence")?;
                    let mapped = match escaped {
                        '"' => '"',
                        '\\' => '\\',
                        'n' => '\n',
                        'r' => '\r',
                        't' => '\t',
                        other => other,
                    };
                    out.push(mapped);
                    self.advance();
                }
                _ => {
                    out.push(ch);
                    self.advance();
                }
            }
        }
        Err("Unterminated string literal".to_string())
    }

    fn read_number(&mut self) -> std::result::Result<f64, String> {
        let mut out = String::new();
        while let Some(ch) = self.current {
            if ch.is_ascii_digit() || ch == '.' {
                out.push(ch);
                self.advance();
            } else {
                break;
            }
        }
        out.parse::<f64>().map_err(|_| "Invalid number".to_string())
    }

    fn read_identifier(&mut self) -> String {
        let mut out = String::new();
        while let Some(ch) = self.current {
            if ch.is_ascii_alphanumeric() || ch == '_' {
                out.push(ch);
                self.advance();
            } else {
                break;
            }
        }
        out
    }
}

struct Parser {
    tokens: Vec<Token>,
    position: usize,
}

impl Parser {
    fn new(tokens: Vec<Token>) -> Self {
        Self { tokens, position: 0 }
    }

    fn has_remaining(&self) -> bool {
        self.position < self.tokens.len()
    }

    fn parse_expression(&mut self) -> std::result::Result<Expr, String> {
        self.parse_add_sub()
    }

    fn parse_add_sub(&mut self) -> std::result::Result<Expr, String> {
        let mut expr = self.parse_mul_div()?;
        while let Some(token) = self.peek() {
            let op = match token {
                Token::Plus => BinaryOp::Add,
                Token::Minus => BinaryOp::Subtract,
                _ => break,
            };
            self.advance();
            let right = self.parse_mul_div()?;
            expr = Expr::Binary {
                op,
                left: Box::new(expr),
                right: Box::new(right),
            };
        }
        Ok(expr)
    }

    fn parse_mul_div(&mut self) -> std::result::Result<Expr, String> {
        let mut expr = self.parse_unary()?;
        while let Some(token) = self.peek() {
            let op = match token {
                Token::Star => BinaryOp::Multiply,
                Token::Slash => BinaryOp::Divide,
                _ => break,
            };
            self.advance();
            let right = self.parse_unary()?;
            expr = Expr::Binary {
                op,
                left: Box::new(expr),
                right: Box::new(right),
            };
        }
        Ok(expr)
    }

    fn parse_unary(&mut self) -> std::result::Result<Expr, String> {
        if let Some(Token::Minus) = self.peek() {
            self.advance();
            let expr = self.parse_unary()?;
            return Ok(Expr::UnaryNeg(Box::new(expr)));
        }
        self.parse_primary()
    }

    fn parse_primary(&mut self) -> std::result::Result<Expr, String> {
        let token = self.next().ok_or("Unexpected end of expression".to_string())?;
        match token {
            Token::Identifier(name) => {
                if let Some(Token::LParen) = self.peek() {
                    self.advance();
                    let mut args = Vec::new();
                    if let Some(Token::RParen) = self.peek() {
                        self.advance();
                    } else {
                        loop {
                            args.push(self.parse_expression()?);
                            match self.peek() {
                                Some(Token::Comma) => {
                                    self.advance();
                                }
                                Some(Token::RParen) => {
                                    self.advance();
                                    break;
                                }
                                _ => return Err("Expected ',' or ')'".to_string()),
                            }
                        }
                    }
                    Ok(Expr::Function { name, args })
                } else {
                    Ok(Expr::Field(name))
                }
            }
            Token::StringLiteral(value) => Ok(Expr::Literal(Value::String(value))),
            Token::Number(value) => Ok(Expr::Literal(Value::Number(
                Number::from_f64(value).unwrap_or_else(|| Number::from(0)),
            ))),
            Token::Bool(flag) => Ok(Expr::Literal(Value::Bool(flag))),
            Token::Null => Ok(Expr::Literal(Value::Null)),
            Token::LParen => {
                let expr = self.parse_expression()?;
                match self.next() {
                    Some(Token::RParen) => Ok(expr),
                    _ => Err("Expected ')'".to_string()),
                }
            }
            _ => Err("Unexpected token".to_string()),
        }
    }

    fn peek(&self) -> Option<&Token> {
        self.tokens.get(self.position)
    }

    fn next(&mut self) -> Option<Token> {
        if self.position >= self.tokens.len() {
            None
        } else {
            let token = self.tokens[self.position].clone();
            self.position += 1;
            Some(token)
        }
    }

    fn advance(&mut self) {
        self.position += 1;
    }
}
