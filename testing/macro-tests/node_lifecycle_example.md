# Node Lifecycle Example with Macros

This document provides a complete example of how to use the Runar macros with the correct Node lifecycle.

## Complete Example

```rust
use anyhow::Result;
use runar_common::types::ValueType;
use runar_macros::{action, service, subscribe};
use runar_node::node::{Node, NodeConfig};
use runar_node::services::RequestContext;
use tokio::sync::RwLock;
use std::sync::Arc;

// Define a service using macros
#[service(
    name = "example_service",
    description = "An example service showing macro usage",
    version = "1.0.0"
)]
struct ExampleService {
    counter: Arc<RwLock<i32>>,
}

impl ExampleService {
    pub fn new() -> Self {
        Self {
            counter: Arc::new(RwLock::new(0)),
        }
    }
    
    // Define an action
    #[action(name = "increment")]
    async fn increment(&self, _ctx: &RequestContext, value: i32) -> Result<i32> {
        let mut counter = self.counter.write().await;
        *counter += value;
        Ok(*counter)
    }
    
    // Define another action
    #[action(name = "get_count")]
    async fn get_count(&self, _ctx: &RequestContext) -> Result<i32> {
        let counter = self.counter.read().await;
        Ok(*counter)
    }
    
    // Define an event subscription
    #[subscribe(topic = "counter/events")]
    async fn handle_counter_event(&self, payload: ValueType) -> Result<()> {
        println!("Received counter event: {:?}", payload);
        Ok(())
    }
}

impl Clone for ExampleService {
    fn clone(&self) -> Self {
        Self {
            counter: self.counter.clone(),
        }
    }
}

// Main function to run the node
async fn main() -> Result<()> {
    // 1. Create a node with configuration
    let config = NodeConfig::new("example-network", "./data", "./data/db");
    let mut node = Node::new(config).await?;
    
    // 2. Initialize the node
    node.init().await?;
    
    // 3. Create and register our service
    let service = ExampleService::new();
    node.add_service(service).await?;
    
    // 4. Start the node and all services
    node.start().await?;
    
    println!("Node is running...");
    
    // 5. Use our service through the node API
    let result = node.request("example_service/increment", 5).await?;
    println!("Increment result: {:?}", result);
    
    let count = node.request("example_service/get_count", ValueType::Null).await?;
    println!("Current count: {:?}", count);
    
    // Publish an event that our service will receive
    node.publish("counter/events", "Event payload").await?;
    
    // Wait a bit to see the event handling
    tokio::time::sleep(tokio::time::Duration::from_secs(1)).await;
    
    // 6. Stop the node gracefully
    node.stop().await?;
    
    println!("Node stopped");
    
    Ok(())
}
```

## Key Points

1. **Order of Operations**:
   - Create node with `Node::new()`
   - Initialize with `node.init()`
   - Register services with `node.add_service()`
   - Start the node with `node.start()`
   - Stop the node with `node.stop()`

2. **Using Macros**:
   - `#[service]` - Define a service with metadata
   - `#[action]` - Expose methods as callable actions
   - `#[subscribe]` - Register methods to receive events

3. **Service Requirements**:
   - Services using `#[subscribe]` must implement `Clone`
   - Actions should take `&self` and `&RequestContext`
   - Return types should be `Result<T>`

4. **Node API**:
   - Use `node.request()` to call actions
   - Use `node.publish()` to publish events
   - Use `node.subscribe()` to subscribe to events

## Testing Checklist

When testing macros, ensure:

1. Services are properly registered and discoverable
2. Actions can be called with both direct and mapped parameters
3. Event subscriptions receive published events
4. Error handling works correctly
5. The full node lifecycle works end-to-end 