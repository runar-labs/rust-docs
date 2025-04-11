# Remote Action Handling Design

## Overview
This document details the architecture and implementation approach for handling remote actions in the Runar Node system. It focuses on the interaction between the ServiceRegistry, RemoteService, and NetworkTransport components to enable transparent remote service invocation with proper lifecycle management.

## Key Design Principles

1. **Clear Separation of Concerns**
   - ServiceRegistry maintains separate registries for local and remote handlers
   - RemoteService encapsulates its own action registration
   - Node applies load balancing and routing decisions

2. **Proper Lifecycle Management**
   - RemoteService instances manage their own lifecycle
   - Services register their actions during initialization
   - Clean registration and deregistration processes

3. **Direct TopicPath Usage**
   - TopicPath used consistently throughout the system
   - Explicit network_id in paths for routing clarity
   - Consistent path formats between registration and lookup

4. **Load Balancing for Remote Handlers**
   - Strategy-based selection among multiple handlers
   - Clear separation between handler retrieval and selection

## Component Architecture

### ServiceRegistry Structure

```rust
pub struct ServiceRegistry {
    /// Local action handlers organized by path
    local_action_handlers: RwLock<HashMap<TopicPath, ActionHandler>>,
    
    /// Remote action handlers organized by path, with multiple handlers per path
    remote_action_handlers: RwLock<HashMap<TopicPath, Vec<ActionHandler>>>,
    
    /// Local event subscriptions using wildcard registry
    local_event_subscriptions: RwLock<WildcardSubscriptionRegistry<(String, EventCallback)>>,
    
    /// Remote event subscriptions using wildcard registry
    remote_event_subscriptions: RwLock<WildcardSubscriptionRegistry<(String, EventCallback)>>,
    
    /// Local services registry
    local_services: RwLock<HashMap<String, Arc<dyn AbstractService>>>,
    
    /// Remote services registry indexed by service path
    remote_services: RwLock<HashMap<TopicPath, Vec<Arc<RemoteService>>>>,
    
    /// Remote services registry indexed by peer ID
    //peer_services: RwLock<HashMap<PeerId, HashSet<String>>>,
    remote_services_by_peer_id: RwLock<HashMap<PeerId, HashSet<String>>>,
    
    //service states is just for local service.. remove services are either availabolt or not.. whne not availablt tney are removed from the registry.
    /// Service lifecycle states - moved from Node
    service_states: Arc<RwLock<HashMap<String, ServiceState>>>,
    
    /// Logger instance
    logger: Logger,
}

```

#### Key Methods

```rust
// Register a local action handler
pub async fn register_local_action_handler(
    &self,
    topic_path: &TopicPath,
    handler: ActionHandler,
    metadata: Option<ActionMetadata>
) -> Result<()>

// Register a remote action handler
pub async fn register_remote_action_handler(
    &self,
    topic_path: &TopicPath,
    handler: ActionHandler,
    remote_service: Arc<RemoteService>
) -> Result<()>

// Get a local action handler
pub async fn get_local_action_handler(&self, topic_path: &TopicPath) -> Option<ActionHandler>

// Get all remote action handlers for a path (for load balancing)
pub async fn get_remote_action_handlers(&self, topic_path: &TopicPath) -> Vec<ActionHandler>
```

### RemoteService Implementation

```rust
pub struct RemoteService {
    // Network peer identifier
    peer_id: PeerId,
    
    // Service path
    service_path: String,
    
    // Available actions with their metadata
    actions: RwLock<HashMap<String, ActionMetadata>>,
    
    // Network transport for sending requests
    network_transport: Arc<RwLock<Option<Box<dyn NetworkTransport>>>>,
    
    // Other fields...
}
```

#### Key Methods

```rust
// Create RemoteService instances from capabilities
pub async fn create_from_capabilities(
    node_id: PeerId,
    capabilities: Vec<String>,
    network_transport: Arc<RwLock<Option<Box<dyn NetworkTransport>>>>,
    logger: Logger,
    local_node_id: PeerId,
    request_timeout_ms: u64,
) -> Result<Vec<Arc<RemoteService>>>

// Initialize the service (register handlers, etc.)
pub async fn init(&self, context: RemoteLifecycleContext) -> Result<()>

// Get a list of available action names
pub async fn get_available_actions(&self) -> Vec<String>

// Create an action handler for a specific action
pub fn create_action_handler(&self, action_name: String) -> ActionHandler
```

