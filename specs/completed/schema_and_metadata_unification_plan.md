# Design Document: Schema Representation and Metadata Unification

**Date:** 2024-07-30
**Status:** Proposed
**Owner:** AI Assistant

## 1. Introduction and Goals

This document outlines a plan to refine how data schemas are represented within service metadata and how `Action/Event` "Capability" structs are unified with their "Metadata" counterparts.

The primary goals are:

- Define clear, type-safe Rust structs for representing data schemas (e.g., for action parameters, results, and event data) instead of relying on `Option<HashMap<String, String>>` or deeply nested `ArcValueType` for the schema structure itself.
- Ensure that `ArcValueType` is primarily used as a wrapper for payloads during transport between services, for dynamic parts of a payload, or for representing example/default values _when converted from their string representation by a consumer of the schema_, not as a core part of static metadata definitions like schemas.
- Unify the `ActionCapability` and `ActionMetadata` structs into a single, canonical `ActionMetadata` struct.
- Unify the `EventCapability` and `EventMetadata` structs into a single, canonical `EventMetadata` struct.
- Simplify the overall system by reducing redundant types and improving type safety for schema definitions.

## 2. Schema Representation

### 2.1. Current Problems

Currently, schema fields like `params_schema`, `result_schema`, and `data_schema` are typed as `Option<HashMap<String, String>>`. This representation has several limitations:

- **Limited Expressiveness:** A `HashMap<String, String>` can only represent flat key-value pairs where values are strings. Real-world schemas need to describe various data types (integers, booleans, nested objects, arrays), constraints, and other metadata (e.g., descriptions for fields).
- **Type Safety:** There's no compile-time checking for the validity or structure of the "schema" beyond it being a map of strings.
- **Conversion Overhead & Inconsistency:** As seen in `registry_info.rs`, these `HashMap<String, String>` schemas often need to be converted into `ArcValueType` to be part of a larger response structure. This implies that the intended final form is more complex than a simple string map. There were also observed inconsistencies where some parts of the code expected `ArcValueType` for these schemas, while definitions were `HashMap<String, String>`.

Using `ArcValueType` directly for the entire schema definition within metadata structs was considered but goes against the principle of using `ArcValueType` primarily as a transport wrapper for payloads rather than a way to define static structure.

### 2.2. Proposed Schema Structs

To address these issues, we propose a set of dedicated Rust structs to model schemas, drawing inspiration from common schema definition patterns. These structs are intended for binary serialization as part of the overall metadata.

'''rust
// In a new common module, e.g., rust_common/src/models/schemas.rs
// or rust_node/src/models/metadata.rs (if primarily node-internal but shared).
// For FieldSchema, ActionMetadata, EventMetadata, ServiceMetadata.

use std::collections::HashMap;
// ArcValueType might be used by consumers of FieldSchema when parsing string-represented
// default_value, enum_values, or example for complex types, but not stored directly in FieldSchema.
// use runar_common::types::ArcValueType;
use serde::{Deserialize, Serialize}; // For binary serialization of metadata structs

/// Defines the type of a schema field. #[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub enum SchemaDataType {
String,
Integer, // Represents whole numbers (e.g., i32, i64)
Number, // Represents floating-point numbers (e.g., f32, f64)
Boolean,
Object,
Array,
Null,
}

/// Represents the schema for a single field or a complex data structure. #[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct FieldSchema {
/// The data type of the field. For complex types like Object or Array,
/// this defines the main type, and 'properties' or 'items' define the substructure.
pub data_type: SchemaDataType,

    pub description: Option<String>,
    pub nullable: Option<bool>,

    /// String representation of the default value.
    /// Consumers must parse this string based on 'data_type'.
    /// For complex types (Object, Array), this should be a JSON string representation.
    pub default_value: Option<String>,

    /// For `SchemaDataType::Object`: Defines the schema for each property of the object.
    /// Keys are property names.
    pub properties: Option<HashMap<String, Box<FieldSchema>>>, // Boxed to handle recursive type
    pub required: Option<Vec<String>>,

    /// For `SchemaDataType::Array`: Defines the schema for items in the array.
    /// All items in the array must conform to this schema.
    pub items: Option<Box<FieldSchema>>, // Boxed to handle recursive type

    pub pattern: Option<String>,

    /// String representations of allowed enumeration values.
    /// Consumers must parse these strings based on 'data_type'.
    pub enum_values: Option<Vec<String>>,

    // Numeric constraints
    pub minimum: Option<f64>,
    pub maximum: Option<f64>,
    pub exclusive_minimum: Option<bool>, // If true, minimum is exclusive
    pub exclusive_maximum: Option<bool>, // If true, maximum is exclusive

    // String length constraints
    pub min_length: Option<usize>,
    pub max_length: Option<usize>,

    // Array length constraints
    pub min_items: Option<usize>,
    pub max_items: Option<usize>,

    /// String representation of an example value.
    /// Consumers must parse this string based on 'data_type'.
    /// For complex types (Object, Array), this should be a JSON string representation.
    pub example: Option<String>,

}

impl FieldSchema {
// Helper constructors for common types
pub fn string() -> Self { FieldSchema::new(SchemaDataType::String) }
pub fn integer() -> Self { FieldSchema::new(SchemaDataType::Integer) }
pub fn number() -> Self { FieldSchema::new(SchemaDataType::Number) }
pub fn boolean() -> Self { FieldSchema::new(SchemaDataType::Boolean) }
pub fn object(properties: HashMap<String, Box<FieldSchema>>, required: Option<Vec<String>>) -> Self {
FieldSchema {
data_type: SchemaDataType::Object,
properties: Some(properties),
required,
..FieldSchema::new(SchemaDataType::Object)
}
}
pub fn array(items: Box<FieldSchema>) -> Self {
FieldSchema {
data_type: SchemaDataType::Array,
items: Some(items),
..FieldSchema::new(SchemaDataType::Array)
}
}
pub fn new(data_type: SchemaDataType) -> Self {
FieldSchema {
data_type,
description: None,
nullable: None,
default_value: None,
properties: None,
required: None,
items: None,
pattern: None,
enum_values: None,
minimum: None,
maximum: None,
exclusive_minimum: None,
exclusive_maximum: None,
min_length: None,
max_length: None,
min_items: None,
max_items: None,
example: None,
}
}
}
'''

