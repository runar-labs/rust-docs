# Node Refactoring Plan

## Overview
This document consolidates the improvements for the Runar Node system, specifically focused on the Service Registry and Event System. It addresses architectural issues, responsibility allocation, and implementation details to create a more maintainable and correctly structured system.

## Current Issues

1. **Inappropriate responsibility allocation**: (RESOLVED)
   - Service Registry handles request routing, event publishing, and other concerns beyond registration
   - `handle_request` should not be in Registry - this is Node's responsibility
   - `publish` should not be in Registry - this is Node's responsibility or a dedicated EventBus

2. **Architectural flaws**: (MOSTLY RESOLVED)
   - Inconsistent path/name usage: Services are sometimes identified by name and sometimes by path (RESOLVED)
   - Topic normalization issues: Topics are normalized differently in different places (RESOLVED)
   - Context storage anti-pattern: Services incorrectly store RequestContext in their state (RESOLVED)
   - Thread-local storage anti-pattern: Thread-local storage used for current context (RESOLVED)
   - Monolithic handler methods: Services using generic `handle_request` or `handle_action` methods instead of registering specific handlers (RESOLVED)

3. **API issues**: (MOSTLY RESOLVED)
   - Subscription handling has excessive boilerplate (RESOLVED)
   - Inconsistent method parameters across the API (RESOLVED)
   - Missing request IDs in some requests (RESOLVED)
   - Deprecated methods still in use (RESOLVED)
   - Accessing action/event name via request.action_or_event instead of using TopicPath (RESOLVED)

## Architectural Boundaries

### ServiceRegistry Responsibilities

ServiceRegistry should ONLY be responsible for:
1. Service registration and lookup
2. Managing service metadata
3. Managing topic subscriptions (storing callbacks)
4. Providing subscribers for a given topic (without executing them)
5. Routing requests to the appropriate action handlers

### Service Implementation Pattern

1. Services should NO LONGER implement generic `handle_request` or `handle_action` methods
2. Instead, during initialization, services should register specific action handlers with the context
3. Each action should have its own dedicated handler function
4. Action handlers are registered in the init phase using `context.register_action("action_name", handler_function)`
5. The Node is responsible for finding the right service and action handler for a request

### Request Path & Topic Handling

1. Requests should have a complete TopicPath that identifies both service and action
2. Action/event names should be extracted from the TopicPath, not from separate fields
3. All path handling should use consistent TopicPath operations
4. Path normalization should follow a single, consistent pattern

### Methods That Have Been Removed from ServiceRegistry

1. `handle_request` - This method violated the architecture's separation of concerns (REMOVED)
   - All request handling is now done by the Node
   - Tests have been updated to use Node.handle_request

2. `publish` - This method violated the architecture's separation of concerns (REMOVED)
   - Event publishing is now the Node's responsibility
   - The registry only provides a way to retrieve subscribers for a topic

### Event System Improvements

1. Event callbacks should receive an EventContext parameter
   - Callbacks need to be able to publish other events or call actions
   - This requires a proper context to be passed to the callback

2. Subscription testing should verify:
   - That subscribers are correctly registered for a topic
   - That unsubscribe correctly removes subscribers
   - That the registry returns the correct subscribers when requested

## Important Implementation Guidelines

1. **API Stability**:
   - Maintain API compatibility for existing consumers
   - Follow documented API contracts
   - Changes must respect the existing architectural boundaries

2. **Follow Documented Intentions**:
   - Code must respect documented intentions in comments
   - Test intentions must be preserved during refactoring
   - Architectural principles must be followed

3. **API Consistency**:
   - Use consistent parameter naming across similar methods
   - Follow established patterns for context objects
   - Ensure consistent error handling

4. **Avoid Duplication**:
   - Don't duplicate functionality across components
   - Consolidate similar code into reusable utilities
   - Use trait implementations to share behavior

## Completed Improvements

### Service Registry Enhancements
- [x] Simplify service lookup by using a single `get_service` method that takes a `TopicPath` parameter
- [x] Refactored test implementations to consistently use `TopicPath` for service lookup
- [x] Improved documentation about Node vs. Registry responsibilities
- [x] Create a dedicated `ServiceRequest` and `ServiceResponse` type
- [x] Create placeholder for a `LifecycleContext` type in the `AbstractService` trait
- [x] Implemented `LifecycleContext` and added proper logging capabilities
- [x] Added warning documentation to `publish` and `request` methods in ServiceRegistry
- [x] Added clear INTENTION documentation to all tests in service_registry_test.rs
- [x] Removed `handle_request` and `publish` from ServiceRegistry
- [x] Properly routed requests through Node instead of Registry

### Node Implementation Improvements
- [x] Implemented proper NodeDelegate trait for Node
- [x] Removed redundant NodeRequestHandler trait
- [x] Fixed list_services implementation to be non-blocking
- [x] Implemented clear pattern for trait method delegation
- [x] Fixed subscribe method to properly register callbacks
- [x] Improved error handling in Node methods
- [x] Ensured all Node functionality is properly tested

### Code Improvements
- [x] Refactored MathService test fixture with proper delegation from `handle_request` to specialized handlers
- [x] Renamed fields for clarity (e.g., `action` to `action_or_event`)
- [x] Enhanced error handling in service implementations
- [x] Cleaned up unused imports and fixed compiler warnings
- [x] Enhanced debug logging throughout the publish/subscribe system
- [x] Updated tests to use `metadata()` method instead of deprecated `name()` and `path()`
- [x] Fixed all doctests to ensure example code is correct

## Key Architectural Principles

1. **Separation of Concerns**
   - Service Registry should ONLY handle registration and lookup
   - Node should manage request routing, event publishing and subscription
   - Each component should have a clear, focused responsibility

2. **Path-based Identity**
   - Services should be consistently identified by their paths, not names
   - Use TopicPath consistently throughout the system

3. **Context is Request-scoped, not Service-scoped**
   - RequestContext should NEVER be stored in service state
   - Context should only be passed as a parameter to methods that need it
   - Each request should have its own isolated context
   - LifecycleContext should be used for initialization and lifecycle operations

4. **Clean API Design**
   - API should be intuitive and consistent
   - Event type consistency (use ValueType::Map for service communication)
   - Simplified subscription handling with minimal boilerplate

5. **Constructor Design Pattern**
   - Avoid constructor proliferation with specialized methods for each parameter combination
   - Use a single primary constructor with required parameters only
   - Implement builder methods with `with_` prefix for optional parameters
   - Apply the builder pattern for fluent configuration
   - Group frequently co-occurring parameters into configuration objects

6. **Action Registration Over Handler Methods**
   - Services should register specific action handlers during initialization
   - Avoid monolithic handler methods that need to inspect action names
   - Each action should have its own dedicated handler function
   - The Node is responsible for finding and invoking the correct handler

## Node Lifecycle Management

An important aspect missing from the current implementation is proper Node lifecycle management. The Node should have a clear startup and shutdown flow that handles:

1. **Node Initialization and Startup**:
   - The Node should have a `start()` method that initializes all internal systems
   - During startup, it should start all registered local services in the proper order
   - When network functionality is added, it should advertise services to the network
   - Startup should be idempotent - calling start() multiple times should be safe, but the actual startup process should only execute when the node is not already started, or after a proper shutdown has been completed

2. **Service Lifecycle Orchestration**:
   - The Node should be responsible for calling `start()` on all services during its own startup
   - Services should be started in dependency order when possible
   - The Node should capture and handle any errors during service startup
   - The Node should manage and update the lifecycle state of each service in the centralized service metadata
   - The existing CompleteServiceMetadata system should be extended to include lifecycle state tracking and ensure it maintains all necessary service information (actions, subscriptions, state)

3. **Clean Shutdown**:
   - The Node should have a `stop()` method for graceful shutdown
   - During shutdown, it should stop all registered services in the proper order
   - It should clean up any resources, subscriptions, or pending events
   - Shutdown should be idempotent - calling stop() multiple times should be safe

4. **Lifecycle State Management**:
   - The Node should track the lifecycle state of each service
   - It should prevent operations on services that aren't in the correct state
   - It should provide a way to query the current state of services

## Implementation Plan

1. **Phase 1: Core Registry Refactoring** ✅
   - [x] Create new Node implementation with proper responsibility separation
   - [x] Implement Node's handle_request, publish and request methods
   - [x] Create tests for the new Node implementation
   - [x] Add documentation warnings to handle_request and publish in ServiceRegistry
   - [x] Remove handle_request and publish from ServiceRegistry
   - [x] Update tests to reflect new responsibility allocation
   - [x] Add test verification for subscribers without calling the callback

2. **Phase 2: Context Handling** ✅
   - [x] Create LifecycleContext type with proper logging support
   - [x] Update AbstractService to use LifecycleContext for initialization
   - [x] Fix context storage in services
   - [x] Remove thread-local storage anti-pattern
   - [x] Implement proper context flow
   - [ ] Create EventContext for callbacks

3. **Phase 3: Path Handling** ✅
   - [x] Standardize TopicPath usage
   - [x] Fix topic normalization issues
   - [x] Update request handling to use TopicPath for action identification

4. **Phase 4: Service Action Registration** ✅
   - [x] Refactor AbstractService to remove handle_request/handle_action
   - [x] Implement register_action in LifecycleContext
   - [x] Convert services to register action handlers during initialization
   - [x] Update Node to route requests to registered handlers
   - [x] Update test fixtures to use the new pattern

5. **Phase 5: API Cleanup** ✅
   - [x] Remove deprecated methods
   - [x] Standardize method parameters
   - [x] Simplify subscription handling
   - [x] Proper implementation of NodeDelegate trait
   - [x] Fix public API consistency
   - [x] Remove redundant NodeRequestHandler trait

6. **Phase 6: Event System Enhancement**
   - [ ] Implement publish_with_options with delivery configuration
   - [ ] Move pending event storage to Node
   - [ ] Create proper event retention policies
   - [ ] Update callback signature to include EventContext

7. **Phase 7: Metrics System**
   - [ ] Implement metrics collection framework 
   - [ ] Add service performance metrics
   - [ ] Create configurable metrics storage

8. **Phase 8: Node Lifecycle Management** ✅
   - [x] Implement a proper `start()` method in Node
   - [x] Implement service startup orchestration (calling start on all services)
   - [x] Implement a clean `stop()` method in Node
   - [x] Implement service shutdown orchestration
   - [x] Add lifecycle state tracking for services
   - [x] Ensure idempotent startup and shutdown
   - [x] Add tests for Node lifecycle methods

9. **Phase 9: Internal Services**
   - [ ] Design and implement the `RegistryService`
   - [ ] Create automatic registration mechanism for internal services
   - [ ] Implement service metadata retrieval endpoints
   - [ ] Add service state retrieval through request interface
   - [ ] Create service action and event listing endpoints
   - [ ] Create tests for the registry service
   - [ ] Update existing tests to use the registry service pattern

10. **Phase 10: Event System Enhancements**
    - [ ] Implement publish_with_options with delivery configuration
    - [ ] Move pending event storage to Node
    - [ ] Create proper event retention policies
    - [ ] Update callback signature to include EventContext

11. **Phase 11: Metrics System**
    - [ ] Implement metrics collection framework 
    - [ ] Add service performance metrics
    - [ ] Create configurable metrics storage

## Progress Tracking

- [x] Simplify service lookup with TopicPath
- [x] Implement request handling in Node
- [x] Implement publishing in Node
- [x] Create LifecycleContext with proper logging
- [x] Add documentation warnings to handle_request and publish in ServiceRegistry
- [x] Add clear test INTENTION documentation
- [x] Refactor constructors using the builder pattern
- [x] Remove deprecated constructor methods
- [x] Remove `handle_request` from ServiceRegistry
- [x] Remove `publish` from ServiceRegistry
- [x] Update AbstractService to use action registration instead of handler methods
- [x] Fix context handling
- [x] Enhance TopicPath usage
- [x] Implement CompleteServiceMetadata to track service state and metadata centrally
- [x] Remove ServiceMetadata dependency from services, using direct AbstractService methods
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

- [ ] Implement internal registry service for accessing service metadata
- [ ] Implement publish_with_options
- [ ] Implement EventContext for callbacks
- [ ] Implement metrics system
- [ ] Complete API cleanup for consistency

## Testing Strategy

- Create comprehensive unit tests for core registry functions
- Test with real services and real Node instances
- Verify event flow from publishing to receiving
- Test both request and event paths
- Ensure consistent behavior across different path formats
- Ensure each test has clear INTENTION documentation
- Each test should have a single responsibility and test only what the component is responsible for

## Next Steps

The immediate next steps are:

1. ✅ Fix action handler registration/lookup with respect to registry cloning (COMPLETED)
2. ✅ Fix NodeDelegate trait implementation (COMPLETED)
3. ✅ Remove redundant NodeRequestHandler trait (COMPLETED)
4. ✅ Fix non-blocking list_services implementation (COMPLETED)
5. ✅ Implement Node.start() and Node.stop() lifecycle methods (COMPLETED)
6. ✅ Implement lifecycle state tracking (COMPLETED)
7. Implement internal registry service for accessing service metadata
8. Implement EventContext to pass to callbacks
9. Implement the metrics collection framework in Node
10. Create the publish_with_options method with configurable delivery options

All the unit tests for basic functionality are now passing, which marks significant progress in the refactoring plan. The implementation of Node.start() and Node.stop() lifecycle methods along with proper state tracking represents a key milestone in the Node's capability to properly manage service lifecycles. 

The next focus is on implementing the internal registry service to provide a consistent API pattern for accessing service metadata. This will eliminate the need for direct methods like get_service_state() and align with the architectural principle of using the standard request interface for all service interactions. After that, work will continue on enhancing the event system and implementing metrics collection.

## ServiceRegistry API Changes

### 1. Action Registration API Change

The `register_action` method signature has been updated from:

```rust
pub async fn register_action(
    &self,
    topic_path: &TopicPath,
    action_name: &str,
    handler: ActionHandler,
) -> Result<()>
```

To the streamlined version:

```rust
pub async fn register_action(
    &self,
    action_path: &TopicPath,
    handler: ActionHandler,
) -> Result<()>
```

This change simplifies the API by:
- Removing the need to separate service path and action name
- Using a single TopicPath that already contains the action in its path
- Improving consistency with the get_action_handler method which also takes a single TopicPath

### Key Architectural Principles

// ... existing code ... 

## Internal Services Architecture

An important architectural improvement is to introduce the concept of "internal services" - special services that handle Node metadata, service information, and other system-level operations through the standard request interface.

### Registry Service

The current implementation exposes methods like `node.get_service_state()` to retrieve service state information. This approach has several drawbacks:

1. **Inconsistent API pattern**: Services are accessed through `request()` but service metadata through direct methods
2. **Limited extensibility**: Each new piece of information requires a new method 
3. **Method proliferation**: As more metadata is exposed, more methods are added
4. **Inconsistent access patterns**: Some information is accessed via service-specific methods, other via requests

Instead, we will implement an internal registry service that provides access to service metadata through the standard request interface:

```rust
// Current approach
let state = node.get_service_state("math").await;

// New approach
let response = node.request("internal/registry/services/math", ValueType::Null).await?;
let service_info = response.data.unwrap();  // Contains full service metadata including state
```

#### Registry Service Design

1. **Service Path**: `internal/registry`

2. **Available Actions**:
   - `services` - List all services with basic metadata
   - `services/{service_path}` - Get detailed information about a specific service
   - `services/{service_path}/state` - Get just the state of a service
   - `services/{service_path}/actions` - List actions of a service
   - `services/{service_path}/events` - List events of a service

3. **Implementation**:
   - Create a dedicated `RegistryService` that is automatically registered with the Node
   - Special initialization to avoid circular dependencies
   - Privileged access to Node internals
   - Standard service interface for requests

4. **Response Format**:
   - For service listing:
   ```json
   [
     {
       "name": "Math",
       "path": "math",
       "state": "Running",
       "version": "1.0.0"
     },
     {
       "name": "UserService",
       "path": "users",
       "state": "Running",
       "version": "1.2.1"
     }
   ]
   ```
   
   - For detailed service information:
   ```json
   {
     "name": "Math",
     "path": "math",
     "state": "Running",
     "version": "1.0.0",
     "actions": ["add", "subtract", "multiply"],
     "events": ["calculation_completed", "error_occurred"],
     "metadata": {
       "description": "Basic math operations",
       "author": "Runar Team"
     },
     "started_at": "2023-06-10T15:30:45Z",
     "uptime_seconds": 3600
   }
   ```

#### Benefits

1. **Consistent API pattern**: All service and metadata access through the same `request()` interface
2. **Extensibility**: Additional metadata can be added without changing the API
3. **Standard request/response format**: Uses the same format as other service responses
4. **Improved testability**: Can test registry access through the same service testing patterns
5. **Enhanced security**: Future permission models can be applied consistently

#### Implementation Steps

1. Create the `RegistryService` struct implementing `AbstractService`
2. Add special handling in Node to register this service automatically
3. Implement actions to retrieve service information from Node's state
4. Update tests to use this new pattern
5. Maintain the direct methods temporarily for backward compatibility 
6. Add test coverage for registry service

This approach better aligns with the architectural principles of the system, treating service metadata as a first-class concept that is accessible through the standard service interface.

#### Example Implementation

Here's a skeleton of how the `RegistryService` could be implemented:

```rust
use anyhow::Result;
use async_trait::async_trait;
use std::sync::Arc;

use crate::node::Node;
use crate::services::abstract_service::{AbstractService, ServiceState};
use crate::services::{LifecycleContext, RequestContext, ServiceResponse};
use runar_common::types::ValueType;

/// Internal service for accessing registry information
pub struct RegistryService {
    /// Reference to the Node - needed to access service information
    node: Arc<Node>,
    
    /// Service name
    name: String,
    
    /// Service path
    path: String,
}

impl RegistryService {
    /// Create a new registry service
    pub fn new(node: Arc<Node>) -> Self {
        Self {
            node,
            name: "Registry".to_string(),
            path: "internal/registry".to_string(),
        }
    }
    
    /// Handle request for listing all services
    async fn handle_list_services(&self, _params: Option<ValueType>, _context: RequestContext) -> Result<ServiceResponse> {
        // Get all services from the node
        let services = self.node.list_services();
        let states = self.node.get_all_service_states().await;
        
        // Build response data
        let mut services_data = Vec::new();
        for service_path in services {
            let state = states.get(&service_path).cloned();
            
            // Create a map for this service
            let mut service_data = std::collections::HashMap::new();
            service_data.insert("path".to_string(), ValueType::String(service_path.clone()));
            
            // Add state if available
            if let Some(state) = state {
                service_data.insert("state".to_string(), ValueType::String(format!("{:?}", state)));
            }
            
            services_data.push(ValueType::Map(service_data));
        }
        
        Ok(ServiceResponse::ok(ValueType::Array(services_data)))
    }
    
    /// Handle request for specific service information
    async fn handle_service_info(&self, service_path: &str, _params: Option<ValueType>, _context: RequestContext) -> Result<ServiceResponse> {
        // Get service state
        let state = self.node.get_service_state(service_path).await;
        
        // Check if service exists
        if !self.node.list_services().contains(&service_path.to_string()) {
            return Ok(ServiceResponse::error(404, &format!("Service '{}' not found", service_path)));
        }
        
        // Create response data
        let mut service_data = std::collections::HashMap::new();
        service_data.insert("path".to_string(), ValueType::String(service_path.to_string()));
        
        // Add state if available
        if let Some(state) = state {
            service_data.insert("state".to_string(), ValueType::String(format!("{:?}", state)));
        }
        
        // TODO: Add more service metadata (actions, events, etc.)
        
        Ok(ServiceResponse::ok(ValueType::Map(service_data)))
    }
}

#[async_trait]
impl AbstractService for RegistryService {
    /// Get the service name
    fn name(&self) -> &str {
        &self.name
    }
    
    /// Get the service path
    fn path(&self) -> &str {
        &self.path
    }
    
    /// Initialize the service
    async fn init(&self, context: LifecycleContext) -> Result<()> {
        // Register actions for accessing registry information
        context.register_action("services", 
            Box::new(|params, ctx| Box::pin(self.handle_list_services(params, ctx))))
            .await?;
        
        // Register pattern-based action for service info
        context.register_action_pattern("services/{service_path}", 
            Box::new(|params, ctx, path_params| {
                let service_path = path_params.get("service_path").unwrap_or_default();
                Box::pin(self.handle_service_info(service_path, params, ctx))
            }))
            .await?;
        
        // Register more specific actions
        context.register_action_pattern("services/{service_path}/state",
            Box::new(|params, ctx, path_params| {
                let service_path = path_params.get("service_path").unwrap_or_default();
                Box::pin(async move {
                    // Get service state only
                    let state = self.node.get_service_state(service_path).await;
                    match state {
                        Some(state) => Ok(ServiceResponse::ok(ValueType::String(format!("{:?}", state)))),
                        None => Ok(ServiceResponse::error(404, &format!("Service '{}' not found", service_path))),
                    }
                })
            }))
            .await?;
        
        Ok(())
    }
    
    /// Start the service
    async fn start(&self, _context: LifecycleContext) -> Result<()> {
        // Nothing to do on start - registry service is always ready
        Ok(())
    }
    
    /// Stop the service
    async fn stop(&self, _context: LifecycleContext) -> Result<()> {
        // Nothing to clean up
        Ok(())
    }
}

#### Integration with Node

To automatically register the registry service with the Node, we need to add special handling:

```rust
impl Node {
    /// Initialize internal services
    async fn init_internal_services(&mut self) -> Result<()> {
        // Create a registry service with a reference to this node
        let node_arc = Arc::new(self.clone());
        let registry_service = RegistryService::new(node_arc);
        
        // Add the registry service to the node
        self.add_service(registry_service).await?;
        
        Ok(())
    }
    
