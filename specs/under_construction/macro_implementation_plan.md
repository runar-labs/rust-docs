# Macro Implementation Plan: Fresh Approach

## Progress Update

### Completed Tasks:
- ✅ Phase 1: Reference Implementation
  - ✅ Created reference implementation (StringService) that demonstrates service structure
  - ✅ Implemented complete working service with actions
  - ✅ Fixed all issues with StringService implementation (handling Option<ValueType> data)
  - ✅ Successfully tested with Node API
  - ✅ Removed duplicate code from docs directory
  - ✅ Identified critical issue with event handling in subscribe callbacks (see "New Issue" below)

### Tasks In Progress:
- 🔄 Macro Development
  - 🔄 Update macros to generate code matching the reference implementation
  - 🔄 Fix the service macro to support dynamic action handlers

### Tasks To Do:
- ⬜ Macro Development (continued)
  - ⬜ Update action macro to handle different parameter types
  - ⬜ Update subscribe macro to implement proper event callback structure
  - ⬜ Ensure macros produce exactly the same code as the manually written version
  - ⬜ Thoroughly test the macros with simple input cases

- ⬜ Test Development
  - ⬜ Create new tests that verify macro behavior, not implementation details
  - ⬜ Focus on end-to-end testing with the Node API
  - ⬜ Demonstrate how services should be used in real-world scenarios

## New Issue: Event Handler Limitations in Core System

During our reference implementation work, we discovered a fundamental issue in the Node API subscription system. The core system needs to be fixed rather than continuing to use workarounds.

**For details, see:** `event_handling_core_fix.md`

This issue affects the final implementation of the `#[subscribe]` macro and requires changes to the core Node API.

## Background and Lessons Learned

After several attempts to fix the macro implementation in the codebase, we've identified core issues that require a completely different approach:

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

1. Fix the core Node API event handling system (see `event_handling_core_fix.md`)
2. Complete the macro implementation based on the reference implementation
3. Create new tests that verify behavior, not implementation details

### Reference Implementation (COMPLETED)

We have successfully completed a working reference implementation in `rust-macros-tests/tests/string_service.rs`. This implementation:
- Handles ValueType parameters correctly
- Implements both direct value and map-based parameters 
- Successfully handles service events through subscriptions (with current workaround)
- Works with the Node API in end-to-end tests
- Provides a template for what the macros should generate

### Macro Development Tasks

1. Create macros that generate code matching the reference implementation
2. Focus on clean, minimal code generation without special cases
3. Ensure macros produce exactly the same code as the manually written version
4. Thoroughly test the macros with simple input cases

### Test Development Tasks

1. Remove all existing macro tests to avoid old constraints
2. Create new tests that verify macro behavior, not implementation details
3. Focus on end-to-end testing with the Node API
4. Demonstrate how services should be used in real-world scenarios

## Implementation Requirements

Based on our reference implementation, the macros should generate code that follows these patterns:

### Service Macro Requirements

The `#[service]` macro should generate:

1. A proper implementation of the `AbstractService` trait with methods for:
   - `name()`, `path()`, `description()`, `version()`, `state()`
   - `actions()` - Returning a list of registered actions
   - `init()` - Setting up subscription handlers
   - `start()` and `stop()` - Service lifecycle management
   - `handle_request()` - Request handling and dispatch

2. A request dispatch system that:
   - Maps incoming requests to the appropriate handler based on the action name
   - Provides clear error messages when an action is not found
   - Uses a registry of action handlers

3. A cloneable service structure that works with async event handlers

### Action Macro Requirements

The `#[action]` macro should:

1. Register an action handler in the service's action registry
2. Generate parameter extraction code for both:
   - Direct string/numeric parameters (`request.data` as `ValueType::String` or `ValueType::Number`)
   - Map parameters (`request.data` as `ValueType::Map`)
3. Properly handle `Option<ValueType>` for the data field
4. Wrap the returned value in a `ServiceResponse` with appropriate status and message

### Subscribe Macro Requirements

The `#[subscribe]` macro should:

1. Generate a subscription registration method that runs during service initialization
2. Create a callback that extracts parameters from the event payload
3. Handle different payload formats (direct values vs maps)
4. Implement proper async event handlers with error handling
5. Ensure thread safety for event handlers through proper use of Arc and Clone
6. Eventually use the new async subscription API after the core system is fixed

## Testing Approach

1. Create focused unit tests for each macro individually
2. Develop integration tests that show all macros working together
3. Test with the Node API to ensure end-to-end functionality
4. Verify both value-based and map-based parameter handling

## Next Steps

1. Fix the core event handling system (highest priority)
2. Complete the macro implementation updates
3. Create comprehensive tests
4. Document the new approach and patterns 