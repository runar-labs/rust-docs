# Rust Macros Testing Implementation Plan

## Background

The `runar_macros` crate provides procedural macros that simplify service development in the Runar framework. We need comprehensive end-to-end tests to ensure these macros work correctly in all scenarios. Currently, the test structure exists but lacks actual test implementations.

## Goals

1. Create a comprehensive testing framework for all macros in the `runar_macros` crate
2. Implement proper end-to-end tests for all macro functionality using the actual Node implementation
3. Test both the compilation and runtime behavior of generated code
4. Ensure tests match the latest API patterns from the documentation

## Current Status and Issues

After thorough investigation, we've identified several critical issues with the macros and testing framework:

### API Incompatibility Issues

1. **API Mismatch**: The macro implementations are generating code that doesn't match the current API:
   - The error `method 'version' is not a member of trait 'runar_node::services::AbstractService'` indicates the service macro is generating a `version()` method that isn't part of the trait.
   - Errors about missing `action_registry` and `subscription_registry` indicate the macros are generating code that assumes these global items exist in the crate root, but they don't.

2. **ServiceMetadata Constructor Change**:
   ```rust
   // Old API (assumed by macros):
   ServiceMetadata::new()
   
   // Current API:
   ServiceMetadata::new(operations: Vec<String>, description: String)
   ```

3. **Missing Trait Methods**:
   - Macros generate calls to `service_name()`, `service_path()`, etc., but these methods no longer exist
   - The current API directly implements methods on `AbstractService`: `name()`, `path()`, etc.

4. **Self Use in Static Context**: The errors about `can't use 'Self' from outer item` indicate the macros are generating code that tries to reference `Self` in a static context, which isn't allowed in Rust.

5. **Service Response Structure Change**:
   ```rust
   // Old API (used in tests):
   result.success, result.data.unwrap()["result"]
   
   // Current API:
   result.status, result.data
   ```

### Module Path Issues

- **Module Path Mismatch**: The scripts were trying to use incorrect module paths when running `cargo expand`
  - Original paths: `examples::service_macro_example`
  - Correct paths: `examples::service_macro` (matching the actual module structure)

## New Implementation Approach

Given these challenges, we need to take a much more incremental approach:

### Phase 1: Basic Expansion Testing

1. **Focus on expand testing only**:
   - Use `cargo-expand` to see what code the macros actually generate
   - Document the expected patterns without trying to run them
   - Modify examples to match the actual current API

2. **Create documentation on current macro behavior**:
   - Document exactly how the macros work now
   - Identify discrepancies with the existing documentation
   - Provide clear examples of what works and what doesn't

### Phase 2: Minimal Compilation Tests

1. **Create minimal test modules that just compile**:
   - Strip macros down to minimal usage
   - Focus only on what can be verified to compile
   - Skip runtime testing for now

2. **Implement proper expansion tests**:
   - Create scripts that verify expected patterns in the expanded code
   - Focus on structure verification rather than runtime behavior
   - Add checks for known macro features

### Phase 3: Macro Fix Implementation

1. **Update Service Macro Implementation**:
   - Modify the generated implementation to directly use the `AbstractService` trait methods
   - Fix the `ServiceMetadata::new()` call to provide the required parameters
   - Eliminate references to the `ServiceInfo` trait which is now deprecated
   - Fix any compiler issues related to `version` method

2. **Update Registry Access**:
   - Determine the correct way to access the registries for actions and subscriptions
   - Modify the macros to use the proper imports and paths

3. **Fix Static Context Issues**:
   - Restructure the generated code to avoid using `Self` in static contexts
   - Ensure all references to service methods are called through proper instances

4. **Update Test Framework**:
   - Update test assertions to match the current `ServiceResponse` structure
   - Fix any test utilities that rely on the old API format

### Phase 4: Documentation Update

1. **Update all documentation to match reality**:
   - Revise all documentation to match the actual API
   - Document any API changes or deprecations
   - Provide new examples that actually work

## Implementation Details

### Example Expansion Testing

We'll use an improved script to run macro expansion and verify it matches expected patterns:

```bash
#!/bin/bash
# Script: verify_expansion.sh

# Run cargo-expand on example file (with corrected module path)
EXPANDED=$(cargo expand --features full_test --package runar-macros-tests examples::service_macro)

# Check for expected patterns
if echo "$EXPANDED" | grep -q "impl runar_common::ServiceInfo"; then
    echo "✅ Service macro correctly implements ServiceInfo trait"
else
    echo "❌ Service macro does not implement ServiceInfo trait as expected"
fi

# More pattern checks...
```

### Simple Compilation Test

We'll create the simplest possible test that just verifies the macros can be used:

