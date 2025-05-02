# ValueType Redesign: Custom Type-Preserving Serialization System

## Overview

This document outlines a redesign of the ValueType system to create a more type-safe, efficient serialization system. The new system will feature two primary types:

1. `Value<T>` for basic values and lists
2. `MapValue<K, V>` for map structures

## Goals

- Remove all Serde dependencies from serialization/deserialization
- Use bincode for all serialization/deserialization
- For maps, use bincode to serialize and deserialize the map
- Maintain type information through serialization
- Enable zero-copy access for direct type matches
- Provide unified serialization protocol for network transmission
- Support efficient generic deserialization from raw bytes
- No backward compatibility - create the new design fresh
- **Implement lazy deserialization** to minimize overhead in network scenarios
- **Support zero serialization overhead for same-runtime service calls**
 
## Constructor Pattern

Following Rust's best practices, we'll use a unified constructor pattern with a single primary constructor:

```rust
// Create primitive values with the unified constructor
let s = Value::<String>::new("Hello".to_string());
let i = Value::<i32>::new(42);
let f = Value::<f64>::new(3.14159);
let b = Value::<bool>::new(true);

// Create lists using the list constructor
let str_list = Value::<String>::new_list(vec!["one".to_string(), "two".to_string()]);
let int_list = Value::<i32>::new_list(vec![1, 2, 3]);
let float_list = Value::<f64>::new_list(vec![1.1, 2.2, 3.3]);

// Create null value
let null = Value::<()>::null();

// Create maps with the unified constructor
let str_to_str_map = MapValue::<String, String>::new(map);
let str_to_int_map = MapValue::<String, i32>::new(map);
let str_to_float_map = MapValue::<String, f64>::new(map);
let str_to_bool_map = MapValue::<String, bool>::new(map);
let int_to_string_map = MapValue::<i32, String>::new(map);
```

## Design

### 1. Core Types

#### `Value<T>`

```rust
enum Value<T> {
    Value(T),                         // Basic typed value (String, i32, f64, etc.)
    List(Vec<Value<T>>),              // Homogeneous list of values
    Struct(Box<dyn CustomStruct>),    // Custom struct with type preservation
    Null,                             // Null/None value
    Bytes(TypedBytes),                // Raw bytes with type information for lazy deserialization
}

impl<T: 'static + Clone + Send + Sync> Value<T> {
    // Primary constructor
    pub fn new(value: T) -> Self {
        Value::Value(value)
    }
    
    // List constructor
    pub fn new_list(values: Vec<T>) -> Self {
        Value::List(values.into_iter().map(Value::new).collect())
    }
    
    // Null constructor
    pub fn null() -> Value<()> {
        Value::Null
    }
}
```

#### `TypedBytes`

```rust
struct TypedBytes {
    bytes: Vec<u8>,             // Raw serialized data
    type_info: TypeInfo,        // Type information for deserialization
    deserialized: Option<Box<dyn Any + Send + Sync>>, // Cached deserialized value
}

impl TypedBytes {
    pub fn new(bytes: Vec<u8>, type_info: TypeInfo) -> Self {
        TypedBytes {
            bytes,
            type_info,
            deserialized: None,
        }
    }
}
```

#### `MapValue<K, V>`

```rust
struct MapValue<K, V> {
    entries: HashMap<K, V>,
    serialized: Option<TypedBytes>, // For lazy deserialization when received over network
}

impl<K: 'static + Clone + Send + Sync + Eq + std::hash::Hash, 
     V: 'static + Clone + Send + Sync> MapValue<K, V> {
    // Primary constructor
    pub fn new(entries: HashMap<K, V>) -> Self {
        MapValue {
            entries,
            serialized: None,
        }
    }
    
    // Create from serialized bytes (for lazy deserialization)
    pub fn from_bytes(bytes: Vec<u8>, type_info: TypeInfo) -> Self {
        MapValue {
            entries: HashMap::new(),
            serialized: Some(TypedBytes::new(bytes, type_info)),
        }
    }
}
```

### 2. Type Traits

#### `ValueBase`

Common interface for all value types:

```rust
trait ValueBase: Send + Sync {
    fn to_bytes(&self) -> Result<Vec<u8>>;
    fn type_info(&self) -> TypeInfo;
    fn as_any(&self) -> &dyn Any;
    fn clone_box(&self) -> Box<dyn ValueBase + Send + Sync>;
}
```

#### `ValueConvert`

Interface for value type conversion:

```rust
trait ValueConvert {
    // Convert to specific type
    fn as_type<U: 'static + Clone + Send + Sync>(&self) -> Result<U>;
    
    // Convert to map
    fn as_map<K: 'static + Clone + Send + Sync + Eq + std::hash::Hash, 
              V: 'static + Clone + Send + Sync>(&self) -> Result<HashMap<K, V>>;
    
    // Convert to list
    fn as_list<U: 'static + Clone + Send + Sync>(&self) -> Result<Vec<U>>;
    
    // Type-safe conversion using Rust's type system
    fn try_into<U: 'static>(&self) -> Result<U>
        where U: TryFrom<Box<dyn Any>>;
}
```