    /// Create a new Node with the given configuration
    pub async fn new(config: NodeConfig) -> Result<Self> {
        // ... existing initialization code ...
        
        // Create a new node instance
        let mut node = Self {
            // ... existing fields ...
        };
        
        // Initialize internal services
        node.init_internal_services().await?;
        
        // Return the new node
        Ok(node)
    }
}
```

#### Action Pattern Matching

The example introduces a new concept: action pattern matching. This allows registering handlers for URL-like patterns with path parameters:

```rust
// Register an action with path parameters
context.register_action_pattern("services/{service_path}/state", handler).await?;
```

This would require extending the `LifecycleContext` with a new registration method:

```rust
impl LifecycleContext {
    /// Register an action handler with pattern matching
    pub async fn register_action_pattern<F, Fut>(
        &self,
        pattern: &str,
        handler: F,
    ) -> Result<()>
    where
        F: Fn(Option<ValueType>, RequestContext, std::collections::HashMap<String, String>) -> Fut + Send + Sync + 'static,
        Fut: Future<Output = Result<ServiceResponse>> + Send + 'static,
    {
        // Implementation would parse patterns like "services/{service_path}/state"
        // and extract path parameters when matching requests
        // ...
    }
}
```

This pattern matching capability would be a significant enhancement to the action registration system, allowing for more RESTful API designs.

## Progress Tracking

- [x] Simplify service lookup with TopicPath
- [x] Implement request handling in Node
- [x] Implement publishing in Node
- [x] Create LifecycleContext with proper logging
- [x] Add documentation warnings to handle_request and publish in ServiceRegistry
- [x] Add clear test INTENTION documentation
- [x] Refactor constructors using the builder pattern
- [x] Remove deprecated constructor methods
- [x] Remove `handle_request` from ServiceRegistry
- [x] Remove `publish` from ServiceRegistry
- [x] Update AbstractService to use action registration instead of handler methods
- [x] Fix context handling
- [x] Enhance TopicPath usage
- [x] Implement CompleteServiceMetadata to track service state and metadata centrally
- [x] Remove ServiceMetadata dependency from services, using direct AbstractService methods
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

- [ ] Implement internal registry service for accessing service metadata
- [ ] Implement publish_with_options
- [ ] Implement EventContext for callbacks
- [ ] Implement metrics system
- [ ] Complete API cleanup for consistency

## Testing Strategy

- Create comprehensive unit tests for core registry functions
- Test with real services and real Node instances
- Verify event flow from publishing to receiving
- Test both request and event paths
- Ensure consistent behavior across different path formats
- Ensure each test has clear INTENTION documentation
- Each test should have a single responsibility and test only what the component is responsible for

## Next Steps

The immediate next steps are:

1. ✅ Fix action handler registration/lookup with respect to registry cloning (COMPLETED)
2. ✅ Fix NodeDelegate trait implementation (COMPLETED)
3. ✅ Remove redundant NodeRequestHandler trait (COMPLETED)
4. ✅ Fix non-blocking list_services implementation (COMPLETED)
5. ✅ Implement Node.start() and Node.stop() lifecycle methods (COMPLETED)
6. ✅ Implement lifecycle state tracking (COMPLETED)
7. Implement internal registry service for accessing service metadata
8. Implement EventContext to pass to callbacks
9. Implement the metrics collection framework in Node
10. Create the publish_with_options method with configurable delivery options

All the unit tests for basic functionality are now passing, which marks significant progress in the refactoring plan. The implementation of Node.start() and Node.stop() lifecycle methods along with proper state tracking represents a key milestone in the Node's capability to properly manage service lifecycles. 

The next focus is on implementing the internal registry service to provide a consistent API pattern for accessing service metadata. This will eliminate the need for direct methods like get_service_state() and align with the architectural principle of using the standard request interface for all service interactions. After that, work will continue on enhancing the event system and implementing metrics collection.

## ServiceRegistry API Changes

### 1. Action Registration API Change

The `register_action` method signature has been updated from:

```rust
pub async fn register_action(
    &self,
    topic_path: &TopicPath,
    action_name: &str,
    handler: ActionHandler,
) -> Result<()>
```

To the streamlined version:

```rust
pub async fn register_action(
    &self,
    action_path: &TopicPath,
    handler: ActionHandler,
) -> Result<()>
```

This change simplifies the API by:
- Removing the need to separate service path and action name
- Using a single TopicPath that already contains the action in its path
- Improving consistency with the get_action_handler method which also takes a single TopicPath

### Key Architectural Principles

// ... existing code ... 

## Internal Services Architecture

An important architectural improvement is to introduce the concept of "internal services" - special services that handle Node metadata, service information, and other system-level operations through the standard request interface.

### Registry Service

The current implementation exposes methods like `node.get_service_state()` to retrieve service state information. This approach has several drawbacks:

1. **Inconsistent API pattern**: Services are accessed through `request()` but service metadata through direct methods
2. **Limited extensibility**: Each new piece of information requires a new method 
3. **Method proliferation**: As more metadata is exposed, more methods are added
4. **Inconsistent access patterns**: Some information is accessed via service-specific methods, other via requests

Instead, we will implement an internal registry service that provides access to service metadata through the standard request interface:

```rust
// Current approach
let state = node.get_service_state("math").await;

// New approach
let response = node.request("internal/registry/services/math", ValueType::Null).await?;
let service_info = response.data.unwrap();  // Contains full service metadata including state
```

#### Registry Service Design

1. **Service Path**: `internal/registry`

2. **Available Actions**:
   - `services` - List all services with basic metadata
   - `services/{service_path}` - Get detailed information about a specific service
   - `services/{service_path}/state` - Get just the state of a service
   - `services/{service_path}/actions` - List actions of a service
   - `services/{service_path}/events` - List events of a service

3. **Implementation**:
   - Create a dedicated `RegistryService` that is automatically registered with the Node
   - Special initialization to avoid circular dependencies
   - Privileged access to Node internals
   - Standard service interface for requests

4. **Response Format**:
   - For service listing:
   ```json
   [
     {
       "name": "Math",
       "path": "math",
       "state": "Running",
       "version": "1.0.0"
     },
     {
       "name": "UserService",
       "path": "users",
       "state": "Running",
       "version": "1.2.1"
     }
   ]
   ```
   
   - For detailed service information:
   ```json
   {
     "name": "Math",
     "path": "math",
     "state": "Running",
     "version": "1.0.0",
     "actions": ["add", "subtract", "multiply"],
     "events": ["calculation_completed", "error_occurred"],
     "metadata": {
       "description": "Basic math operations",
       "author": "Runar Team"
     },
     "started_at": "2023-06-10T15:30:45Z",
     "uptime_seconds": 3600
   }
   ```

#### Benefits

1. **Consistent API pattern**: All service and metadata access through the same `request()` interface
2. **Extensibility**: Additional metadata can be added without changing the API
3. **Standard request/response format**: Uses the same format as other service responses
4. **Improved testability**: Can test registry access through the same service testing patterns
5. **Enhanced security**: Future permission models can be applied consistently

#### Implementation Steps

1. Create the `RegistryService` struct implementing `AbstractService`
2. Add special handling in Node to register this service automatically
3. Implement actions to retrieve service information from Node's state
4. Update tests to use this new pattern
5. Maintain the direct methods temporarily for backward compatibility 
6. Add test coverage for registry service

This approach better aligns with the architectural principles of the system, treating service metadata as a first-class concept that is accessible through the standard service interface.

#### Example Implementation

Here's a skeleton of how the `RegistryService` could be implemented:

```rust
use anyhow::Result;
use async_trait::async_trait;
use std::sync::Arc;

use crate::node::Node;
use crate::services::abstract_service::{AbstractService, ServiceState};
use crate::services::{LifecycleContext, RequestContext, ServiceResponse};
use runar_common::types::ValueType;

/// Internal service for accessing registry information
pub struct RegistryService {
    /// Reference to the Node - needed to access service information
    node: Arc<Node>,
    
    /// Service name
    name: String,
    
    /// Service path
    path: String,
}

impl RegistryService {
    /// Create a new registry service
    pub fn new(node: Arc<Node>) -> Self {
        Self {
            node,
            name: "Registry".to_string(),
            path: "internal/registry".to_string(),
        }
    }
    
    /// Handle request for listing all services
    async fn handle_list_services(&self, _params: Option<ValueType>, _context: RequestContext) -> Result<ServiceResponse> {
        // Get all services from the node
        let services = self.node.list_services();
        let states = self.node.get_all_service_states().await;
        
        // Build response data
        let mut services_data = Vec::new();
        for service_path in services {
            let state = states.get(&service_path).cloned();
            
            // Create a map for this service
            let mut service_data = std::collections::HashMap::new();
            service_data.insert("path".to_string(), ValueType::String(service_path.clone()));
            
            // Add state if available
            if let Some(state) = state {
                service_data.insert("state".to_string(), ValueType::String(format!("{:?}", state)));
            }
            
            services_data.push(ValueType::Map(service_data));
        }
        
        Ok(ServiceResponse::ok(ValueType::Array(services_data)))
    }
    
    /// Handle request for specific service information
    async fn handle_service_info(&self, service_path: &str, _params: Option<ValueType>, _context: RequestContext) -> Result<ServiceResponse> {
        // Get service state
        let state = self.node.get_service_state(service_path).await;
        
        // Check if service exists
        if !self.node.list_services().contains(&service_path.to_string()) {
            return Ok(ServiceResponse::error(404, &format!("Service '{}' not found", service_path)));
        }
        
        // Create response data
        let mut service_data = std::collections::HashMap::new();
        service_data.insert("path".to_string(), ValueType::String(service_path.to_string()));
        
        // Add state if available
        if let Some(state) = state {
            service_data.insert("state".to_string(), ValueType::String(format!("{:?}", state)));
        }
        
        // TODO: Add more service metadata (actions, events, etc.)
        
        Ok(ServiceResponse::ok(ValueType::Map(service_data)))
    }
}

#[async_trait]
impl AbstractService for RegistryService {
    /// Get the service name
    fn name(&self) -> &str {
        &self.name
    }
    
    /// Get the service path
    fn path(&self) -> &str {
        &self.path
    }
    
    /// Initialize the service
    async fn init(&self, context: LifecycleContext) -> Result<()> {
        // Register actions for accessing registry information
        context.register_action("services", 
            Box::new(|params, ctx| Box::pin(self.handle_list_services(params, ctx))))
            .await?;
        
        // Register pattern-based action for service info
        context.register_action_pattern("services/{service_path}", 
            Box::new(|params, ctx, path_params| {
                let service_path = path_params.get("service_path").unwrap_or_default();
                Box::pin(self.handle_service_info(service_path, params, ctx))
            }))
            .await?;
        
        // Register more specific actions
        context.register_action_pattern("services/{service_path}/state",
            Box::new(|params, ctx, path_params| {
                let service_path = path_params.get("service_path").unwrap_or_default();
                Box::pin(async move {
                    // Get service state only
                    let state = self.node.get_service_state(service_path).await;
                    match state {
                        Some(state) => Ok(ServiceResponse::ok(ValueType::String(format!("{:?}", state)))),
                        None => Ok(ServiceResponse::error(404, &format!("Service '{}' not found", service_path))),
                    }
                })
            }))
            .await?;
        
        Ok(())
    }
    
    /// Start the service
    async fn start(&self, _context: LifecycleContext) -> Result<()> {
        // Nothing to do on start - registry service is always ready
        Ok(())
    }
    
    /// Stop the service
    async fn stop(&self, _context: LifecycleContext) -> Result<()> {
        // Nothing to clean up
        Ok(())
    }
}

#### Integration with Node

To automatically register the registry service with the Node, we need to add special handling:

```rust
impl Node {
    /// Initialize internal services
    async fn init_internal_services(&mut self) -> Result<()> {
        // Create a registry service with a reference to this node
        let node_arc = Arc::new(self.clone());
        let registry_service = RegistryService::new(node_arc);
        
        // Add the registry service to the node
        self.add_service(registry_service).await?;
        
        Ok(())
    }
    
    /// Create a new Node with the given configuration
    pub async fn new(config: NodeConfig) -> Result<Self> {
        // ... existing initialization code ...
        
        // Create a new node instance
        let mut node = Self {
            // ... existing fields ...
        };
        
        // Initialize internal services
        node.init_internal_services().await?;
        
        // Return the new node
        Ok(node)
    }
}
```

#### Action Pattern Matching

The example introduces a new concept: action pattern matching. This allows registering handlers for URL-like patterns with path parameters:

```rust
// Register an action with path parameters
context.register_action_pattern("services/{service_path}/state", handler).await?;
```

This would require extending the `LifecycleContext` with a new registration method:

```rust
impl LifecycleContext {
    /// Register an action handler with pattern matching
    pub async fn register_action_pattern<F, Fut>(
        &self,
        pattern: &str,
        handler: F,
    ) -> Result<()>
    where
        F: Fn(Option<ValueType>, RequestContext, std::collections::HashMap<String, String>) -> Fut + Send + Sync + 'static,
        Fut: Future<Output = Result<ServiceResponse>> + Send + 'static,
    {
        // Implementation would parse patterns like "services/{service_path}/state"
        // and extract path parameters when matching requests
        // ...
    }
}
```

This pattern matching capability would be a significant enhancement to the action registration system, allowing for more RESTful API designs.

## Progress Tracking

- [x] Simplify service lookup with TopicPath
- [x] Implement request handling in Node
- [x] Implement publishing in Node
- [x] Create LifecycleContext with proper logging
- [x] Add documentation warnings to handle_request and publish in ServiceRegistry
- [x] Add clear test INTENTION documentation
- [x] Refactor constructors using the builder pattern
- [x] Remove deprecated constructor methods
- [x] Remove `handle_request` from ServiceRegistry
- [x] Remove `publish` from ServiceRegistry
- [x] Update AbstractService to use action registration instead of handler methods
- [x] Fix context handling
- [x] Enhance TopicPath usage
- [x] Implement CompleteServiceMetadata to track service state and metadata centrally
- [x] Remove ServiceMetadata dependency from services, using direct AbstractService methods
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

- [ ] Implement internal registry service for accessing service metadata
- [ ] Implement publish_with_options
- [ ] Implement EventContext for callbacks
- [ ] Implement metrics system
- [ ] Complete API cleanup for consistency

## Testing Strategy

- Create comprehensive unit tests for core registry functions
- Test with real services and real Node instances
- Verify event flow from publishing to receiving
- Test both request and event paths
- Ensure consistent behavior across different path formats
- Ensure each test has clear INTENTION documentation
- Each test should have a single responsibility and test only what the component is responsible for

## Next Steps

The immediate next steps are:

1. ✅ Fix action handler registration/lookup with respect to registry cloning (COMPLETED)
2. ✅ Fix NodeDelegate trait implementation (COMPLETED)
3. ✅ Remove redundant NodeRequestHandler trait (COMPLETED)
4. ✅ Fix non-blocking list_services implementation (COMPLETED)
5. ✅ Implement Node.start() and Node.stop() lifecycle methods (COMPLETED)
6. ✅ Implement lifecycle state tracking (COMPLETED)
7. Implement internal registry service for accessing service metadata
8. Implement EventContext to pass to callbacks
9. Implement the metrics collection framework in Node
10. Create the publish_with_options method with configurable delivery options

All the unit tests for basic functionality are now passing, which marks significant progress in the refactoring plan. The implementation of Node.start() and Node.stop() lifecycle methods along with proper state tracking represents a key milestone in the Node's capability to properly manage service lifecycles. 

The next focus is on implementing the internal registry service to provide a consistent API pattern for accessing service metadata. This will eliminate the need for direct methods like get_service_state() and align with the architectural principle of using the standard request interface for all service interactions. After that, work will continue on enhancing the event system and implementing metrics collection.

## ServiceRegistry API Changes

### 1. Action Registration API Change

The `register_action` method signature has been updated from:

```rust
pub async fn register_action(
    &self,
    topic_path: &TopicPath,
    action_name: &str,
    handler: ActionHandler,
) -> Result<()>
```

To the streamlined version:

```rust
pub async fn register_action(
    &self,
    action_path: &TopicPath,
    handler: ActionHandler,
) -> Result<()>
```

This change simplifies the API by:
- Removing the need to separate service path and action name
- Using a single TopicPath that already contains the action in its path
- Improving consistency with the get_action_handler method which also takes a single TopicPath

### Key Architectural Principles

// ... existing code ... 

## Internal Services Architecture

An important architectural improvement is to introduce the concept of "internal services" - special services that handle Node metadata, service information, and other system-level operations through the standard request interface.

### Registry Service

The current implementation exposes methods like `node.get_service_state()` to retrieve service state information. This approach has several drawbacks:

1. **Inconsistent API pattern**: Services are accessed through `request()` but service metadata through direct methods
2. **Limited extensibility**: Each new piece of information requires a new method 
3. **Method proliferation**: As more metadata is exposed, more methods are added
4. **Inconsistent access patterns**: Some information is accessed via service-specific methods, other via requests

Instead, we will implement an internal registry service that provides access to service metadata through the standard request interface:

```rust
// Current approach
let state = node.get_service_state("math").await;

// New approach
let response = node.request("internal/registry/services/math", ValueType::Null).await?;
let service_info = response.data.unwrap();  // Contains full service metadata including state
```

#### Registry Service Design

1. **Service Path**: `internal/registry`

2. **Available Actions**:
   - `services` - List all services with basic metadata
   - `services/{service_path}` - Get detailed information about a specific service
   - `services/{service_path}/state` - Get just the state of a service
   - `services/{service_path}/actions` - List actions of a service
   - `services/{service_path}/events` - List events of a service

3. **Implementation**:
   - Create a dedicated `RegistryService` that is automatically registered with the Node
   - Special initialization to avoid circular dependencies
   - Privileged access to Node internals
   - Standard service interface for requests

4. **Response Format**:
   - For service listing:
   ```json
   [
     {
       "name": "Math",
       "path": "math",
       "state": "Running",
       "version": "1.0.0"
     },
     {
       "name": "UserService",
       "path": "users",
       "state": "Running",
       "version": "1.2.1"
     }
   ]
   ```
   
   - For detailed service information:
   ```json
   {
     "name": "Math",
     "path": "math",
     "state": "Running",
     "version": "1.0.0",
     "actions": ["add", "subtract", "multiply"],
     "events": ["calculation_completed", "error_occurred"],
     "metadata": {
       "description": "Basic math operations",
       "author": "Runar Team"
     },
     "started_at": "2023-06-10T15:30:45Z",
     "uptime_seconds": 3600
   }
   ```

#### Benefits

1. **Consistent API pattern**: All service and metadata access through the same `request()` interface
2. **Extensibility**: Additional metadata can be added without changing the API
3. **Standard request/response format**: Uses the same format as other service responses
4. **Improved testability**: Can test registry access through the same service testing patterns
5. **Enhanced security**: Future permission models can be applied consistently

#### Implementation Steps

1. Create the `RegistryService` struct implementing `AbstractService`
2. Add special handling in Node to register this service automatically
3. Implement actions to retrieve service information from Node's state
4. Update tests to use this new pattern
5. Maintain the direct methods temporarily for backward compatibility 
6. Add test coverage for registry service

This approach better aligns with the architectural principles of the system, treating service metadata as a first-class concept that is accessible through the standard service interface.

#### Example Implementation

Here's a skeleton of how the `RegistryService` could be implemented:

