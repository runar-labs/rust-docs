# Service Routing Consistency Fix

## Overview

This document addresses an architectural inconsistency in how services are addressed in request routing within the Runar Node system. Currently, tests use service names for routing (e.g., `explorer/land`), while the architectural guidelines specify that service paths should be used (e.g., `ship/land`).

This inconsistency impacts code maintainability and architectural clarity, potentially leading to confusion for developers and making the system harder to maintain long-term.

## Current State Analysis

The routing inconsistency manifests in several key areas:

1. In test files like `simple_events.rs`, we observe:
   ```rust
   // Service creation with explicit names
   let ship_service = ShipService::new("explorer");
   let base_station_service = BaseStationService::new("alpha");
   
   // Requests using name for routing
   let response = node.request("explorer/land", ValueType::Null).await?;
   ```

2. In service implementation files like `ship_service.rs`, the path is explicitly set regardless of name:
   ```rust
   pub fn new(name: &str) -> Self {
       Self {
           name: name.to_string(),
           path: "ship".to_string(), // Hard-coded path
           // ...
       }
   }
   ```

3. According to our architectural guidelines, service routing should use paths, not names:
   - Path format should be: `<service_path>/action` and `<service_path>/event`
   - The Node's request handler should parse this to extract service path and operation
   - This aligns with REST-like semantics and service-oriented design principles

4. The inconsistency appears to be in the Node's service registry and request handling logic, which is using the service's name instead of path for lookup purposes.

## Root Cause

The issue stems from an implementation detail in the Node service registry:

1. The service registry uses service name as the lookup key rather than service path
2. When routing requests, the Node splits the request path and uses the first segment to lookup services by name
3. This creates confusion because service implementations define both a name and a path, but only the name is actually used for routing

## Proposed Solution

### Option A: Align Implementation with Guidelines (Preferred)

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
   - Modify test fixtures to use service paths for requests
   - Update all tests to use the service path rather than name when making requests
   - Fix integration tests to align with the new approach

### Option B: Update Guidelines to Match Implementation

Although less preferred, we could alternatively:
- Document that service names are used for routing
- Update service path to be primarily for documentation/metadata purposes
- Keep the current behavior but make it explicit

We recommend Option A as it aligns with architectural principles and provides clearer service boundaries.

## Implementation Plan

### Phase 1: Code Audit

1. Identify all locations where service registration occurs
2. Identify all locations where request routing occurs
3. Map all service implementations to understand name/path usage patterns
4. Analyze test suite to determine the scope of changes needed

### Phase 2: Core Changes

1. **Update Service Registry**:
   - Modify the service registry to use path as the lookup key
   - Add validation to ensure path uniqueness
   - Add a transitional period with warnings for duplicate paths

2. **Update Request Routing**:
   - Modify the request routing logic to use path for service lookup
   - Add logging to help track any routing issues during the transition

3. **Add Compatibility Layer**:
   - Consider a temporary compatibility layer that checks both name and path
   - Log deprecation warnings when a service is found by name instead of path

### Phase 3: Test Updates

1. Modify test fixtures to use service paths for routing
2. Update integration tests to use the correct routing approach
3. Add specific tests for edge cases:
   - Services with the same name but different paths
   - Path validation
   - Error handling for path conflicts

### Phase 4: Documentation

1. Update all documentation to reflect the routing by path approach
2. Provide migration guidelines for any external consumers
3. Update architectural guidelines to emphasize the correct pattern

## Testing Strategy

1. **Unit Tests**:
   - Test service registry with the updated lookup mechanism
   - Test request routing with various path patterns
   - Test edge cases like services with similar names/paths

2. **Integration Tests**:
   - End-to-end test of service registration and request routing
   - Test service discovery mechanisms
   - Test backward compatibility layer if implemented

3. **Test Coverage**:
   - Ensure all code paths in the updated service registry are covered
   - Test error cases and edge conditions

## Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|------------|
| Breaking existing services | High | Add compatibility layer during transition |
| Path conflicts | Medium | Add validation on service registration |
| Performance impact | Low | Profile before/after to ensure no degradation |
| Test suite failures | High | Update tests carefully, keeping existing functionality tests intact |

## Backward Compatibility

To minimize disruption:

1. Consider a transition period where both name and path are checked
2. Log deprecation warnings when name is used instead of path
3. Add runtime validation to ensure path uniqueness
4. Update documentation to emphasize the change

## Success Criteria

1. All services are properly registered and accessible by path
2. All tests pass using the correct path-based addressing
3. The codebase is consistent with architectural guidelines
4. No regressions in existing functionality
5. Clean error messages when conflicts or issues arise

## Next Steps

1. Begin code audit to understand the full scope of changes
2. Implement core service registry changes
3. Add compatibility layer if needed
4. Update tests to use the correct routing approach
5. Update documentation to reflect the changes 