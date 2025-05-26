# Rust Macros Refactoring Plan

## Current State Analysis

After analyzing the codebase, I've identified the following issues with the current macro implementations:

1. The `action` macro doesn't properly handle direct parameter extraction from function signatures
2. The `service` macro needs to be updated to properly implement the AbstractService trait
3. The `subscribe` macro implementation is incomplete
4. The macros are not properly generating code that integrates with the Node framework

## Files Involved

1. `/Users/rafael/dev/rust-mono/rust-macros/src/lib.rs` - Main macro implementations
2. `/Users/rafael/dev/rust-mono/rust-macros/src/action.rs` - Action macro helper functions
3. `/Users/rafael/dev/rust-mono/rust-macros/src/service.rs` - Service macro helper functions
4. `/Users/rafael/dev/rust-mono/rust-macros/src/subscribe.rs` - Subscribe macro helper functions
5. `/Users/rafael/dev/rust-mono/rust-macros/tests/action_macro_test.rs` - Test file that should work after refactoring

## Reference Implementation

The `action_macro_test.rs` file provides a clear example of the expected API:

```rust
// Define a simple test service
#[derive(Clone)]
#[service(
    name = "test",
    description = "A simple test service",
    version = "1.0.0"
)]
struct TestService {

}

impl TestService {
    fn new() -> Self {
        Self {}
    }

    // Action with the action macro that uses direct parameters instead of ServiceRequest
    #[action(name = "add")]
    async fn add(&self, a: i32, b: i32) -> anyhow::Result<i32> {
        Ok(a + b)
    }

    // Action with default name using direct parameters
    #[action]
    async fn multiply(&self, a: i32, b: i32) -> anyhow::Result<i32> {
        Ok(a * b)
    }
}
```

## Required Changes

### 1. Service Macro

The `service` macro needs to:

1. Generate a proper implementation of the `AbstractService` trait
2. Set up the service with the provided metadata (name, description, version)
3. Ensure the service can be registered with a Runar node
4. Implement proper initialization for action registration

### 2. Action Macro

The `action` macro needs to:

1. Support direct parameter extraction from function signatures
2. Generate code to register the action with the Node during service initialization
3. Handle both named and default (function name) actions
4. Convert between primitive types and ArcValueType
5. Properly handle async functions

### 3. Subscribe Macro

The `subscribe` macro needs to be updated to properly handle event subscriptions.

## Implementation Plan

### Phase 1: Update Service Macro

1. Modify the `service` macro to generate a proper AbstractService implementation
2. Ensure the service has proper lifecycle methods (init, start, stop)
3. Add support for registering actions during initialization

### Phase 2: Update Action Macro

1. Modify the `action` macro to extract parameters from function signatures
2. Generate code to convert between ArcValueType and primitive types
3. Implement proper error handling
4. Support both named and default actions

### Phase 3: Update Subscribe Macro

1. Update the `subscribe` macro to properly handle event subscriptions
2. Ensure it integrates with the Node's event system

### Phase 4: Testing

1. Ensure the `action_macro_test.rs` test passes
2. Verify that the macros work with the existing codebase

## Detailed Implementation Approach

### Service Macro Implementation

The service macro should:

1. Parse attributes (name, description, version)
2. Generate an implementation of AbstractService
3. Add methods for action registration during initialization

### Action Macro Implementation

The action macro should:

1. Parse the function signature to extract parameter types and names
2. Generate code to extract parameters from ArcValueType
3. Call the original function with extracted parameters
4. Convert the result back to ArcValueType
5. Register the action handler during service initialization

### Subscribe Macro Implementation

The subscribe macro should:

1. Parse the function signature
2. Generate code to extract event data
3. Register the subscription handler during service initialization

## Success Criteria

1. The `action_macro_test.rs` test passes
2. The macros generate code that properly integrates with the Node framework
3. The macros follow the documented API and architecture boundaries
4. The implementation is clean, maintainable, and well-documented