```rust
#[test]
fn test_macro_compiles() {
    // This test just verifies that the code using the macros compiles
    // It doesn't test runtime behavior
    
    #[service(name = "test_service")]
    struct TestService {}
    
    // Just create an instance to verify it compiled
    let _service = TestService {};
    
    assert!(true);
}
```

## Implementation Priority

1. **Service Macro (Highest Priority)**:
   - Fix the `AbstractService` trait implementation
   - Update the `ServiceMetadata::new()` call
   - Fix the `version()` method issue

2. **Action Macro**:
   - Update the registry access
   - Fix the return value wrapping for action methods

3. **Subscribe Macro**:
   - Fix subscription setup and handler registration

4. **Update Test Framework**:
   - Fix all test assertions and utilities
   - Update example code to match the current API

## Expected Challenges

1. **API Flux**: The APIs appear to be in flux, so tests may break as the codebase evolves
2. **Documentation Mismatch**: Existing docs don't match the current implementation
3. **Integration Complexity**: Full integration testing requires a stable API

## Success Criteria

1. Successfully expand and document all macros
2. Create minimal tests that compile for each macro
3. Document discrepancies between expected and actual behavior
4. Update documentation to match the current implementation

## Progress Tracking

- [x] Phase 1: Basic Expansion Testing
  - [x] Set up cargo-expand testing for each macro
  - [x] Document the actual expansion patterns
  - [x] Identify differences from expected behavior
  - [x] Update the `check_expansions.sh` script to correctly target modules
  - [x] Fix module paths in examples to match expected export format
  
- [x] Phase 2: Minimal Compilation Tests
  - [x] Create tests that verify the macros compile
  - [x] Add basic verification of expanded code structure
  - [x] Document limitations and issues discovered
  - [x] Fix issues with struct field initializers in test_service macro
  - [ ] Add negative test cases to verify compile-time errors

- [x] Phase 3: Fixing API Violations
  - [x] Update architectural guidelines with proper API usage patterns
  - [x] Document proper service registry access patterns
  - [x] Document proper service registration patterns
  - [x] Fix minimal version tests for field initializers
  - [x] Update end-to-end test to use proper API patterns
  - [x] Fix direct API test to use proper service registration
  - [x] Check and fix remaining tests for architectural violations
  - [ ] Fix `version()` method in service macro
  - [ ] Fix missing `action_registry` and `subscription_registry` references
  - [ ] Fix `Self` usage in static contexts
  
- [ ] Phase 4: Documentation and CI Integration
  - [ ] Create new examples that work with the current implementation
  - [ ] Document any known issues or limitations
  - [ ] Add a step to run the minimal compilation tests in CI
  - [ ] Add a step to verify macro expansions with cargo-expand in CI
  - [ ] Add a step to run full tests with the `full_test` feature in CI

## Next Steps

1. ✅ Update end-to-end test to use proper API patterns
2. ✅ Fix direct API test to use proper service registration
3. ✅ Update and fix remaining tests for architectural violations
   - ✅ Files with register_service updated:
     - ✅ rust-examples/gateway_example.rs
     - ✅ rust-examples/macros_node_example.rs
     - ✅ rust-examples/rest_api_example.rs
     - ✅ rust-apps/invoice-demo/src/main.rs
     - ✅ rust-macros-tests/examples/basic_node_example.rs
4. ⬜ Examine the `AbstractService` trait to understand the current structure
5. ⬜ Update the service macro to match the current trait requirements
6. ⬜ Fix the registry references in action and subscribe macros
7. ⬜ Create simplified test cases to verify fixes
8. ⬜ Update all tests to use the correct API patterns
9. ⬜ Create new examples that follow all guidelines
10. ⬜ Finalize documentation

## API Consistency Requirements

Tests must follow the same API patterns used in production code:

1. **Service Registry Access**:
   - ❌ DO NOT use `node.service_registry_arc()` (bypasses service boundaries)
   - ✅ DO use `node.request("internal/registry/list_services", ...)` (proper API pattern)
   - ✅ Extract data with `vmap!` macro instead of manual JSON parsing

2. **Service Registration**:
   - ❌ DO NOT use `node.service_registry.register_service(...)` (bypasses service boundaries)
   - ✅ DO use `node.add_service(...)` (proper API pattern)

3. **Data Extraction**:
   - ❌ DO NOT manually parse JSON when extracting values from responses
   - ✅ DO use the `vmap!` macro for clean extraction with defaults

4. **Service Interactions**:
   - ❌ DO NOT call service methods directly (tight coupling)
   - ✅ DO use request-based API to interact with services

Every test must be checked for these architectural violations as part of the review process. 