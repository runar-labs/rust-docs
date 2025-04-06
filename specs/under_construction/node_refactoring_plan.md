# Node Refactoring Plan

## Overview
This document consolidates the improvements for the Runar Node system, specifically focused on the Network Layer implementation. It addresses architectural issues, responsibility allocation, and implementation details to create a more maintainable and correctly structured system.

## Current Status (Updated)

Refactoring of the core Node and Service Registry components is largely complete:
- ✅ Service Registry responsibilities properly defined
- ✅ Node implementation with local request routing & publishing functional (as verified by tests)
- ✅ Consistent path/name usage with TopicPath (in most areas)
- ✅ Removed deprecated methods and anti-patterns
- ✅ Improved service lifecycle management
- ✅ Registry Service Implementation with path parameter extraction
- ✅ Implementation of publish_with_options
- ✅ Benchmark tests implemented

**Currently In Progress:**
- **Integrating Network Layer into Node:** Adding network-related fields (`network_transport`, `node_discovery`, etc.) and lifecycle management (`start_networking`, updates to `start`/`stop`) to `node.rs`. Correcting previous overly broad edits to `node.rs` to focus *only* on additive network integration.
- **Resolving Build Errors:** Addressing linter errors related to missing type definitions (`NodeConfig`, `Router`, etc.) and persistent issues in network components (`quic_transport.rs` lock errors).

## Lessons Learned (New Section)

Recent refactoring attempts highlighted critical lessons:
- **Strict Adherence to Plans:** It is essential to strictly follow documented refactoring plans and architectural guidelines (`node_design.md`). Deviations, especially those modifying existing functional code without explicit planning, can lead to significant setbacks and breakages.
- **Verify Before Modifying:** Assumptions about type definitions, visibility, or existing logic must be verified by reading the relevant code or documentation *before* proposing edits. Relying solely on linter output can be misleading if the root cause is elsewhere (e.g., missing definitions).
- **Additive Integration:** When adding new features like the network layer, changes should be primarily additive. Existing, tested logic (like local request handling in `node.rs`) should not be refactored or significantly altered unless it's part of an explicitly documented and agreed-upon step in the plan.
- **Incremental Steps:** Focus on small, verifiable steps. Ensure basic structure and dependencies are correct before attempting complex integrations.

## Key Architectural Principles

1. **Separation of Concerns**
   - Service Registry should ONLY handle registration and lookup
   - Node should manage request routing, event publishing and subscription
   - Each component should have a clear, focused responsibility

2. **Path-based Identity**
   - Services should be consistently identified by their paths, not names
   - Use TopicPath consistently throughout the system
   - Internal services prefixed with `$` to avoid path complexity (e.g., `$registry`)

3. **Context is Request-scoped, not Service-scoped**
   - RequestContext should NEVER be stored in service state
   - Context should only be passed as a parameter to methods that need it
   - Each request should have its own isolated context
   - LifecycleContext should be used for initialization and lifecycle operations

4. **Action Registration Over Handler Methods**
   - Services should register specific action handlers during initialization
   - Avoid monolithic handler methods that need to inspect action names
   - Each action should have its own dedicated handler function
   - The Node is responsible for finding and invoking the correct handler

## Enhanced Features

### TopicPath Template Parameter Extraction

For detailed design, see: [topic_path_templating.md](./topic_path_templating.md)

This feature enables:
- Pattern matching with URL-like templates (e.g., `services/{service_path}/state`)
- Parameter extraction from matched paths
- Path creation from templates and parameter values

This will be integrated into the Registry Service to support endpoints like:
- `services/{service_path}` - Get info about a specific service
- `services/{service_path}/state` - Get service state

### Registry Service

For detailed design, see: [registry_service_design.md](./registry_service_design.md)

This service will provide access to service metadata through the standard request interface:

```rust
// New approach using the registry service
let response = node.request("$registry/services/math", ValueType::Null).await?;
let service_info = response.data.unwrap();  // Contains full service metadata including state
```

The Registry Service will leverage TopicPath templating to handle parameterized paths.

## Progress Tracking

- [x] Simplify service lookup with TopicPath
- [x] Implement request handling in Node
- [x] Implement publishing in Node
- [x] Create LifecycleContext with proper logging
- [x] Remove `handle_request` from ServiceRegistry
- [x] Remove `publish` from ServiceRegistry
- [x] Update AbstractService to use action registration instead of handler methods
- [x] Fix context handling
- [x] Enhance TopicPath usage
- [x] Implement CompleteServiceMetadata to track service state and metadata centrally
- [x] Fix ServiceRegistry implementation to properly handle registry cloning in action registration
- [x] Update test fixtures to use the new service pattern
- [x] Update service lifecycle management
- [x] Remove the publish_event method from NodeDelegate trait
- [x] Properly implement NodeDelegate trait for Node class
- [x] Remove redundant NodeRequestHandler trait
- [x] Fix list_services implementation to be non-blocking
- [x] Fix unsubscribe method implementation
- [x] Ensure all tests pass, including unit tests and doctests
- [x] Implement Node.start() method for proper lifecycle management
- [x] Implement Node.stop() method for clean shutdown
- [x] Add service startup orchestration
- [x] Add service shutdown orchestration
- [x] Implement lifecycle state tracking
- [x] Implement TopicPath template parameter extraction (see topic_path_templating.md)
- [x] Extend RequestContext and registration options with template parameters

## Next Steps (Refined)

The immediate next steps are focused on establishing a compiling baseline with the network structure integrated:
 
3.  **Address Network Component Errors:**
    *   Investigate and fix the persistent `Result<...Guard> is not a future` errors in `quic_transport.rs`. This may require checking `Cargo.lock`, cleaning the build, or further debugging.
    *   Ensure `multicast_discovery.rs` compiles cleanly.
4.  **Build & Test:** Achieve a clean build (`cargo build --package runar_node --no-default-features`). Run existing tests (`cargo test --package runar_node`) and fix any regressions introduced during network integration.
5.  **Implement Network Routing:** Once the structure compiles, modify `Node::request`, `Node::publish_event`, etc., to correctly interact with the `Router` and `NetworkTransport` for handling remote communication.
6.  **Address Serialization:** change to `protobuf` as originally planned. Document this decision.

(Future steps remain the same)

## Testing Strategy

- Create comprehensive unit tests for networking functions
- Test with real services across multiple nodes (Integration/System Tests)
- Verify request and event flow between nodes (Integration/System Tests)
- Test both local and remote service scenarios (Integration/System Tests)
- Ensure consistent behavior across different transport types (Integration Tests)
- Validate security features and failure handling (System/Chaos Tests)
- Benchmark performance across network boundaries (Performance Tests)
- **Examples (`examples/`)**: Focus on demonstrating high-level, user-facing API usage, especially multi-node communication where network details are transparent.

## Performance Considerations

(Content remains the same)

## Backward Compatibility

(Content remains the same)