# Node Refactoring Plan

## Overview
This document consolidates the improvements for the Runar Node system, specifically focused on the Service Registry and Event System. It addresses architectural issues, responsibility allocation, and implementation details to create a more maintainable and correctly structured system.

## Current Status

Most architectural issues have been resolved:
- ✅ Service Registry responsibilities properly defined
- ✅ Node implementation with correct request routing & publishing
- ✅ Consistent path/name usage with TopicPath
- ✅ Removed deprecated methods and anti-patterns
- ✅ Improved service lifecycle management

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

## Next Steps

The immediate next steps are:

1. [✓] Implement internal registry service ($registry) for accessing service metadata
   - [✓] Basic service structure and delegates
   - [✓] **Improve Registry Service Implementation:**
     - [✓] Simplify action registration by using `register_action` instead of `register_action_with_options` where possible
     - [✓] Replace manual URL path parsing with built-in path parameter extraction
     - [✓] Eliminate duplicate code for parameter handling
     - [✓] Create helper methods for consistent parameter extraction
     - [✓] Improve error messages and logging
     - [✓] Optimize service metadata retrieval to fetch all metadata in a single call

2. [ ] Implement publish_with_options
3. [ ] Implement EventContext for callbacks
4. [ ] Implement metrics system
5. [ ] Complete API cleanup for consistency

## Testing Strategy

- Create comprehensive unit tests for core registry functions
- Test with real services and real Node instances
- Verify event flow from publishing to receiving
- Test both request and event paths
- Ensure consistent behavior across different path formats
- Ensure each test has clear INTENTION documentation