The top-level schema for action parameters, results, or event data will typically be an object. Therefore, the fields `parameters_schema`, `result_schema`, and `data_schema` in metadata structs will be of type `Option<FieldSchema>`. The `FieldSchema` instance itself would have `data_type: SchemaDataType::Object` and use its `properties` field.

### 2.3. Rationale

- **Expressiveness:** Allows defining complex data structures, types, and constraints.
- **Type Safety:** Provides compile-time checking for the schema structure itself.
- **Clarity:** Makes the intent and structure of schemas explicit.
- **Standardization:** Aligns with common practices in API and data modeling.
- **Serialization:** Derives `Serialize` and `Deserialize` for easy binary conversion (e.g., via `bincode`) as part of containing metadata structs. If a specific JSON representation of `FieldSchema` itself is needed later for other purposes (e.g., documentation tools), custom serialization logic or a separate DTO could be introduced.
- **`ArcValueType` for Transport/Dynamic Data:** Actual payloads are transported as `ArcValueType`. `FieldSchema` defines their structure. For default values, enum values, and examples within `FieldSchema`, these are stored as `String`. Consumers of the schema are responsible for parsing these strings (e.g., as JSON if the `data_type` indicates a complex type) into appropriate Rust types or `ArcValueType` instances as needed.

## 3. Unification of Metadata and Capability Structs

### 3.1. ActionMetadata and ActionCapability

**Analysis:**
`ActionMetadata` (internal representation) and `ActionCapability` (network advertisement) are semantically identical. They can be unified.

**Proposal:**

1.  **Define `ActionMetadata` as the canonical struct.** It, along with `EventMetadata`, `FieldSchema`, and the unified `ServiceMetadata` (formerly `ServiceCapability`), should be located in a common, shared module (e.g., `rust_common::models::schemas` or a new `rust_node::models::metadata` if primarily node-internal but shared across its sub-modules like network and services). This module will house all canonical metadata definitions.
2.  Update `ActionMetadata` to use `Option<FieldSchema>` for its schema fields and `path` for identification:
    '''rust
    // In the new common metadata module #[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
    pub struct ActionMetadata {
    pub path: String, // Full action path, e.g., "service_path/action_name"
    pub description: String,
    pub parameters_schema: Option<FieldSchema>,
    pub return_schema: Option<FieldSchema>,
    }
    '''
3.  **Remove `ActionCapability`** from `rust-node/src/network/capabilities.rs`.
4.  **Rename `ServiceCapability` to `ServiceMetadata`**. This unified `ServiceMetadata` struct should also be defined in the new common module. It will use `Vec<ActionMetadata>`:
    '''rust
    // In the new common metadata module #[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
    pub struct ServiceMetadata { // Renamed from ServiceCapability
    pub network_id: String,
    pub service_path: String, // Path of the service itself
    pub name: String, // Human-readable name of the service
    pub version: String,
    pub description: String,
    pub actions: Vec<ActionMetadata>,
    pub events: Vec<EventMetadata>,
    }
    '''

### 3.2. EventMetadata and EventCapability