```rust
use anyhow::Result;
use async_trait::async_trait;
use std::sync::Arc;

use crate::node::Node;
use crate::services::abstract_service::{AbstractService, ServiceState};
use crate::services::{LifecycleContext, RequestContext, ServiceResponse};
use runar_common::types::ValueType;

/// Internal service for accessing registry information
pub struct RegistryService {
    /// Reference to the Node - needed to access service information
    node: Arc<Node>,
    
    /// Service name
    name: String,
    
    /// Service path
    path: String,
}

impl RegistryService {
    /// Create a new registry service
    pub fn new(node: Arc<Node>) -> Self {
        Self {
            node,
            name: "Registry".to_string(),
            path: "internal/registry".to_string(),
        }
    }
    
    /// Handle request for listing all services
    async fn handle_list_services(&self, _params: Option<ValueType>, _context: RequestContext) -> Result<ServiceResponse> {
        // Get all services from the node
        let services = self.node.list_services();
        let states = self.node.get_all_service_states().await;
        
        // Build response data
        let mut services_data = Vec::new();
        for service_path in services {
            let state = states.get(&service_path).cloned();
            
            // Create a map for this service
            let mut service_data = std::collections::HashMap::new();
            service_data.insert("path".to_string(), ValueType::String(service_path.clone()));
            
            // Add state if available
            if let Some(state) = state {
                service_data.insert("state".to_string(), ValueType::String(format!("{:?}", state)));
            }
            
            services_data.push(ValueType::Map(service_data));
        }
        
        Ok(ServiceResponse::ok(ValueType::Array(services_data)))
    }
    
    /// Handle request for specific service information
    async fn handle_service_info(&self, service_path: &str, _params: Option<ValueType>, _context: RequestContext) -> Result<ServiceResponse> {
        // Get service state
        let state = self.node.get_service_state(service_path).await;
        
        // Check if service exists
        if !self.node.list_services().contains(&service_path.to_string()) {
            return Ok(ServiceResponse::error(404, &format!("Service '{}' not found", service_path)));
        }
        
        // Create response data
        let mut service_data = std::collections::HashMap::new();
        service_data.insert("path".to_string(), ValueType::String(service_path.to_string()));
        
        // Add state if available
        if let Some(state) = state {
            service_data.insert("state".to_string(), ValueType::String(format!("{:?}", state)));
        }
        
        // TODO: Add more service metadata (actions, events, etc.)
        
        Ok(ServiceResponse::ok(ValueType::Map(service_data)))
    }
}

#[async_trait]
impl AbstractService for RegistryService {
    /// Get the service name
    fn name(&self) -> &str {
        &self.name
    }
    
    /// Get the service path
    fn path(&self) -> &str {
        &self.path
    }
    
    /// Initialize the service
    async fn init(&self, context: LifecycleContext) -> Result<()> {
        // Register actions for accessing registry information
        context.register_action("services", 
            Box::new(|params, ctx| Box::pin(self.handle_list_services(params, ctx))))
            .await?;
        
        // Register pattern-based action for service info
        context.register_action_pattern("services/{service_path}", 
            Box::new(|params, ctx, path_params| {
                let service_path = path_params.get("service_path").unwrap_or_default();
                Box::pin(self.handle_service_info(service_path, params, ctx))
            }))
            .await?;
        
        // Register more specific actions
        context.register_action_pattern("services/{service_path}/state",
            Box::new(|params, ctx, path_params| {
                let service_path = path_params.get("service_path").unwrap_or_default();
                Box::pin(async move {
                    // Get service state only
                    let state = self.node.get_service_state(service_path).await;
                    match state {
                        Some(state) => Ok(ServiceResponse::ok(ValueType::String(format!("{:?}", state)))),
                        None => Ok(ServiceResponse::error(404, &format!("Service '{}' not found", service_path))),
                    }
                })
            }))
            .await?;
        
        Ok(())
    }
    
    /// Start the service
    async fn start(&self, _context: LifecycleContext) -> Result<()> {
        // Nothing to do on start - registry service is always ready
        Ok(())
    }
    
    /// Stop the service
    async fn stop(&self, _context: LifecycleContext) -> Result<()> {
        // Nothing to clean up
        Ok(())
    }
}

#### Integration with Node

To automatically register the registry service with the Node, we need to add special handling:

```rust
impl Node {
    /// Initialize internal services
    async fn init_internal_services(&mut self) -> Result<()> {
        // Create a registry service with a reference to this node
        let node_arc = Arc::new(self.clone());
        let registry_service = RegistryService::new(node_arc);
        
        // Add the registry service to the node
        self.add_service(registry_service).await?;
        
        Ok(())
    }
    
    /// Create a new Node with the given configuration
    pub async fn new(config: NodeConfig) -> Result<Self> {
        // ... existing initialization code ...
        
        // Create a new node instance
        let mut node = Self {
            // ... existing fields ...
        };
        
        // Initialize internal services
        node.init_internal_services().await?;
        
        // Return the new node
        Ok(node)
    }
}
```

#### Action Pattern Matching

The example introduces a new concept: action pattern matching. This allows registering handlers for URL-like patterns with path parameters:

```rust
// Register an action with path parameters
context.register_action_pattern("services/{service_path}/state", handler).await?;
```

This would require extending the `LifecycleContext` with a new registration method:

```rust
impl LifecycleContext {
    /// Register an action handler with pattern matching
    pub async fn register_action_pattern<F, Fut>(
        &self,
        pattern: &str,
        handler: F,
    ) -> Result<()>
    where
        F: Fn(Option<ValueType>, RequestContext, std::collections::HashMap<String, String>) -> Fut + Send + Sync + 'static,
        Fut: Future<Output = Result<ServiceResponse>> + Send + 'static,
    {
        // Implementation would parse patterns like "services/{service_path}/state"
        // and extract path parameters when matching requests
        // ...
    }
}
```

This pattern matching capability would be a significant enhancement to the action registration system, allowing for more RESTful API designs.

## Progress Tracking

- [x] Simplify service lookup with TopicPath
- [x] Implement request handling in Node
- [x] Implement publishing in Node
- [x] Create LifecycleContext with proper logging
- [x] Add documentation warnings to handle_request and publish in ServiceRegistry
- [x] Add clear test INTENTION documentation
- [x] Refactor constructors using the builder pattern
- [x] Remove deprecated constructor methods
- [x] Remove `handle_request` from ServiceRegistry
- [x] Remove `publish` from ServiceRegistry
- [x] Update AbstractService to use action registration instead of handler methods
- [x] Fix context handling
- [x] Enhance TopicPath usage
- [x] Implement CompleteServiceMetadata to track service state and metadata centrally
- [x] Remove ServiceMetadata dependency from services, using direct AbstractService methods
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

- [ ] Implement internal registry service for accessing service metadata
- [ ] Implement publish_with_options
- [ ] Implement EventContext for callbacks
- [ ] Implement metrics system
- [ ] Complete API cleanup for consistency

## Testing Strategy

- Create comprehensive unit tests for core registry functions
- Test with real services and real Node instances
- Verify event flow from publishing to receiving
- Test both request and event paths
- Ensure consistent behavior across different path formats
- Ensure each test has clear INTENTION documentation
- Each test should have a single responsibility and test only what the component is responsible for

## Next Steps

The immediate next steps are:

1. ✅ Fix action handler registration/lookup with respect to registry cloning (COMPLETED)
2. ✅ Fix NodeDelegate trait implementation (COMPLETED)
3. ✅ Remove redundant NodeRequestHandler trait (COMPLETED)
4. ✅ Fix non-blocking list_services implementation (COMPLETED)
5. ✅ Implement Node.start() and Node.stop() lifecycle methods (COMPLETED)
6. ✅ Implement lifecycle state tracking (COMPLETED)
7. Implement internal registry service for accessing service metadata
8. Implement EventContext to pass to callbacks
9. Implement the metrics collection framework in Node
10. Create the publish_with_options method with configurable delivery options

All the unit tests for basic functionality are now passing, which marks significant progress in the refactoring plan. The implementation of Node.start() and Node.stop() lifecycle methods along with proper state tracking represents a key milestone in the Node's capability to properly manage service lifecycles. 

The next focus is on implementing the internal registry service to provide a consistent API pattern for accessing service metadata. This will eliminate the need for direct methods like get_service_state() and align with the architectural principle of using the standard request interface for all service interactions. After that, work will continue on enhancing the event system and implementing metrics collection.

## ServiceRegistry API Changes

### 1. Action Registration API Change

The `register_action` method signature has been updated from:

```rust
pub async fn register_action(
    &self,
    topic_path: &TopicPath,
    action_name: &str,
    handler: ActionHandler,
) -> Result<()>
```

To the streamlined version:

```rust
pub async fn register_action(
    &self,
    action_path: &TopicPath,
    handler: ActionHandler,
) -> Result<()>
```

This change simplifies the API by:
- Removing the need to separate service path and action name
- Using a single TopicPath that already contains the action in its path
- Improving consistency with the get_action_handler method which also takes a single TopicPath

### Key Architectural Principles

// ... existing code ... 

## Internal Services Architecture

An important architectural improvement is to introduce the concept of "internal services" - special services that handle Node metadata, service information, and other system-level operations through the standard request interface.

### Registry Service

The current implementation exposes methods like `node.get_service_state()` to retrieve service state information. This approach has several drawbacks:

1. **Inconsistent API pattern**: Services are accessed through `request()` but service metadata through direct methods
2. **Limited extensibility**: Each new piece of information requires a new method 
3. **Method proliferation**: As more metadata is exposed, more methods are added
4. **Inconsistent access patterns**: Some information is accessed via service-specific methods, other via requests

Instead, we will implement an internal registry service that provides access to service metadata through the standard request interface:

```rust
// Current approach
let state = node.get_service_state("math").await;

// New approach
let response = node.request("internal/registry/services/math", ValueType::Null).await?;
let service_info = response.data.unwrap();  // Contains full service metadata including state
```

#### Registry Service Design

1. **Service Path**: `internal/registry`

2. **Available Actions**:
   - `services` - List all services with basic metadata
   - `services/{service_path}` - Get detailed information about a specific service
   - `services/{service_path}/state` - Get just the state of a service
   - `services/{service_path}/actions` - List actions of a service
   - `services/{service_path}/events` - List events of a service

3. **Implementation**:
   - Create a dedicated `RegistryService` that is automatically registered with the Node
   - Special initialization to avoid circular dependencies
   - Privileged access to Node internals
   - Standard service interface for requests

4. **Response Format**:
   - For service listing:
   ```json
   [
     {
       "name": "Math",
       "path": "math",
       "state": "Running",
       "version": "1.0.0"
     },
     {
       "name": "UserService",
       "path": "users",
       "state": "Running",
       "version": "1.2.1"
     }
   ]
   ```
   
   - For detailed service information:
   ```json
   {
     "name": "Math",
     "path": "math",
     "state": "Running",
     "version": "1.0.0",
     "actions": ["add", "subtract", "multiply"],
     "events": ["calculation_completed", "error_occurred"],
     "metadata": {
       "description": "Basic math operations",
       "author": "Runar Team"
     },
     "started_at": "2023-06-10T15:30:45Z",
     "uptime_seconds": 3600
   }
   ```

#### Benefits

1. **Consistent API pattern**: All service and metadata access through the same `request()` interface
2. **Extensibility**: Additional metadata can be added without changing the API
3. **Standard request/response format**: Uses the same format as other service responses
4. **Improved testability**: Can test registry access through the same service testing patterns
5. **Enhanced security**: Future permission models can be applied consistently

#### Implementation Steps

1. Create the `RegistryService` struct implementing `AbstractService`
2. Add special handling in Node to register this service automatically
3. Implement actions to retrieve service information from Node's state
4. Update tests to use this new pattern
5. Maintain the direct methods temporarily for backward compatibility 
6. Add test coverage for registry service

This approach better aligns with the architectural principles of the system, treating service metadata as a first-class concept that is accessible through the standard service interface.

#### Example Implementation

Here's a skeleton of how the `RegistryService` could be implemented:

```rust
use anyhow::Result;
use async_trait::async_trait;
use std::sync::Arc;

use crate::node::Node;
use crate::services::abstract_service::{AbstractService, ServiceState};
use crate::services::{LifecycleContext, RequestContext, ServiceResponse};
use runar_common::types::ValueType;

/// Internal service for accessing registry information
pub struct RegistryService {
    /// Reference to the Node - needed to access service information
    node: Arc<Node>,
    
    /// Service name
    name: String,
    
    /// Service path
    path: String,
}

impl RegistryService {
    /// Create a new registry service
    pub fn new(node: Arc<Node>) -> Self {
        Self {
            node,
            name: "Registry".to_string(),
            path: "internal/registry".to_string(),
        }
    }
    
    /// Handle request for listing all services
    async fn handle_list_services(&self, _params: Option<ValueType>, _context: RequestContext) -> Result<ServiceResponse> {
        // Get all services from the node
        let services = self.node.list_services();
        let states = self.node.get_all_service_states().await;
        
        // Build response data
        let mut services_data = Vec::new();
        for service_path in services {
            let state = states.get(&service_path).cloned();
            
            // Create a map for this service
            let mut service_data = std::collections::HashMap::new();
            service_data.insert("path".to_string(), ValueType::String(service_path.clone()));
            
            // Add state if available
            if let Some(state) = state {
                service_data.insert("state".to_string(), ValueType::String(format!("{:?}", state)));
            }
            
            services_data.push(ValueType::Map(service_data));
        }
        
        Ok(ServiceResponse::ok(ValueType::Array(services_data)))
    }
    
    /// Handle request for specific service information
    async fn handle_service_info(&self, service_path: &str, _params: Option<ValueType>, _context: RequestContext) -> Result<ServiceResponse> {
        // Get service state
        let state = self.node.get_service_state(service_path).await;
        
        // Check if service exists
        if !self.node.list_services().contains(&service_path.to_string()) {
            return Ok(ServiceResponse::error(404, &format!("Service '{}' not found", service_path)));
        }
        
        // Create response data
        let mut service_data = std::collections::HashMap::new();
        service_data.insert("path".to_string(), ValueType::String(service_path.to_string()));
        
        // Add state if available
        if let Some(state) = state {
            service_data.insert("state".to_string(), ValueType::String(format!("{:?}", state)));
        }
        
        // TODO: Add more service metadata (actions, events, etc.)
        
        Ok(ServiceResponse::ok(ValueType::Map(service_data)))
    }
}

#[async_trait]
impl AbstractService for RegistryService {
    /// Get the service name
    fn name(&self) -> &str {
        &self.name
    }
    
    /// Get the service path
    fn path(&self) -> &str {
        &self.path
    }
    
    /// Initialize the service
    async fn init(&self, context: LifecycleContext) -> Result<()> {
        // Register actions for accessing registry information
        context.register_action("services", 
            Box::new(|params, ctx| Box::pin(self.handle_list_services(params, ctx))))
            .await?;
        
        // Register pattern-based action for service info
        context.register_action_pattern("services/{service_path}", 
            Box::new(|params, ctx, path_params| {
                let service_path = path_params.get("service_path").unwrap_or_default();
                Box::pin(self.handle_service_info(service_path, params, ctx))
            }))
            .await?;
        
        // Register more specific actions
        context.register_action_pattern("services/{service_path}/state",
            Box::new(|params, ctx, path_params| {
                let service_path = path_params.get("service_path").unwrap_or_default();
                Box::pin(async move {
                    // Get service state only
                    let state = self.node.get_service_state(service_path).await;
                    match state {
                        Some(state) => Ok(ServiceResponse::ok(ValueType::String(format!("{:?}", state)))),
                        None => Ok(ServiceResponse::error(404, &format!("Service '{}' not found", service_path))),
                    }
                })
            }))
            .await?;
        
        Ok(())
    }
    
    /// Start the service
    async fn start(&self, _context: LifecycleContext) -> Result<()> {
        // Nothing to do on start - registry service is always ready
        Ok(())
    }
    
    /// Stop the service
    async fn stop(&self, _context: LifecycleContext) -> Result<()> {
        // Nothing to clean up
        Ok(())
    }
}

#### Integration with Node

To automatically register the registry service with the Node, we need to add special handling:

```rust
impl Node {
    /// Initialize internal services
    async fn init_internal_services(&mut self) -> Result<()> {
        // Create a registry service with a reference to this node
        let node_arc = Arc::new(self.clone());
        let registry_service = RegistryService::new(node_arc);
        
        // Add the registry service to the node
        self.add_service(registry_service).await?;
        
        Ok(())
    }
    
    /// Create a new Node with the given configuration
    pub async fn new(config: NodeConfig) -> Result<Self> {
        // ... existing initialization code ...
        
        // Create a new node instance
        let mut node = Self {
            // ... existing fields ...
        };
        
        // Initialize internal services
        node.init_internal_services().await?;
        
        // Return the new node
        Ok(node)
    }
}
```

#### Action Pattern Matching

The example introduces a new concept: action pattern matching. This allows registering handlers for URL-like patterns with path parameters:

```rust
// Register an action with path parameters
context.register_action_pattern("services/{service_path}/state", handler).await?;
```

This would require extending the `LifecycleContext` with a new registration method:

```rust
impl LifecycleContext {
    /// Register an action handler with pattern matching
    pub async fn register_action_pattern<F, Fut>(
        &self,
        pattern: &str,
        handler: F,
    ) -> Result<()>
    where
        F: Fn(Option<ValueType>, RequestContext, std::collections::HashMap<String, String>) -> Fut + Send + Sync + 'static,
        Fut: Future<Output = Result<ServiceResponse>> + Send + 'static,
    {
        // Implementation would parse patterns like "services/{service_path}/state"
        // and extract path parameters when matching requests
        // ...
    }
}
```

This pattern matching capability would be a significant enhancement to the action registration system, allowing for more RESTful API designs.

## Progress Tracking

- [x] Simplify service lookup with TopicPath
- [x] Implement request handling in Node
- [x] Implement publishing in Node
- [x] Create LifecycleContext with proper logging
- [x] Add documentation warnings to handle_request and publish in ServiceRegistry
- [x] Add clear test INTENTION documentation
- [x] Refactor constructors using the builder pattern
- [x] Remove deprecated constructor methods
- [x] Remove `handle_request` from ServiceRegistry
- [x] Remove `publish` from ServiceRegistry
- [x] Update AbstractService to use action registration instead of handler methods
- [x] Fix context handling
- [x] Enhance TopicPath usage
- [x] Implement CompleteServiceMetadata to track service state and metadata centrally
- [x] Remove ServiceMetadata dependency from services, using direct AbstractService methods
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

- [ ] Implement internal registry service for accessing service metadata
- [ ] Implement publish_with_options
- [ ] Implement EventContext for callbacks
- [ ] Implement metrics system
- [ ] Complete API cleanup for consistency

## Testing Strategy

- Create comprehensive unit tests for core registry functions
- Test with real services and real Node instances
- Verify event flow from publishing to receiving
- Test both request and event paths
- Ensure consistent behavior across different path formats
- Ensure each test has clear INTENTION documentation
- Each test should have a single responsibility and test only what the component is responsible for

## Next Steps

The immediate next steps are:

1. ✅ Fix action handler registration/lookup with respect to registry cloning (COMPLETED)
2. ✅ Fix NodeDelegate trait implementation (COMPLETED)
3. ✅ Remove redundant NodeRequestHandler trait (COMPLETED)
4. ✅ Fix non-blocking list_services implementation (COMPLETED)
5. ✅ Implement Node.start() and Node.stop() lifecycle methods (COMPLETED)
6. ✅ Implement lifecycle state tracking (COMPLETED)
7. Implement internal registry service for accessing service metadata
8. Implement EventContext to pass to callbacks
9. Implement the metrics collection framework in Node
10. Create the publish_with_options method with configurable delivery options

All the unit tests for basic functionality are now passing, which marks significant progress in the refactoring plan. The implementation of Node.start() and Node.stop() lifecycle methods along with proper state tracking represents a key milestone in the Node's capability to properly manage service lifecycles. 

The next focus is on implementing the internal registry service to provide a consistent API pattern for accessing service metadata. This will eliminate the need for direct methods like get_service_state() and align with the architectural principle of using the standard request interface for all service interactions. After that, work will continue on enhancing the event system and implementing metrics collection.

## ServiceRegistry API Changes

### 1. Action Registration API Change

The `register_action` method signature has been updated from:

```rust
pub async fn register_action(
    &self,
    topic_path: &TopicPath,
    action_name: &str,
    handler: ActionHandler,
) -> Result<()>
```

To the streamlined version:

```rust
pub async fn register_action(
    &self,
    action_path: &TopicPath,
    handler: ActionHandler,
) -> Result<()>
```

This change simplifies the API by:
- Removing the need to separate service path and action name
- Using a single TopicPath that already contains the action in its path
- Improving consistency with the get_action_handler method which also takes a single TopicPath

### Key Architectural Principles

// ... existing code ... 

## Internal Services Architecture

An important architectural improvement is to introduce the concept of "internal services" - special services that handle Node metadata, service information, and other system-level operations through the standard request interface.

### Registry Service

The current implementation exposes methods like `node.get_service_state()` to retrieve service state information. This approach has several drawbacks:

1. **Inconsistent API pattern**: Services are accessed through `request()` but service metadata through direct methods
2. **Limited extensibility**: Each new piece of information requires a new method 
3. **Method proliferation**: As more metadata is exposed, more methods are added
4. **Inconsistent access patterns**: Some information is accessed via service-specific methods, other via requests

Instead, we will implement an internal registry service that provides access to service metadata through the standard request interface:

```rust
// Current approach
let state = node.get_service_state("math").await;

// New approach
let response = node.request("internal/registry/services/math", ValueType::Null).await?;
let service_info = response.data.unwrap();  // Contains full service metadata including state
```

#### Registry Service Design

1. **Service Path**: `internal/registry`

2. **Available Actions**:
   - `services` - List all services with basic metadata
   - `services/{service_path}` - Get detailed information about a specific service
   - `services/{service_path}/state` - Get just the state of a service
   - `services/{service_path}/actions` - List actions of a service
   - `services/{service_path}/events` - List events of a service

3. **Implementation**:
   - Create a dedicated `RegistryService` that is automatically registered with the Node
   - Special initialization to avoid circular dependencies
   - Privileged access to Node internals
   - Standard service interface for requests

4. **Response Format**:
   - For service listing:
   ```json
   [
     {
       "name": "Math",
       "path": "math",
       "state": "Running",
       "version": "1.0.0"
     },
     {
       "name": "UserService",
       "path": "users",
       "state": "Running",
       "version": "1.2.1"
     }
   ]
   ```
   
   - For detailed service information:
   ```json
   {
     "name": "Math",
     "path": "math",
     "state": "Running",
     "version": "1.0.0",
     "actions": ["add", "subtract", "multiply"],
     "events": ["calculation_completed", "error_occurred"],
     "metadata": {
       "description": "Basic math operations",
       "author": "Runar Team"
     },
     "started_at": "2023-06-10T15:30:45Z",
     "uptime_seconds": 3600
   }
   ```

#### Benefits

1. **Consistent API pattern**: All service and metadata access through the same `request()` interface
2. **Extensibility**: Additional metadata can be added without changing the API
3. **Standard request/response format**: Uses the same format as other service responses
4. **Improved testability**: Can test registry access through the same service testing patterns
5. **Enhanced security**: Future permission models can be applied consistently

#### Implementation Steps

1. Create the `RegistryService` struct implementing `AbstractService`
2. Add special handling in Node to register this service automatically
3. Implement actions to retrieve service information from Node's state
4. Update tests to use this new pattern
5. Maintain the direct methods temporarily for backward compatibility 
6. Add test coverage for registry service

This approach better aligns with the architectural principles of the system, treating service metadata as a first-class concept that is accessible through the standard service interface.

#### Example Implementation

Here's a skeleton of how the `RegistryService` could be implemented:

```rust
use anyhow::Result;
use async_trait::async_trait;
use std::sync::Arc;

use crate::node::Node;
use crate::services::abstract_service::{AbstractService, ServiceState};
use crate::services::{LifecycleContext, RequestContext, ServiceResponse};
use runar_common::types::ValueType;

/// Internal service for accessing registry information
pub struct RegistryService {
    /// Reference to the Node - needed to access service information
    node: Arc<Node>,
    
    /// Service name
    name: String,
    
    /// Service path
    path: String,
}

impl RegistryService {
    /// Create a new registry service
    pub fn new(node: Arc<Node>) -> Self {
        Self {
            node,
            name: "Registry".to_string(),
            path: "internal/registry".to_string(),
        }
    }
    
    /// Handle request for listing all services
    async fn handle_list_services(&self, _params: Option<ValueType>, _context: RequestContext) -> Result<ServiceResponse> {
        // Get all services from the node
        let services = self.node.list_services();
        let states = self.node.get_all_service_states().await;
        
        // Build response data
        let mut services_data = Vec::new();
        for service_path in services {
            let state = states.get(&service_path).cloned();
            
            // Create a map for this service
            let mut service_data = std::collections::HashMap::new();
            service_data.insert("path".to_string(), ValueType::String(service_path.clone()));
            
            // Add state if available
            if let Some(state) = state {
                service_data.insert("state".to_string(), ValueType::String(format!("{:?}", state)));
            }
            
            services_data.push(ValueType::Map(service_data));
        }
        
        Ok(ServiceResponse::ok(ValueType::Array(services_data)))
    }
    
    /// Handle request for specific service information
    async fn handle_service_info(&self, service_path: &str, _params: Option<ValueType>, _context: RequestContext) -> Result<ServiceResponse> {
        // Get service state
        let state = self.node.get_service_state(service_path).await;
        
        // Check if service exists
        if !self.node.list_services().contains(&service_path.to_string()) {
            return Ok(ServiceResponse::error(404, &format!("Service '{}' not found", service_path)));
        }
        
        // Create response data
        let mut service_data = std::collections::HashMap::new();
        service_data.insert("path".to_string(), ValueType::String(service_path.to_string()));
        
        // Add state if available
        if let Some(state) = state {
            service_data.insert("state".to_string(), ValueType::String(format!("{:?}", state)));
        }
        
        // TODO: Add more service metadata (actions, events, etc.)
        
        Ok(ServiceResponse::ok(ValueType::Map(service_data)))
    }
}

#[async_trait]
impl AbstractService for RegistryService {
    /// Get the service name
    fn name(&self) -> &str {
        &self.name
    }
    
    /// Get the service path
    fn path(&self) -> &str {
        &self.path
    }
    
    /// Initialize the service
    async fn init(&self, context: LifecycleContext) -> Result<()> {
        // Register actions for accessing registry information
        context.register_action("services", 
            Box::new(|params, ctx| Box::pin(self.handle_list_services(params, ctx))))
            .await?;
        
        // Register pattern-based action for service info
        context.register_action_pattern("services/{service_path}", 
            Box::new(|params, ctx, path_params| {
                let service_path = path_params.get("service_path").unwrap_or_default();
                Box::pin(self.handle_service_info(service_path, params, ctx))
            }))
            .await?;
        
        // Register more specific actions
        context.register_action_pattern("services/{service_path}/state",
            Box::new(|params, ctx, path_params| {
                let service_path = path_params.get("service_path").unwrap_or_default();
                Box::pin(async move {
                    // Get service state only
                    let state = self.node.get_service_state(service_path).await;
                    match state {
                        Some(state) => Ok(ServiceResponse::ok(ValueType::String(format!("{:?}", state)))),
                        None => Ok(ServiceResponse::error(404, &format!("Service '{}' not found", service_path))),
                    }
                })
            }))
            .await?;
        
        Ok(())
    }
    
    /// Start the service
    async fn start(&self, _context: LifecycleContext) -> Result<()> {
        // Nothing to do on start - registry service is always ready
        Ok(())
    }
    
    /// Stop the service
    async fn stop(&self, _context: LifecycleContext) -> Result<()> {
        // Nothing to clean up
        Ok(())
    }
}

#### Integration with Node

To automatically register the registry service with the Node, we need to add special handling:

```rust
impl Node {
    /// Initialize internal services
    async fn init_internal_services(&mut self) -> Result<()> {
        // Create a registry service with a reference to this node
        let node_arc = Arc::new(self.clone());
        let registry_service = RegistryService::new(node_arc);
        
        // Add the registry service to the node
        self.add_service(registry_service).await?;
        
        Ok(())
    }
    
    /// Create a new Node with the given configuration
    pub async fn new(config: NodeConfig) -> Result<Self> {
        // ... existing initialization code ...
        
        // Create a new node instance
        let mut node = Self {
            // ... existing fields ...
        };
        
        // Initialize internal services
        node.init_internal_services().await?;
        
        // Return the new node
        Ok(node)
    }
}
```

#### Action Pattern Matching

The example introduces a new concept: action pattern matching. This allows registering handlers for URL-like patterns with path parameters:

```rust
// Register an action with path parameters
context.register_action_pattern("services/{service_path}/state", handler).await?;
```

This would require extending the `LifecycleContext` with a new registration method:

```rust
impl LifecycleContext {
    /// Register an action handler with pattern matching
    pub async fn register_action_pattern<F, Fut>(
        &self,
        pattern: &str,
        handler: F,
    ) -> Result<()>
    where
        F: Fn(Option<ValueType>, RequestContext, std::collections::HashMap<String, String>) -> Fut + Send + Sync + 'static,
        Fut: Future<Output = Result<ServiceResponse>> + Send + 'static,
    {
        // Implementation would parse patterns like "services/{service_path}/state"
        // and extract path parameters when matching requests
        // ...
    }
}
```

This pattern matching capability would be a significant enhancement to the action registration system, allowing for more RESTful API designs.

## Progress Tracking

- [x] Simplify service lookup with TopicPath
- [x] Implement request handling in Node
- [x] Implement publishing in Node
- [x] Create LifecycleContext with proper logging
- [x] Add documentation warnings to handle_request and publish in ServiceRegistry
- [x] Add clear test INTENTION documentation
- [x] Refactor constructors using the builder pattern
- [x] Remove deprecated constructor methods
- [x] Remove `handle_request` from ServiceRegistry
- [x] Remove `publish` from ServiceRegistry
- [x] Update AbstractService to use action registration instead of handler methods
- [x] Fix context handling
- [x] Enhance TopicPath usage
- [x] Implement CompleteServiceMetadata to track service state and metadata centrally
- [x] Remove ServiceMetadata dependency from services, using direct AbstractService methods
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

- [ ] Implement internal registry service for accessing service metadata
- [ ] Implement publish_with_options
- [ ] Implement EventContext for callbacks
- [ ] Implement metrics system
- [ ] Complete API cleanup for consistency

## Testing Strategy

- Create comprehensive unit tests for core registry functions
- Test with real services and real Node instances
- Verify event flow from publishing to receiving
- Test both request and event paths
- Ensure consistent behavior across different path formats
- Ensure each test has clear INTENTION documentation
- Each test should have a single responsibility and test only what the component is responsible for

## Next Steps

The immediate next steps are:

1. ✅ Fix action handler registration/lookup with respect to registry cloning (COMPLETED)
2. ✅ Fix NodeDelegate trait implementation (COMPLETED)
3. ✅ Remove redundant NodeRequestHandler trait (COMPLETED)
4. ✅ Fix non-blocking list_services implementation (COMPLETED)
5. ✅ Implement Node.start() and Node.stop() lifecycle methods (COMPLETED)
6. ✅ Implement lifecycle state tracking (COMPLETED)
7. Implement internal registry service for accessing service metadata
8. Implement EventContext to pass to callbacks
9. Implement the metrics collection framework in Node
10. Create the publish_with_options method with configurable delivery options

All the unit tests for basic functionality are now passing, which marks significant progress in the refactoring plan. The implementation of Node.start() and Node.stop() lifecycle methods along with proper state tracking represents a key milestone in the Node's capability to properly manage service lifecycles. 

The next focus is on implementing the internal registry service to provide a consistent API pattern for accessing service metadata. This will eliminate the need for direct methods like get_service_state() and align with the architectural principle of using the standard request interface for all service interactions. After that, work will continue on enhancing the event system and implementing metrics collection.

## ServiceRegistry API Changes

### 1. Action Registration API Change

The `register_action` method signature has been updated from:

```rust
pub async fn register_action(
    &self,
    topic_path: &TopicPath,
    action_name: &str,
    handler: ActionHandler,
) -> Result<()>
```

To the streamlined version:

```rust
pub async fn register_action(
    &self,
    action_path: &TopicPath,
    handler: ActionHandler,
) -> Result<()>
```

This change simplifies the API by:
- Removing the need to separate service path and action name
- Using a single TopicPath that already contains the action in its path
- Improving consistency with the get_action_handler method which also takes a single TopicPath

### Key Architectural Principles

// ... existing code ... 

## Internal Services Architecture

An important architectural improvement is to introduce the concept of "internal services" - special services that handle Node metadata, service information, and other system-level operations through the standard request interface.

### Registry Service

The current implementation exposes methods like `node.get_service_state()` to retrieve service state information. This approach has several drawbacks:

1. **Inconsistent API pattern**: Services are accessed through `request()` but service metadata through direct methods
2. **Limited extensibility**: Each new piece of information requires a new method 
3. **Method proliferation**: As more metadata is exposed, more methods are added
4. **Inconsistent access patterns**: Some information is accessed via service-specific methods, other via requests

Instead, we will implement an internal registry service that provides access to service metadata through the standard request interface:

```rust
// Current approach
let state = node.get_service_state("math").await;

// New approach
let response = node.request("internal/registry/services/math", ValueType::Null).await?;
let service_info = response.data.unwrap();  // Contains full service metadata including state
```

#### Registry Service Design

1. **Service Path**: `internal/registry`

2. **Available Actions**:
   - `services` - List all services with basic metadata
   - `services/{service_path}` - Get detailed information about a specific service
   - `services/{service_path}/state` - Get just the state of a service
   - `services/{service_path}/actions` - List actions of a service
   - `services/{service_path}/events` - List events of a service

3. **Implementation**:
   - Create a dedicated `RegistryService` that is automatically registered with the Node
   - Special initialization to avoid circular dependencies
   - Privileged access to Node internals
   - Standard service interface for requests

4. **Response Format**:
   - For service listing:
   ```json
   [
     {
       "name": "Math",
       "path": "math",
       "state": "Running",
       "version": "1.0.0"
     },
     {
       "name": "UserService",
       "path": "users",
       "state": "Running",
       "version": "1.2.1"
     }
   ]
   ```
   
   - For detailed service information:
   ```json
   {
     "name": "Math",
     "path": "math",
     "state": "Running",
     "version": "1.0.0",
     "actions": ["add", "subtract", "multiply"],
     "events": ["calculation_completed", "error_occurred"],
     "metadata": {
       "description": "Basic math operations",
       "author": "Runar Team"
     },
     "started_at": "2023-06-10T15:30:45Z",
     "uptime_seconds": 3600
   }
   ```

#### Benefits

1. **Consistent API pattern**: All service and metadata access through the same `request()` interface
2. **Extensibility**: Additional metadata can be added without changing the API
3. **Standard request/response format**: Uses the same format as other service responses
4. **Improved testability**: Can test registry access through the same service testing patterns
5. **Enhanced security**: Future permission models can be applied consistently

#### Implementation Steps

1. Create the `RegistryService` struct implementing `AbstractService`
2. Add special handling in Node to register this service automatically
3. Implement actions to retrieve service information from Node's state
4. Update tests to use this new pattern
5. Maintain the direct methods temporarily for backward compatibility 
6. Add test coverage for registry service

This approach better aligns with the architectural principles of the system, treating service metadata as a first-class concept that is accessible through the standard service interface.

#### Example Implementation

Here's a skeleton of how the `RegistryService` could be implemented:

```rust
use anyhow::Result;
use async_trait::async_trait;
use std::sync::Arc;

use crate::node::Node;
use crate::services::abstract_service::{AbstractService, ServiceState};
use crate::services::{LifecycleContext, RequestContext, ServiceResponse};
use runar_common::types::ValueType;

/// Internal service for accessing registry information
pub struct RegistryService {
    /// Reference to the Node - needed to access service information
    node: Arc<Node>,
    
    /// Service name
    name: String,
    
    /// Service path
    path: String,
}

impl RegistryService {
    /// Create a new registry service
    pub fn new(node: Arc<Node>) -> Self {
        Self {
            node,
            name: "Registry".to_string(),
            path: "internal/registry".to_string(),
        }
    }
    
    /// Handle request for listing all services
    async fn handle_list_services(&self, _params: Option<ValueType>, _context: RequestContext) -> Result<ServiceResponse> {
        // Get all services from the node
        let services = self.node.list_services();
        let states = self.node.get_all_service_states().await;
        
        // Build response data
        let mut services_data = Vec::new();
        for service_path in services {
            let state = states.get(&service_path).cloned();
            
            // Create a map for this service
            let mut service_data = std::collections::HashMap::new();
            service_data.insert("path".to_string(), ValueType::String(service_path.clone()));
            
            // Add state if available
            if let Some(state) = state {
                service_data.insert("state".to_string(), ValueType::String(format!("{:?}", state)));
            }
            
            services_data.push(ValueType::Map(service_data));
        }
        
        Ok(ServiceResponse::ok(ValueType::Array(services_data)))
    }
    
    /// Handle request for specific service information
    async fn handle_service_info(&self, service_path: &str, _params: Option<ValueType>, _context: RequestContext) -> Result<ServiceResponse> {
        // Get service state
        let state = self.node.get_service_state(service_path).await;
        
        // Check if service exists
        if !self.node.list_services().contains(&service_path.to_string()) {
            return Ok(ServiceResponse::error(404, &format!("Service '{}' not found", service_path)));
        }
        
        // Create response data
        let mut service_data = std::collections::HashMap::new();
        service_data.insert("path".to_string(), ValueType::String(service_path.to_string()));
        
        // Add state if available
        if let Some(state) = state {
            service_data.insert("state".to_string(), ValueType::String(format!("{:?}", state)));
        }
        
        // TODO: Add more service metadata (actions, events, etc.)
        
        Ok(ServiceResponse::ok(ValueType::Map(service_data)))
    }
}

#[async_trait]
impl AbstractService for RegistryService {
    /// Get the service name
    fn name(&self) -> &str {
        &self.name
    }
    
    /// Get the service path
    fn path(&self) -> &str {
        &self.path
    }
    
    /// Initialize the service
    async fn init(&self, context: LifecycleContext) -> Result<()> {
        // Register actions for accessing registry information
        context.register_action("services", 
            Box::new(|params, ctx| Box::pin(self.handle_list_services(params, ctx))))
            .await?;
        
        // Register pattern-based action for service info
        context.register_action_pattern("services/{service_path}", 
            Box::new(|params, ctx, path_params| {
                let service_path = path_params.get("service_path").unwrap_or_default();
                Box::pin(self.handle_service_info(service_path, params, ctx))
            }))
            .await?;
        
        // Register more specific actions
        context.register_action_pattern("services/{service_path}/state",
            Box::new(|params, ctx, path_params| {
                let service_path = path_params.get("service_path").unwrap_or_default();
                Box::pin(async move {
                    // Get service state only
                    let state = self.node.get_service_state(service_path).await;
                    match state {
                        Some(state) => Ok(ServiceResponse::ok(ValueType::String(format!("{:?}", state)))),
                        None => Ok(ServiceResponse::error(404, &format!("Service '{}' not found", service_path))),
                    }
                })
            }))
            .await?;
        
        Ok(())
    }
    
    /// Start the service
    async fn start(&self, _context: LifecycleContext) -> Result<()> {
        // Nothing to do on start - registry service is always ready
        Ok(())
    }
    
    /// Stop the service
    async fn stop(&self, _context: LifecycleContext) -> Result<()> {
        // Nothing to clean up
        Ok(())
    }
}

#### Integration with Node

To automatically register the registry service with the Node, we need to add special handling:

```rust
impl Node {
    /// Initialize internal services
    async fn init_internal_services(&mut self) -> Result<()> {
        // Create a registry service with a reference to this node
        let node_arc = Arc::new(self.clone());
        let registry_service = RegistryService::new(node_arc);
        
        // Add the registry service to the node
        self.add_service(registry_service).await?;
        
        Ok(())
    }
    
    /// Create a new Node with the given configuration
    pub async fn new(config: NodeConfig) -> Result<Self> {
        // ... existing initialization code ...
        
        // Create a new node instance
        let mut node = Self {
            // ... existing fields ...
        };
        
        // Initialize internal services
        node.init_internal_services().await?;
        
        // Return the new node
        Ok(node)
    }
}
```

#### Action Pattern Matching

The example introduces a new concept: action pattern matching. This allows registering handlers for URL-like patterns with path parameters:

```rust
// Register an action with path parameters
context.register_action_pattern("services/{service_path}/state", handler).await?;
```

This would require extending the `LifecycleContext` with a new registration method:

```rust
impl LifecycleContext {
    /// Register an action handler with pattern matching
    pub async fn register_action_pattern<F, Fut>(
        &self,
        pattern: &str,
        handler: F,
    ) -> Result<()>
    where
        F: Fn(Option<ValueType>, RequestContext, std::collections::HashMap<String, String>) -> Fut + Send + Sync + 'static,
        Fut: Future<Output = Result<ServiceResponse>> + Send + 'static,
    {
        // Implementation would parse patterns like "services/{service_path}/state"
        // and extract path parameters when matching requests
        // ...
    }
}
```

This pattern matching capability would be a significant enhancement to the action registration system, allowing for more RESTful API designs.

## Progress Tracking

- [x] Simplify service lookup with TopicPath
- [x] Implement request handling in Node
- [x] Implement publishing in Node
- [x] Create LifecycleContext with proper logging
- [x] Add documentation warnings to handle_request and publish in ServiceRegistry
- [x] Add clear test INTENTION documentation
- [x] Refactor constructors using the builder pattern
- [x] Remove deprecated constructor methods
- [x] Remove `handle_request` from ServiceRegistry
- [x] Remove `publish` from ServiceRegistry
- [x] Update AbstractService to use action registration instead of handler methods
- [x] Fix context handling
- [x] Enhance TopicPath usage
- [x] Implement CompleteServiceMetadata to track service state and metadata centrally
- [x] Remove ServiceMetadata dependency from services, using direct AbstractService methods
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

- [ ] Implement internal registry service for accessing service metadata
- [ ] Implement publish_with_options
- [ ] Implement EventContext for callbacks
- [ ] Implement metrics system
- [ ] Complete API cleanup for consistency

## Testing Strategy

- Create comprehensive unit tests for core registry functions
- Test with real services and real Node instances
- Verify event flow from publishing to receiving
- Test both request and event paths
- Ensure consistent behavior across different path formats
- Ensure each test has clear INTENTION documentation
- Each test should have a single responsibility and test only what the component is responsible for

## Next Steps

The immediate next steps are:

1. ✅ Fix action handler registration/lookup with respect to registry cloning (COMPLETED)
2. ✅ Fix NodeDelegate trait implementation (COMPLETED)
3. ✅ Remove redundant NodeRequestHandler trait (COMPLETED)
4. ✅ Fix non-blocking list_services implementation (COMPLETED)
5. ✅ Implement Node.start() and Node.stop() lifecycle methods (COMPLETED)
6. ✅ Implement lifecycle state tracking (COMPLETED)
7. Implement internal registry service for accessing service metadata
8. Implement EventContext to pass to callbacks
9. Implement the metrics collection framework in Node
10. Create the publish_with_options method with configurable delivery options

All the unit tests for basic functionality are now passing, which marks significant progress in the refactoring plan. The implementation of Node.start() and Node.stop() lifecycle methods along with proper state tracking represents a key milestone in the Node's capability to properly manage service lifecycles. 

The next focus is on implementing the internal registry service to provide a consistent API pattern for accessing service metadata. This will eliminate the need for direct methods like get_service_state() and align with the architectural principle of using the standard request interface for all service interactions. After that, work will continue on enhancing the event system and implementing metrics collection.

## ServiceRegistry API Changes

### 1. Action Registration API Change

The `register_action` method signature has been updated from:

```rust
pub async fn register_action(
    &self,
    topic_path: &TopicPath,
    action_name: &str,
    handler: ActionHandler,
) -> Result<()>
```

To the streamlined version:

```rust
pub async fn register_action(
    &self,
    action_path: &TopicPath,
    handler: ActionHandler,
) -> Result<()>
```

This change simplifies the API by:
- Removing the need to separate service path and action name
- Using a single TopicPath that already contains the action in its path
- Improving consistency with the get_action_handler method which also takes a single TopicPath

### Key Architectural Principles

// ... existing code ... 

## Internal Services Architecture

An important architectural improvement is to introduce the concept of "internal services" - special services that handle Node metadata, service information, and other system-level operations through the standard request interface.

### Registry Service

The current implementation exposes methods like `node.get_service_state()` to retrieve service state information. This approach has several drawbacks:

1. **Inconsistent API pattern**: Services are accessed through `request()` but service metadata through direct methods
2. **Limited extensibility**: Each new piece of information requires a new method 
3. **Method proliferation**: As more metadata is exposed, more methods are added
4. **Inconsistent access patterns**: Some information is accessed via service-specific methods, other via requests

Instead, we will implement an internal registry service that provides access to service metadata through the standard request interface:

```rust
// Current approach
let state = node.get_service_state("math").await;

// New approach
let response = node.request("internal/registry/services/math", ValueType::Null).await?;
let service_info = response.data.unwrap();  // Contains full service metadata including state
```

