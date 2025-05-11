# Vmap Macro Improvement Plan

## Current State
The `vmap` macro currently always creates a `HashMap<String, ArcValueType>` regardless of value types. This is not optimal when all values are the same primitive type, as we could use a more specific map type.

## Goals
- Improve the `vmap` macro to create type-specific maps when possible
- Only wrap in `ArcValueType` when the map contains multiple types
- For homogeneous maps (e.g., all values are `f64`), create a typed map (e.g., `HashMap<String, f64>`)
- Maintain backward compatibility with existing code

## Implementation Strategy
1. Create a new macro implementation that detects homogeneous types
2. For homogeneous maps, create a typed map wrapped in the appropriate `ArcValueType`
3. For heterogeneous maps, keep the current behavior
4. Update tests to validate both cases

## Progress
- [x] Analyzed current implementation
- [ ] Implement type detection logic
- [ ] Implement homogeneous map creation
- [ ] Update tests
- [ ] Document the new behavior

## Design Decisions
- We'll use compile-time type detection to identify when all values are of the same primitive type
- We'll maintain the ability to create heterogeneous maps using `ArcValueType`
- Following Rust best practices, we'll leverage the type system to ensure maximum compile-time safety
- The implementation will strictly follow the API design patterns in the codebase
