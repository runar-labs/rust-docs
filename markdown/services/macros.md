# KAGI Service and Action Macros

This document provides a comprehensive reference for using the service and action macros in the KAGI framework.

## Table of Contents

- [Service Macro](#service-macro)
- [Action Macro](#action-macro)
- [Subscribe Macro](#subscribe-macro)
- [Value Handling](#value-handling)
- [Example Usage](#example-usage)
- [Best Practices](#best-practices)

## Service Macro

The `#[service]` macro automates the implementation of the `AbstractService` trait, reducing boilerplate and providing a clean API for service definition.

### Syntax

```rust
#[service(
    name = "service_name",
    path = "service_path",
    description = "Service description",
    version = "1.0.0"
)]
struct MyService {
    // Service state fields
}
```

### Parameters

| Parameter | Required | Default | Description |
|-----------|----------|---------|-------------|
| `name` | No | Struct name in snake_case | The display name of the service |
| `path` | No | Same as `name` | The routing path for this service |
| `description` | No | Empty string | Human-readable description |
| `version` | No | "0.1.0" | Version string |

### Generated Implementations

The macro generates implementations for:

1. **name()**: Returns the service name
2. **path()**: Returns the routing path
3. **description()**: Returns the service description
4. **init()**: Initializes the service and sets up subscriptions
5. **handle_request()**: Routes requests to the appropriate action handlers

## Action Macro

The `#[action]` macro defines a method as an action handler that can be invoked via the node API.

### Syntax

```rust
#[action(name = "action_name")]
async fn my_action(&self, context: &RequestContext, param: &str) -> Result<String> {
    // Implementation
    Ok("Result data".to_string())
}
```

### Parameters

| Parameter | Required | Default | Description |
|-----------|----------|---------|-------------|
| `name` | Yes | N/A | The name of the action, used in API requests |

### Return Types

Action methods should return `Result<T>` where `T` is the actual data type. The macro automatically wraps the result in a `ServiceResponse` with:

- `Success` status and the returned value for successful results
- `Error` status and error message for failed results

Supported return types include:

- `Result<String>`
- `Result<u32>`, `Result<i32>`, `Result<f64>`, etc.
- `Result<bool>`
- `Result<Vec<T>>` where T can be serialized
- `Result<HashMap<K, V>>` where K and V can be serialized
- `Result<CustomStruct>` where CustomStruct implements Into<ValueType> 

You do not need to manually create a `ServiceResponse` - simply return your data!

### Parameter Patterns

The `#[action]` macro supports several parameter patterns:

1. **Context + Value Parameters**:
   ```rust
   #[action(name = "transform")]
   async fn transform(&self, context: &RequestContext, data: &str) -> Result<String> {
       // data is extracted from the params
       Ok(data.to_uppercase())
   }
   ```

2. **Multiple Parameters**:
   ```rust
   #[action(name = "combine")]
   async fn combine(&self, context: &RequestContext, first: &str, second: &str) -> Result<String> {
       Ok(format!("{} {}", first, second))
   }
   ```

3. **Self-mutating Actions**:
   ```rust
   #[action(name = "increment")]
   async fn increment_counter(&mut self, context: &RequestContext, value: u32) -> Result<u32> {
       self.counter += value;
       Ok(self.counter)
   }
   ```

## Subscribe Macro

The `#[subscribe]` macro registers a method to handle events published on a specific topic.

### Syntax

```rust
#[subscribe(topic = "event_topic")]
async fn handle_event(&mut self, payload: ValueType) -> Result<()> {
    // Handle the event
    Ok(())
}
```

### Parameters

| Parameter | Required | Default | Description |
|-----------|----------|---------|-------------|
| `topic` | Yes | N/A | The topic to subscribe to |

### Topic Resolution

Topic strings can be specified in two ways:

1. **Short form**: When you specify just the topic name (e.g., `"data_event"`), it will be prefixed with the service path. For example, if your service path is "my_service", the full topic will be "my_service/data_event".

2. **Full path**: You can specify the full topic path (e.g., `"other_service/event_type"`) to subscribe to events from other services.

### Event Handler Requirements

Event handler methods must:
1. Be async
2. Take a `ValueType` parameter containing the event payload
3. Return `Result<()>`
4. Be part of a service that implements `Clone`

## Value Handling

### Using the vmap! Macro

The `vmap!` macro provides a clean way to extract values from `ValueType` objects:

```rust
// Extract a field with default
let data = vmap!(payload, "data" => String::new());

// Extract a direct value with default
let value = vmap!(response.data, => 0);
```

### ValueType Extraction

Different data types can be extracted using the `vmap!` macro:

```rust
// String extraction
let text = vmap!(payload, "message" => "default text");

// Numeric extraction
let count = vmap!(payload, "count" => 0);

// Boolean extraction
let enabled = vmap!(payload, "enabled" => false);

// Array extraction (default empty Vec)
let items = vmap!(payload, "items" => Vec::<ValueType>::new());
```

## Example Usage

### Service Definition

```rust
#[service(
    name = "data",
    description = "Data processing service",
    version = "1.0.0"
)]
struct DataProcessorService {
    counter: u32,
}

impl DataProcessorService {
    pub fn new() -> Self {
        Self { counter: 0 }
    }
    
    #[action(name = "transform")]
    async fn transform(&self, context: &RequestContext, data: &str) -> Result<String> {
        // Transform the data
        let transformed = data.to_uppercase();
        
        // Publish an event
        let event_data = vmap! {
            "source" => "transform",
            "data" => transformed.clone()
        };
        context.publish("data/events", event_data).await?;
        
        // Return the transformed data directly
        Ok(transformed)
    }
    
    #[action(name = "increment")]
    async fn increment_counter(&mut self, context: &RequestContext, value: u32) -> Result<u32> {
        self.counter += value + 1;
        Ok(self.counter)
    }
}
```

### Event Handling

```rust
#[service(
    name = "EventHandler",
    path = "events"
)]
struct EventHandlerService {
    events_received: Vec<String>,
}

impl EventHandlerService {
    pub fn new() -> Self {
        Self { events_received: Vec::new() }
    }
    
    #[subscribe(topic = "data/events")]
    async fn handle_data_event(&mut self, payload: ValueType) -> Result<()> {
        let data = vmap!(payload, "data" => String::new());
        if !data.is_empty() {
            println!("Received event: {}", data);
            self.events_received.push(data);
        }
        Ok(())
    }
    
    #[action(name = "get_events")]
    async fn get_events(&self, _context: &RequestContext) -> Result<Vec<ValueType>> {
        let events = self.events_received.iter()
            .map(|e| ValueType::String(e.clone()))
            .collect::<Vec<ValueType>>();
        
        Ok(events)
    }
}

// Required for subscription handlers
impl Clone for EventHandlerService {
    fn clone(&self) -> Self {
        Self {
            events_received: self.events_received.clone(),
        }
    }
}
```

### Making Requests

```rust
// Create and initialize a node
let mut node = Node::new(config).await?;
node.init().await?;

// Add services
let data_processor = DataProcessorService::new();
let event_handler = EventHandlerService::new();
node.add_service(data_processor).await?;
node.add_service(event_handler).await?;
node.start().await?;

// For actions with a single parameter, you can pass the value directly
let transform_result = node.request(
    "data/transform",
    "hello world"  // Direct parameter value
).await?;

// Or use vmap! for explicit parameter naming
let transform_result_alt = node.request(
    "data/transform",
    vmap! { "data" => "hello world" }
).await?;

// For multiple parameters, use vmap!
let combine_result = node.request(
    "data/combine",
    vmap! {
        "first" => "john",
        "second" => "doe"
    }
).await?;

// Extract response values using vmap!
let transformed_data = vmap!(transform_result.data, => String::new());
```

### Publishing Events

```rust
// Publish an event directly
node.publish(
    "custom/topic",
    vmap! {
        "message" => "Direct publish event",
        "timestamp" => chrono::Utc::now().to_rfc3339()
    }
).await?;
```

## Best Practices

1. **Return Types**: Return domain-specific types like `Result<String>` instead of wrapping in `ServiceResponse`.

2. **Parameter Handling**: Make parameter names descriptive and match the method parameter names.

3. **Event Topics**: Use structured topic hierarchies like `"service/event_type"`.

4. **Value Extraction**: Use the `vmap!` macro for cleaner parameter extraction.

5. **Service Cloning**: Always implement `Clone` for services that use `#[subscribe]`.

6. **Error Handling**: Return `Result<T>` from actions - errors will be automatically converted to error responses.

7. **Subscriptions**: Register all subscriptions during the service initialization.

8. **Context Usage**: Use the `context` parameter for operations that need service context, like publishing events or making requests to other services.

9. **Service State**: Use mutable references (`&mut self`) for actions that change service state.

10. **API Design**: Design service APIs with the consumer in mind, using intuitive operation names and parameter structures. 