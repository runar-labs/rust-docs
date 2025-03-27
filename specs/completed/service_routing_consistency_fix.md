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
       let action = parts.get(1).unwrap_or(&"");
       
       if let Some(service) = self.services.get(service_path) {
           // Process request
       }
   }
   ```

3. **Test Fixture Updates**:
   - Modify test fixtures to use service paths for requests
   - Update all tests to use the service path rather than name when making requests
   - Fix integration tests to align with the new approach

## Implementation Plan
 
1. Identify all locations where service registration occurs
2. Identify all locations where request routing occurs
3. Map all service implementations to understand name/path usage patterns
4. Analyze test suite to determine the scope of changes needed
 
Core Changes

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