#### `CustomStruct` 

For struct type preservation:

```rust
trait CustomStruct: Debug + Any + Send + Sync {
    fn to_bytes(&self) -> Result<Vec<u8>>;
    fn type_name(&self) -> &'static str;
    fn clone_box(&self) -> Box<dyn CustomStruct + Send + Sync>;
    fn as_any(&self) -> &dyn Any;
}
```

### 3. Type Information System

To support lazy deserialization, we need a robust type information system:

```rust
enum TypeInfo {
    Primitive(PrimitiveType),
    List(Box<TypeInfo>),
    Map(Box<TypeInfo>, Box<TypeInfo>), // Key, Value types
    Struct(String),                    // Struct type name
    Null,
    Raw,                               // Raw bytes
}

enum PrimitiveType {
    String,
    Int32,
    Int64,
    Float32,
    Float64,
    Bool,
    // other primitive types
}
```

### 4. Serialization Protocol

Binary serialization format:

```
[TYPE_MARKER:1 byte][TYPE_INFO:variable][DATA:variable]
```

Type markers:
- `0x01`: ValueType<T> with primitive T
- `0x02`: ValueType<Vec<T>> for lists
- `0x03`: MapValueType<K, V>
- `0x04`: ValueType<T> with Struct T
- `0x05`: Null
- `0x06`: Raw Bytes

Type info (when needed):
- For primitives: One byte indicating the specific primitive type
- For lists: Type info for the element type
- For maps: Type info for both key and value types
- For structs: Type name as length-prefixed string

### 5. Lazy Deserialization

The system will support lazy deserialization for network scenarios:

```rust
fn value_from_bytes(data: &[u8]) -> Result<Box<dyn ValueBase>> {
    if data.is_empty() {
        return Err(Error::EmptyData);
    }
    
    // Extract type information but don't deserialize payload yet
    let type_marker = data[0];
    let (type_info, offset) = parse_type_info(&data[1..])?;
    
    // Store bytes and type info for lazy deserialization
    let typed_bytes = TypedBytes::new(
        data[offset+1..].to_vec(), // +1 to skip the marker
        type_info
    );
    
    // Create appropriate Value with TypedBytes
    match type_marker {
        0x01 => Ok(Box::new(Value::<()>::Bytes(typed_bytes))),
        0x02 => Ok(Box::new(Value::<()>::Bytes(typed_bytes))),
        0x03 => {
            // Create MapValue with serialized data for lazy deserialization
            Ok(Box::new(MapValue::<(), ()>::from_bytes(typed_bytes.bytes, typed_bytes.type_info)))
        },
        0x04 => Ok(Box::new(Value::<()>::Bytes(typed_bytes))),
        0x05 => Ok(Box::new(Value::<()>::Null)),
        0x06 => Ok(Box::new(Value::<Vec<u8>>::new(data[offset..].to_vec()))),
        _ => Err(Error::UnknownTypeMarker(type_marker)),
    }
}
```

## Usage Scenarios

The ValueType system supports two primary scenarios:

### 1. Same-Runtime Service Calls

When services are in the same runtime, no serialization occurs:

```rust
// Client code
let mut map_x = HashMap::new();
map_x.insert("value".to_string(), 42.0);

let result = ctx.request("service/actionx", MapValue::new(map_x)).await?;

// Extract result
let result_string = result.as_type::<String>()?;

// Service implementation
fn action_x(ctx: Context, params: Box<dyn ValueBase>) -> Result<Box<dyn ValueBase>> {
    // Direct access to the map - no serialization overhead
    let map_param = params.as_map::<String, f64>()?;
    
    // Process and return
    Ok(Box::new(Value::<String>::new("Success".to_string())))
}
```

### 2. Network Service Calls

For services communicating over the network:

```rust
// Client code (same as above)
let mut map_x = HashMap::new();
map_x.insert("value".to_string(), 42.0);

let result = ctx.request("remote/service/actionx", MapValue::new(map_x)).await?;

// Network layer
let params: Box<dyn ValueBase> = ...; // From client request
let params_bytes = params.to_bytes()?;      // Serialize with type information
// Send over network

// Receiving side
let params_bytes = network_msg.params_bytes();
// Create ValueType that stores bytes for lazy deserialization
let params = value_from_bytes(params_bytes)?;

// Service implementation
fn action_x(ctx: Context, params: Box<dyn ValueBase>) -> Result<Box<dyn ValueBase>> {
    // Lazy deserialization happens here - only when type is needed
    let map_param = params.as_map::<String, f64>()?;
    
    // Process and return
    Ok(Box::new(Value::<String>::new("Success".to_string())))
}
```

## Basic Testing 

To ensure the design works as expected, implement basic tests that verify:

1. Construction and access of primitive values
2. List creation and manipulation
3. Map operations
4. Serialization/deserialization with type preservation
5. Lazy deserialization behavior
6. Zero-copy access for same-runtime calls

This lightweight test suite will validate the core functionality without excessive test proliferation