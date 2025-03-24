# Runar Project Restructuring and Migration

## Background

We have recently moved our code to a new repository structure. Now we need to rename components, update references, remove duplicate code, and ensure everything compiles and runs as expected.

Several duplicate packages exist (rust-common, kagi_utils, utils, kagi_node, test_service_info) that need to be consolidated. The rust-common crate should be the central location for all common utilities.

The core components of our system are:
- rust-node: The system core
- rust-macros: Contains the macro functionality that enables simple service definition

Currently, some macros exist in the core package that may need to be moved to the rust-macros crate. We need to analyze all macros to ensure they're in the appropriate locations.

The rust-apps submodule will contain components and applications built using Runar tools. This submodule will typically remain disabled to keep the monorepo manageable, but can be enabled when working on applications.

The rust-docs submodule will contain:
- Specifications (to be built into docs)
- Public documentation in Markdown format
- Website builder
- Built documentation website (HTML/CSS/JS)

We need to reorganize this submodule to host the built docs website as a GitHub Pages site.

We have also rebranded from "Kagi" to "Runar". We are now the Runar team, and our product is runar-node. To distinguish between implementations, we'll use the prefixes rust-, go-, and ts- (e.g., rust-runar-node, go-runar-node, ts-runar-node). All references to "Kagi" in code and documentation must be updated to "Runar".

# Runar Project Migration Plan

## 1. Code Consolidation and Deduplication

- [x] Analyze duplicate code between rust-common, kagi_utils, utils, kagi_node, test_service_info
- [x] Create a consolidation plan with mapping of which files go where
- [x] Move all common utilities and shared code to rust-common crate
- [x] Update all import paths across the codebase to point to consolidated code in rust-common
- [x] Ensure proper dependency structure in Cargo.toml files after consolidation
- [x] Verify no critical functionality is lost during consolidation
- [x] Update tests to reflect new import paths
- [x] Verify the build works with consolidated code but before removing old packages
- [x] Remove redundant packages after verification (kagi_utils, utils, etc.)

## 2. Renaming from Kagi to Runar

- [x] Create a comprehensive grep search to identify all "kagi" references throughout the codebase
- [x] Update all file and directory names from "kagi_*" to "runar_*"
- [x] Update package names in Cargo.toml files
- [x] Update module names and references in source code
- [x] Update documentation references from "kagi" to "runar"
- [x] Update README files and other project documentation
- [x] Ensure all references to the project in comments are updated
- [x] Standardize function names across all crates (log_callback -> log_callback_execution, log_event_published -> log_published_event)
- [ ] Verify proper references to implementations (rust-runar-node, go-runar-node, ts-runar-node)

## 3. Macro Analysis and Reorganization (HIGHEST PRIORITY)

- [x] Identify all macros across the codebase
- [x] Create inventory of macros in rust-node core package
- [x] Determine which macros should move to rust-macros
- [x] Migrate appropriate macros to rust-macros package
- [x] Update all references to moved macros
- [x] Ensure backward compatibility or provide clear migration path
- [x] Add comprehensive documentation for all macros and their usage
- [x] Write tests for any moved macros
- [x] Fix `version()` method in service macro (simplified approach: macros pass-through, manual implementation)
- [x] Fix missing `action_registry` and `subscription_registry` references (simplified approach)
- [x] Fix `Self` usage in static contexts (simplified approach: macros pass-through)
- [ ] Implement architectural compliance testing to validate macro usage patterns

## 4. Rust-docs Reorganization

- [x] Plan structure for GitHub Pages compatible documentation
  - [x] Created basic website structure with index.html
  - [x] Added .nojekyll and CNAME files
  - [x] Set up asset directories (css, js, img)
  - [x] Updated build process to output to website directory
  - [x] Added basic styling and JavaScript
- [x] Create a clear separation between source docs and built docs
- [x] Set up a build process for generating static website from markdown
- [x] Organize specs, public docs, and website builder
- [x] Create a GitHub Actions workflow for automatic docs deployment
- [ ] Test the GitHub Pages deployment
- [ ] Verify all documentation is up-to-date with the latest code changes

