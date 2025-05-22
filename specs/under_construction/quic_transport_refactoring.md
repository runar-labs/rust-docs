
QUIC Transport Implementation Specification
1. Core Requirements
1.1 Functional Requirements
Implement NetworkTransport trait fully
Handle multiple concurrent connections efficiently
Support bi-directional streaming
Implement proper connection lifecycle management
Support message passing between nodes
Handle peer discovery integration
1.2 Non-Functional Requirements
Memory Safety: Proper resource cleanup
Performance: Efficient connection and stream pooling
Reliability: Handle network partitions and reconnections
Security: TLS 1.3 encryption
Thread Safety: Safe concurrent access patterns
2. Architecture
2.1 Component Diagram
CopyInsert
+------------------+     +---------------------+     +------------------+
|   QuicTransport  |---->|  QuicTransportImpl  |<----|     PeerState    |
+------------------+     +---------------------+     +------------------+
         ^                        ^                            ^
         |                        |                            |
         v                        v                            v
+------------------+     +---------------------+     +------------------+
| NetworkTransport |     |   ConnectionPool    |     |   StreamPool     |
+------------------+     +---------------------+     +------------------+
2.2 Key Components
QuicTransport
Public API implementing NetworkTransport
Thin wrapper around QuicTransportImpl
Manages lifecycle of the implementation
QuicTransportImpl
Core implementation
Manages connections and background tasks
Handles connection pooling
PeerState
Tracks state of individual peer connections
Manages stream pools
Handles connection health
ConnectionPool
Manages active connections
Handles connection reuse
Implements connection cleanup
StreamPool
Manages stream reuse
Implements stream lifecycle
Handles stream timeouts
3. Implementation Plan

Phase 1: Core Structure
Define all necessary types and traits
Implement basic structure with empty methods
Ensure all dependencies are properly managed

ensuyre all crate compiles and the quic transport compiles and runs with the emopty methods. to make sure the API and the node.rs file are in sync

make SURE all COMPILES with the REST of the code (same crate)...   ..
DO not change other files without mny confirmation. use the API defined in the TRait and expected in the node.rs file


 also do not change the existingn QuicTransportOptions which is already used in other parts ofg the code... also QuicTransportBuilder is not ourt pattern. we use new() + builder method..like we have in the QuicTransportOptions ->  with_certificates() etc.... update the plan with this.. providfe full update plan

DO NOT MOVE ON.. ONLY FOPCUS ON PHASE 1 for now

Phase 2: Connection Management
Implement connection establishment
Handle connection pooling
Implement keep-alive
Handle connection errors and reconnections
Phase 3: Message Handling
Implement message sending
Handle message receiving
Implement request/response pattern
Handle message timeouts
Phase 4: Resource Management
Implement stream pooling
Handle backpressure
Implement graceful shutdown
Add metrics and monitoring
4. Best Practices from Previous Attempts
4.1 What to Keep
Separation of Concerns: Clear division between public API and implementation
Thread Safety: Proper use of Arc and Mutex/RwLock
Async Patterns: Proper use of async/await
Resource Management: Connection and stream pooling
Error Handling: Comprehensive error types and handling