#### Registry Service Design

1. **Service Path**: `internal/registry`

2. **Available Actions**:
   - `services` - List all services with basic metadata
   - `services/{service_path}` - Get detailed information about a specific service
   - `services/{service_path}/state` - Get just the state of a service
   - `services/{service_path}/actions` - List actions of a service
   - `services/{service_path}/events` - List events of a service

3. **Implementation**:
   - Create a dedicated `RegistryService` that is automatically registered with the Node
   - Special initialization to avoid circular dependencies
   - Privileged access to Node internals
   - Standard service interface for requests

4. **Response Format**:
   - For service listing:
   ```json
   [
     {
       "name": "Math",
       "path": "math",
       "state": "Running",
       "version": "1.0.0"
     },
     {
       "name": "UserService",
       "path": "users",
       "state": "Running",
       "version": "1.2.1"
     }
   ]
   ```
   
   - For detailed service information:
   ```json
   {
     "name": "Math",
     "path": "math",
     "state": "Running",
     "version": "1.0.0",
     "actions": ["add", "subtract", "multiply"],
     "events": ["calculation_completed", "error_occurred"],
     "metadata": {
       "description": "Basic math operations",
       "author": "Runar Team"
     },
     "started_at": "2023-06-10T15:30:45Z",
     "uptime_seconds": 3600
   }
   ```

#### Benefits

1. **Consistent API pattern**: All service and metadata access through the same `request()` interface
2. **Extensibility**: Additional metadata can be added without changing the API
3. **Standard request/response format**: Uses the same format as other service responses
4. **Improved testability**: Can test registry access through the same service testing patterns
5. **Enhanced security**: Future permission models can be applied consistently

#### Implementation Steps

1. Create the `RegistryService` struct implementing `AbstractService`
2. Add special handling in Node to register this service automatically
3. Implement actions to retrieve service information from Node's state
4. Update tests to use this new pattern
5. Maintain the direct methods temporarily for backward compatibility 
6. Add test coverage for registry service

This approach better aligns with the architectural principles of the system, treating service metadata as a first-class concept that is accessible through the standard service interface.

#### Example Implementation

Here's a skeleton of how the `RegistryService` could be implemented:

```rust
use anyhow::Result;
use async_trait::async_trait;
use std::sync::Arc;

use crate::node::Node;
use crate::services::abstract_service::{AbstractService, ServiceState};
use crate::services::{LifecycleContext, RequestContext, ServiceResponse};
use runar_common::types::ValueType;

/// Internal service for accessing registry information
pub struct RegistryService {
    /// Reference to the Node - needed to access service information
    node: Arc<Node>,
    
    /// Service name
    name: String,
    
    /// Service path
    path: String,
}

impl RegistryService {
    /// Create a new registry service
    pub fn new(node: Arc<Node>) -> Self {
        Self {
            node,
            name: "Registry".to_string(),
            path: "internal/registry".to_string(),
        }
    }
    
    /// Handle request for listing all services
    async fn handle_list_services(&self, _params: Option<ValueType>, _context: RequestContext) -> Result<ServiceResponse> {
        // Get all services from the node
        let services = self.node.list_services();
        let states = self.node.get_all_service_states().await;
        
        // Build response data
        let mut services_data = Vec::new();
        for service_path in services {
            let state = states.get(&service_path).cloned();
            
            // Create a map for this service
            let mut service_data = std::collections::HashMap::new();
            service_data.insert("path".to_string(), ValueType::String(service_path.clone()));
            
            // Add state if available
            if let Some(state) = state {
                service_data.insert("state".to_string(), ValueType::String(format!("{:?}", state)));
            }
            
            services_data.push(ValueType::Map(service_data));
        }
        
        Ok(ServiceResponse::ok(ValueType::Array(services_data)))
    }
    
    /// Handle request for specific service information
    async fn handle_service_info(&self, service_path: &str, _params: Option<ValueType>, _context: RequestContext) -> Result<ServiceResponse> {
        // Get service state
        let state = self.node.get_service_state(service_path).await;
        
        // Check if service exists
        if !self.node.list_services().contains(&service_path.to_string()) {
            return Ok(ServiceResponse::error(404, &format!("Service '{}' not found", service_path)));
        }
        
        // Create response data
        let mut service_data = std::collections::HashMap::new();
        service_data.insert("path".to_string(), ValueType::String(service_path.to_string()));
        
        // Add state if available
        if let Some(state) = state {
            service_data.insert("state".to_string(), ValueType::String(format!("{:?}", state)));
        }
        
        // TODO: Add more service metadata (actions, events, etc.)
        
        Ok(ServiceResponse::ok(ValueType::Map(service_data)))
    }
}

#[async_trait]
impl AbstractService for RegistryService {
    /// Get the service name
    fn name(&self) -> &str {
        &self.name
    }
    
    /// Get the service path
    fn path(&self) -> &str {
        &self.path
    }
    
    /// Initialize the service
    async fn init(&self, context: LifecycleContext) -> Result<()> {
        // Register actions for accessing registry information
        context.register_action("services", 
            Box::new(|params, ctx| Box::pin(self.handle_list_services(params, ctx))))
            .await?;
        
        // Register pattern-based action for service info
        context.register_action_pattern("services/{service_path}", 
            Box::new(|params, ctx, path_params| {
                let service_path = path_params.get("service_path").unwrap_or_default();
                Box::pin(self.handle_service_info(service_path, params, ctx))
            }))
            .await?;
        
        // Register more specific actions
        context.register_action_pattern("services/{service_path}/state",
            Box::new(|params, ctx, path_params| {
                let service_path = path_params.get("service_path").unwrap_or_default();
                Box::pin(async move {
                    // Get service state only
                    let state = self.node.get_service_state(service_path).await;
                    match state {
                        Some(state) => Ok(ServiceResponse::ok(ValueType::String(format!("{:?}", state)))),
                        None => Ok(ServiceResponse::error(404, &format!("Service '{}' not found", service_path))),
                    }
                })
            }))
            .await?;
        
        Ok(())
    }
    
    /// Start the service
    async fn start(&self, _context: LifecycleContext) -> Result<()> {
        // Nothing to do on start - registry service is always ready
        Ok(())
    }
    
    /// Stop the service
    async fn stop(&self, _context: LifecycleContext) -> Result<()> {
        // Nothing to clean up
        Ok(())
    }
}

#### Integration with Node

To automatically register the registry service with the Node, we need to add special handling:

```rust
impl Node {
    /// Initialize internal services
    async fn init_internal_services(&mut self) -> Result<()> {
        // Create a registry service with a reference to this node
        let node_arc = Arc::new(self.clone());
        let registry_service = RegistryService::new(node_arc);
        
        // Add the registry service to the node
        self.add_service(registry_service).await?;
        
        Ok(())
    }
    
    /// Create a new Node with the given configuration
    pub async fn new(config: NodeConfig) -> Result<Self> {
        // ... existing initialization code ...
        
        // Create a new node instance
        let mut node = Self {
            // ... existing fields ...
        };
        
        // Initialize internal services
        node.init_internal_services().await?;
        
        // Return the new node
        Ok(node)
    }
}
```

#### Action Pattern Matching

The example introduces a new concept: action pattern matching. This allows registering handlers for URL-like patterns with path parameters:

```rust
// Register an action with path parameters
context.register_action_pattern("services/{service_path}/state", handler).await?;
```

This would require extending the `LifecycleContext` with a new registration method:

```rust
impl LifecycleContext {
    /// Register an action handler with pattern matching
    pub async fn register_action_pattern<F, Fut>(
        &self,
        pattern: &str,
        handler: F,
    ) -> Result<()>
    where
        F: Fn(Option<ValueType>, RequestContext, std::collections::HashMap<String, String>) -> Fut + Send + Sync + 'static,
        Fut: Future<Output = Result<ServiceResponse>> + Send + 'static,
    {
        // Implementation would parse patterns like "services/{service_path}/state"
        // and extract path parameters when matching requests
        // ...
    }
}
```

This pattern matching capability would be a significant enhancement to the action registration system, allowing for more RESTful API designs.

## Progress Tracking

- [x] Simplify service lookup with TopicPath
- [x] Implement request handling in Node
- [x] Implement publishing in Node
- [x] Create LifecycleContext with proper logging
- [x] Add documentation warnings to handle_request and publish in ServiceRegistry
- [x] Add clear test INTENTION documentation
- [x] Refactor constructors using the builder pattern
- [x] Remove deprecated constructor methods
- [x] Remove `handle_request` from ServiceRegistry
- [x] Remove `publish` from ServiceRegistry
- [x] Update AbstractService to use action registration instead of handler methods
- [x] Fix context handling
- [x] Enhance TopicPath usage
- [x] Implement CompleteServiceMetadata to track service state and metadata centrally
- [x] Remove ServiceMetadata dependency from services, using direct AbstractService methods
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

- [ ] Implement internal registry service for accessing service metadata
- [ ] Implement publish_with_options
- [ ] Implement EventContext for callbacks
- [ ] Implement metrics system
- [ ] Complete API cleanup for consistency

## Testing Strategy

- Create comprehensive unit tests for core registry functions
- Test with real services and real Node instances
- Verify event flow from publishing to receiving
- Test both request and event paths
- Ensure consistent behavior across different path formats
- Ensure each test has clear INTENTION documentation
- Each test should have a single responsibility and test only what the component is responsible for

## Next Steps

The immediate next steps are:

1. ✅ Fix action handler registration/lookup with respect to registry cloning (COMPLETED)
2. ✅ Fix NodeDelegate trait implementation (COMPLETED)
3. ✅ Remove redundant NodeRequestHandler trait (COMPLETED)
4. ✅ Fix non-blocking list_services implementation (COMPLETED)
5. ✅ Implement Node.start() and Node.stop() lifecycle methods (COMPLETED)
6. ✅ Implement lifecycle state tracking (COMPLETED)
7. Implement internal registry service for accessing service metadata
8. Implement EventContext to pass to callbacks
9. Implement the metrics collection framework in Node
10. Create the publish_with_options method with configurable delivery options

All the unit tests for basic functionality are now passing, which marks significant progress in the refactoring plan. The implementation of Node.start() and Node.stop() lifecycle methods along with proper state tracking represents a key milestone in the Node's capability to properly manage service lifecycles. 

The next focus is on implementing the internal registry service to provide a consistent API pattern for accessing service metadata. This will eliminate the need for direct methods like get_service_state() and align with the architectural principle of using the standard request interface for all service interactions. After that, work will continue on enhancing the event system and implementing metrics collection.

## ServiceRegistry API Changes

### 1. Action Registration API Change

The `register_action` method signature has been updated from:

```rust
pub async fn register_action(
    &self,
    topic_path: &TopicPath,
    action_name: &str,
    handler: ActionHandler,
) -> Result<()>
```

To the streamlined version:

```rust
pub async fn register_action(
    &self,
    action_path: &TopicPath,
    handler: ActionHandler,
) -> Result<()>
```

This change simplifies the API by:
- Removing the need to separate service path and action name
- Using a single TopicPath that already contains the action in its path
- Improving consistency with the get_action_handler method which also takes a single TopicPath

### Key Architectural Principles

// ... existing code ... 

## Internal Services Architecture

An important architectural improvement is to introduce the concept of "internal services" - special services that handle Node metadata, service information, and other system-level operations through the standard request interface.

### Registry Service

The current implementation exposes methods like `node.get_service_state()` to retrieve service state information. This approach has several drawbacks:

1. **Inconsistent API pattern**: Services are accessed through `request()` but service metadata through direct methods
2. **Limited extensibility**: Each new piece of information requires a new method 
3. **Method proliferation**: As more metadata is exposed, more methods are added
4. **Inconsistent access patterns**: Some information is accessed via service-specific methods, other via requests

Instead, we will implement an internal registry service that provides access to service metadata through the standard request interface:

```rust
// Current approach
let state = node.get_service_state("math").await;

// New approach
let response = node.request("internal/registry/services/math", ValueType::Null).await?;
let service_info = response.data.unwrap();  // Contains full service metadata including state
```

#### Registry Service Design

1. **Service Path**: `internal/registry`

2. **Available Actions**:
   - `services` - List all services with basic metadata
   - `services/{service_path}` - Get detailed information about a specific service
   - `services/{service_path}/state` - Get just the state of a service
   - `services/{service_path}/actions` - List actions of a service
   - `services/{service_path}/events` - List events of a service

3. **Implementation**:
   - Create a dedicated `RegistryService` that is automatically registered with the Node
   - Special initialization to avoid circular dependencies
   - Privileged access to Node internals
   - Standard service interface for requests

4. **Response Format**:
   - For service listing:
   ```json
   [
     {
       "name": "Math",
       "path": "math",
       "state": "Running",
       "version": "1.0.0"
     },
     {
       "name": "UserService",
       "path": "users",
       "state": "Running",
       "version": "1.2.1"
     }
   ]
   ```
   
   - For detailed service information:
   ```json
   {
     "name": "Math",
     "path": "math",
     "state": "Running",
     "version": "1.0.0",
     "actions": ["add", "subtract", "multiply"],
     "events": ["calculation_completed", "error_occurred"],
     "metadata": {
       "description": "Basic math operations",
       "author": "Runar Team"
     },
     "started_at": "2023-06-10T15:30:45Z",
     "uptime_seconds": 3600
   }
   ```

#### Benefits

1. **Consistent API pattern**: All service and metadata access through the same `request()` interface
2. **Extensibility**: Additional metadata can be added without changing the API
3. **Standard request/response format**: Uses the same format as other service responses
4. **Improved testability**: Can test registry access through the same service testing patterns
5. **Enhanced security**: Future permission models can be applied consistently

#### Implementation Steps

1. Create the `RegistryService` struct implementing `AbstractService`
2. Add special handling in Node to register this service automatically
3. Implement actions to retrieve service information from Node's state
4. Update tests to use this new pattern
5. Maintain the direct methods temporarily for backward compatibility 
6. Add test coverage for registry service

This approach better aligns with the architectural principles of the system, treating service metadata as a first-class concept that is accessible through the standard service interface.

#### Example Implementation

Here's a skeleton of how the `RegistryService` could be implemented:

```rust
use anyhow::Result;
use async_trait::async_trait;
use std::sync::Arc;

use crate::node::Node;
use crate::services::abstract_service::{AbstractService, ServiceState};
use crate::services::{LifecycleContext, RequestContext, ServiceResponse};
use runar_common::types::ValueType;

/// Internal service for accessing registry information
pub struct RegistryService {
    /// Reference to the Node - needed to access service information
    node: Arc<Node>,
    
    /// Service name
    name: String,
    
    /// Service path
    path: String,
}

impl RegistryService {
    /// Create a new registry service
    pub fn new(node: Arc<Node>) -> Self {
        Self {
            node,
            name: "Registry".to_string(),
            path: "internal/registry".to_string(),
        }
    }
    
    /// Handle request for listing all services
    async fn handle_list_services(&self, _params: Option<ValueType>, _context: RequestContext) -> Result<ServiceResponse> {
        // Get all services from the node
        let services = self.node.list_services();
        let states = self.node.get_all_service_states().await;
        
        // Build response data
        let mut services_data = Vec::new();
        for service_path in services {
            let state = states.get(&service_path).cloned();
            
            // Create a map for this service
            let mut service_data = std::collections::HashMap::new();
            service_data.insert("path".to_string(), ValueType::String(service_path.clone()));
            
            // Add state if available
            if let Some(state) = state {
                service_data.insert("state".to_string(), ValueType::String(format!("{:?}", state)));
            }
            
            services_data.push(ValueType::Map(service_data));
        }
        
        Ok(ServiceResponse::ok(ValueType::Array(services_data)))
    }
    
    /// Handle request for specific service information
    async fn handle_service_info(&self, service_path: &str, _params: Option<ValueType>, _context: RequestContext) -> Result<ServiceResponse> {
        // Get service state
        let state = self.node.get_service_state(service_path).await;
        
        // Check if service exists
        if !self.node.list_services().contains(&service_path.to_string()) {
            return Ok(ServiceResponse::error(404, &format!("Service '{}' not found", service_path)));
        }
        
        // Create response data
        let mut service_data = std::collections::HashMap::new();
        service_data.insert("path".to_string(), ValueType::String(service_path.to_string()));
        
        // Add state if available
        if let Some(state) = state {
            service_data.insert("state".to_string(), ValueType::String(format!("{:?}", state)));
        }
        
        // TODO: Add more service metadata (actions, events, etc.)
        
        Ok(ServiceResponse::ok(ValueType::Map(service_data)))
    }
}

#[async_trait]
impl AbstractService for RegistryService {
    /// Get the service name
    fn name(&self) -> &str {
        &self.name
    }
    
    /// Get the service path
    fn path(&self) -> &str {
        &self.path
    }
    
    /// Initialize the service
    async fn init(&self, context: LifecycleContext) -> Result<()> {
        // Register actions for accessing registry information
        context.register_action("services", 
            Box::new(|params, ctx| Box::pin(self.handle_list_services(params, ctx))))
            .await?;
        
        // Register pattern-based action for service info
        context.register_action_pattern("services/{service_path}", 
            Box::new(|params, ctx, path_params| {
                let service_path = path_params.get("service_path").unwrap_or_default();
                Box::pin(self.handle_service_info(service_path, params, ctx))
            }))
            .await?;
        
        // Register more specific actions
        context.register_action_pattern("services/{service_path}/state",
            Box::new(|params, ctx, path_params| {
                let service_path = path_params.get("service_path").unwrap_or_default();
                Box::pin(async move {
                    // Get service state only
                    let state = self.node.get_service_state(service_path).await;
                    match state {
                        Some(state) => Ok(ServiceResponse::ok(ValueType::String(format!("{:?}", state)))),
                        None => Ok(ServiceResponse::error(404, &format!("Service '{}' not found", service_path))),
                    }
                })
            }))
            .await?;
        
        Ok(())
    }
    
    /// Start the service
    async fn start(&self, _context: LifecycleContext) -> Result<()> {
        // Nothing to do on start - registry service is always ready
        Ok(())
    }
    
    /// Stop the service
    async fn stop(&self, _context: LifecycleContext) -> Result<()> {
        // Nothing to clean up
        Ok(())
    }
}

#### Integration with Node

To automatically register the registry service with the Node, we need to add special handling:

```rust
impl Node {
    /// Initialize internal services
    async fn init_internal_services(&mut self) -> Result<()> {
        // Create a registry service with a reference to this node
        let node_arc = Arc::new(self.clone());
        let registry_service = RegistryService::new(node_arc);
        
        // Add the registry service to the node
        self.add_service(registry_service).await?;
        
        Ok(())
    }
    
    /// Create a new Node with the given configuration
    pub async fn new(config: NodeConfig) -> Result<Self> {
        // ... existing initialization code ...
        
        // Create a new node instance
        let mut node = Self {
            // ... existing fields ...
        };
        
        // Initialize internal services
        node.init_internal_services().await?;
        
        // Return the new node
        Ok(node)
    }
}
```

#### Action Pattern Matching

The example introduces a new concept: action pattern matching. This allows registering handlers for URL-like patterns with path parameters:

```rust
// Register an action with path parameters
context.register_action_pattern("services/{service_path}/state", handler).await?;
```

This would require extending the `LifecycleContext` with a new registration method:

```rust
impl LifecycleContext {
    /// Register an action handler with pattern matching
    pub async fn register_action_pattern<F, Fut>(
        &self,
        pattern: &str,
        handler: F,
    ) -> Result<()>
    where
        F: Fn(Option<ValueType>, RequestContext, std::collections::HashMap<String, String>) -> Fut + Send + Sync + 'static,
        Fut: Future<Output = Result<ServiceResponse>> + Send + 'static,
    {
        // Implementation would parse patterns like "services/{service_path}/state"
        // and extract path parameters when matching requests
        // ...
    }
}
```

This pattern matching capability would be a significant enhancement to the action registration system, allowing for more RESTful API designs.

## Progress Tracking

- [x] Simplify service lookup with TopicPath
- [x] Implement request handling in Node
- [x] Implement publishing in Node
- [x] Create LifecycleContext with proper logging
- [x] Add documentation warnings to handle_request and publish in ServiceRegistry
- [x] Add clear test INTENTION documentation
- [x] Refactor constructors using the builder pattern
- [x] Remove deprecated constructor methods
- [x] Remove `handle_request` from ServiceRegistry
- [x] Remove `publish` from ServiceRegistry
- [x] Update AbstractService to use action registration instead of handler methods
- [x] Fix context handling
- [x] Enhance TopicPath usage
- [x] Implement CompleteServiceMetadata to track service state and metadata centrally
- [x] Remove ServiceMetadata dependency from services, using direct AbstractService methods
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

- [ ] Implement internal registry service for accessing service metadata
- [ ] Implement publish_with_options
- [ ] Implement EventContext for callbacks
- [ ] Implement metrics system
- [ ] Complete API cleanup for consistency

## Testing Strategy

- Create comprehensive unit tests for core registry functions
- Test with real services and real Node instances
- Verify event flow from publishing to receiving
- Test both request and event paths
- Ensure consistent behavior across different path formats
- Ensure each test has clear INTENTION documentation
- Each test should have a single responsibility and test only what the component is responsible for

## Next Steps

The immediate next steps are:

1. ✅ Fix action handler registration/lookup with respect to registry cloning (COMPLETED)
2. ✅ Fix NodeDelegate trait implementation (COMPLETED)
3. ✅ Remove redundant NodeRequestHandler trait (COMPLETED)
4. ✅ Fix non-blocking list_services implementation (COMPLETED)
5. ✅ Implement Node.start() and Node.stop() lifecycle methods (COMPLETED)
6. ✅ Implement lifecycle state tracking (COMPLETED)
7. Implement internal registry service for accessing service metadata
8. Implement EventContext to pass to callbacks
9. Implement the metrics collection framework in Node
10. Create the publish_with_options method with configurable delivery options

