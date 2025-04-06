# Runar Node Network Layer Design

## INTENTION
This document outlines the comprehensive design for implementing network capabilities in the Runar Node system, enabling transparent communication between distributed services across multiple nodes.

## Overview

The Runar Node system will be extended to support distributed service discovery and communication across multiple nodes in a network. This design maintains the existing service abstraction while introducing network transparency, allowing services to communicate seamlessly regardless of their physical location.

## Key Design Principles

1. **Network Transparency**: Services should be able to communicate with each other without knowing whether they are local or remote
2. **Default Locality Preference**: Local services are preferred over remote ones when both exist
3. **Late Serialization**: Data serialization happens only at network boundaries
4. **Protocol Agnosticism**: Support multiple transport protocols (TCP, QUIC, WebSockets)
5. **Automatic Discovery**: Nodes automatically discover other nodes unless explicitly disabled
6. **Security by Design**: All communications are secured with encryption and authentication

## Core Components

### 1. Remote Service Abstraction

```rust
pub struct RemoteService {
    // Service metadata
    service_path: TopicPath,
    version: String,
    description: String,
    
    // Remote peer information
    peer_id: PeerId,
    connection: Arc<PeerConnection>,
    
    // Service capabilities
    actions: HashMap<String, ActionMetadata>,
    subscriptions: HashMap<String, SubscriptionMetadata>,
    
    // Statistics and state
    metrics: ServiceMetrics,
    state: ServiceState,
}
```

The `RemoteService` implements the `AbstractService` trait, making it indistinguishable from local services from the Node's perspective. Its action handlers serialize requests and forward them to the remote peer.

### 2. Transport Layer

```rust
pub trait Transport: Send + Sync {
    // Connection management
    async fn start(&self) -> Result<()>;
    async fn stop(&self) -> Result<()>;
    
    // Peer operations
    async fn connect_to_peer(&self, address: &str) -> Result<PeerId>;
    async fn disconnect_from_peer(&self, peer_id: &PeerId) -> Result<()>;
    
    // Message handling
    async fn send_message(&self, peer_id: &PeerId, message: NetworkMessage) -> Result<()>;
    async fn register_message_handler(&self, handler: MessageHandler) -> Result<()>;
    
    // Discovery
    async fn start_discovery(&self) -> Result<()>;
    async fn stop_discovery(&self) -> Result<()>;
    async fn register_discovery_handler(&self, handler: DiscoveryHandler) -> Result<()>;
}
```

Initial transport implementations:
- `TcpTransport`: For basic TCP connections
- `QuicTransport`: For QUIC protocol with improved performance
- Later: `WebSocketTransport` and `WebRTCTransport` for browser compatibility

### 3. Discovery Mechanism

```rust
pub trait DiscoveryProvider: Send + Sync {
    async fn start(&self, config: DiscoveryConfig) -> Result<()>;
    async fn stop(&self) -> Result<()>;
    async fn advertise_services(&self, services: Vec<ServiceAdvertisement>) -> Result<()>;
    async fn register_discovery_handler(&self, handler: DiscoveryHandler) -> Result<()>;
}
```

Initial discovery implementations:
- `MulticastDiscovery`: LAN discovery using UDP multicast
- `DhtDiscovery`: WAN discovery using a distributed hash table
- `StaticPeersDiscovery`: Preconfigured static peers list

### 4. Message Protocol

All network messages are defined using Protocol Buffers for cross-language compatibility. The core message types include:

```protobuf
syntax = "proto3";

message NodeMessage {
  string message_id = 1;
  string source_node_id = 2;
  string target_node_id = 3;
  oneof payload {
    RequestMessage request = 4;
    ResponseMessage response = 5;
    EventMessage event = 6;
    DiscoveryMessage discovery = 7;
    HeartbeatMessage heartbeat = 8;
  }
}

message RequestMessage {
  string service_path = 1;
  string action = 2;
  bytes params = 3;
  RequestOptions options = 4;
}

message ResponseMessage {
  string request_id = 1;
  bool success = 2;
  bytes data = 3;
  string error_code = 4;
  string error_message = 5;
}

message EventMessage {
  string topic = 1;
  bytes data = 2;
  EventOptions options = 3;
}
```

