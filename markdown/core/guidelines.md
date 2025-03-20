# Runar Architectural Guidelines

This document outlines the key architectural patterns and guidelines for developing services using the Runar framework.

## Service Architecture

The Runar framework is built around a service-based architecture where each service:

1. Implements the `AbstractService` trait
2. Is registered with the Node using `add_service()`
3. Handles requests through operations
4. Communicates with other services through events

## Key Architectural Patterns

### 1. Service Registration

Services must be registered with the Node using the `add_service()` method:

```rust
// ✅ CORRECT: Register service with add_service
node.add_service(service).await?;

// ❌ INCORRECT: Do not use lower-level registry methods
node.service_registry().register_service(service).await?;
```

### 2. Service Implementation

Services should implement the `AbstractService` trait either directly or using the `#[service]` macro:

```rust
// Option 1: Using the service macro
#[service(name = "my_service", path = "my_service")]
struct MyService {
    // service state
}

// Option 2: Manual implementation
#[async_trait]
impl AbstractService for MyService {
    fn name(&self) -> &str { "my_service" }
    fn path(&self) -> &str { "/my_service" }
    // ...other required methods
}
```

### 3. Request Handling

Requests should use the `service/operation` format:

```rust
// ✅ CORRECT: Use service/operation format
let response = context.request("my_service/get_data", params).await?;

// ❌ INCORRECT: Do not use path and operation separately
let response = context.call("my_service", "get_data", params).await?;
```

### 4. Parameter Handling

Parameters should be extracted using the `vmap!` macro:

```rust
// ✅ CORRECT: Extract parameters with vmap!
let id = vmap!(params, "id" => String::new())?;
let count = vmap!(params, "count" => 10i32)?;

// ❌ INCORRECT: Do not manually parse parameters
let id = params.get("id").and_then(|v| v.as_str()).unwrap_or_default();
```

### 5. Event Handling

Services should subscribe to events using the `#[subscribe]` macro and publish events using the `#[publish]` macro:

```rust
// ✅ CORRECT: Subscribe to events
#[subscribe(topic = "user_created")]
async fn handle_user_created(&mut self, payload: ValueType) -> Result<()> {
    // handle event
}

// ✅ CORRECT: Publish events
#[publish(topic = "item_updated")]
async fn update_item(&self, ctx: &RequestContext, id: &str) -> Result<Item> {
    // update item
}
```

## Macro Usage Guidelines

### Service Macro

The `#[service]` macro simplifies service implementation:

```rust
#[service(
    name = "my_service",       // Service name (default: struct name in snake_case)
    path = "my_path",          // Path for routing (default: name)
    description = "My service", // Human-readable description
    version = "1.0.0"          // Version string
)]
struct MyService {
    // Service state
}
```

### Action Macro

The `#[action]` macro marks methods as service operations:

```rust
#[action(name = "custom_name")] // Optional custom name
async fn get_data(&self, ctx: &RequestContext, id: &str) -> Result<Data> {
    // Implementation
}
```

Required action method signature:
- First parameter must be `&self` or `&mut self`
- Second parameter must be `&RequestContext` or a similar context type
- Return type must be `Result<T, E>` where `T` is the success type

### Subscribe Macro

The `#[subscribe]` macro registers event handlers:

```rust
#[subscribe(topic = "event_name")]
async fn handle_event(&mut self, payload: ValueType) -> Result<()> {
    // Handle event
}
```

Requirements:
- Service must implement `Clone`
- Handler must be an async method returning `Result<()>`
- Handler must take `&mut self` and a `ValueType` parameter

### Publish Macro

The `#[publish]` macro automatically publishes events:

```rust
#[publish(topic = "item_updated")]
async fn update_item(&self, ctx: &RequestContext, id: &str) -> Result<Item> {
    // Update the item
    // The result will be automatically published as an event
}
```

## Common Patterns

### Service Registration

```rust
async fn main() -> anyhow::Result<()> {
    let mut node = Node::new(config).await?;
    
    // Create services
    let service1 = Service1::new();
    let service2 = Service2::new();
    
    // Register services
    node.add_service(service1).await?;
    node.add_service(service2).await?;
    
    // Start the node
    node.start().await?;
    
    Ok(())
}
```

### Service Communication

```rust
// Service 1 publishes events
#[publish(topic = "data_updated")]
async fn update_data(&self, ctx: &RequestContext, id: &str) -> Result<Data> {
    // Update data
    Ok(updated_data)
}

// Service 2 subscribes to events
#[subscribe(topic = "data_updated")]
async fn handle_data_update(&mut self, payload: ValueType) -> Result<()> {
    // Extract data from payload
    let id = vmap!(payload, "id" => String::new())?;
    
    // Process event
    Ok(())
}
``` 