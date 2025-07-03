# Services in Runar

Services are the core building blocks of Runar applications. They provide functionality that can be called by other services or external clients, and they can communicate with each other through events.

## What is a Service?

A service in Runar is a Rust struct that:
- **Exposes actions** that can be called remotely
- **Publishes events** to notify other services
- **Subscribes to events** from other services
- **Manages its own state** and lifecycle

Think of services as microservices that can run locally or be distributed across a network of nodes.

## Quick Example

Here's a simple service that provides math operations:

```rust
use runar_macros::{service, action, publish, subscribe};
use anyhow::Result;

#[service(name = "math", path = "math")]
pub struct MathService;

#[service_impl]
impl MathService {
    #[action]
    pub fn add(&self, a: f64, b: f64) -> Result<f64> {
        let result = a + b;
        
        // Publish an event when addition completes
        self.publish_math_operation("add", a, b, result)?;
        
        Ok(result)
    }
    
    #[action]
    pub fn multiply(&self, a: f64, b: f64) -> Result<f64> {
        let result = a * b;
        self.publish_math_operation("multiply", a, b, result)?;
        Ok(result)
    }
    
    #[publish(topic = "math/operation")]
    fn publish_math_operation(&self, operation: &str, a: f64, b: f64, result: f64) -> Result<()> {
        // This method automatically publishes events
        Ok(())
    }
}
```

## Service Macros

Runar provides several macros to make service development simple and declarative:

### `#[service]` - Service Definition

The `#[service]` macro defines a service and automatically implements the `AbstractService` trait:

```rust
#[service(name = "user_service", path = "user_service")]
pub struct UserService {
    users: HashMap<String, User>,
}

#[service_impl]
impl UserService {
    // Actions and event handlers go here
}
```

**Service Attributes:**
- `name`: The service name (used in routing)
- `version`: Optional version string
- `description`: Optional service description

### `#[action]` - Expose Methods

The `#[action]` macro makes methods callable from other services or clients:

```rust
#[action]
pub fn create_user(&self, username: String, email: String) -> Result<String> {
    // Method logic here
    Ok(user_id)
}
```

**Action Features:**
- **Type Safety**: Parameters and return types are preserved
- **Error Handling**: `Result<T>` automatically becomes error responses
- **Async Support**: Methods can be `async`
- **Context Access**: Automatically receives `RequestContext` if needed

### `#[publish]` - Event Publishing

The `#[publish]` macro automatically publishes events when methods are called:

```rust
#[publish(topic = "user/created")]
pub fn create_user(&self, username: String, email: String) -> Result<String> {
    let user_id = self.internal_create_user(username, email)?;
    Ok(user_id) // This automatically publishes the event
}
```

**Publishing Features:**
- **Automatic**: Events are published when methods return `Ok`
- **Topic Routing**: Events are sent to the specified topic
- **Data Serialization**: Return values are automatically serialized
- **Network Distribution**: Events can be distributed across the network

### `#[subscribe]` - Event Handling

The `#[subscribe]` macro sets up event handlers:

```rust
#[subscribe(topic = "user/created")]
async fn on_user_created(&self, user_data: ArcValue) -> Result<()> {
    // Handle the user creation event
    let user: User = user_data.as_type()?;
    self.notify_admin(&user).await?;
    Ok(())
}
```

**Subscription Features:**
- **Topic Matching**: Supports wildcards like `user/*`
- **Async Support**: Handlers can be async
- **Type Safety**: Events are automatically deserialized
- **Multiple Handlers**: One service can subscribe to many topics

## Service Communication Patterns

### 1. Request/Response

Services can call each other directly:

```rust
// Service A calls Service B
let result: f64 = node.request("math/add", Some(ArcValue::new_map(hmap! {
    "a" => 10.0,
    "b" => 5.0
}))).await?;
```

### 2. Event-Driven

Services communicate through events:

```rust
// Service A publishes an event
#[publish(topic = "order/created")]
pub fn create_order(&self, order: Order) -> Result<String> {
    // Order creation logic
    Ok(order_id)
}

// Service B subscribes to the event
#[subscribe(topic = "order/created")]
async fn on_order_created(&self, order_data: ArcValue) -> Result<()> {
    let order: Order = order_data.as_type()?;
    self.send_notification(&order).await?;
    Ok(())
}
```

## Service Lifecycle

Services go through several lifecycle phases:

1. **Creation**: Service struct is instantiated
2. **Initialization**: `#[service_impl]` methods are called
3. **Registration**: Service is registered with the node
4. **Startup**: Service begins processing requests and events
5. **Running**: Service is active and handling operations
6. **Shutdown**: Service stops gracefully

## Best Practices

### 1. Service Design

- **Single Responsibility**: Each service should have one clear purpose
- **Stateless**: Services should be stateless when possible
- **Idempotent**: Actions should be safe to retry
- **Versioning**: Use service versions for breaking changes

### 2. Error Handling

```rust
#[action]
pub fn divide(&self, a: f64, b: f64) -> Result<f64> {
    if b == 0.0 {
        anyhow::bail!("Cannot divide by zero");
    }
    Ok(a / b)
}
```

### 3. Event Design

- **Use Descriptive Topics**: `user/created` not just `event1`
- **Include Relevant Data**: Events should contain useful information
- **Handle Failures**: Event handlers should be resilient

### 4. Performance

- **Async Operations**: Use async for I/O operations
- **Batch Processing**: Group related operations when possible
- **Caching**: Cache frequently accessed data

## Migration from Legacy APIs

Older docs & examples used types like `ValueType`, manual `ServiceRequest/Response`, and custom `handle_request` functions. All of these are now obsolete:

| Legacy Concept | Modern Replacement |
|----------------|-------------------|
| `ValueType` | `ArcValue` (zero-copy, thread-safe wrapper) |
| `ServiceRequest/Response` | Direct parameters + return values |
| Manual `handle_request` | `#[action]` macro |
| Manual subscription setup | `#[subscribe]` macro |
| Manual service registration | `#[service]` macro |

## Next Steps

- **Try the Example**: See [Example Service](example-service.md) for a complete working example
- **Learn About Events**: Understand [Event Publishing and Subscriptions](#event-driven)

- **Add Encryption**: Learn about [Key Management](../features/keys-management) and [Envelope Encryption](../features/encryption-schema) 