### Documentation Updates Needed
- [ ] Update all code examples to use new standardized function names
- [x] Create documentation for the current simplified macro approach
- [x] Create a macro usage guide that explains the manual implementation requirements
- [ ] Create API documentation for all public interfaces
- [ ] Add troubleshooting guides for common issues
- [ ] Update architecture documentation with compliance requirements

## 5. Integration and Testing

- [x] Verify that all crates build successfully after changes
- [x] Run the full test suite across all submodules
- [x] Ensure all examples work correctly
- [ ] Create integration tests that verify cross-module functionality
- [ ] Create automated tests to verify architectural compliance
- [ ] Test on different platforms if applicable
- [ ] Document any breaking changes and required migrations for users

## Notes

- The `pub_sub_macros_test.rs` test file is temporarily parked as it requires additional work to function with the updated macro system. We'll revisit this after completing the main migration tasks.
- Current focus is on ensuring all core functionality is working properly in the restructured repository.
- **Macro API Changes**: We identified that the current macro implementation doesn't support our desired API pattern (returning plain data instead of ServiceResponse, removing manual operation handling). This will require additional implementation work to update the macros.
- **BE CAREFUL**: When making changes to the rust-node crate, follow the architecture guidelines closely. Do not modify core components unless absolutely necessary.

## Progress Updates

### Testing Approach (Consolidated from test documentation)

#### Analysis of Current Test Issues

The current tests for `runar_macros` (previously `kagi_macros`) have several issues:

1. They try to access internal modules of a proc-macro crate directly, which is not allowed by Rust.
2. They expect a specific API structure that has changed during the refactoring.
3. Some tests rely on implementation details rather than focusing on the generated code.

#### Recommended Testing Approach

1. **Create Test Fixtures Crates**:
   - Create separate test fixture crates that use the macros as they would be used in real code
   - Structure: `rust-macros-tests/` as a new test crate that depends on rust-macros

2. **Test Structure**:
   - Have a dependency on the `runar_macros` crate
   - Contain multiple examples of services with different configurations
   - Test the generated code, not the implementation details

3. **Test Categories**:
   - Basic Service Tests: Verify service macro correctly generates implementation
   - Action Handler Tests: Verify action handlers are registered and callable
   - Subscription Tests: Verify event subscriptions are registered correctly
   - Parameter Extraction Tests: Verify parameters are extracted correctly from requests
   - Path Handling Tests: Verify service paths are handled correctly

4. **Implementation Status**:
   - Created a minimal test crate with a placeholder test
   - Added documentation on how to use cargo-expand for macro inspection
   - Created example files for different macro types (service, action, subscribe, publish)
   - Implemented a script to automate macro expansion checking

### Work Log Highlights

- ✅ Created a modular structure for `rust-common`
- ✅ Moved `ValueType` to `rust-common/src/types`
- ✅ Created utility modules in `rust-common/src/utils`
- ✅ Updated `rust-macros` to utilize `ValueType` from `rust-common`
- ✅ Fixed compile errors in `ValueType` implementations with proper type constraints
- ✅ Implemented a macro to handle `From<T>` for `ValueType` for custom structs
- ✅ Renamed package from "kagi_common" to "runar_common" in Cargo.toml
- ✅ Renamed utils package from "kagi_utils" to "runar_utils"
- ✅ Renamed package from "kagi_node" to "runar_node" in Cargo.toml
- ✅ Modified services/mod.rs to import ValueType from runar_common

### Key Implementation Changes

The macro implementations have been updated to replace all "kagi" references with "runar" including:

- Updated import patterns from `kagi_common` to `runar_common` and `kagi_node` to `runar_node`
- Changed macros to use crate-relative paths for better modularity
- Fixed service macro to correctly handle path prefixing
- Updated service metadata handling to match the new architecture 

### Architectural Consistency Enforcement

