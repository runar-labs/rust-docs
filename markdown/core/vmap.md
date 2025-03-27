# ValueMap (VMap)

## Overview

ValueMap (VMap) is a core abstraction in Kagi that provides an ergonomic interface for working with structured data. It simplifies parameter extraction and reduces boilerplate code through an intuitive API and accompanying macros.

## Key Features

- **Type-safe parameter extraction**: Get parameters with proper type conversion
- **Comprehensive error handling**: Detailed errors for missing or invalid parameters
- **Macro-based simplification**: Dramatically reduce parameter handling code
- **Integration with ValueType**: Seamless work with Kagi's value type system

## Basic Usage

### Creating a VMap

```rust
// Create an empty VMap
let vmap = VMap::new();

// Create from key-value pairs using the macro
let params = vmap! {
    "name" => "kagi",
    "version" => "1.0",
    "count" => 42,
    "enabled" => true
};

// Create from an existing HashMap
let map: HashMap<String, ValueType> = /* ... */;
let vmap = VMap::from_hashmap(map);
```

### Extracting Values

```rust
// Get a String value with the macro and default value
let name = vmap!(params, "name" => String::new());

// Get an integer with the macro and default value
let count = vmap!(params, "count" => 0);

// Get a boolean with the macro and default value
let enabled = vmap!(params, "enabled" => false);

// For optional values, use Option with the vmap! macro
let description = if params.contains_key("description") {
    Some(vmap!(params, "description" => String::new()))
} else {
    None
};
```

## Before and After Comparison

### Before VMap

Extracting parameters used to require significant boilerplate:

```rust
fn process_request(params: HashMap<String, ValueType>) -> Result<(), Error> {
    // Extract name
    let name = match params.get("name") {
        Some(value) => match value {
            ValueType::String(s) => s.clone(),
            _ => return Err(Error::InvalidParameter("name must be a string".to_string())),
        },
        None => return Err(Error::MissingParameter("name".to_string())),
    };

    // Extract count
    let count = match params.get("count") {
        Some(value) => match value {
            ValueType::Int(i) => *i,
            _ => return Err(Error::InvalidParameter("count must be an integer".to_string())),
        },
        None => return Err(Error::MissingParameter("count".to_string())),
    };

    // Extract enabled
    let enabled = match params.get("enabled") {
        Some(value) => match value {
            ValueType::Bool(b) => *b,
            _ => return Err(Error::InvalidParameter("enabled must be a boolean".to_string())),
        },
        None => false, // Default value
    };

    // Process with extracted parameters
    println!("Processing: {}, count={}, enabled={}", name, count, enabled);
    Ok(())
}
```

### After VMap

With VMap, parameter extraction becomes concise and readable:

```rust
fn process_request(params: VMap) -> Result<(), Error> {
    // Extract parameters with type inference from defaults
    let name = vmap!(params, "name" => String::new())?;
    let count = vmap!(params, "count" => 0)?;
    let enabled = vmap!(params, "enabled" => false);

    // Process with extracted parameters
    println!("Processing: {}, count={}, enabled={}", name, count, enabled);
    Ok(())
}
```

## Advanced Usage

### Working with Complex Types

VMap supports various parameter types, including complex structures:

```rust
// Extract a JSON object
let config = vmap!(params, "config" => serde_json::Value::Null);

// Extract an array of strings
let tags = vmap!(params, "tags" => Vec::<String>::new());

// Extract a nested VMap
let options = vmap!(params, "options" => VMap::new());
```

### Specialized Type Extraction Macros

In addition to the general `vmap!` macro, VMap provides specialized macros for extracting specific types with cleaner syntax:

#### String Types
```rust
// Extract a string value with default
let name = vmap_str!(params, "name" => "default name");
```

#### Integer Types
```rust
// Extract various integer types with defaults
let small_value = vmap_i8!(params, "small_value" => 0);
let short_value = vmap_i16!(params, "short_value" => 0);
let normal_value = vmap_i32!(params, "normal_value" => 0);
let large_value = vmap_i64!(params, "large_value" => 0);

// Unsigned integer types
let byte_value = vmap_u8!(params, "byte_value" => 0);
let uint_value = vmap_u32!(params, "uint_value" => 0);
let big_uint_value = vmap_u64!(params, "big_uint_value" => 0);
```

