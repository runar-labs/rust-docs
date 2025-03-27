# Documentation and Service Routing Fixes

## Overview

This document outlines two critical improvement areas for the Runar Node system:

1. **Documentation Updates**: Many documentation files contain outdated examples, particularly with respect to the `vmap` macro system, which has recently been overhauled. We need to ensure all documentation consistently reflects the current implementation.

2. **Service Routing Consistency**: There's an architectural inconsistency in how services are addressed in request routing. The tests use service names for routing (e.g., `explorer/land`), while the architectural guidelines specify that service paths should be used (e.g., `ship/land`).

Both issues impact developer experience and code maintainability, requiring systematic resolution.

## Current State Analysis

### Documentation Issues

1. Many markdown files still contain outdated code examples with:
   - Old `vmap` macro syntax that doesn't use the `=>` operator for defaults
   - References to the deprecated `vmap_opt` macro
   - No usage of specialized type-specific macros (e.g., `vmap_str!`, `vmap_i32!`)
   - Inconsistent patterns for handling optional values

2. Some documentation may not reflect the current architectural patterns and best practices.

### Service Routing Inconsistency

1. In `simple_events.rs`, we see:
   ```rust
   // Service creation with explicit names
   let ship_service = ShipService::new("explorer");
   let base_station_service = BaseStationService::new("alpha");
   
   // Requests using name for routing
   let response = node.request("explorer/land", ValueType::Null).await?;
   ```

2. In `ship_service.rs`, the path is explicitly set regardless of name:
   ```rust
   pub fn new(name: &str) -> Self {
       Self {
           name: name.to_string(),
           path: "ship".to_string(), // Hard-coded path
           // ...
       }
   }
   ```

3. According to our guidelines, service routing should use paths, not names:
   - Path format should be: `<service>/operation`
   - The Node's request handler should parse this to extract service path and operation

4. The inconsistency appears to be in the Node's service registry and request handling logic, which is using the service's name instead of path for lookup purposes.

## Proposed Solutions

### 1. Documentation Update Plan

#### Step 1: Comprehensive Documentation Audit

1. Enumerate all markdown files containing code examples:
   ```bash
   find /home/rafael/dev/runar-labs/rust-mono/rust-docs/markdown -name "*.md" | xargs grep -l "vmap" 
   ```

2. Categorize files by priority:
   - High: Core API documentation (vmap.md was already updated)
   - Medium: Service implementation examples
   - Low: Conceptual documentation with minimal code examples

#### Step 2: Update Code Examples

For each file, systematically:

1. Replace old `vmap` syntax with the new pattern:
   - Old: `vmap!(params, "key", Type)?`
   - New: `vmap!(params, "key" => default_value)`

2. Replace `vmap_opt!` usage with standard Option pattern:
   ```rust
   // Old
   let value = vmap_opt!(params, "key", Type).unwrap_or(default);
   
   // New
   let value = vmap!(params, "key" => default_value);
   ```

3. Update to use specialized macros where appropriate:
   ```rust
   // Instead of
   let name = vmap!(params, "name" => String::new());
   
   // Use
   let name = vmap_str!(params, "name" => "");
   ```

4. Ensure all examples show proper error handling patterns.

5. Update nested key access examples to use dot notation.

#### Step 3: Ensure Architectural Consistency

1. Review all service examples to ensure they follow current architectural patterns:
   - Proper service boundaries
   - Request/response patterns
   - Event publishing/subscription
   - Context usage

2. Align examples with patterns demonstrated in test files:
   - `simple_events.rs`
   - `simple_actions.rs`

#### Step 4: Documentation Testing

1. Extract key code examples and validate they compile with the current codebase.
2. Create a documentation testing script to ensure examples remain valid.

### 2. Service Routing Fix Plan

#### Step 1: Detailed Code Analysis

1. Investigate the service registration flow in `node.rs`:
   - How services are added to the registry
   - How the lookup key is determined

