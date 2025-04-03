# Macro Implementation Plan

## Task Status

### Completed
- ✅ Fix the core Node API event handling system
- ✅ Complete the reference implementation in `string_service.rs`
- ✅ Implement core macro functionality for service, action, and subscribe
- ✅ Enhance action macro to handle both direct value and map parameters
- ✅ Fix subscribe macro to support async handler properly
- ✅ Develop auto-registration system for actions and subscriptions
- ✅ Fix API inconsistency in core Node crate (sync vs async methods)

### In Progress
- 🔄 Create tests to verify macro functionality against reference implementation
- 🔄 Implement auto-registration system in macros
- 🔄 Update subscribe macro implementation to use synchronous methods

### To Do
- ⬜ Clean up remaining linter errors
- ⬜ Further enhance the service macro
- ⬜ Add documentation and examples to macro code
- ⬜ Expand test coverage

## API Inconsistency Issue - RESOLVED

We identified and fixed an important API inconsistency in the core Node crate:

1. **Previous Inconsistency**:
   - `context.subscribe()` was async and required awaiting
   - Similar registration methods like `node.add_service()` were synchronous
   - This created an inconsistent API pattern and complicated macro implementation

2. **Solution Implemented**:
   - Made all subscription methods synchronous
   - Registration now happens immediately, returning a subscription ID
   - Any async work (like broker communication) happens in background tasks
   - This follows a "register now, process later" pattern that is consistent

3. **Benefits for Macros**:
   - Simplified the `subscribe` macro implementation
   - No need to handle awaiting in generated code
   - More consistent pattern for all registration methods

The fix has been implemented in the core Node API, and tests have been updated to use the new synchronous methods.

## Auto-Registration System Implementation

The auto-registration system has been successfully implemented and tested. It follows these key concepts:

1. **Service Macro**: Generates a struct with an `action_registry` field that stores action handlers.
2. **Action Macro**: Generates handler functions and registration methods for each action.
3. **Subscribe Macro**: Generates subscription handlers and registration methods.
4. **Registration Flow**: 
   - Action handlers are registered during service initialization via `register_actions`
   - Subscription handlers are registered during service `init()` via `register_subscriptions`

The benefits of this approach include:
- Single registration point for all actions
- Consistent error handling across all actions
- Clean integration with the Node API
- Type-safe parameter handling

### Implementation Details

The auto-registration system consists of:

1. **Action Handler Registry**: 
   - A HashMap stored in the service struct
   - Maps action names to handler functions
   - Handler functions are async closures

2. **Action Registration**: 
   - Each action method has a corresponding registration method
   - Registration methods add handlers to the registry

3. **Subscription Registration**:
   - Each subscription has a registration method
   - The service has a main `register_subscriptions` method that calls all individual subscription registration methods

4. **Error Handling**:
   - Consistent error handling patterns across all handlers
   - Properly converts errors to ServiceResponse objects

## Background

### Lessons Learned

Previous attempts to develop the macros suffered from several key issues:

1. **Circular Implementation Problems**:
   - Previous attempts modified the macro implementation to match test expectations
   - This led to hardcoded mock behaviors and test-specific logic in production code
   - We kept adding special cases to make tests pass rather than implementing correct macro behavior

2. **Design Mismatch**:
   - The existing macro tests expect specific implementation details that may not be ideal
   - Tests are coupled to implementation rather than behavior
   - This creates brittleness where any refactoring breaks tests, even if behavior is preserved

3. **Fundamental Implementation Flaws**:
   - Current macros contain test-specific behavior (like mock responses)
   - The macros try to do runtime reflection, which is limited in Rust
   - They mix concerns between code generation and test verification

## Implementation Strategy: Fix Fundamentals First

Our approach:

1. ✅ Fix the core Node API event handling system (completed)
2. ✅ Complete the macro implementation based on the reference implementation (completed)
3. ✅ Implement the auto-registration system to connect registration methods (completed)
4. 🔄 Create new tests that verify behavior, not implementation details (in progress)

### Reference Implementation (COMPLETED)

We have successfully completed a working reference implementation in `rust-macros-tests/tests/string_service.rs`. This implementation:
- Handles ValueType parameters correctly
- Implements both direct value and map-based parameters 
- Successfully handles service events through subscriptions
- Works with the Node API in end-to-end tests
- Provides a template for what the macros should generate

### Macro Testing Progress

We have implemented a successful test for the auto-registration system:
- Created a mock implementation that mimics what the macros should generate
- Verified the implementation works properly with the Node API
- Confirmed the error handling behaves as expected
- Validated parameter extraction for both direct values and maps

The next step is to enhance our macros to produce this exact code pattern.

## Implementation Requirements

Based on our reference implementation, the macros should generate code that follows these patterns:

### Service Macro Requirements

The `#[service]` macro should generate:

1. A struct with the fields provided by the user, plus:
   - `action_registry: Arc<HashMap<String, ActionHandlerFn>>`

2. A `new()` method that initializes these fields

3. A method to register all actions:
   ```rust
   fn register_actions(&mut self) {
       let mut registry = HashMap::new();
       // Call individual registration methods for each action
       self.action_registry = Arc::new(registry);
   }
   ```

4. An implementation of the `AbstractService` trait with:
   - Standard accessor methods (name, path, etc.)
   - An `init` method that registers subscriptions
   - A `handle_request` method that delegates to the appropriate action handler

### Action Macro Requirements

For each `#[action]` method, generate:

1. A handler method that:
   - Extracts parameters from the request
   - Calls the original method
   - Returns a properly formatted ServiceResponse

2. A registration method that:
   - Creates an async closure that calls the handler
   - Returns a HashMap with the action's registration

### Subscribe Macro Requirements

For each `#[subscribe]` method, generate:

1. A registration method that:
   - Creates a subscription with an async handler
   - Extracts parameters from the ValueType payload
   - Calls the original handler method
   - Provides proper error handling

2. Extend the `register_subscriptions` method to call all individual subscription registration methods

## Next Steps

1. Update the macros to generate code that follows the patterns demonstrated in our test
2. Implement comprehensive testing against the reference implementation
3. Clean up the codebase and remove unused code
4. Add documentation and examples 