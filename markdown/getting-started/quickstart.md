# Runar Quick Start Guide

This guide will help you get started with Runar by building a simple application.

## Creating a New Project

Start by creating a new Rust project:

```bash
cargo new runar-hello-world
cd runar-hello-world
```

Add Runar as a dependency in your `Cargo.toml` file:

```toml
[dependencies]
runa_node = { path = "../runa-node" }
runa_macros = { path = "../runa-macros" }
runa_common = { path = "../runa-common" }
tokio = { version = "1", features = ["full"] }
anyhow = "1.0"
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
futures = "0.3"
```

## Creating a Simple Service

Let's create a simple math service. Replace the contents of `src/main.rs` with the following code:

```rust
use anyhow::Result;
use futures::lock::Mutex;
use runar_common::types::ArcValueType;
use runar_macros::{action, service};
use runar_node::services::RequestContext;
use std::collections::HashMap;
use std::sync::Arc;

// Define a service
#[service(
    name = "math",
    path = "math"
)]
struct MathService {
    store: Arc<Mutex<HashMap<String, ArcValueType>>>,
}

impl MathService {
    // Constructor
    fn new() -> Self {
        Self {
            store: Arc::new(Mutex::new(HashMap::new())),
        }
    }
    
    // Simple addition action
    #[action]
    async fn add(&self, a: f64, b: f64, _ctx: &RequestContext) -> Result<f64> {
        Ok(a + b)
    }
    
    // Subtraction action with custom path
    #[action(path = "subtract")]
    async fn sub(&self, a: f64, b: f64, _ctx: &RequestContext) -> Result<f64> {
        Ok(a - b)
    }
    
    // Multiplication with error handling
    #[action]
    async fn multiply(&self, a: f64, b: f64, _ctx: &RequestContext) -> Result<f64> {
        Ok(a * b)
    }
    
    // Division with error handling
    #[action]
    async fn divide(&self, a: f64, b: f64, _ctx: &RequestContext) -> Result<f64> {
        if b == 0.0 {
            return Err(anyhow::anyhow!("Cannot divide by zero"));
        }
        Ok(a / b)
    }
}

#[tokio::main]
async fn main() -> Result<()> {
    // Create a node configuration
    let mut config = runar_node::config::NodeConfig::new("math-node", "test-network");
    
    // Disable networking for this simple example
    config.network_config = None;
    
    // Create the node
    let mut node = runar_node::Node::new(config).await?;
    
    // Create and add our math service
    let math_service = MathService::new();
    node.add_service(math_service).await?;
    
    // Start the node
    node.start().await?;
    
    // Make some test requests
    let params = runar_common::hmap! {
        "a" => 10.0,
        "b" => 5.0
    };
    
    // Test addition
    if let Ok(Some(result)) = node.request("math/add", Some(params.into())).await {
        println!("10 + 5 = {}", result);
    }
    
    // Keep the node running
    tokio::signal::ctrl_c().await?;
    
    // Stop the node
    node.stop().await?;
    
    Ok(())
}

## Testing the Service

You can now build and run your service:

```bash
cargo run
```

The service will start and execute the test requests defined in the `main` function, which includes a simple addition operation. You should see output similar to:

```
10 + 5 = 15
```

## Next Steps

You've created a simple Runar service! Here are some next steps to explore:

- Learn about [Runar's Architecture](../core/architecture)
- Understand [Service Definition](../development/macros)
- Explore [Action Handlers](../services/api#action-handlers)
- Set up [Event Subscriptions](../services/api#event-system)
- Check out the [Examples](../examples) for more complex use cases

## Extending the Service

To extend this service, you can:

1. Add more mathematical operations
2. Implement event publishing for operations
3. Add state management using the provided store
4. Create client applications that connect to the service

Happy coding with Runar!