#### Floating Point Types
```rust
// Extract float types with defaults
let float_value = vmap_f32!(params, "float_value" => 0.0);
let double_value = vmap_f64!(params, "double_value" => 0.0);
```

#### Boolean Type
```rust
// Extract boolean with default
let is_enabled = vmap_bool!(params, "is_enabled" => false);
```

#### Collection Types
```rust
// Extract a vector of strings with default
let tags = vmap_vec!(params, "tags" => Vec::<String>::new());
```

#### Nested Key Access

All specialized macros support dot notation for accessing nested values:

```rust
// Access nested values with specialized macros
let username = vmap_str!(params, "user.profile.name" => "guest");
let user_age = vmap_i32!(params, "user.profile.age" => 0);
let is_admin = vmap_bool!(params, "user.permissions.admin" => false);
let scores = vmap_vec!(params, "user.statistics.scores" => Vec::<i32>::new());
```

#### Date and Time Types (with chrono feature)

When the `chrono` feature is enabled, additional macros are available:

```rust
// Extract date values
let created_date = vmap_date!(params, "created_date" => chrono::NaiveDate::from_ymd_opt(2000, 1, 1).unwrap());

// Extract datetime values
let updated_at = vmap_datetime!(params, "updated_at" => chrono::Utc::now());
```

### Optional Values and Default Values

For optional values, use standard Rust Option patterns:

```rust
// If "timeout" is missing, use 30 seconds
let timeout = vmap!(params, "timeout" => 30);

// Explicitly check for presence when needed
let mode = if params.contains_key("mode") {
    Some(vmap!(params, "mode" => String::new()))
} else {
    Some("standard".to_string())
};

// Or more simply with Rust's standard library
let mode = vmap!(params, "mode" => "standard".to_string());
```

### Handling Nested Parameters

Extract nested parameters with path notation:

```rust
// Extract nested value: { "user": { "profile": { "name": "Alice" } } }
let name: String = vmap!(params, "user.profile.name", String)?;

// Or extract a sub-map and then access it
let user: VMap = vmap!(params, "user", Map)?;
let profile: VMap = vmap!(user, "profile", Map)?;
let name: String = vmap!(profile, "name", String)?;
```

## Error Handling

VMap provides detailed error messages that make debugging easier:

```rust
match vmap!(params, "count", Int) {
    Ok(count) => {
        // Use count
    },
    Err(e) => match e {
        Error::MissingParameter(param) => {
            println!("Missing required parameter: {}", param);
        },
        Error::InvalidParameter(msg) => {
            println!("Invalid parameter format: {}", msg);
        },
        _ => {
            println!("Other error: {:?}", e);
        }
    }
}
```

## VMap Data Flow

```mermaid
@include "../assets/images/vmap-flow.txt"
```

The diagram above illustrates how data flows through the VMap system:

1. Parameter data enters the system as a HashMap<String, ValueType>
2. The VMap wrapper provides a structured interface to this data
3. Extraction macros handle type conversion and error checking
4. Typed data is passed to the application logic

## Best Practices

1. **Use macros for clarity**: Prefer `vmap!` over manual extraction
2. **Handle optional parameters**: Use `vmap_opt!` for optional values
3. **Validate early**: Extract and validate parameters at the entry point
4. **Use descriptive error messages**: Add context to error messages
5. **Type consistency**: Use consistent parameter naming and types across services

## Implementation Details

The VMap implementation consists of:

- The `VMap` struct wrapping a `HashMap<String, ValueType>`
- Type-specific extraction methods for different data types
- The `vmap!` macro with type inference from default values for simplified access
- Integration with Kagi's error handling system 

## Related Documentation

- [Context System](context.md) - How context enables secure and traceable communication
- [Request Handling](request_handling.md) - Best practices for using VMap in request handlers
- [Service Lifecycle](lifecycle.md) - Understanding the service lifecycle and initialization
- [Logging System](logging.md) - Context-aware, structured logging 