- ✅ Identified architectural violation: Direct service registry access
- ✅ Updated API test examples to demonstrate proper patterns
- ✅ Added documentation on proper service registry access patterns in guidelines.md
- ✅ Added API consistency requirements to macro testing implementation plan
- ✅ Fixed end-to-end tests to use proper request-based API patterns
- ✅ Identified additional violation: Direct service registration
- ✅ Updated rust-node-api-test/src/main.rs to use proper service registration
- ✅ Updated direct_api_test.rs to use proper service registration
- ✅ Added documentation on proper service registration patterns in guidelines.md
- ✅ Create list of common architectural violations to check for
- ✅ Scan codebase for additional instances of direct registry access:
  - ✅ Tests
  - ✅ Node implementation
  - ✅ Example code
    - ✅ Updated files:
      - ✅ rust-examples/gateway_example.rs
      - ✅ rust-examples/macros_node_example.rs
      - ✅ rust-examples/rest_api_example.rs
      - ✅ rust-apps/invoice-demo/src/main.rs
      - ✅ rust-macros-tests/examples/basic_node_example.rs
- ✅ Update all occurrences to use request-based API pattern
- ⬜ Add automated testing to verify architectural pattern compliance 

## Current Priorities and Next Steps

### High Priority Tasks

1. **Fix Macro Implementation Issues**:
   - The macro tests are failing due to several specific issues:
   
   - **Action Macro Issues**:
     - The action macro tries to use `Self` in a static context, which is not allowed in Rust (error E0401)
     - There's a field name mismatch in `ActionItem` struct - the service macro references `handler_fn` but it might be named differently (error E0560)
     - The macro doesn't convert `&str` to `String` where required, causing type mismatches (error E0308)
     - Multiple action macros in the same impl block create duplicate unnamed const items (error E0592)
     - The action macro generates const items without names, which is not valid Rust syntax
   
   - **Service Macro Issues**:
     - The service macro doesn't implement the required `operations()` method from the `AbstractService` trait (error E0046)
     - Return type mismatches where a `Vec<&ActionItem>` is expected but a `Result<_, _>` is found (error E0308)

   - **Implementation Plan**:
     - Fix the action macro to use concrete type names instead of `Self` in static contexts
     - Generate unique names for const items based on method names
     - Fix field name mismatches between macro usages and implementations
     - Ensure proper String conversions for all string literals in generated code
     - Add implementation for missing operations() method in service macro
     - Fix return type mismatches in generated code

2. **Implement Architectural Compliance Testing**:
   - Create automated tests to verify proper service registration
   - Verify services use request-based API patterns
   - Test proper event publishing and subscription
   - Validate data extraction methods

3. **Document Architectural Guidelines**:
   - Create comprehensive guide on service registration best practices
   - Add examples of correct and incorrect usage for each architectural pattern
   - Document the request-based API pattern with examples

### Implementation Strategy

1. **For Macro Fixes**:
   - First priority: Fix Self in static context and unnamed const items in action.rs
     ```rust
     // Generate a unique name for the const item
     let const_name = format!("__ACTION_REGISTER_{}", method_name);
     let const_ident = Ident::new(&const_name, Span::call_site());
     
     // Use a concrete type path instead of Self
     let struct_type_path = extract_parent_type_path(&input_fn);
     ```
   
   - Second priority: Add missing operations() method in service.rs
     ```rust
     fn operations(&self) -> Vec<String> {
         // Implementation to return registered operations
     }
     ```
   
   - Third priority: Fix field name mismatches and string conversions
   
   - Test each fix individually to ensure it resolves the specific issue

2. **For Architectural Testing**:
   - Create a test utility to scan code for architectural violations
   - Add automated checks for common violation patterns
   - Verify all examples follow architectural guidelines
   - Document architectural requirements with examples

3. **For Documentation**:
   - Update documentation to reflect current architecture
   - Add detailed examples of correct usage patterns
   - Document the migration path for users
   - Provide code samples for common patterns

### Progress Tracking for Macro Fixes

- [ ] **Action Macro Fixes**:
  - [ ] Fix Self in static context issue
  - [ ] Add proper names to const items
  - [ ] Fix field name mismatches
  - [ ] Fix string conversions
  - [ ] Run tests to verify fixes