All the unit tests for basic functionality are now passing, which marks significant progress in the refactoring plan. The implementation of Node.start() and Node.stop() lifecycle methods along with proper state tracking represents a key milestone in the Node's capability to properly manage service lifecycles. 

The next focus is on implementing the internal registry service to provide a consistent API pattern for accessing service metadata. This will eliminate the need for direct methods like get_service_state() and align with the architectural principle of using the standard request interface for all service interactions. After that, work will continue on enhancing the event system and implementing metrics collection.

## ServiceRegistry API Changes

### 1. Action Registration API Change

The `register_action` method signature has been updated from:

```rust
pub async fn register_action(
    &self,
    topic_path: &TopicPath,
    action_name: &str,
    handler: ActionHandler,
) -> Result<()>
```

To the streamlined version:

```rust
pub async fn register_action(
    &self,
    action_path: &TopicPath,
    handler: ActionHandler,
) -> Result<()>
```

This change simplifies the API by:
- Removing the need to separate service path and action name
- Using a single TopicPath that already contains the action in its path
- Improving consistency with the get_action_handler method which also takes a single TopicPath

### Key Architectural Principles

// ... existing code ... 

## Internal Services Architecture

An important architectural improvement is to introduce the concept of "internal services" - special services that handle Node metadata, service information, and other system-level operations through the standard request interface.

### Registry Service

The current implementation exposes methods like `node.get_service_state()` to retrieve service state information. This approach has several drawbacks:

1. **Inconsistent API pattern**: Services are accessed through `request()` but service metadata through direct methods
2. **Limited extensibility**: Each new piece of information requires a new method 
3. **Method proliferation**: As more metadata is exposed, more methods are added
4. **Inconsistent access patterns**: Some information is accessed via service-specific methods, other via requests

Instead, we will implement an internal registry service that provides access to service metadata through the standard request interface:

```rust
// Current approach
let state = node.get_service_state("math").await;

// New approach
let response = node.request("internal/registry/services/math", ValueType::Null).await?;
let service_info = response.data.unwrap();  // Contains full service metadata including state
```

#### Registry Service Design

1. **Service Path**: `internal/registry`

2. **Available Actions**:
   - `services` - List all services with basic metadata
   - `services/{service_path}` - Get detailed information about a specific service
   - `services/{service_path}/state` - Get just the state of a service
   - `services/{service_path}/actions` - List actions of a service
   - `services/{service_path}/events` - List events of a service

3. **Implementation**:
   - Create a dedicated `RegistryService` that is automatically registered with the Node
   - Special initialization to avoid circular dependencies
   - Privileged access to Node internals
   - Standard service interface for requests

4. **Response Format**:
   - For service listing:
   ```json
   [
     {
       "name": "Math",
       "path": "math",
       "state": "Running",
       "version": "1.0.0"
     },
     {
       "name": "UserService",
       "path": "users",
       "state": "Running",
       "version": "1.2.1"
     }
   ]
   ```
   
   - For detailed service information:
   ```json
   {
     "name": "Math",
     "path": "math",
     "state": "Running",
     "version": "1.0.0",
     "actions": ["add", "subtract", "multiply"],
     "events": ["calculation_completed", "error_occurred"],
     "metadata": {
       "description": "Basic math operations",
       "author": "Runar Team"
     },
     "started_at": "2023-06-10T15:30:45Z",
     "uptime_seconds": 3600
   }
   ```

#### Benefits

1. **Consistent API pattern**: All service and metadata access through the same `request()` interface
2. **Extensibility**: Additional metadata can be added without changing the API
3. **Standard request/response format**: Uses the same format as other service responses
4. **Improved testability**: Can test registry access through the same service testing patterns
5. **Enhanced security**: Future permission models can be applied consistently

#### Implementation Steps

1. Create the `RegistryService` struct implementing `AbstractService`
2. Add special handling in Node to register this service automatically
3. Implement actions to retrieve service information from Node's state
4. Update tests to use this new pattern
5. Maintain the direct methods temporarily for backward compatibility 
6. Add test coverage for registry service

This approach better aligns with the architectural principles of the system, treating service metadata as a first-class concept that is accessible through the standard service interface.

#### Example Implementation

Here's a skeleton of how the `RegistryService` could be implemented:

```rust
use anyhow::Result;
use async_trait::async_trait;
use std::sync::Arc;

use crate::node::Node;
use crate::services::abstract_service::{AbstractService, ServiceState};
use crate::services::{LifecycleContext, RequestContext, ServiceResponse};
use runar_common::types::ValueType;

/// Internal service for accessing registry information
pub struct RegistryService {
    /// Reference to the Node - needed to access service information
    node: Arc<Node>,
    
    /// Service name
    name: String,
    
    /// Service path
    path: String,
}

impl RegistryService {
    /// Create a new registry service
    pub fn new(node: Arc<Node>) -> Self {
        Self {
            node,
            name: "Registry".to_string(),
            path: "internal/registry".to_string(),
        }
    }
    
    /// Handle request for listing all services
    async fn handle_list_services(&self, _params: Option<ValueType>, _context: RequestContext) -> Result<ServiceResponse> {
        // Get all services from the node
        let services = self.node.list_services();
        let states = self.node.get_all_service_states().await;
        
        // Build response data
        let mut services_data = Vec::new();
        for service_path in services {
            let state = states.get(&service_path).cloned();
            
            // Create a map for this service
            let mut service_data = std::collections::HashMap::new();
            service_data.insert("path".to_string(), ValueType::String(service_path.clone()));
            
            // Add state if available
            if let Some(state) = state {
                service_data.insert("state".to_string(), ValueType::String(format!("{:?}", state)));
            }
            
            services_data.push(ValueType::Map(service_data));
        }
        
        Ok(ServiceResponse::ok(ValueType::Array(services_data)))
    }
    
    /// Handle request for specific service information
    async fn handle_service_info(&self, service_path: &str, _params: Option<ValueType>, _context: RequestContext) -> Result<ServiceResponse> {
        // Get service state
        let state = self.node.get_service_state(service_path).await;
        
        // Check if service exists
        if !self.node.list_services().contains(&service_path.to_string()) {
            return Ok(ServiceResponse::error(404, &format!("Service '{}' not found", service_path)));
        }
        
        // Create response data
        let mut service_data = std::collections::HashMap::new();
        service_data.insert("path".to_string(), ValueType::String(service_path.to_string()));
        
        // Add state if available
        if let Some(state) = state {
            service_data.insert("state".to_string(), ValueType::String(format!("{:?}", state)));
        }
        
        // TODO: Add more service metadata (actions, events, etc.)
        
        Ok(ServiceResponse::ok(ValueType::Map(service_data)))
    }
}

#[async_trait]
impl AbstractService for RegistryService {
    /// Get the service name
    fn name(&self) -> &str {
        &self.name
    }
    
    /// Get the service path
    fn path(&self) -> &str {
        &self.path
    }
    
    /// Initialize the service
    async fn init(&self, context: LifecycleContext) -> Result<()> {
        // Register actions for accessing registry information
        context.register_action("services", 
            Box::new(|params, ctx| Box::pin(self.handle_list_services(params, ctx))))
            .await?;
        
        // Register pattern-based action for service info
        context.register_action_pattern("services/{service_path}", 
            Box::new(|params, ctx, path_params| {
                let service_path = path_params.get("service_path").unwrap_or_default();
                Box::pin(self.handle_service_info(service_path, params, ctx))
            }))
            .await?;
        
        // Register more specific actions
        context.register_action_pattern("services/{service_path}/state",
            Box::new(|params, ctx, path_params| {
                let service_path = path_params.get("service_path").unwrap_or_default();
                Box::pin(async move {
                    // Get service state only
                    let state = self.node.get_service_state(service_path).await;
                    match state {
                        Some(state) => Ok(ServiceResponse::ok(ValueType::String(format!("{:?}", state)))),
                        None => Ok(ServiceResponse::error(404, &format!("Service '{}' not found", service_path))),
                    }
                })
            }))
            .await?;
        
        Ok(())
    }
    
    /// Start the service
    async fn start(&self, _context: LifecycleContext) -> Result<()> {
        // Nothing to do on start - registry service is always ready
        Ok(())
    }
    
    /// Stop the service
    async fn stop(&self, _context: LifecycleContext) -> Result<()> {
        // Nothing to clean up
        Ok(())
    }
}

#### Integration with Node

To automatically register the registry service with the Node, we need to add special handling:

```rust
impl Node {
    /// Initialize internal services
    async fn init_internal_services(&mut self) -> Result<()> {
        // Create a registry service with a reference to this node
        let node_arc = Arc::new(self.clone());
        let registry_service = RegistryService::new(node_arc);
        
        // Add the registry service to the node
        self.add_service(registry_service).await?;
        
        Ok(())
    }
    
    /// Create a new Node with the given configuration
    pub async fn new(config: NodeConfig) -> Result<Self> {
        // ... existing initialization code ...
        
        // Create a new node instance
        let mut node = Self {
            // ... existing fields ...
        };
        
        // Initialize internal services
        node.init_internal_services().await?;
        
        // Return the new node
        Ok(node)
    }
}
```

#### Action Pattern Matching

The example introduces a new concept: action pattern matching. This allows registering handlers for URL-like patterns with path parameters:

```rust
// Register an action with path parameters
context.register_action_pattern("services/{service_path}/state", handler).await?;
```

This would require extending the `LifecycleContext` with a new registration method:

```rust
impl LifecycleContext {
    /// Register an action handler with pattern matching
    pub async fn register_action_pattern<F, Fut>(
        &self,
        pattern: &str,
        handler: F,
    ) -> Result<()>
    where
        F: Fn(Option<ValueType>, RequestContext, std::collections::HashMap<String, String>) -> Fut + Send + Sync + 'static,
        Fut: Future<Output = Result<ServiceResponse>> + Send + 'static,
    {
        // Implementation would parse patterns like "services/{service_path}/state"
        // and extract path parameters when matching requests
        // ...
    }
}
```

This pattern matching capability would be a significant enhancement to the action registration system, allowing for more RESTful API designs.

## Progress Tracking

- [x] Simplify service lookup with TopicPath
- [x] Implement request handling in Node
- [x] Implement publishing in Node
- [x] Create LifecycleContext with proper logging
- [x] Add documentation warnings to handle_request and publish in ServiceRegistry
- [x] Add clear test INTENTION documentation
- [x] Refactor constructors using the builder pattern
- [x] Remove deprecated constructor methods
- [x] Remove `handle_request` from ServiceRegistry
- [x] Remove `publish` from ServiceRegistry
- [x] Update AbstractService to use action registration instead of handler methods
- [x] Fix context handling
- [x] Enhance TopicPath usage
- [x] Implement CompleteServiceMetadata to track service state and metadata centrally
- [x] Remove ServiceMetadata dependency from services, using direct AbstractService methods
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

- [ ] Implement internal registry service for accessing service metadata
- [ ] Implement publish_with_options
- [ ] Implement EventContext for callbacks
- [ ] Implement metrics system
- [ ] Complete API cleanup for consistency

## Testing Strategy

- Create comprehensive unit tests for core registry functions
- Test with real services and real Node instances
- Verify event flow from publishing to receiving
- Test both request and event paths
- Ensure consistent behavior across different path formats
- Ensure each test has clear INTENTION documentation
- Each test should have a single responsibility and test only what the component is responsible for

## Next Steps

The immediate next steps are:

1. ✅ Fix action handler registration/lookup with respect to registry cloning (COMPLETED)
2. ✅ Fix NodeDelegate trait implementation (COMPLETED)
3. ✅ Remove redundant NodeRequestHandler trait (COMPLETED)
4. ✅ Fix non-blocking list_services implementation (COMPLETED)
5. ✅ Implement Node.start() and Node.stop() lifecycle methods (COMPLETED)
6. ✅ Implement lifecycle state tracking (COMPLETED)
7. Implement internal registry service for accessing service metadata
8. Implement EventContext to pass to callbacks
9. Implement the metrics collection framework in Node
10. Create the publish_with_options method with configurable delivery options

All the unit tests for basic functionality are now passing, which marks significant progress in the refactoring plan. The implementation of Node.start() and Node.stop() lifecycle methods along with proper state tracking represents a key milestone in the Node's capability to properly manage service lifecycles. 

The next focus is on implementing the internal registry service to provide a consistent API pattern for accessing service metadata. This will eliminate the need for direct methods like get_service_state() and align with the architectural principle of using the standard request interface for all service interactions. After that, work will continue on enhancing the event system and implementing metrics collection.

## ServiceRegistry API Changes

### 1. Action Registration API Change

The `register_action` method signature has been updated from:

```rust
pub async fn register_action(
    &self,
    topic_path: &TopicPath,
    action_name: &str,
    handler: ActionHandler,
) -> Result<()>
```

To the streamlined version:

```rust
pub async fn register_action(
    &self,
    action_path: &TopicPath,
    handler: ActionHandler,
) -> Result<()>
```

This change simplifies the API by:
- Removing the need to separate service path and action name
- Using a single TopicPath that already contains the action in its path
- Improving consistency with the get_action_handler method which also takes a single TopicPath

### Key Architectural Principles

// ... existing code ... 

## Internal Services Architecture

An important architectural improvement is to introduce the concept of "internal services" - special services that handle Node metadata, service information, and other system-level operations through the standard request interface.

### Registry Service

The current implementation exposes methods like `node.get_service_state()` to retrieve service state information. This approach has several drawbacks:

1. **Inconsistent API pattern**: Services are accessed through `request()` but service metadata through direct methods
2. **Limited extensibility**: Each new piece of information requires a new method 
3. **Method proliferation**: As more metadata is exposed, more methods are added
4. **Inconsistent access patterns**: Some information is accessed via service-specific methods, other via requests

Instead, we will implement an internal registry service that provides access to service metadata through the standard request interface:

```rust
// Current approach
let state = node.get_service_state("math").await;

// New approach
let response = node.request("internal/registry/services/math", ValueType::Null).await?;
let service_info = response.data.unwrap();  // Contains full service metadata including state
```

#### Registry Service Design

1. **Service Path**: `internal/registry`

2. **Available Actions**:
   - `services` - List all services with basic metadata
   - `services/{service_path}` - Get detailed information about a specific service
   - `services/{service_path}/state` - Get just the state of a service
   - `services/{service_path}/actions` - List actions of a service
   - `services/{service_path}/events` - List events of a service

3. **Implementation**:
   - Create a dedicated `RegistryService` that is automatically registered with the Node
   - Special initialization to avoid circular dependencies
   - Privileged access to Node internals
   - Standard service interface for requests

4. **Response Format**:
   - For service listing:
   ```json
   [
     {
       "name": "Math",
       "path": "math",
       "state": "Running",
       "version": "1.0.0"
     },
     {
       "name": "UserService",
       "path": "users",
       "state": "Running",
       "version": "1.2.1"
     }
   ]
   ```
   
   - For detailed service information:
   ```json
   {
     "name": "Math",
     "path": "math",
     "state": "Running",
     "version": "1.0.0",
     "actions": ["add", "subtract", "multiply"],
     "events": ["calculation_completed", "error_occurred"],
     "metadata": {
       "description": "Basic math operations",
       "author": "Runar Team"
     },
     "started_at": "2023-06-10T15:30:45Z",
     "uptime_seconds": 3600
   }
   ```

#### Benefits

1. **Consistent API pattern**: All service and metadata access through the same `request()` interface
2. **Extensibility**: Additional metadata can be added without changing the API
3. **Standard request/response format**: Uses the same format as other service responses
4. **Improved testability**: Can test registry access through the same service testing patterns
5. **Enhanced security**: Future permission models can be applied consistently

#### Implementation Steps

1. Create the `RegistryService` struct implementing `AbstractService`
2. Add special handling in Node to register this service automatically
3. Implement actions to retrieve service information from Node's state
4. Update tests to use this new pattern
5. Maintain the direct methods temporarily for backward compatibility 
6. Add test coverage for registry service

This approach better aligns with the architectural principles of the system, treating service metadata as a first-class concept that is accessible through the standard service interface.

#### Example Implementation

Here's a skeleton of how the `RegistryService` could be implemented:

```rust
use anyhow::Result;
use async_trait::async_trait;
use std::sync::Arc;

use crate::node::Node;
use crate::services::abstract_service::{AbstractService, ServiceState};
use crate::services::{LifecycleContext, RequestContext, ServiceResponse};
use runar_common::types::ValueType;

/// Internal service for accessing registry information
pub struct RegistryService {
    /// Reference to the Node - needed to access service information
    node: Arc<Node>,
    
    /// Service name
    name: String,
    
    /// Service path
    path: String,
}

impl RegistryService {
    /// Create a new registry service
    pub fn new(node: Arc<Node>) -> Self {
        Self {
            node,
            name: "Registry".to_string(),
            path: "internal/registry".to_string(),
        }
    }
    
    /// Handle request for listing all services
    async fn handle_list_services(&self, _params: Option<ValueType>, _context: RequestContext) -> Result<ServiceResponse> {
        // Get all services from the node
        let services = self.node.list_services();
        let states = self.node.get_all_service_states().await;
        
        // Build response data
        let mut services_data = Vec::new();
        for service_path in services {
            let state = states.get(&service_path).cloned();
            
            // Create a map for this service
            let mut service_data = std::collections::HashMap::new();
            service_data.insert("path".to_string(), ValueType::String(service_path.clone()));
            
            // Add state if available
            if let Some(state) = state {
                service_data.insert("state".to_string(), ValueType::String(format!("{:?}", state)));
            }
            
            services_data.push(ValueType::Map(service_data));
        }
        
        Ok(ServiceResponse::ok(ValueType::Array(services_data)))
    }
    
    /// Handle request for specific service information
    async fn handle_service_info(&self, service_path: &str, _params: Option<ValueType>, _context: RequestContext) -> Result<ServiceResponse> {
        // Get service state
        let state = self.node.get_service_state(service_path).await;
        
        // Check if service exists
        if !self.node.list_services().contains(&service_path.to_string()) {
            return Ok(ServiceResponse::error(404, &format!("Service '{}' not found", service_path)));
        }
        
        // Create response data
        let mut service_data = std::collections::HashMap::new();
        service_data.insert("path".to_string(), ValueType::String(service_path.to_string()));
        
        // Add state if available
        if let Some(state) = state {
            service_data.insert("state".to_string(), ValueType::String(format!("{:?}", state)));
        }
        
        // TODO: Add more service metadata (actions, events, etc.)
        
        Ok(ServiceResponse::ok(ValueType::Map(service_data)))
    }
}

#[async_trait]
impl AbstractService for RegistryService {
    /// Get the service name
    fn name(&self) -> &str {
        &self.name
    }
    
    /// Get the service path
    fn path(&self) -> &str {
        &self.path
    }
    
    /// Initialize the service
    async fn init(&self, context: LifecycleContext) -> Result<()> {
        // Register actions for accessing registry information
        context.register_action("services", 
            Box::new(|params, ctx| Box::pin(self.handle_list_services(params, ctx))))
            .await?;
        
        // Register pattern-based action for service info
        context.register_action_pattern("services/{service_path}", 
            Box::new(|params, ctx, path_params| {
                let service_path = path_params.get("service_path").unwrap_or_default();
                Box::pin(self.handle_service_info(service_path, params, ctx))
            }))
            .await?;
        
        // Register more specific actions
        context.register_action_pattern("services/{service_path}/state",
            Box::new(|params, ctx, path_params| {
                let service_path = path_params.get("service_path").unwrap_or_default();
                Box::pin(async move {
                    // Get service state only
                    let state = self.node.get_service_state(service_path).await;
                    match state {
                        Some(state) => Ok(ServiceResponse::ok(ValueType::String(format!("{:?}", state)))),
                        None => Ok(ServiceResponse::error(404, &format!("Service '{}' not found", service_path))),
                    }
                })
            }))
            .await?;
        
        Ok(())
    }
    
    /// Start the service
    async fn start(&self, _context: LifecycleContext) -> Result<()> {
        // Nothing to do on start - registry service is always ready
        Ok(())
    }
    
    /// Stop the service
    async fn stop(&self, _context: LifecycleContext) -> Result<()> {
        // Nothing to clean up
        Ok(())
    }
}

#### Integration with Node

To automatically register the registry service with the Node, we need to add special handling:

```rust
impl Node {
    /// Initialize internal services
    async fn init_internal_services(&mut self) -> Result<()> {
        // Create a registry service with a reference to this node
        let node_arc = Arc::new(self.clone());
        let registry_service = RegistryService::new(node_arc);
        
        // Add the registry service to the node
        self.add_service(registry_service).await?;
        
        Ok(())
    }
    
    /// Create a new Node with the given configuration
    pub async fn new(config: NodeConfig) -> Result<Self> {
        // ... existing initialization code ...
        
        // Create a new node instance
        let mut node = Self {
            // ... existing fields ...
        };
        
        // Initialize internal services
        node.init_internal_services().await?;
        
        // Return the new node
        Ok(node)
    }
}
```

#### Action Pattern Matching

The example introduces a new concept: action pattern matching. This allows registering handlers for URL-like patterns with path parameters:

```rust
// Register an action with path parameters
context.register_action_pattern("services/{service_path}/state", handler).await?;
```

This would require extending the `LifecycleContext` with a new registration method:

```rust
impl LifecycleContext {
    /// Register an action handler with pattern matching
    pub async fn register_action_pattern<F, Fut>(
        &self,
        pattern: &str,
        handler: F,
    ) -> Result<()>
    where
        F: Fn(Option<ValueType>, RequestContext, std::collections::HashMap<String, String>) -> Fut + Send + Sync + 'static,
        Fut: Future<Output = Result<ServiceResponse>> + Send + 'static,
    {
        // Implementation would parse patterns like "services/{service_path}/state"
        // and extract path parameters when matching requests
        // ...
    }
}
```