**Analysis:**
`EventMetadata` (internal) and `EventCapability` (network) are also semantically very similar. The main difference was `name` vs. `topic`. This can be unified by using a `path` field for the full event topic.

**Proposal:**

1.  **Define `EventMetadata` as the canonical struct** in the new common metadata module.
2.  Update `EventMetadata` to use `Option<FieldSchema>` and `path` for identification:
    '''rust
    // In the new common metadata module #[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
    pub struct EventMetadata {
    pub path: String, // Full event topic, e.g., "service_path/event_name"
    pub description: String,
    pub data_schema: Option<FieldSchema>,
    }
    '''
3.  **Remove `EventCapability`** from `rust-node/src/network/capabilities.rs`.
4.  The unified `ServiceMetadata` (as defined in 3.1.4) will use `Vec<EventMetadata>`.
5.  **Topic Access:** The full event topic is now directly available in `EventMetadata.path`.

### 3.3. Impact on Service Advertising (formerly ServiceCapability)

The (now renamed) `ServiceMetadata` struct, defined in the common metadata module, will be the single source of truth for advertising a service's capabilities:
'''rust
// In the new common metadata module (repeated for clarity of its final form) #[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ServiceMetadata {
pub network_id: String,
pub service_path: String, // Path of the service itself
pub name: String, // Human-readable name of the service
pub version: String,
pub description: String,
pub actions: Vec<ActionMetadata>,
pub events: Vec<EventMetadata>,
}
'''
All contained structs (`ActionMetadata`, `EventMetadata`, `FieldSchema`, `SchemaDataType`) also derive `Serialize` and `Deserialize` for consistent binary serialization of the entire `ServiceMetadata` structure.

## 4. Implications and Next Steps

**Code Changes Required (Post-Approval):**

1.  **Create New Common Module:** (e.g., `rust_common::models::schemas` or `rust_node::models::metadata`). Define `FieldSchema`, `SchemaDataType`, `ActionMetadata`, `EventMetadata`, and `ServiceMetadata` (formerly `ServiceCapability`) there.
2.  **Remove Old Structs:** Delete `ActionCapability`, `EventCapability` from `rust-node/src/network/capabilities.rs`. Potentially delete `capabilities.rs` if `ServiceCapability` was its only occupant and is now moved.
3.  **Update `abstract_service.rs`:** `ActionMetadata` and `EventMetadata` definitions will be removed from here (as they move to the common module). The `CompleteServiceMetadata` struct in `abstract_service.rs` will need to be updated to use these new canonical `ActionMetadata` and `EventMetadata` types from the common module. It likely also needs to derive `Serialize, Deserialize` if it's part of any larger state that gets serialized.
4.  **Refactor `rust-node/src/node.rs`:**
    - Adjust logic for creating `ServiceMetadata` (formerly `ServiceCapability`) instances.
    - Update interactions with `CompleteServiceMetadata` to align with the new `FieldSchema` in `ActionMetadata`/`EventMetadata`.
5.  **Refactor `rust-node/src/services/remote_service.rs`:**
    - The `create_from_capabilities` function (which might be renamed, e.g., `create_from_metadata`) will now receive `ServiceMetadata`.
    - Logic for handling schemas will work directly with `FieldSchema`.
6.  **Refactor `rust-node/src/services/registry_info.rs`:**
    - When constructing responses, if schemas are `Option<FieldSchema>`, they will need to be appropriately converted to `ArcValueType` if the response format demands it (e.g., by serializing the `FieldSchema` to a JSON string then into an `ArcValueType::String`, or by recursively converting the `FieldSchema` structure into a nested `ArcValueType::Map`). A helper function `impl FieldSchema { fn to_arc_value_type(&self) -> ArcValueType { /* ... */ } }` might be beneficial. This conversion is for representing the schema _as data_ in the response, not for transporting the schema definition itself during discovery (which uses the binary serialized `ServiceMetadata`).
7.  **Update Other Consumers:** Any other code that uses or creates these metadata or capability structs will need to be updated. This includes tests.
8.  **Update `vmap!` Usage:** If `vmap!` was used to create schema _definitions_, this will change. Services will now construct `FieldSchema` instances directly. `vmap!` remains for creating `ArcValueType` _payloads_.

**Serialization of Schemas for Transport:**
With `FieldSchema`, `ActionMetadata`, `EventMetadata`, and `ServiceMetadata` all deriving `serde::Serialize` and `serde::Deserialize`, the `ServiceMetadata` object can be efficiently serialized to binary (e.g., using `bincode`) for network transport during service discovery. This uses `serde` for the mechanism but doesn't impose a JSON structure on the wire for `FieldSchema` itself unless explicitly chosen for that transport layer.

This plan provides a more robust and type-safe way to handle schemas and simplifies the metadata structures.