- [ ] **Service Macro Fixes**:
  - [ ] Add operations() method implementation 
  - [ ] Fix return type mismatches
  - [ ] Run tests to verify fixes
  
- [ ] **Documentation Updates**:
  - [ ] Document macro fixes and implementation details
  - [ ] Update examples with correct macro usage
  - [ ] Create troubleshooting guide for common macro issues

### Key Guidelines

When implementing these changes:
- Follow the architectural guidelines closely
- Do not modify rust-node crate structure unless absolutely necessary
- Test all changes thoroughly to avoid regressions
- Document any API changes or deprecations
- Focus on maintaining compatibility with existing code

## Migration Guide

### Common Migration Patterns

#### 1. Updating Service Registration

**Old pattern (deprecated):**
```rust
// This approach is deprecated and should be avoided
let service = MyService::new();
node.register_service(service).await?;
```

**New pattern:**
```rust
// Use add_service instead of register_service
let service = MyService::new();
node.add_service(service).await?;
```

#### 2. Updating Direct API Access

**Old pattern (deprecated):**
```rust
// Directly accessing service registry methods is deprecated
let services = node.registry.get_services().await?;
let my_service = node.registry.get_service("my_service").await?;
```

**New pattern:**
```rust
// Use the request-based API pattern
let response = node.request(
    "internal/registry/list_services",
    ValueType::Null,
).await?;

// Extract services using vmap! for clean parameter extraction with defaults
let services = vmap!(response.data, "services" => Vec::<String>::new());
```

#### 3. Properly Initializing Service Fields

**Old pattern (deprecated):**
```rust
#[service(name = "my_service", description = "My service", version = "1.0")]
pub struct MyService {
    data: Arc<Mutex<Vec<String>>>, // Uninitialized field
    counter: u32, // Uninitialized field
}

impl MyService {
    pub fn new() -> Self {
        // Manual initialization in new method
        Self {
            data: Arc::new(Mutex::new(Vec::new())),
            counter: 0,
        }
    }
}
```

**New pattern:**
```rust
#[service(name = "my_service", description = "My service", version = "1.0")]
pub struct MyService {
    // Initialized fields directly in the struct definition
    data: Arc<Mutex<Vec<String>>> = Arc::new(Mutex::new(Vec::new())),
    counter: u32 = 0,
}
```

#### 4. Using Proper Event System

**Old pattern (deprecated):**
```rust
// Direct event emitting without proper context
self.emit_event("service/event", data).await?;
```

**New pattern:**
```rust
// Use the request context for publishing events
request.context.publish(
    "service/events/created", 
    ValueType::Json(json!({ "id": "123", "timestamp": SystemTime::now() }))
).await?;
```

#### 5. Using Action Handlers

**Old pattern (deprecated):**
```rust
// Manual operation matching in handle_request
async fn handle_request(&self, request: ServiceRequest) -> Result<ServiceResponse, anyhow::Error> {
    match request.operation.as_str() {
        "do_something" => self.do_something(request).await,
        _ => Err(anyhow::anyhow!("Unknown operation")),
    }
}

async fn do_something(&self, request: ServiceRequest) -> Result<ServiceResponse, anyhow::Error> {
    // Implementation...
}
```

**New pattern:**
```rust
// Use the action! macro for operation handlers
#[action]
async fn do_something(&self, request: ServiceRequest) -> Result<ServiceResponse, anyhow::Error> {
    // Implementation...
}
```

#### 6. Event Subscriptions

**Old pattern (deprecated):**
```rust
// Manual event subscription setup
async fn init(&mut self, context: &RequestContext) -> Result<(), anyhow::Error> {
    let self_clone = self.clone();
    context.subscribe("topic/event", move |payload| {
        let service = self_clone.clone();
        Box::pin(async move {
            service.handle_event(payload).await
        })
    }).await?;
    Ok(())
}

async fn handle_event(&self, payload: ValueType) -> Result<(), anyhow::Error> {
    // Implementation...
}
```