This pattern matching capability would be a significant enhancement to the action registration system, allowing for more RESTful API designs.

## Progress Tracking

- [x] Simplify service lookup with TopicPath
- [x] Implement request handling in Node
- [x] Implement publishing in Node
- [x] Create LifecycleContext with proper logging
- [x] Add documentation warnings to handle_request and publish in ServiceRegistry
- [x] Add clear test INTENTION documentation
- [x] Refactor constructors using the builder pattern
- [x] Remove deprecated constructor methods
- [x] Remove `handle_request` from ServiceRegistry
- [x] Remove `publish` from ServiceRegistry
- [x] Update AbstractService to use action registration instead of handler methods
- [x] Fix context handling
- [x] Enhance TopicPath usage
- [x] Implement CompleteServiceMetadata to track service state and metadata centrally
- [x] Remove ServiceMetadata dependency from services, using direct AbstractService methods
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

- [ ] Implement internal registry service for accessing service metadata
- [ ] Implement publish_with_options
- [ ] Implement EventContext for callbacks
- [ ] Implement metrics system
- [ ] Complete API cleanup for consistency

## Testing Strategy

- Create comprehensive unit tests for core registry functions
- Test with real services and real Node instances
- Verify event flow from publishing to receiving
- Test both request and event paths
- Ensure consistent behavior across different path formats
- Ensure each test has clear INTENTION documentation
- Each test should have a single responsibility and test only what the component is responsible for

## Next Steps

The immediate next steps are:

1. ✅ Fix action handler registration/lookup with respect to registry cloning (COMPLETED)
2. ✅ Fix NodeDelegate trait implementation (COMPLETED)
3. ✅ Remove redundant NodeRequestHandler trait (COMPLETED)
4. ✅ Fix non-blocking list_services implementation (COMPLETED)
5. ✅ Implement Node.start() and Node.stop() lifecycle methods (COMPLETED)
6. ✅ Implement lifecycle state tracking (COMPLETED)
7. Implement internal registry service for accessing service metadata
8. Implement EventContext to pass to callbacks
9. Implement the metrics collection framework in Node
10. Create the publish_with_options method with configurable delivery options

All the unit tests for basic functionality are now passing, which marks significant progress in the refactoring plan. The implementation of Node.start() and Node.stop() lifecycle methods along with proper state tracking represents a key milestone in the Node's capability to properly manage service lifecycles. 

The next focus is on implementing the internal registry service to provide a consistent API pattern for accessing service metadata. This will eliminate the need for direct methods like get_service_state() and align with the architectural principle of using the standard request interface for all service interactions. After that, work will continue on enhancing the event system and implementing metrics collection.

## ServiceRegistry API Changes

### 1. Action Registration API Change

The `register_action` method signature has been updated from:

```rust
pub async fn register_action(
    &self,
    topic_path: &TopicPath,
    action_name: &str,
    handler: ActionHandler,
) -> Result<()>
```

To the streamlined version:

```rust
pub async fn register_action(
    &self,
    action_path: &TopicPath,
    handler: ActionHandler,
) -> Result<()>
```

This change simplifies the API by:
- Removing the need to separate service path and action name
- Using a single TopicPath that already contains the action in its path
- Improving consistency with the get_action_handler method which also takes a single TopicPath

### Key Architectural Principles

// ... existing code ... 

## Internal Services Architecture

An important architectural improvement is to introduce the concept of "internal services" - special services that handle Node metadata, service information, and other system-level operations through the standard request interface.

### Registry Service

The current implementation exposes methods like `node.get_service_state()` to retrieve service state information. This approach has several drawbacks:

1. **Inconsistent API pattern**: Services are accessed through `request()` but service metadata through direct methods
2. **Limited extensibility**: Each new piece of information requires a new method 
3. **Method proliferation**: As more metadata is exposed, more methods are added
4. **Inconsistent access patterns**: Some information is accessed via service-specific methods, other via requests

Instead, we will implement an internal registry service that provides access to service metadata through the standard request interface:

```rust
// Current approach
let state = node.get_service_state("math").await;

// New approach
let response = node.request("internal/registry/services/math", ValueType::Null).await?;
let service_info = response.data.unwrap();  // Contains full service metadata including state
```

#### Registry Service Design

1. **Service Path**: `internal/registry`

2. **Available Actions**:
   - `services` - List all services with basic metadata
   - `services/{service_path}` - Get detailed information about a specific service
   - `services/{service_path}/state` - Get just the state of a service
   - `services/{service_path}/actions` - List actions of a service
   - `services/{service_path}/events` - List events of a service

3. **Implementation**:
   - Create a dedicated `RegistryService` that is automatically registered with the Node
   - Special initialization to avoid circular dependencies
   - Privileged access to Node internals
   - Standard service interface for requests

4. **Response Format**:
   - For service listing:
   ```json
   [
     {
       "name": "Math",
       "path": "math",
       "state": "Running",
       "version": "1.0.0"
     },
     {
       "name": "UserService",
       "path": "users",
       "state": "Running",
       "version": "1.2.1"
     }
   ]
   ```
   
   - For detailed service information:
   ```json
   {
     "name": "Math",
     "path": "math",
     "state": "Running",
     "version": "1.0.0",
     "actions": ["add", "subtract", "multiply"],
     "events": ["calculation_completed", "error_occurred"],
     "metadata": {
       "description": "Basic math operations",
       "author": "Runar Team"
     },
     "started_at": "2023-06-10T15:30:45Z",
     "uptime_seconds": 3600
   }
   ```

#### Benefits

1. **Consistent API pattern**: All service and metadata access through the same `request()` interface
2. **Extensibility**: Additional metadata can be added without changing the API
3. **Standard request/response format**: Uses the same format as other service responses
4. **Improved testability**: Can test registry access through the same service testing patterns
5. **Enhanced security**: Future permission models can be applied consistently

#### Implementation Steps

1. Create the `RegistryService` struct implementing `AbstractService`
2. Add special handling in Node to register this service automatically
3. Implement actions to retrieve service information from Node's state
4. Update tests to use this new pattern
5. Maintain the direct methods temporarily for backward compatibility 
6. Add test coverage for registry service

This approach better aligns with the architectural principles of the system, treating service metadata as a first-class concept that is accessible through the standard service interface.

#### Example Implementation

Here's a skeleton of how the `RegistryService` could be implemented:

```rust
use anyhow::Result;
use async_trait::async_trait;
use std::sync::Arc;

use crate::node::Node;
use crate::services::abstract_service::{AbstractService, ServiceState};
use crate::services::{LifecycleContext, RequestContext, ServiceResponse};
use runar_common::types::ValueType;

/// Internal service for accessing registry information
pub struct RegistryService {
    /// Reference to the Node - needed to access service information
    node: Arc<Node>,
    
    /// Service name
    name: String,
    
    /// Service path
    path: String,
}

impl RegistryService {
    /// Create a new registry service
    pub fn new(node: Arc<Node>) -> Self {
        Self {
            node,
            name: "Registry".to_string(),
            path: "internal/registry".to_string(),
        }
    }
    
    /// Handle request for listing all services
    async fn handle_list_services(&self, _params: Option<ValueType>, _context: RequestContext) -> Result<ServiceResponse> {
        // Get all services from the node
        let services = self.node.list_services();
        let states = self.node.get_all_service_states().await;
        
        // Build response data
        let mut services_data = Vec::new();
        for service_path in services {
            let state = states.get(&service_path).cloned();
            
            // Create a map for this service
            let mut service_data = std::collections::HashMap::new();
            service_data.insert("path".to_string(), ValueType::String(service_path.clone()));
            
            // Add state if available
            if let Some(state) = state {
                service_data.insert("state".to_string(), ValueType::String(format!("{:?}", state)));
            }
            
            services_data.push(ValueType::Map(service_data));
        }
        
        Ok(ServiceResponse::ok(ValueType::Array(services_data)))
    }
    
    /// Handle request for specific service information
    async fn handle_service_info(&self, service_path: &str, _params: Option<ValueType>, _context: RequestContext) -> Result<ServiceResponse> {
        // Get service state
        let state = self.node.get_service_state(service_path).await;
        
        // Check if service exists
        if !self.node.list_services().contains(&service_path.to_string()) {
            return Ok(ServiceResponse::error(404, &format!("Service '{}' not found", service_path)));
        }
        
        // Create response data
        let mut service_data = std::collections::HashMap::new();
        service_data.insert("path".to_string(), ValueType::String(service_path.to_string()));
        
        // Add state if available
        if let Some(state) = state {
            service_data.insert("state".to_string(), ValueType::String(format!("{:?}", state)));
        }
        
        // TODO: Add more service metadata (actions, events, etc.)
        
        Ok(ServiceResponse::ok(ValueType::Map(service_data)))
    }
}

#[async_trait]
impl AbstractService for RegistryService {
    /// Get the service name
    fn name(&self) -> &str {
        &self.name
    }
    
    /// Get the service path
    fn path(&self) -> &str {
        &self.path
    }
    
    /// Initialize the service
    async fn init(&self, context: LifecycleContext) -> Result<()> {
        // Register actions for accessing registry information
        context.register_action("services", 
            Box::new(|params, ctx| Box::pin(self.handle_list_services(params, ctx))))
            .await?;
        
        // Register pattern-based action for service info
        context.register_action_pattern("services/{service_path}", 
            Box::new(|params, ctx, path_params| {
                let service_path = path_params.get("service_path").unwrap_or_default();
                Box::pin(self.handle_service_info(service_path, params, ctx))
            }))
            .await?;
        
        // Register more specific actions
        context.register_action_pattern("services/{service_path}/state",
            Box::new(|params, ctx, path_params| {
                let service_path = path_params.get("service_path").unwrap_or_default();
                Box::pin(async move {
                    // Get service state only
                    let state = self.node.get_service_state(service_path).await;
                    match state {
                        Some(state) => Ok(ServiceResponse::ok(ValueType::String(format!("{:?}", state)))),
                        None => Ok(ServiceResponse::error(404, &format!("Service '{}' not found", service_path))),
                    }
                })
            }))
            .await?;
        
        Ok(())
    }
    
    /// Start the service
    async fn start(&self, _context: LifecycleContext) -> Result<()> {
        // Nothing to do on start - registry service is always ready
        Ok(())
    }
    
    /// Stop the service
    async fn stop(&self, _context: LifecycleContext) -> Result<()> {
        // Nothing to clean up
        Ok(())
    }
}

#### Integration with Node

To automatically register the registry service with the Node, we need to add special handling:

```rust
impl Node {
    /// Initialize internal services
    async fn init_internal_services(&mut self) -> Result<()> {
        // Create a registry service with a reference to this node
        let node_arc = Arc::new(self.clone());
        let registry_service = RegistryService::new(node_arc);
        
        // Add the registry service to the node
        self.add_service(registry_service).await?;
        
        Ok(())
    }
    
    /// Create a new Node with the given configuration
    pub async fn new(config: NodeConfig) -> Result<Self> {
        // ... existing initialization code ...
        
        // Create a new node instance
        let mut node = Self {
            // ... existing fields ...
        };
        
        // Initialize internal services
        node.init_internal_services().await?;
        
        // Return the new node
        Ok(node)
    }
}
```

#### Action Pattern Matching

The example introduces a new concept: action pattern matching. This allows registering handlers for URL-like patterns with path parameters:

```rust
// Register an action with path parameters
context.register_action_pattern("services/{service_path}/state", handler).await?;
```

This would require extending the `LifecycleContext` with a new registration method:

```rust
impl LifecycleContext {
    /// Register an action handler with pattern matching
    pub async fn register_action_pattern<F, Fut>(
        &self,
        pattern: &str,
        handler: F,
    ) -> Result<()>
    where
        F: Fn(Option<ValueType>, RequestContext, std::collections::HashMap<String, String>) -> Fut + Send + Sync + 'static,
        Fut: Future<Output = Result<ServiceResponse>> + Send + 'static,
    {
        // Implementation would parse patterns like "services/{service_path}/state"
        // and extract path parameters when matching requests
        // ...
    }
}
```

This pattern matching capability would be a significant enhancement to the action registration system, allowing for more RESTful API designs.

## Progress Tracking

- [x] Simplify service lookup with TopicPath
- [x] Implement request handling in Node
- [x] Implement publishing in Node
- [x] Create LifecycleContext with proper logging
- [x] Add documentation warnings to handle_request and publish in ServiceRegistry
- [x] Add clear test INTENTION documentation
- [x] Refactor constructors using the builder pattern
- [x] Remove deprecated constructor methods
- [x] Remove `handle_request` from ServiceRegistry
- [x] Remove `publish` from ServiceRegistry
- [x] Update AbstractService to use action registration instead of handler methods
- [x] Fix context handling
- [x] Enhance TopicPath usage
- [x] Implement CompleteServiceMetadata to track service state and metadata centrally
- [x] Remove ServiceMetadata dependency from services, using direct AbstractService methods
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

- [ ] Implement internal registry service for accessing service metadata
- [ ] Implement publish_with_options
- [ ] Implement EventContext for callbacks
- [ ] Implement metrics system
- [ ] Complete API cleanup for consistency

## Testing Strategy

- Create comprehensive unit tests for core registry functions
- Test with real services and real Node instances
- Verify event flow from publishing to receiving
- Test both request and event paths
- Ensure consistent behavior across different path formats
- Ensure each test has clear INTENTION documentation
- Each test should have a single responsibility and test only what the component is responsible for

## Next Steps

The immediate next steps are:

1. ✅ Fix action handler registration/lookup with respect to registry cloning (COMPLETED)
2. ✅ Fix NodeDelegate trait implementation (COMPLETED)
3. ✅ Remove redundant NodeRequestHandler trait (COMPLETED)
4. ✅ Fix non-blocking list_services implementation (COMPLETED)
5. ✅ Implement Node.start() and Node.stop() lifecycle methods (COMPLETED)
6. ✅ Implement lifecycle state tracking (COMPLETED)
7. Implement internal registry service for accessing service metadata
8. Implement EventContext to pass to callbacks
9. Implement the metrics collection framework in Node
10. Create the publish_with_options method with configurable delivery options

All the unit tests for basic functionality are now passing, which marks significant progress in the refactoring plan. The implementation of Node.start() and Node.stop() lifecycle methods along with proper state tracking represents a key milestone in the Node's capability to properly manage service lifecycles. 

The next focus is on implementing the internal registry service to provide a consistent API pattern for accessing service metadata. This will eliminate the need for direct methods like get_service_state() and align with the architectural principle of using the standard request interface for all service interactions. After that, work will continue on enhancing the event system and implementing metrics collection.

## ServiceRegistry API Changes

### 1. Action Registration API Change

The `register_action` method signature has been updated from:

```rust
pub async fn register_action(
    &self,
    topic_path: &TopicPath,
    action_name: &str,
    handler: ActionHandler,
) -> Result<()>
```

To the streamlined version:

```rust
pub async fn register_action(
    &self,
    action_path: &TopicPath,
    handler: ActionHandler,
) -> Result<()>
```

This change simplifies the API by:
- Removing the need to separate service path and action name
- Using a single TopicPath that already contains the action in its path
- Improving consistency with the get_action_handler method which also takes a single TopicPath

### Key Architectural Principles

// ... existing code ... 

## Internal Services Architecture

An important architectural improvement is to introduce the concept of "internal services" - special services that handle Node metadata, service information, and other system-level operations through the standard request interface.

### Registry Service

The current implementation exposes methods like `node.get_service_state()` to retrieve service state information. This approach has several drawbacks:

1. **Inconsistent API pattern**: Services are accessed through `request()` but service metadata through direct methods
2. **Limited extensibility**: Each new piece of information requires a new method 
3. **Method proliferation**: As more metadata is exposed, more methods are added
4. **Inconsistent access patterns**: Some information is accessed via service-specific methods, other via requests

Instead, we will implement an internal registry service that provides access to service metadata through the standard request interface:

```rust
// Current approach
let state = node.get_service_state("math").await;

// New approach
let response = node.request("internal/registry/services/math", ValueType::Null).await?;
let service_info = response.data.unwrap();  // Contains full service metadata including state
```

#### Registry Service Design

1. **Service Path**: `internal/registry`

2. **Available Actions**:
   - `services` - List all services with basic metadata
   - `services/{service_path}` - Get detailed information about a specific service
   - `services/{service_path}/state` - Get just the state of a service
   - `services/{service_path}/actions` - List actions of a service
   - `services/{service_path}/events` - List events of a service

3. **Implementation**:
   - Create a dedicated `RegistryService` that is automatically registered with the Node
   - Special initialization to avoid circular dependencies
   - Privileged access to Node internals
   - Standard service interface for requests

4. **Response Format**:
   - For service listing:
   ```json
   [
     {
       "name": "Math",
       "path": "math",
       "state": "Running",
       "version": "1.0.0"
     },
     {
       "name": "UserService",
       "path": "users",
       "state": "Running",
       "version": "1.2.1"
     }
   ]
   ```
   
   - For detailed service information:
   ```json
   {
     "name": "Math",
     "path": "math",
     "state": "Running",
     "version": "1.0.0",
     "actions": ["add", "subtract", "multiply"],
     "events": ["calculation_completed", "error_occurred"],
     "metadata": {
       "description": "Basic math operations",
       "author": "Runar Team"
     },
     "started_at": "2023-06-10T15:30:45Z",
     "uptime_seconds": 3600
   }
   ```

#### Benefits

1. **Consistent API pattern**: All service and metadata access through the same `request()` interface
2. **Extensibility**: Additional metadata can be added without changing the API
3. **Standard request/response format**: Uses the same format as other service responses
4. **Improved testability**: Can test registry access through the same service testing patterns
5. **Enhanced security**: Future permission models can be applied consistently

#### Implementation Steps

1. Create the `RegistryService` struct implementing `AbstractService`
2. Add special handling in Node to register this service automatically
3. Implement actions to retrieve service information from Node's state
4. Update tests to use this new pattern
5. Maintain the direct methods temporarily for backward compatibility 
6. Add test coverage for registry service

This approach better aligns with the architectural principles of the system, treating service metadata as a first-class concept that is accessible through the standard service interface.

#### Example Implementation

Here's a skeleton of how the `RegistryService` could be implemented:

```rust
use anyhow::Result;
use async_trait::async_trait;
use std::sync::Arc;

use crate::node::Node;
use crate::services::abstract_service::{AbstractService, ServiceState};
use crate::services::{LifecycleContext, RequestContext, ServiceResponse};
use runar_common::types::ValueType;

/// Internal service for accessing registry information
pub struct RegistryService {
    /// Reference to the Node - needed to access service information
    node: Arc<Node>,
    
    /// Service name
    name: String,
    
    /// Service path
    path: String,
}

impl RegistryService {
    /// Create a new registry service
    pub fn new(node: Arc<Node>) -> Self {
        Self {
            node,
            name: "Registry".to_string(),
            path: "internal/registry".to_string(),
        }
    }
    
    /// Handle request for listing all services
    async fn handle_list_services(&self, _params: Option<ValueType>, _context: RequestContext) -> Result<ServiceResponse> {
        // Get all services from the node
        let services = self.node.list_services();
        let states = self.node.get_all_service_states().await;
        
        // Build response data
        let mut services_data = Vec::new();
        for service_path in services {
            let state = states.get(&service_path).cloned();
            
            // Create a map for this service
            let mut service_data = std::collections::HashMap::new();
            service_data.insert("path".to_string(), ValueType::String(service_path.clone()));
            
            // Add state if available
            if let Some(state) = state {
                service_data.insert("state".to_string(), ValueType::String(format!("{:?}", state)));
            }
            
            services_data.push(ValueType::Map(service_data));
        }
        
        Ok(ServiceResponse::ok(ValueType::Array(services_data)))
    }
    
    /// Handle request for specific service information
    async fn handle_service_info(&self, service_path: &str, _params: Option<ValueType>, _context: RequestContext) -> Result<ServiceResponse> {
        // Get service state
        let state = self.node.get_service_state(service_path).await;
        
        // Check if service exists
        if !self.node.list_services().contains(&service_path.to_string()) {
            return Ok(ServiceResponse::error(404, &format!("Service '{}' not found", service_path)));
        }
        
        // Create response data
        let mut service_data = std::collections::HashMap::new();
        service_data.insert("path".to_string(), ValueType::String(service_path.to_string()));
        
        // Add state if available
        if let Some(state) = state {
            service_data.insert("state".to_string(), ValueType::String(format!("{:?}", state)));
        }
        
        // TODO: Add more service metadata (actions, events, etc.)
        
        Ok(ServiceResponse::ok(ValueType::Map(service_data)))
    }
}

#[async_trait]
impl AbstractService for RegistryService {
    /// Get the service name
    fn name(&self) -> &str {
        &self.name
    }
    
    /// Get the service path
    fn path(&self) -> &str {
        &self.path
    }
    
    /// Initialize the service
    async fn init(&self, context: LifecycleContext) -> Result<()> {
        // Register actions for accessing registry information
        context.register_action("services", 
            Box::new(|params, ctx| Box::pin(self.handle_list_services(params, ctx))))
            .await?;
        
        // Register pattern-based action for service info
        context.register_action_pattern("services/{service_path}", 
            Box::new(|params, ctx, path_params| {
                let service_path = path_params.get("service_path").unwrap_or_default();
                Box::pin(self.handle_service_info(service_path, params, ctx))
            }))
            .await?;
        
        // Register more specific actions
        context.register_action_pattern("services/{service_path}/state",
            Box::new(|params, ctx, path_params| {
                let service_path = path_params.get("service_path").unwrap_or_default();
                Box::pin(async move {
                    // Get service state only
                    let state = self.node.get_service_state(service_path).await;
                    match state {
                        Some(state) => Ok(ServiceResponse::ok(ValueType::String(format!("{:?}", state)))),
                        None => Ok(ServiceResponse::error(404, &format!("Service '{}' not found", service_path))),
                    }
                })
            }))
            .await?;
        
        Ok(())
    }
    
