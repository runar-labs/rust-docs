# Macro Testing Implementation Plan

## Overview

This document outlines the plan for implementing comprehensive tests for the procedural macros in the `runar_macros` crate. The goal is to ensure that all macros work correctly with the current node API and to provide a solid foundation for future development.

## Node Lifecycle

All macros must be tested with the correct node lifecycle pattern:

```rust
// 1. Create the node
let node = Node::new(config).await?;

// 2. Initialize the node
node.init().await?;

// 3. Register services
node.add_service(service).await?;

// 4. Start the node and all services
node.start().await?;

// 5. [Run operations]

// 6. Shut down gracefully
node.stop().await?;
```

## Implementation Phases

### Phase 1: Expansion Testing

Verify that macros expand to valid Rust code:

1. **Set up the test environment**:
   - Ensure all macros can be expanded with `cargo-expand`
   - Create scripts to check expansion patterns

2. **Verify expansion patterns**:
   - Check that `service` macro generates correct trait implementations
   - Verify that `action` macro properly registers handlers
   - Ensure `subscribe` macro sets up event handlers

3. **Document expected patterns**:
   - Create reference examples of correct expansions
   - Document common expansion issues

### Phase 2: Compilation Testing

Ensure that the expanded macros compile correctly:

1. **Create test services**:
   - Implement simple test services using all macros
   - Ensure they follow the correct API patterns

2. **Simplified tests**:
   - Create tests that verify basic compilation
   - Focus on interface compatibility, not runtime behavior

3. **API Compatibility**:
   - Ensure test code matches the current node API
   - Test with various parameter types and return values

### Phase 3: End-to-End Testing

Implement runtime tests with the actual node:

1. **Test helpers**:
   - Create a test node factory
   - Implement service registration helpers
   - Add request and event test utilities

2. **Service testing**:
   - Test service registration and discovery
   - Verify metadata is correctly exposed

3. **Action testing**:
   - Test direct parameter passing
   - Test mapped parameter passing
   - Verify error handling behavior

4. **Event testing**:
   - Test subscription registration
   - Test event publishing and receiving
   - Verify callback behavior

## Testing Matrix

| Macro     | Expansion Test | Compilation Test | E2E Test |
|-----------|---------------|-----------------|----------|
| service   | ✅             | ✅               | ✅        |
| action    | ✅             | ✅               | ✅        |
| subscribe | ✅             | ✅               | ✅        |

## Tools and Scripts

1. **check_expansions.sh**:
   - Expands all example macros
   - Verifies expansion patterns
   - Generates report

2. **check_specific_macro.sh**:
   - Expands a specific macro
   - Shows detailed output
   - Allows focused testing

3. **Test Environment**:
   - Sets up temporary directories for node testing
   - Provides isolated test environment
   - Cleans up after tests

## Implementation Strategy

1. **Focus on API correctness**:
   - Ensure all tests follow the current node API
   - Update tests when API changes

2. **Incremental approach**:
   - First get expansion testing working
   - Then ensure compilation
   - Finally implement runtime tests

3. **Documentation**:
   - Document all test patterns
   - Provide examples of correct usage
   - Update documentation when API changes

## Success Criteria

1. All macros expand to valid Rust code
2. All macros compile correctly with the current API
3. End-to-end tests pass for all macro functionality
4. Documentation is accurate and up-to-date

## Timeline

1. Phase 1: 1-2 days
2. Phase 2: 2-3 days
3. Phase 3: 3-5 days

Total: 1-2 weeks for complete implementation 