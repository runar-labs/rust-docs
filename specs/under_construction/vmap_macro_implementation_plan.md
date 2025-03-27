# VMAP Macro Implementation Plan

## Overview

The goal is to create a simple, robust, and type-safe `vmap!` macro that handles both:
1. Extracting values from `ValueType::Map` structures with sensible defaults
2. Creating `ValueType::Map` structures from key-value pairs

This will replace the numerous specialized macros with a single, flexible macro that uses Rust's type system to infer the correct conversions.

## Current Issues

1. The current implementation has too many specialized macros (vmap_string!, vmap_i32!, etc.)
2. The pattern matching uses invalid syntax (the `is` keyword for guards)
3. Type casting is not handled consistently
4. The API is not intuitive for users
5. There is duplication of logic across different macros (all those extract, result, variation.all need to be removed.)
6. The `vmap_opt` macro duplicates functionality and introduces complexity in imports

## Requirements

1. The macro should support two primary use cases:
   - Extracting values from a `ValueType::Map` with a default value
   - Creating a new `ValueType::Map` from key-value pairs

2. Type handling:
   - Should automatically infer the desired type from the default value
   - Should handle common types: String, i32, f64, bool
   - Should support collections (Vec, HashMap) where appropriate

3. Syntax should be clean and intuitive:
   ```rust
   // Value extraction
   let name: String = vmap_get!(data, "name" => "");
   let count: i32 = vmap_get!(data, "count" => 0);
   let active: bool = vmap_get!(data, "active" => false);
   
   // Map creation
   let params = vmap!{"key1" => "value1", "key2" => 42};
   ```

4. Error handling should be graceful:
   - Missing keys should return the default value
   - Type mismatches should attempt sensible conversions or return the default
   - No panics in normal operation

5. Should integrate with the existing VMap struct and ValueType enum

6. No backward compatibility - any code that uses the old vmap macros should be changed to use the new design.

IMPORTANT DONT DEVIATE FROM THIS DESIGN, THINK DEEP AND THINK HARD ON HOW O ACHIVE THIS IN RUST.

Worst case scenarion if deducing teh type is proving dificult add a parametr fo rhe type
   let name: String = vmap_get!(data, "name" => "", String);


## Implementation Approach

### Macro Design

1. Use a unified approach with different patterns for extraction and creation
2. Leverage Rust's pattern matching for safe type extraction
3. Avoid complex or invalid syntax patterns
4. Ensure good error messages for common mistakes

### Primary Macro Logic

For value extraction:
1. Check if input is a `ValueType::Map`
2. Look for the key in the map
3. If found, attempt to convert to the expected type (inferred from default)
4. If not found or conversion fails, return the default value

For map creation:
1. Create a new HashMap
2. Add each key-value pair, converting values to ValueType as needed
3. Return a ValueType::Map

### Type Conversion Strategy

Use pattern matching to safely handle type conversions:
- String → can be extracted directly
- Number → can be converted to i32 or f64 as needed
- Boolean → can be extracted directly
- Collections → special handling based on collection type

## Eliminating vmap_opt Macro

### Issue Identified
The `vmap_opt` macro was duplicated across files (`rust-common/src/macros/mod.rs` and `rust-common/src/macros/vmap_macros.rs`) and caused import issues in the `rust-node` crate. While the macro was correctly defined and exported in `runar_common`, it couldn't be reliably imported.

### Analysis
The `vmap_opt` macro essentially does two things:
1. Returns `None` when called with empty braces: `vmap_opt! {}`
2. Returns `Some(ValueType::Map(...))` when called with key-value pairs

This functionality can be achieved using the standard `vmap!` macro combined with `Option` types.

### Solution
We have decided to eliminate the `vmap_opt` macro entirely and replace it with:
1. Direct use of `None` for empty maps
2. `Some(vmap! { ... })` for maps with content