### Node Implementation for Request Handling

```rust
pub async fn request(&self, path: &str, params: ValueType) -> Result<ServiceResponse> {
    let topic_path = TopicPath::new(path, &self.network_id)?;
    
    // First check for local handlers
    if let Some(handler) = self.service_registry.get_local_action_handler(&topic_path).await {
        self.logger.debug(format!("Executing local handler for {}", path));
        let context = RequestContext { /* ... */ };
        return handler(Some(params), context).await;
    }
    
    // If no local handler found, look for remote handlers
    let remote_handlers = self.service_registry.get_remote_action_handlers(&topic_path).await;
    if !remote_handlers.is_empty() {
        // Create request context
        let context = RequestContext { /* ... */ };
        
        // Apply load balancing strategy to select a handler
        let handler_index = self.load_balancer.select_handler(&remote_handlers, &context);
        let handler = &remote_handlers[handler_index];
        
        self.logger.debug(format!(
            "Executing remote handler {}/{} for {}", 
            handler_index + 1, remote_handlers.len(), path
        ));
        
        return handler(Some(params), context).await;
    }
    
    // No handler found
    Err(anyhow!("No handler found for action: {}", path))
}
```

### LoadBalancingStrategy Interface

```rust
pub trait LoadBalancingStrategy: Send + Sync {
    // Select an action handler from a list of available handlers
    fn select_handler<T>(&self, handlers: &[T], context: &RequestContext) -> usize;
}

// Default implementation using round-robin
pub struct RoundRobinLoadBalancer {
    counter: AtomicUsize,
}

impl LoadBalancingStrategy for RoundRobinLoadBalancer {
    fn select_handler<T>(&self, handlers: &[T], _context: &RequestContext) -> usize {
        if handlers.len() <= 1 {
            return 0;
        }
        
        let current = self.counter.fetch_add(1, Ordering::SeqCst);
        current % handlers.len()
    }
}
```

## Lifecycle and Workflow

### Remote Service Creation Process

1. Node discovers a remote node and receives its capabilities
2. Node calls `ServiceRegistry.create_remote_service_from_capabilities`
3. This calls `RemoteService.create_from_capabilities` to instantiate services
4. Each RemoteService is initialized with a `RemoteLifecycleContext`
5. During init, RemoteService registers its actions using `context.register_remote_action_handler`

```rust
// Creating remote services from capabilities
pub async fn create_remote_service_from_capabilities(
    &self,
    node_info: NodeInfo,
    capability_strings: Vec<String>,
    network_transport: Arc<RwLock<Option<Box<dyn NetworkTransport>>>>,
    local_node_id: PeerId,
    request_timeout_ms: u64,
) -> Result<Vec<Arc<RemoteService>>> {
    // Create remote services from capabilities
    let remote_services = RemoteService::create_from_capabilities(
        node_info.identifier,
        capability_strings,
        network_transport.clone(),
        self.logger.clone(),
        local_node_id,
        request_timeout_ms,
    ).await?;
    
    // Register each service (not its handlers - the service will do that)
    for service in &remote_services {
        self.register_remote_service(service.clone()).await?;
    }
    
    Ok(remote_services)
}
```

### RemoteService Initialization

```rust
pub async fn init(&self, context: RemoteLifecycleContext) -> Result<()> {
    // Get available actions
    let action_names = self.get_available_actions().await;
    
    // Register each action handler
    for action_name in action_names {
        if let Ok(topic_path) = TopicPath::new(self.path(), &self.peer_id().network_id) {
            if let Ok(action_topic_path) = topic_path.new_action_topic(&action_name) {
                // Create handler for this action
                let handler = self.create_action_handler(action_name.clone());
                
                // Register with the context
                context.register_remote_action_handler(
                    &action_topic_path,
                    handler,
                    self.clone()
                ).await?;
            }
        }
    }
    
    Ok(())
}
```

### Request Handling Flow

1. Node receives a request with a TopicPath
2. Node first checks for local handlers using `get_local_action_handler`
3. If no local handler is found, get remote handlers with `get_remote_action_handlers`
4. If remote handlers exist, apply load balancing to select one
5. Execute the selected handler with appropriate context
6. Return the result to the caller

## Implementation Phases

