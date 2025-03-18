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
// Get a String value with the macro
let name: String = vmap!(params, "name", String)?;

// Get an integer with the macro
let count: i32 = vmap!(params, "count", Int)?;

// Get a boolean with the macro
let enabled: bool = vmap!(params, "enabled", Bool)?;

// Get an optional value (doesn't error if missing)
let description: Option<String> = vmap_opt!(params, "description", String);
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
    // Extract parameters with type conversion
    let name: String = vmap!(params, "name", String)?;
    let count: i32 = vmap!(params, "count", Int)?;
    let enabled: bool = vmap_opt!(params, "enabled", Bool).unwrap_or(false);

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
let config: serde_json::Value = vmap!(params, "config", Json)?;

// Extract an array of strings
let tags: Vec<String> = vmap!(params, "tags", StringArray)?;

// Extract a nested VMap
let options: VMap = vmap!(params, "options", Map)?;
```

### Default Values

The `vmap_opt!` macro allows specifying default values:

```rust
// If "timeout" is missing, use 30 seconds
let timeout: u64 = vmap_opt!(params, "timeout", Int).unwrap_or(30);

// If "mode" is missing, use "standard"
let mode: String = vmap_opt!(params, "mode", String).unwrap_or_else(|| "standard".to_string());
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
- The `vmap!` and `vmap_opt!` macros for simplified access
- Integration with Kagi's error handling system 

## Related Documentation

- [Context System](context.md) - How context enables secure and traceable communication
- [Request Handling](request_handling.md) - Best practices for using VMap in request handlers
- [Service Lifecycle](lifecycle.md) - Understanding the service lifecycle and initialization
- [Logging System](logging.md) - Context-aware, structured logging 