2. Examine the request handling logic:
   - Which field (name or path) is used for service lookup
   - The path parsing mechanism

3. Analyze service implementation:
   - How the AbstractService trait enforces path vs. name
   - Current usage patterns across the codebase

#### Step 2: Design the Fix

Two potential approaches:

**Option A: Align Implementation with Guidelines** (Preferred)
- Modify service registry to use path instead of name as the lookup key
- Update request handler to match services by path
- Fix tests to use service paths for requests

**Option B: Update Guidelines to Match Implementation**
- Document that service names are used for routing
- Update service path to be primarily for documentation
- Keep the current behavior but make it explicit

We recommend Option A as it aligns with architectural principles and provides clearer service boundaries.

#### Step 3: Implementation Plan

1. **Service Registry Update**:
   ```rust
   // Current (using name for lookup)
   fn register_service(&mut self, service: Box<dyn AbstractService>) {
       let name = service.name();
       self.services.insert(name.to_string(), service);
   }
   
   // Fixed (using path for lookup)
   fn register_service(&mut self, service: Box<dyn AbstractService>) {
       let path = service.path();
       self.services.insert(path.to_string(), service);
   }
   ```

2. **Request Routing Fix**:
   ```rust
   // Current
   fn route_request(&self, request: ServiceRequest) -> Result<ServiceResponse> {
       let parts: Vec<&str> = request.path.splitn(2, '/').collect();
       let service_name = parts[0];
       let operation = parts.get(1).unwrap_or(&"");
       
       if let Some(service) = self.services.get(service_name) {
           // Process request
       }
   }
   
   // Fixed
   fn route_request(&self, request: ServiceRequest) -> Result<ServiceResponse> {
       let parts: Vec<&str> = request.path.splitn(2, '/').collect();
       let service_path = parts[0];
       let operation = parts.get(1).unwrap_or(&"");
       
       if let Some(service) = self.services.get(service_path) {
           // Process request
       }
   }
   ```

3. **Test Fixture Updates**:
   - Modify test fixtures to accept both name and path parameters
   - Update tests to use service paths for requests

#### Step 4: Backward Compatibility

1. Provide a transitional period with warnings when using name instead of path
2. Add runtime validation to ensure path uniqueness
3. Update documentation to emphasize the change

#### Step 5: Testing Strategy

1. Unit tests for service registry lookup changes
2. Integration tests for request routing
3. Verify all existing tests pass with the new implementation
4. Add specific tests for edge cases:
   - Services with the same name but different paths
   - Path validation
   - Error handling for path conflicts

## Implementation Order

1. **Service Routing Fix**:
   - Implement the code changes
   - Validate with comprehensive tests
   - Update guidelines to reinforce the correct pattern

2. **Documentation Updates**:
   - Start with high-priority files first
   - Align with the fixed service routing implementation
   - Ensure all examples use the latest vmap patterns

## Risk Assessment

### Service Routing Fix

| Risk | Mitigation |
|------|------------|
| Breaking existing services | Add compatibility layer during transition |
| Path conflicts | Add validation on service registration |
| Performance impact | Profile before/after to ensure no degradation |

### Documentation Updates

| Risk | Mitigation |
|------|------------|
| Incomplete updates | Comprehensive search for all instances |
| New syntax errors | Test code examples |
| Inconsistent guidance | Cross-reference all documentation updates |

## Success Criteria

1. **Service Routing**:
   - All services are properly registered and accessible by path
   - All tests pass using the correct path-based addressing
   - The codebase is consistent with architectural guidelines

2. **Documentation**:
   - All code examples use the latest vmap syntax
   - No references to deprecated macros remain
   - Examples align with current architectural patterns
   - Documentation accurately reflects the system's behavior

## Next Steps

1. Seek approval for the proposed approaches
2. Prioritize the service routing fix as it affects core functionality
3. Schedule documentation updates to follow the implementation
4. Consider automating documentation validation for future changes 