    /// Start the service
    async fn start(&self, _context: LifecycleContext) -> Result<()> {
        // Nothing to do on start - registry service is always ready
        Ok(())
    }
    
    /// Stop the service
    async fn stop(&self, _context: LifecycleContext) -> Result<()> {
        // Nothing to clean up
        Ok(())
    }
}

#### Integration with Node

To automatically register the registry service with the Node, we need to add special handling:

```rust
impl Node {
    /// Initialize internal services
    async fn init_internal_services(&mut self) -> Result<()> {
        // Create a registry service with a reference to this node
        let node_arc = Arc::new(self.clone());
        let registry_service = RegistryService::new(node_arc);
        
        // Add the registry service to the node
        self.add_service(registry_service).await?;
        
        Ok(())
    }
    
    /// Create a new Node with the given configuration
    pub async fn new(config: NodeConfig) -> Result<Self> {
        // ... existing initialization code ...
        
        // Create a new node instance
        let mut node = Self {
            // ... existing fields ...
        };
        
        // Initialize internal services
        node.init_internal_services().await?;
        
        // Return the new node
        Ok(node)
    }
}
```

#### Action Pattern Matching

The example introduces a new concept: action pattern matching. This allows registering handlers for URL-like patterns with path parameters:

```rust
// Register an action with path parameters
context.register_action_pattern("services/{service_path}/state", handler).await?;
```

This would require extending the `LifecycleContext` with a new registration method:

```rust
impl LifecycleContext {
    /// Register an action handler with pattern matching
    pub async fn register_action_pattern<F, Fut>(
        &self,
        pattern: &str,
        handler: F,
    ) -> Result<()>
    where
        F: Fn(Option<ValueType>, RequestContext, std::collections::HashMap<String, String>) -> Fut + Send + Sync + 'static,
        Fut: Future<Output = Result<ServiceResponse>> + Send + 'static,
    {
        // Implementation would parse patterns like "services/{service_path}/state"
        // and extract path parameters when matching requests
        // ...
    }
}
```

This pattern matching capability would be a significant enhancement to the action registration system, allowing for more RESTful API designs.

## Progress Tracking

- [x] Simplify service lookup with TopicPath
- [x] Implement request handling in Node
- [x] Implement publishing in Node
- [x] Create LifecycleContext with proper logging
- [x] Add documentation warnings to handle_request and publish in ServiceRegistry
- [x] Add clear test INTENTION documentation
- [x] Refactor constructors using the builder pattern
- [x] Remove deprecated constructor methods
- [x] Remove `handle_request` from ServiceRegistry
- [x] Remove `publish` from ServiceRegistry
- [x] Update AbstractService to use action registration instead of handler methods
- [x] Fix context handling
- [x] Enhance TopicPath usage
- [x] Implement CompleteServiceMetadata to track service state and metadata centrally
- [x] Remove ServiceMetadata dependency from services, using direct AbstractService methods
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

- [ ] Implement internal registry service for accessing service metadata
- [ ] Implement publish_with_options
- [ ] Implement EventContext for callbacks
- [ ] Implement metrics system
- [ ] Complete API cleanup for consistency

## Testing Strategy

- Create comprehensive unit tests for core registry functions
- Test with real services and real Node instances
- Verify event flow from publishing to receiving
- Test both request and event paths
- Ensure consistent behavior across different path formats
- Ensure each test has clear INTENTION documentation
- Each test should have a single responsibility and test only what the component is responsible for

## Next Steps

The immediate next steps are:

1. ✅ Fix action handler registration/lookup with respect to registry cloning (COMPLETED)
2. ✅ Fix NodeDelegate trait implementation (COMPLETED)
3. ✅ Remove redundant NodeRequestHandler trait (COMPLETED)
4. ✅ Fix non-blocking list_services implementation (COMPLETED)
5. ✅ Implement Node.start() and Node.stop() lifecycle methods (COMPLETED)
6. ✅ Implement lifecycle state tracking (COMPLETED)
7. Implement internal registry service for accessing service metadata
8. Implement EventContext to pass to callbacks
9. Implement the metrics collection framework in Node
10. Create the publish_with_options method with configurable delivery options

All the unit tests for basic functionality are now passing, which marks significant progress in the refactoring plan. The implementation of Node.start() and Node.stop() lifecycle methods along with proper state tracking represents a key milestone in the Node's capability to properly manage service lifecycles. 

The next focus is on implementing the internal registry service to provide a consistent API pattern for accessing service metadata. This will eliminate the need for direct methods like get_service_state() and align with the architectural principle of using the standard request interface for all service interactions. After that, work will continue on enhancing the event system and implementing metrics collection.

## ServiceRegistry API Changes

### 1. Action Registration API Change

The `register_action` method signature has been updated from:

```rust
pub async fn register_action(
    &self,
    topic_path: &TopicPath,
    action_name: &str,
    handler: ActionHandler,
) -> Result<()>
```

To the streamlined version:

```rust
pub async fn register_action(
    &self,
    action_path: &TopicPath,
    handler: ActionHandler,
) -> Result<()>
```

This change simplifies the API by:
- Removing the need to separate service path and action name
- Using a single TopicPath that already contains the action in its path
- Improving consistency with the get_action_handler method which also takes a single TopicPath

### Key Architectural Principles

// ... existing code ... 

## Internal Services Architecture

An important architectural improvement is to introduce the concept of "internal services" - special services that handle Node metadata, service information, and other system-level operations through the standard request interface.

### Registry Service

The current implementation exposes methods like `node.get_service_state()` to retrieve service state information. This approach has several drawbacks:

1. **Inconsistent API pattern**: Services are accessed through `request()` but service metadata through direct methods
2. **Limited extensibility**: Each new piece of information requires a new method 
3. **Method proliferation**: As more metadata is exposed, more methods are added
4. **Inconsistent access patterns**: Some information is accessed via service-specific methods, other via requests

Instead, we will implement an internal registry service that provides access to service metadata through the standard request interface:

```rust
// Current approach
let state = node.get_service_state("math").await;

// New approach
let response = node.request("internal/registry/services/math", ValueType::Null).await?;
let service_info = response.data.unwrap();  // Contains full service metadata including state
```

#### Registry Service Design

1. **Service Path**: `internal/registry`

2. **Available Actions**:
   - `services` - List all services with basic metadata
   - `services/{service_path}` - Get detailed information about a specific service
   - `services/{service_path}/state` - Get just the state of a service
   - `services/{service_path}/actions` - List actions of a service
   - `services/{service_path}/events` - List events of a service

3. **Implementation**:
   - Create a dedicated `RegistryService` that is automatically registered with the Node
   - Special initialization to avoid circular dependencies
   - Privileged access to Node internals
   - Standard service interface for requests

4. **Response Format**:
   - For service listing:
   ```json
   [
     {
       "name": "Math",
       "path": "math",
       "state": "Running",
       "version": "1.0.0"
     },
     {
       "name": "UserService",
       "path": "users",
       "state": "Running",
       "version": "1.2.1"
     }
   ]
   ```
   
   - For detailed service information:
   ```json
   {
     "name": "Math",
     "path": "math",
     "state": "Running",
     "version": "1.0.0",
     "actions": ["add", "subtract", "multiply"],
     "events": ["calculation_completed", "error_occurred"],
     "metadata": {
       "description": "Basic math operations",
       "author": "Runar Team"
     },
     "started_at": "2023-06-10T15:30:45Z",
     "uptime_seconds": 3600
   }
   ```

#### Benefits

1. **Consistent API pattern**: All service and metadata access through the same `request()` interface
2. **Extensibility**: Additional metadata can be added without changing the API
3. **Standard request/response format**: Uses the same format as other service responses
4. **Improved testability**: Can test registry access through the same service testing patterns
5. **Enhanced security**: Future permission models can be applied consistently

#### Implementation Steps

1. Create the `RegistryService` struct implementing `AbstractService`
2. Add special handling in Node to register this service automatically
3. Implement actions to retrieve service information from Node's state
4. Update tests to use this new pattern
5. Maintain the direct methods temporarily for backward compatibility 
6. Add test coverage for registry service

This approach better aligns with the architectural principles of the system, treating service metadata as a first-class concept that is accessible through the standard service interface.

#### Example Implementation

Here's a skeleton of how the `RegistryService` could be implemented:

```rust
use anyhow::Result;
use async_trait::async_trait;
use std::sync::Arc;

use crate::node::Node;
use crate::services::abstract_service::{AbstractService, ServiceState};
use crate::services::{LifecycleContext, RequestContext, ServiceResponse};
use runar_common::types::ValueType;

/// Internal service for accessing registry information
pub struct RegistryService {
    /// Reference to the Node - needed to access service information
    node: Arc<Node>,
    
    /// Service name
    name: String,
    
    /// Service path
    path: String,
}

impl RegistryService {
    /// Create a new registry service
    pub fn new(node: Arc<Node>) -> Self {
        Self {
            node,
            name: "Registry".to_string(),
            path: "internal/registry".to_string(),
        }
    }
    
    /// Handle request for listing all services
    async fn handle_list_services(&self, _params: Option<ValueType>, _context: RequestContext) -> Result<ServiceResponse> {
        // Get all services from the node
        let services = self.node.list_services();
        let states = self.node.get_all_service_states().await;
        
        // Build response data
        let mut services_data = Vec::new();
        for service_path in services {
            let state = states.get(&service_path).cloned();
            
            // Create a map for this service
            let mut service_data = std::collections::HashMap::new();
            service_data.insert("path".to_string(), ValueType::String(service_path.clone()));
            
            // Add state if available
            if let Some(state) = state {
                service_data.insert("state".to_string(), ValueType::String(format!("{:?}", state)));
            }
            
            services_data.push(ValueType::Map(service_data));
        }
        
        Ok(ServiceResponse::ok(ValueType::Array(services_data)))
    }
    
    /// Handle request for specific service information
    async fn handle_service_info(&self, service_path: &str, _params: Option<ValueType>, _context: RequestContext) -> Result<ServiceResponse> {
        // Get service state
        let state = self.node.get_service_state(service_path).await;
        
        // Check if service exists
        if !self.node.list_services().contains(&service_path.to_string()) {
            return Ok(ServiceResponse::error(404, &format!("Service '{}' not found", service_path)));
        }
        
        // Create response data
        let mut service_data = std::collections::HashMap::new();
        service_data.insert("path".to_string(), ValueType::String(service_path.to_string()));
        
        // Add state if available
        if let Some(state) = state {
            service_data.insert("state".to_string(), ValueType::String(format!("{:?}", state)));
        }
        
        // TODO: Add more service metadata (actions, events, etc.)
        
        Ok(ServiceResponse::ok(ValueType::Map(service_data)))
    }
}

#[async_trait]
impl AbstractService for RegistryService {
    /// Get the service name
    fn name(&self) -> &str {
        &self.name
    }
    
    /// Get the service path
    fn path(&self) -> &str {
        &self.path
    }
    
    /// Initialize the service
    async fn init(&self, context: LifecycleContext) -> Result<()> {
        // Register actions for accessing registry information
        context.register_action("services", 
            Box::new(|params, ctx| Box::pin(self.handle_list_services(params, ctx))))
            .await?;
        
        // Register pattern-based action for service info
        context.register_action_pattern("services/{service_path}", 
            Box::new(|params, ctx, path_params| {
                let service_path = path_params.get("service_path").unwrap_or_default();
                Box::pin(self.handle_service_info(service_path, params, ctx))
            }))
            .await?;
        
        // Register more specific actions
        context.register_action_pattern("services/{service_path}/state",
            Box::new(|params, ctx, path_params| {
                let service_path = path_params.get("service_path").unwrap_or_default();
                Box::pin(async move {
                    // Get service state only
                    let state = self.node.get_service_state(service_path).await;
                    match state {
                        Some(state) => Ok(ServiceResponse::ok(ValueType::String(format!("{:?}", state)))),
                        None => Ok(ServiceResponse::error(404, &format!("Service '{}' not found", service_path))),
                    }
                })
            }))
            .await?;
        
        Ok(())
    }
    
    /// Start the service
    async fn start(&self, _context: LifecycleContext) -> Result<()> {
        // Nothing to do on start - registry service is always ready
        Ok(())
    }
    
    /// Stop the service
    async fn stop(&self, _context: LifecycleContext) -> Result<()> {
        // Nothing to clean up
        Ok(())
    }
}

#### Integration with Node

To automatically register the registry service with the Node, we need to add special handling:

```rust
impl Node {
    /// Initialize internal services
    async fn init_internal_services(&mut self) -> Result<()> {
        // Create a registry service with a reference to this node
        let node_arc = Arc::new(self.clone());
        let registry_service = RegistryService::new(node_arc);
        
        // Add the registry service to the node
        self.add_service(registry_service).await?;
        
        Ok(())
    }
    
    /// Create a new Node with the given configuration
    pub async fn new(config: NodeConfig) -> Result<Self> {
        // ... existing initialization code ...
        
        // Create a new node instance
        let mut node = Self {
            // ... existing fields ...
        };
        
        // Initialize internal services
        node.init_internal_services().await?;
        
        // Return the new node
        Ok(node)
    }
}
```

#### Action Pattern Matching

The example introduces a new concept: action pattern matching. This allows registering handlers for URL-like patterns with path parameters:

```rust
// Register an action with path parameters
context.register_action_pattern("services/{service_path}/state", handler).await?;
```

This would require extending the `LifecycleContext` with a new registration method:

```rust
impl LifecycleContext {
    /// Register an action handler with pattern matching
    pub async fn register_action_pattern<F, Fut>(
        &self,
        pattern: &str,
        handler: F,
    ) -> Result<()>
    where
        F: Fn(Option<ValueType>, RequestContext, std::collections::HashMap<String, String>) -> Fut + Send + Sync + 'static,
        Fut: Future<Output = Result<ServiceResponse>> + Send + 'static,
    {
        // Implementation would parse patterns like "services/{service_path}/state"
        // and extract path parameters when matching requests
        // ...
    }
}
```

This pattern matching capability would be a significant enhancement to the action registration system, allowing for more RESTful API designs.

## Progress Tracking

- [x] Simplify service lookup with TopicPath
- [x] Implement request handling in Node
- [x] Implement publishing in Node
- [x] Create LifecycleContext with proper logging
- [x] Add documentation warnings to handle_request and publish in ServiceRegistry
- [x] Add clear test INTENTION documentation
- [x] Refactor constructors using the builder pattern
- [x] Remove deprecated constructor methods
- [x] Remove `handle_request` from ServiceRegistry
- [x] Remove `publish` from ServiceRegistry
- [x] Update AbstractService to use action registration instead of handler methods
- [x] Fix context handling
- [x] Enhance TopicPath usage
- [x] Implement CompleteServiceMetadata to track service state and metadata centrally
- [x] Remove ServiceMetadata dependency from services, using direct AbstractService methods
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

- [ ] Implement internal registry service for accessing service metadata
- [ ] Implement publish_with_options
- [ ] Implement EventContext for callbacks
- [ ] Implement metrics system
- [ ] Complete API cleanup for consistency

## Testing Strategy

- Create comprehensive unit tests for core registry functions
- Test with real services and real Node instances
- Verify event flow from publishing to receiving
- Test both request and event paths
- Ensure consistent behavior across different path formats
- Ensure each test has clear INTENTION documentation
- Each test should have a single responsibility and test only what the component is responsible for

## Next Steps

The immediate next steps are:

1. ✅ Fix action handler registration/lookup with respect to registry cloning (COMPLETED)
2. ✅ Fix NodeDelegate trait implementation (COMPLETED)
3. ✅ Remove redundant NodeRequestHandler trait (COMPLETED)
4. ✅ Fix non-blocking list_services implementation (COMPLETED)
5. ✅ Implement Node.start() and Node.stop() lifecycle methods (COMPLETED)
6. ✅ Implement lifecycle state tracking (COMPLETED)
7. Implement internal registry service for accessing service metadata
8. Implement EventContext to pass to callbacks
9. Implement the metrics collection framework in Node
10. Create the publish_with_options method with configurable delivery options

All the unit tests for basic functionality are now passing, which marks significant progress in the refactoring plan. The implementation of Node.start() and Node.stop() lifecycle methods along with proper state tracking represents a key milestone in the Node's capability to properly manage service lifecycles. 

The next focus is on implementing the internal registry service to provide a consistent API pattern for accessing service metadata. This will eliminate the need for direct methods like get_service_state() and align with the architectural principle of using the standard request interface for all service interactions. After that, work will continue on enhancing the event system and implementing metrics collection.

## ServiceRegistry API Changes

### 1. Action Registration API Change

The `register_action` method signature has been updated from:

```rust
pub async fn register_action(
    &self,
    topic_path: &TopicPath,
    action_name: &str,
    handler: ActionHandler,
) -> Result<()>
```

To the streamlined version:

```rust
pub async fn register_action(
    &self,
    action_path: &TopicPath,
    handler: ActionHandler,
) -> Result<()>
```

This change simplifies the API by:
- Removing the need to separate service path and action name
- Using a single TopicPath that already contains the action in its path
- Improving consistency with the get_action_handler method which also takes a single TopicPath

### Key Architectural Principles

// ... existing code ... 

## Internal Services Architecture

An important architectural improvement is to introduce the concept of "internal services" - special services that handle Node metadata, service information, and other system-level operations through the standard request interface.

### Registry Service

The current implementation exposes methods like `node.get_service_state()` to retrieve service state information. This approach has several drawbacks:

1. **Inconsistent API pattern**: Services are accessed through `request()` but service metadata through direct methods
2. **Limited extensibility**: Each new piece of information requires a new method 
3. **Method proliferation**: As more metadata is exposed, more methods are added
4. **Inconsistent access patterns**: Some information is accessed via service-specific methods, other via requests

Instead, we will implement an internal registry service that provides access to service metadata through the standard request interface:

```rust
// Current approach
let state = node.get_service_state("math").await;

// New approach
let response = node.request("internal/registry/services/math", ValueType::Null).await?;
let service_info = response.data.unwrap();  // Contains full service metadata including state
```

#### Registry Service Design

1. **Service Path**: `internal/registry`

2. **Available Actions**:
   - `services` - List all services with basic metadata
   - `services/{service_path}` - Get detailed information about a specific service
   - `services/{service_path}/state` - Get just the state of a service
   - `services/{service_path}/actions` - List actions of a service
   - `services/{service_path}/events` - List events of a service

3. **Implementation**:
   - Create a dedicated `RegistryService` that is automatically registered with the Node
   - Special initialization to avoid circular dependencies
   - Privileged access to Node internals
   - Standard service interface for requests

4. **Response Format**:
   - For service listing:
   ```json
   [
     {
       "name": "Math",
       "path": "math",
       "state": "Running",
       "version": "1.0.0"
     },
     {
       "name": "UserService",
       "path": "users",
       "state": "Running",
       "version": "1.2.1"
     }
   ]
   ```
   
   - For detailed service information:
   ```json
   {
     "name": "Math",
     "path": "math",
     "state": "Running",
     "version": "1.0.0",
     "actions": ["add", "subtract", "multiply"],
     "events": ["calculation_completed", "error_occurred"],
     "metadata": {
       "description": "Basic math operations",
       "author": "Runar Team"
     },
     "started_at": "2023-06-10T15:30:45Z",
     "uptime_seconds": 3600
   }
   ```

#### Benefits

1. **Consistent API pattern**: All service and metadata access through the same `request()` interface
2. **Extensibility**: Additional metadata can be added without changing the API
3. **Standard request/response format**: Uses the same format as other service responses
4. **Improved testability**: Can test registry access through the same service testing patterns
5. **Enhanced security**: Future permission models can be applied consistently

#### Implementation Steps

1. Create the `RegistryService` struct implementing `AbstractService`
2. Add special handling in Node to register this service automatically
3. Implement actions to retrieve service information from Node's state
4. Update tests to use this new pattern
5. Maintain the direct methods temporarily for backward compatibility 
6. Add test coverage for registry service

This approach better aligns with the architectural principles of the system, treating service metadata as a first-class concept that is accessible through the standard service interface.

#### Example Implementation

Here's a skeleton of how the `RegistryService` could be implemented:

```rust
use anyhow::Result;
use async_trait::async_trait;
use std::sync::Arc;

use crate::node::Node;
use crate::services::abstract_service::{AbstractService, ServiceState};
use crate::services::{LifecycleContext, RequestContext, ServiceResponse};
use runar_common::types::ValueType;

/// Internal service for accessing registry information
pub struct RegistryService {
    /// Reference to the Node - needed to access service information
    node: Arc<Node>,
    
    /// Service name
    name: String,
    
    /// Service path
    path: String,
}

impl RegistryService {
    /// Create a new registry service
    pub fn new(node: Arc<Node>) -> Self {
        Self {
            node,
            name: "Registry".to_string(),
            path: "internal/registry".to_string(),
        }
    }
    
    /// Handle request for listing all services
    async fn handle_list_services(&self, _params: Option<ValueType>, _context: RequestContext) -> Result<ServiceResponse> {
        // Get all services from the node
        let services = self.node.list_services();
        let states = self.node.get_all_service_states().await;
        
        // Build response data
        let mut services_data = Vec::new();
        for service_path in services {
            let state = states.get(&service_path).cloned();
            