1. Update ServiceRegistry with separate local and remote handler methods
2. Implement RemoteService lifecycle management with proper initialization
3. Create RemoteLifecycleContext for remote service registration
4. Update Node request method to use load balancing
5. Integrate with NetworkTransport for actual message passing

## Benefits of This Architecture

1. **Clear Separation:** Local and remote handlers are clearly separated
2. **Proper Lifecycle:** RemoteService manages its own lifecycle
3. **Consistent Paths:** TopicPath is used consistently throughout
4. **Scalability:** Load balancing enables scaling across multiple nodes
5. **Maintainability:** Clean interfaces reduce coupling between components

## Testing Requirements and Approach

### Baseline Tests

The Runar Node system has a set of baseline tests that verify the core functionality:

1. **node_test.rs**: This test suite validates essential Node operations:
   - Node creation and initialization
   - Service registration and lifecycle management
   - Local request handling
   - Event publishing and subscription
   - Basic service operations

**IMPORTANT**: These baseline tests MUST continue to pass without modification after implementing remote action handling. They serve as the foundation for validating that our changes maintain backward compatibility and don't break existing functionality.

### Existing Test Coverage

The existing test suite already provides coverage for several aspects of the system:

1. **service_registry_test.rs**
   - Verifies registration, retrieval, and unsubscription for local handlers
   - Tests wildcard subscriptions
   - Validates network isolation for handlers

2. **remote_action_test.rs**
   - Tests remote action topic path formatting
   - Verifies remote action handler registration and lookup
   - Demonstrates the importance of consistent path usage with network IDs

3. **node_network.rs**
   - Integration test that connects two real nodes over the network
   - Registers different services on each node
   - Verifies cross-node remote action calls

### Implementation Testing Approach

For implementing the remote action handling architecture:

1. **Preserve Local Functionality**
   - Maintain separate handling paths for local and remote operations
   - Ensure local handler logic remains unchanged
   - Verify with existing node_test.rs that local functionality is unaffected

2. **Test Remote Functionality**
   - Use the existing integration test in node_network.rs to validate basic remote calls
   - Enhance as needed to test load balancing with multiple remote services

3. **Unit Tests for New Components**
   - Add tests for RemoteLifecycleContext
   - Test load balancing strategies
   - Verify proper serialization/deserialization of capabilities

4. **Test Edge Cases**
   - Remote service disconnection handling
   - Multiple handlers for the same action path
   - Network partitioning and reconnection

The main strategy is to build on the existing test suite, extending it only when needed for the new functionality, while ensuring all baseline functionality remains unchanged.

## Network Transport Stream Management

To optimize performance and resource usage, especially with connection-oriented protocols like QUIC, the `NetworkTransport` implementation should manage underlying communication streams efficiently.

### Peer Connection State
- The transport layer (e.g., `QuicTransport`) must maintain an internal representation for each active peer connection (e.g., `quinn::Connection`).
- This state should include mechanisms for managing streams associated with that connection.

### Stream Pooling and Reuse
- For each active peer connection, the transport should maintain a pool of idle, reusable communication streams (e.g., QUIC bidirectional streams).
- When sending a message (`send_message`) or request (`send_request`):
    1. Check the pool for an available idle stream for the target peer's connection.
    2. If an idle stream exists, acquire it, use it to send the data, potentially wait for a response (for requests), and then return it to the idle pool.
    3. If no idle stream is available, attempt to open a new stream on the underlying connection (e.g., `connection.open_bi().await`).
    4. If opening a new stream succeeds, use it as described above.
    5. If opening a new stream fails (e.g., stream limits reached, connection error), the send operation should fail with an appropriate `NetworkError`.

### Dynamic Stream Closing Policy
- Streams should not be kept open indefinitely. Implement a policy to close idle streams.
- **Idle Timeout:** Close streams that have been in the idle pool for longer than a configured timeout.
- **Dynamic Adaptation:** This timeout should ideally be dynamic:
    - **Frequency-Based:** Keep streams open longer for peers with frequent communication.
    - **Resource-Aware:** Shorten idle timeouts or limit pool sizes if system resources (e.g., memory, file descriptors) are becoming scarce or if the total number of open streams exceeds a threshold.
- A background task within the transport implementation can periodically scan the stream pools and apply the closing policy.

This approach minimizes the latency associated with stream setup for frequent communication while preventing resource leaks by closing unused streams proactively.

## Related Documentation

- Node Refactoring Plan
- Network Transport Implementation
- TopicPath Documentation 