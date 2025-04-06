# Runar Node Network Layer Design

## INTENTION
This document outlines the key architectural aspects for integrating network capabilities into the Runar Node system, enabling transparent communication between distributed services across multiple nodes.

## Key Design Principles

1. **Network Transparency**: Services should be able to communicate with each other without knowing whether they are local or remote
2. **Default Locality Preference**: Local services are preferred over remote ones when both exist
3. **Late Serialization**: Data serialization happens only at network boundaries
4. **Automatic Discovery**: Nodes automatically discover other nodes unless explicitly disabled

## Core Components for Integration

### 1. Remote Service Abstraction

```rust
pub struct RemoteService {
    // Service metadata
    name: String,
    service_path: TopicPath,
    version: String,
    description: String,
    
    // Remote peer information
    peer_id: NodeIdentifier,
    network_transport: Arc<dyn NetworkTransport>,
    
    // Service capabilities
    actions: HashMap<String, ActionMetadata>,
    subscriptions: HashMap<String, SubscriptionMetadata>,
}
```

The `RemoteService` implements the `AbstractService` trait, making it indistinguishable from local services from the Node's perspective. Its action handlers serialize requests and forward them to the remote peer.

### 2. Network Registry Integration

The ServiceRegistry will be enhanced to maintain separate registries for local and remote services:

```rust
pub struct ServiceRegistry {
    // ... existing fields
    
    // Registry of local services
    local_services: HashMap<TopicPath, Arc<dyn AbstractService>>,
    
    // Registry of remote services, indexed by service path
    remote_services: HashMap<TopicPath, Vec<Arc<RemoteService>>>,
    
    // Registry of remote services, indexed by peer ID
    peer_services: HashMap<NodeIdentifier, HashSet<TopicPath>>,
}
```

## Request Flow with Network Layer

1. User calls `node.request("user/auth", params)`
2. Node looks up "user/auth" in the local service registry
3. If a local service exists, the request is handled locally
4. If no local service exists, the registry is queried for remote services
5. A remote service is selected using a load balancing algorithm (round-robin initially)
6. The RemoteService action handler serializes the request and forwards it to the remote peer
7. The remote peer deserializes the request and invokes the local service
8. The response is serialized and sent back to the original node
9. The RemoteService handler deserializes the response and returns it to the caller

## Event Flow with Network Layer

1. User calls `node.publish("status/updated", data)`
2. The node finds all matching local subscribers and invokes their handlers
3. Based on delivery options, the node may also broadcast to remote subscribers:
   - `broadcast_mode: "all"`: Send to all subscribers across all nodes
   - `broadcast_mode: "one_per_service"`: Send to one instance of each service path
   - `broadcast_mode: "local_only"`: Don't send to any remote subscribers

## Node Configuration for Network

```rust
pub struct NetworkConfig {
    // Network identity
    node_id: Option<String>,  // If None, generated automatically
    default_network_id: String,
    
    // Transport configuration
    transport_type: TransportType,
    transport_options: HashMap<String, String>,
    bind_address: String,
    
    // Discovery configuration
    discovery_enabled: bool,
    discovery_providers: Vec<DiscoveryProviderConfig>,
    
    // Advanced options
    connection_timeout_ms: u32,
    request_timeout_ms: u32,
    max_connections: u32,
    max_message_size: usize,
}
```

## Implementation Phases

### Phase 1: Basic Node Integration (Current Focus)
1. Add network-related fields to Node struct
2. Initialize network components in Node startup
3. Register message handlers for incoming messages
4. Implement RemoteService abstraction
5. Update request and publish methods to handle remote services

### Phase 2: Service Discovery and Routing
1. Announce local services via discovery mechanism
2. Process discovered remote nodes
3. Register remote services in registry
4. Implement remote event subscription

### Phase 3: Advanced Features (Future)
1. Implement connection pooling and request batching
2. Add comprehensive security features
3. Implement advanced load balancing algorithms
4. Add DHT-based discovery for WAN support

## Backward Compatibility

The network layer is designed to be transparent to existing code. Services written for the local-only node will work with the networked version without modification. The Node API (request, publish, subscribe) remains unchanged. 