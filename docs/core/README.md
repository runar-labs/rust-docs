# Runar Core Documentation

This directory contains documentation for the core components of the Runar architecture. These documents explain the fundamental abstractions and systems that power the Runar node.

## Core Components

### [Context System](context.md)
The Context System enables secure and traceable communication between services. It provides:
- Request and lifecycle contexts for different operations
- Request metadata for tracing request chains
- Common interface for shared functionality

### [ValueMap (VMap)](vmap.md)
VMap is a core abstraction for working with structured data that:
- Provides type-safe parameter extraction
- Reduces boilerplate code through intuitive macros
- Offers comprehensive error handling
- Integrates with Runar's value type system

### [Logging System](logging.md)
The Logging System provides a consistent, context-aware logging interface that:
- Works seamlessly in both asynchronous and synchronous code
- Automatically includes contextual metadata
- Supports structured logging for better filtering and analysis
- Manages ID truncation for improved readability

### [Request Handling](request_handling.md)
The Request Handling document outlines best practices for service implementations:
- Guidelines for implementing the `handle_request` method
- Patterns for clean operation delegation
- Best practices for data format handling (JSON vs VMap)
- Recommendations for context-aware logging in request handlers

### [Service Lifecycle](lifecycle.md)
The Service Lifecycle document details:
- Service state transitions (Created, Initialized, Running, Stopped)
- Best practices for implementing lifecycle methods
- Proper subscription setup during initialization
- Common anti-patterns to avoid in service implementation

## Core Concepts Relationships

Understanding how these core components relate to each other is essential for effective Runar development:

1. **Service Lifecycle → Request Handling**:
   - Services follow a lifecycle (create → initialize → run → stop)
   - Request handling occurs during the "Running" state
   - Initialization (including subscription setup) must complete before handling requests

2. **Context System → Logging/Request Handling**:
   - Context provides the foundation for both logging and request handling
   - RequestContext carries metadata across service boundaries
   - LifecycleContext provides context during initialization and other lifecycle events

3. **VMap → Request Handling**:
   - VMap provides type-safe parameter extraction in request handlers
   - It integrates with both JSON and Map formats used in service requests

4. **Logging → All Components**:
   - The logging system integrates with all other components
   - Context-aware logging provides traceability across service boundaries
   - Structured logging enables better operational insights

This diagram illustrates the relationships:

```
┌─────────────────┐       ┌─────────────────┐
│ Service         │       │ Request         │
│ Lifecycle       ├───────► Handling        │
└────────┬────────┘       └───────┬─────────┘
         │                         │
         │                         │
         │        ┌────────────────▼────────────────┐
         │        │                                 │
         └────────►           Context               │
                  │                                 │
         ┌────────►                                 │
         │        └───┬─────────────────┬───────────┘
┌────────▼────────┐   │                 │    ┌─────────────────┐
│                 │   │                 │    │                 │
│     Logging     │   │                 │    │     VMap        │
│                 │   │                 │    │                 │
└─────────────────┘   │                 │    └─────────────────┘
                      │                 │              ▲
                      │                 │              │
                      └─────────────────┼──────────────┘
                                        │
                                        ▼
                                   Service
                                   Requests
```

## Common Anti-Patterns to Avoid

When developing services in Runar, be aware of these common anti-patterns that can lead to inefficient or problematic code:

### Subscription Setup During Request Handling

**Anti-Pattern**: Setting up or checking subscriptions during request handling rather than during initialization.

```rust
// DON'T DO THIS: Checking subscriptions on every request
async fn handle_request(&self, request: ServiceRequest) -> Result<ServiceResponse> {
    self.ensure_subscriptions(&request.request_context).await?;
    // ...
}
```

**Best Practice**: Set up all subscriptions during the `init` lifecycle method.

```rust
// DO THIS: Set up subscriptions during initialization
async fn init(&mut self, context: &RequestContext) -> Result<()> {
    self.setup_subscriptions(context).await?;
    // ...
}
```

### Unnecessary Data Format Conversions

**Anti-Pattern**: Converting data between formats (JSON to VMap or vice versa) when not necessary.

**Best Practice**: Process data in its original format when possible, especially when just passing it through or accessing a few fields.

### Complex Logic in `handle_request`

**Anti-Pattern**: Implementing complex business logic directly in the `handle_request` method.

**Best Practice**: Keep `handle_request` focused on operation routing, delegating to specialized methods for each operation.

For detailed explanations and examples of these anti-patterns, refer to the specific documentation pages.

## Diagrams

The documentation includes Mermaid diagrams to visualize key concepts:
- Request Context Flow: How context propagates through service requests
- VMap Data Flow: How data flows through the VMap system
- Logging Flow: How the logging system processes log entries
- Service Lifecycle: State transitions during a service's lifecycle

## Related Documentation

For more information on the overall architecture, see:
- [Architecture Overview](architecture.md)
- [P2P Communication](p2p.md)
- [Service Discovery](discovery.md)
- [System Diagrams](system-diagrams.md)

## Contributing to Documentation

When updating or creating documentation in the Runar core system, please follow these guidelines to maintain consistency:

### Documentation Structure

Each core documentation file should include these standard sections:

1. **Title** - Clear title describing the component
2. **Overview** - Brief introduction to the component and its purpose
3. **Key Features/Components** - Bulleted list of main capabilities
4. **Detailed Sections** - In-depth explanation of specific aspects
5. **Best Practices** - Guidelines for effective use
6. **Implementation Details** - Technical information about the implementation
7. **Related Documentation** - Cross-references to related documentation

### Cross-Referencing

- Always include a "Related Documentation" section with links to related files
- Use relative links: `[Title](filename.md)`
- Provide a brief description of why the related document is relevant

### Visual Elements

- Include diagrams where they add value (preferably using Mermaid)
- Keep ASCII diagrams simple and clear
- Ensure diagrams have explanatory text

### Code Examples

- Always include practical code examples
- Provide both basic and advanced usage examples
- Use consistent formatting with syntax highlighting
- Include comments in code examples

By following these guidelines, we can maintain a high-quality, consistent documentation set that helps developers effectively use the Runar framework. 