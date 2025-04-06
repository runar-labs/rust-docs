# Network Integration Plan

## Status: IN PROGRESS

## Overview

This document outlines the plan for integrating the network layer components into the Runar Node system. The network transport and discovery implementations have been completed and tested successfully. The next phase is to integrate these components into the node to enable distributed service communication.

## Current Status

- ✅ Network transport interface defined
- ✅ QUIC transport implementation completed
- ✅ Peer registry implementation completed
- ✅ Node discovery interface defined
- ✅ MulticastDiscovery implementation completed
- ✅ MemoryDiscovery implementation completed
- ✅ Comprehensive testing of network components
- ✅ Cleanup of incomplete implementations (WebSocket removed)
- ✅ Mock implementations moved to test directory
- ✅ Security improvements (certificate handling warnings)

## Next Steps (Integration Phase)

1. **Integrate Network Components into Node**
   - Add network-related fields to `Node` struct:
     - `network_transport: Option<Box<dyn NetworkTransport>>`
     - `node_discovery: Option<Box<dyn NodeDiscovery>>`
   - Update `Node::start()` to initialize network components
   - Update `Node::stop()` to shut down network components

2. **Implement Network Message Handling**
   - Register message handlers with transport layer
   - Process incoming network messages:
     - Route requests to local services
     - Route responses to waiting requests
     - Process discovery messages
   - Implement `RemoteService` wrapper for remote service proxies

3. **Enable Distributed Service Discovery**
   - Announce local services via discovery mechanism
   - Handle discovered remote nodes
   - Register remote services in service registry

4. **Modify Request and Publish Methods**
   - Update `Node::request()` to handle remote services
   - Update `Node::publish_event()` to send events to remote subscribers
   - Implement request/response correlation

5. **Address Serialization**
   - Implement Protocol Buffer serialization for message exchanges
   - Create schema definitions for network messages
   - Implement value type serialization/deserialization

## Implementation Approach

1. **Iterative Integration**: Make small, verifiable changes and test after each step
2. **Preserve Existing Functionality**: Maintain backward compatibility with local-only node
3. **Feature Flags**: Use feature flags to enable/disable network capabilities
4. **Clear Separation**: Keep clear boundaries between local and remote service handling

## Testing Strategy

- Create unit tests for network integration
- Implement integration tests with multiple nodes
- Test distributed request/response flows
- Test distributed event publishing/subscription
- Ensure backward compatibility with existing tests

## Completion Criteria

The integration will be considered complete when:

1. All existing tests pass
2. New network integration tests pass
3. Manual testing confirms distributed service communication works
4. Network components can be gracefully started and stopped
5. Error handling is comprehensive and robust 