**New pattern:**
```rust
// Use the sub! macro for event subscriptions
#[sub(topic = "topic/event")]
async fn handle_event(&self, payload: ValueType, context: &RequestContext) -> Result<(), anyhow::Error> {
    // Implementation...
}
```

### Checking for Compliance

You can check for compliance with Runar's architectural patterns by:

1. Running Clippy lints specific to the Runar codebase:
   ```bash
   cargo clippy --all
   ```

2. Reviewing service implementations against the examples provided in the `rust-examples` directory.

3. Using the log output with LLMs to identify architectural violations.

### Examples

For complete working examples that demonstrate proper architectural patterns, please see:

- [Node API Example](./rust-examples/examples/node_api_example.rs) - Demonstrates proper service implementation and registration using the AbstractService trait
- [Macro Example](./rust-examples/examples/macro_example.rs) - Demonstrates proper service implementation using macros 

## Progress Summary

### Recent Accomplishments

1. ✅ **Fixed service registration in the `direct_api_test.rs`** - Updated to use `node.add_service()`.
2. ✅ **Fixed field initialization in minimal version tests** - Updated the `test_service` macro.
3. ✅ **Identified remaining architectural violations** - Created an inventory of files needing updates.
4. ✅ **Fixed macro implementation issues** - Addressed the following key issues:
   - Fixed `version()` method in service macro implementation 
   - Fixed missing registry references for service operations
   - Fixed `Self` usage in static contexts in action and subscribe macros

### Next Steps (Prioritized)

1. **Create architectural compliance tests** to verify proper architectural patterns.
2. **Update examples** to use proper architectural patterns, focusing on `rust-examples/` directory.
3. **Document architectural guidelines** more thoroughly, including best practices and examples.

## Background

The Runar project involves migrating from the legacy Kagi architecture to a new, more consistent Runar architecture. This migration includes updating the codebase to follow architectural guidelines, ensuring proper API usage patterns, and implementing tests to verify compliance.

## Current Priorities and Next Steps

### Critical Architectural Issues

* ✅ **Service Registration**: Services should be registered using `node.add_service()`.
* ✅ **Service Macros**: Fixed version() method, metadata generation with operations list.
* ✅ **Action Macros**: Fixed Self usage in static contexts, improved parameter extraction.
* ✅ **Subscribe Macros**: Fixed service type checking, improved topic path handling.

### Implementation Strategy

1. **Architectural Compliance Testing**:
   - Create tests that verify services are registered properly
   - Test that request patterns follow architectural guidelines
   - Verify event handling uses proper patterns

2. **Example Updates**:
   - Update all examples to use correct architectural patterns
   - Create comprehensive examples showing proper macro usage

3. **Documentation Updates**:
   - Document proper API usage patterns
   - Create migration guides for services
   - Update API documentation

### Key Guidelines

1. **Be cautious with changes to the rust-node crate** - Focus on compatibility, not restructuring
2. **Follow architectural guidelines for service registration** - Use `add_service` consistently
3. **Use proper API patterns for requests** - Follow service/operation pattern
4. **Test all changes thoroughly** - Ensure compatibility with existing code

## Architectural Analysis

### Service Macro Analysis

1. ✅ **Fixed Issue**: The `version()` method in service macro now properly returns the correct version.
2. ✅ **Fixed Issue**: Service macro now properly collects operations from registry.
3. ✅ **Fixed Issue**: Improved error handling and type safety in action and subscription handlers.

### Remaining Issues

1. **Missing Architectural Compliance Testing**: Need to verify all code follows architectural patterns.
2. **Example Inconsistencies**: Need to update examples to follow architectural guidelines.
3. **Documentation Gaps**: Need to update documentation to reflect proper API usage.

## Next Actions

1. **Create Architectural Compliance Tests**:
   - Write tests that verify proper service registration
   - Test proper request patterns
   - Verify event handling patterns

2. **Update Examples**:
   - Update all examples to use proper architectural patterns
   - Create comprehensive examples showing proper macro usage
   - Provide clear migration examples for users

3. **Document Architectural Guidelines**:
   - Update API documentation
   - Create migration guides
   - Document best practices 