### 5. Network Registry Integration

The ServiceRegistry will be enhanced to maintain separate registries for local and remote services:

```rust
pub struct ServiceRegistry {
    // ... existing fields
    
    // Registry of local services
    local_services: HashMap<TopicPath, Arc<dyn AbstractService>>,
    
    // Registry of remote services, indexed by service path
    remote_services: HashMap<TopicPath, Vec<Arc<RemoteService>>>,
    
    // Registry of remote services, indexed by peer ID
    peer_services: HashMap<PeerId, HashSet<TopicPath>>,
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

## Node Configuration Extensions

```rust
pub struct NetworkConfig {
    // Network identity
    node_id: Option<String>,  // If None, generated automatically
    network_id: String,
    
    // Transport configuration
    transport_type: TransportType,
    transport_options: HashMap<String, String>,
    bind_address: String,
    
    // Discovery configuration
    discovery_enabled: bool,
    discovery_providers: Vec<DiscoveryProviderConfig>,
    
    // Security configuration
    security_enabled: bool,
    tls_certificate: Option<PathBuf>,
    tls_private_key: Option<PathBuf>,
    
    // Advanced options
    connection_timeout_ms: u32,
    request_timeout_ms: u32,
    max_connections: u32,
    max_message_size: usize,
}
```

## Security Considerations

1. **Authentication**: Nodes authenticate each other using TLS certificates or public/private key pairs
2. **Encryption**: All network traffic is encrypted using TLS or equivalent
3. **Authorization**: Services can specify which peers are allowed to access them
4. **Rate Limiting**: Protection against DoS attacks with configurable rate limits
5. **Message Validation**: Strict validation of all incoming messages before processing

## Implementation Plan

### Phase 1: Basic Networking Infrastructure
1. Implement the Transport trait and TcpTransport
2. Define and implement the Protocol Buffer message schema
3. Create the RemoteService implementation
4. Enhance ServiceRegistry to track local and remote services
5. Implement serialization/deserialization of ValueType

### Phase 2: Service Discovery and Routing
1. Implement the DiscoveryProvider trait and MulticastDiscovery
2. Add service advertisement and discovery
3. Implement request routing between nodes
4. Add support for remote event subscription

### Phase 3: Advanced Networking Features
1. Implement QUIC transport for improved performance
2. Add DHT-based discovery for WAN support
3. Implement connection pooling and request batching
4. Add comprehensive security features
5. Implement advanced load balancing algorithms

### Phase 4: Optimization and Testing
1. Optimize serialization performance
2. Implement caching strategies
3. Add network resilience features (retry, timeout, circuit breaker)
4. Create comprehensive benchmarks and stress tests
5. Implement metrics and monitoring

## Testing Strategy

1. **Unit Tests**: Test each component in isolation with mocks
2. **Integration Tests**: Test multiple components working together
3. **System Tests**: Test the entire system with multiple nodes
4. **Chaos Testing**: Simulate network failures, node crashes, and other adverse conditions
5. **Performance Testing**: Benchmark latency, throughput, and resource usage

## Performance Considerations

1. **Connection Pooling**: Reuse connections to minimize overhead
2. **Batching**: Group small messages when possible to reduce protocol overhead
3. **Compression**: Compress large messages to reduce bandwidth usage
4. **Backpressure**: Implement flow control to prevent overwhelming nodes
5. **Caching**: Cache remote service information to reduce discovery overhead

## Backward Compatibility

The network layer is designed to be transparent to existing code. Services written for the local-only node will work with the networked version without modification. The Node API (request, publish, subscribe) remains unchanged. 