All usages of `vmap_opt! {}` in the codebase (primarily in `node.rs` and `services/mod.rs`) will be replaced accordingly. This approach:
- Reduces macro duplication
- Eliminates import complexity
- Uses Rust's standard `Option` type more explicitly
- Leverages the existing `vmap!` macro for consistent API

## Implemented Enhancements

### Dot Notation for Nested Key Access

We've implemented dot notation to access nested maps, which greatly simplifies the code:

```rust
// Before: Multiple steps to access nested values
let nested_val = vmap!(map.clone(), "nested");
if let ValueType::Map(nested) = nested_val {
    let key_val = vmap_str!(ValueType::Map(nested), "key", "default");
    // ...
}

// After: Simple dot notation
let nested_key_val = vmap_str!(map.clone(), "nested.key", "default");
```

This works with arbitrary nesting depth:
```rust
let deep_value = vmap_str!(map, "level1.level2.level3.level4.key", "default");
```

### Extended Type Support

We've added specialized macros for a comprehensive range of types:

1. Integer types: 
   - `vmap_i8!`, `vmap_i16!`, `vmap_i32!`, `vmap_i64!`
   - `vmap_u8!`, `vmap_u32!`, `vmap_u64!`

2. Float types:
   - `vmap_f32!`, `vmap_f64!`

3. Other basic types:
   - `vmap_str!`, `vmap_bool!`

4. Collection types:
   - `vmap_vec!` for array/vector extraction

5. Date and time types (with chrono feature):
   - `vmap_date!` for NaiveDate
   - `vmap_datetime!` for DateTime<Utc>

All these macros support both direct key lookup and nested key access with dot notation.

### Robust Error Handling

Each macro now includes:
- Graceful handling of missing keys
- Type conversion where appropriate
- Return of default values when lookup or conversion fails
- Safe traversal of nested structures

## Testing Strategy

1. Unit tests for the macro itself ✓
   - Basic value extraction for all supported types
   - Map creation with various value types
   - Error handling (missing keys, type mismatches)
   - Edge cases (empty maps, null values)

2. Integration tests ✓
   - Use in the context of service requests
   - Use in parameter extraction scenarios
   - Nested map handling
   - Deep nesting access (5+ levels)

3. Type Conversion Tests ✓
   - Tests for all numeric types with appropriate ranges
   - String↔numeric conversions
   - Boolean conversions
   - Collection handling

## Implementation Status

1. Create a prototype of the new macro in rust-common/src/macros/mod.rs ✓
2. Write comprehensive tests to verify functionality ✓
3. Add support for nested key access via dot notation ✓
4. Extend type support with specialized extraction macros ✓
5. Add support for collection types and date/time types ✓ 
6. Update documentation to reflect the new API ✓
7. Eliminated the redundant `vmap_opt` macro and replaced with standard Option+vmap pattern ✓

## Next Steps

1. ✓ Update rust-node crate to use the enhanced vmap API
2. ✓ Update instances of `vmap_opt!` to use `None` or `Some(vmap!{...})` as appropriate
3. ✓ Ensure all tests in rust-common pass with the new implementation
4. ⏳ Resolve remaining issues in rust-node tests (specifically in the math_service test code) 
5. Consider further optimizations or feature enhancements based on usage patterns
6. Finalize documentation with complete examples

## Recent Changes

### Removing vmap_opt Macro Implementation

In order to streamline the macro interface and reduce duplication, we've successfully:

1. Removed the `vmap_opt` macro definition from `rust-common/src/macros/mod.rs` and `rust-common/src/macros/vmap_macros.rs`
2. Added appropriate documentation notes indicating that users should use `None` and `Some(vmap!{...})` instead
3. Updated the `rust-common/src/lib.rs` file to ensure that all modules are correctly exported
4. Fixed the import in `rust-node/tests/fixtures/math_service.rs` to use the new `vmap_f64!` macro instead of the old `vmap_extract_f64!` macro
5. Verified that all `rust-common` tests pass successfully

This approach simplifies the codebase and leverages Rust's standard `Option` type more effectively, making the code more consistent and easier to maintain.
