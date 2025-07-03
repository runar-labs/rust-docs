# Context System

## Overview

The Context System is a core component of the Runar architecture that enables secure and traceable communication between services. This document outlines the design decisions and implementation details of the context system.

## Context Types

Runar uses two distinct context types to clearly separate concerns:

### RequestContext

`RequestContext` is used for handling service requests and provides:

- Request metadata (request ID, timestamp)
- Methods for nested requests (`request`, `publish`, `subscribe`)
- Request path tracking for debugging
- Parent request information for tracing request chains

### LifecycleContext

`LifecycleContext` is used for service lifecycle operations (init, start, stop) and provides:

- Configuration parameters needed for initialization
- A limited subset of functionality required for lifecycle operations
- Stripped-down interface without request-specific methods

## Common Context Interface

Both context types implement a common interface for shared functionality:

```rust
pub trait AbstractContext {
    fn node_id(&self) -> &str;
    fn network_id(&self) -> &str;
    // Other common methods...
}

impl AbstractContext for RequestContext {
    // Implementation of common methods
}

impl AbstractContext for LifecycleContext {
    // Implementation of common methods
}
```

## Request Metadata

For nested requests, metadata about the parent request is stored rather than direct object references:

```rust
pub struct RequestMetadata {
    id: String,        // Unique identifier for the request
    path: String,      // Full request path
    operation: String, // Operation being performed
    timestamp: u64,    // When the request was initiated
}

pub struct RequestContext {
    // Other fields...
    parent_request: Option<RequestMetadata>,
}
```

## Usage Examples

### Creating a Root Request Context

A root request is the initial request without a parent:

```rust
// Creating a root request context
let context = RequestContext::new(
    "node-123",   // Node ID
    "network-456", // Network ID
    None           // No parent request
);

// Using the context for a request
let response = service.request("some/path", ValueType::String("data".to_string()), &context).await?;
```

### Creating a Nested Request Context

For nested requests (service-to-service communication):

```rust
// Original request context
let parent_context = /* ... */;

// Creating a context for a nested request
let child_context = RequestContext::new(
    parent_context.node_id(),
    parent_context.network_id(),
    Some(RequestMetadata::from(parent_context))
);

// The nested request inherits metadata from the parent
assert_eq!(child_context.parent_request.unwrap().id, parent_context.id());
```

### Using a Lifecycle Context

For service lifecycle operations:

```rust
// Creating a lifecycle context
let lifecycle_context = LifecycleContext::new(
    "node-123",    // Node ID 
    "network-456"  // Network ID
);

// Using in service initialization
service.init(&lifecycle_context).await?;
```

## Request Tracing Flow

```mermaid
@include "../assets/images/request-context-flow.txt"
```

The diagram above illustrates how request contexts flow through the system:

1. A root request arrives with no parent context
2. Service A creates a child context when calling Service B
3. Service B creates another child context when calling Service C
4. Each context maintains a reference to its parent's metadata
5. This enables full request tracing through the entire call chain

## Key Benefits

1. **Clear separation of concerns**: Different context types for different operations
2. **Simplified API**: Each context type only provides what's needed
3. **Complete request tracing**: Full parent-child relationship tracking
4. **Type safety**: Compiler enforces correct context usage
5. **Improved testability**: Services can be tested with appropriate context types

## Best Practices

1. **Always pass the context**: Never create a new context unless starting a new request chain
2. **Use the right context type**: Use RequestContext for requests and LifecycleContext for lifecycle operations
3. **Don't modify context objects**: Treat contexts as immutable after creation
4. **Preserve request chains**: When making nested requests, always pass parent metadata
5. **Add relevant context fields**: Use context-aware logging to aid in debugging

## Implementation Details

The context system implementation ensures:

- Thread safety through the use of Arc/Mutex where needed
- Efficient context creation with minimal overhead
- Proper error propagation through context chains
- Serialization support for distributed tracing
- Integration with the logging system 

## Related Documentation

- Service Lifecycle - Understanding how context is used throughout the service lifecycle
- Request Handling - Best practices for using context in request handlers
- Logging System - How context integrates with the logging system
- ValueMap (VMap) - Working with structured data using VMap 