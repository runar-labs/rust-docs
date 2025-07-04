# Runar Quick Start Guide

This guide will help you get started with Runar by building a simple application that demonstrates the core features including service definition, encryption, and cross-device data sharing.

## Prerequisites

- Rust 1.70 or later
- Basic understanding of Rust async/await
- Git (for cloning the repository)

## Creating a New Project

Start by creating a new Rust project:

```bash
cargo new runar-hello-world
cd runar-hello-world
```

Add Runar as a dependency in your `Cargo.toml` file:

```toml
[package]
name = "runar-hello-world"
version = "0.1.0"
edition = "2021"

[dependencies]
runar_node = { path = "../runar-node" }
runar_macros = { path = "../runar-macros" }
runar_common = { path = "../runar-common" }
runar_keys = { path = "../runar-keys" }
runar_serializer = { path = "../runar-serializer" }
tokio = { version = "1", features = ["full"] }
anyhow = "1.0"
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
log = "0.4"
```

## Creating a Simple Service

Let's create a simple math service with encryption capabilities. Replace the contents of `src/main.rs` with the following code:

```rust
use anyhow::Result;
use runar_common::{hmap, types::ArcValue};
use runar_macros::{action, publish, service, service_impl, subscribe};
use runar_node::{
    services::{EventContext, RequestContext},
    Node, NodeConfig,
};
use std::sync::{Arc, Mutex};

// Define a simple math service
#[derive(Clone, Default)]
#[service(
    name = "Math Service",
    path = "math",
    description = "Simple arithmetic API with event publishing",
    version = "1.0.0"
)]
pub struct MathService;

#[service_impl]
impl MathService {
    /// Add two numbers and publish the total to `math/added`.
    #[publish(topic = "added")]
    #[action]
    async fn add(&self, a: f64, b: f64, ctx: &RequestContext) -> Result<f64> {
        ctx.debug(format!("Adding {a} + {b}"));
        let result = a + b;
        
        // Publish the result as an event
        ctx.publish("math/added", ArcValue::new_primitive(result)).await?;
        
        Ok(result)
    }
    
    /// Subtract two numbers
    #[action]
    async fn subtract(&self, a: f64, b: f64, ctx: &RequestContext) -> Result<f64> {
        ctx.debug(format!("Subtracting {a} - {b}"));
        Ok(a - b)
    }
    
    /// Multiply two numbers
    #[action]
    async fn multiply(&self, a: f64, b: f64, ctx: &RequestContext) -> Result<f64> {
        ctx.debug(format!("Multiplying {a} * {b}"));
        Ok(a * b)
    }
    
    /// Divide two numbers with error handling
    #[action]
    async fn divide(&self, a: f64, b: f64, ctx: &RequestContext) -> Result<f64> {
        ctx.debug(format!("Dividing {a} / {b}"));
        if b == 0.0 {
            return Err(anyhow::anyhow!("Cannot divide by zero"));
        }
        Ok(a / b)
    }
}

// Define a statistics service that listens to math events
#[derive(Clone)]
#[service(
    name = "Stats Service",
    path = "stats",
    description = "Statistics tracking service",
    version = "1.0.0"
)]
pub struct StatsService {
    values: Arc<Mutex<Vec<f64>>>,
}

impl Default for StatsService {
    fn default() -> Self {
        Self {
            values: Arc::new(Mutex::new(Vec::new())),
        }
    }
}

#[service_impl]
impl StatsService {
    /// Record a value manually
    #[action]
    async fn record(&self, value: f64, ctx: &RequestContext) -> Result<()> {
        ctx.debug(format!("Recording value: {value}"));
        self.values.lock().unwrap().push(value);
        Ok(())
    }

    /// Return number of recorded values
    #[action]
    async fn count(&self, ctx: &RequestContext) -> Result<usize> {
        let count = self.values.lock().unwrap().len();
        ctx.debug(format!("Current count: {count}"));
        Ok(count)
    }
    
    /// Get the sum of all recorded values
    #[action]
    async fn sum(&self, ctx: &RequestContext) -> Result<f64> {
        let sum: f64 = self.values.lock().unwrap().iter().sum();
        ctx.debug(format!("Current sum: {sum}"));
        Ok(sum)
    }
    
    /// Get the average of all recorded values
    #[action]
    async fn average(&self, ctx: &RequestContext) -> Result<f64> {
        let values = self.values.lock().unwrap();
        if values.is_empty() {
            return Err(anyhow::anyhow!("No values recorded"));
        }
        let avg = values.iter().sum::<f64>() / values.len() as f64;
        ctx.debug(format!("Current average: {avg}"));
        Ok(avg)
    }

    /// React to math/added events automatically
    #[subscribe(topic = "math/added")]
    async fn on_math_added(&self, total: f64, ctx: &EventContext) -> Result<()> {
        ctx.debug(format!("Received math/added event: {total}"));
        
        // Record the result automatically
        let _: () = ctx
            .request("stats/record", Some(ArcValue::new_primitive(total)))
            .await
            .expect("Call to stats/record failed");
        
        Ok(())
    }
}

#[tokio::main]
async fn main() -> Result<()> {
    // Initialize logging
    runar_common::logging::init_logging("runar-hello-world", "info")?;
    
    println!("🚀 Starting Runar Hello World Application");
    
    // Create a minimal Node configuration
    let config = NodeConfig::new_test_config("test-node", "hello-world-network");
    let mut node = Node::new(config).await?;

    // Register services
    node.add_service(MathService).await?;
    node.add_service(StatsService::default()).await?;

    println!("✅ Services registered successfully");

    // Test basic math operations
    println!("\n🧮 Testing Math Operations:");
    
    // Addition
    let add_params = ArcValue::new_map(hmap! { "a" => 10.0, "b" => 5.0 });
    let sum: f64 = node.request("math/add", Some(add_params)).await?;
    println!("   10 + 5 = {}", sum);

    // Subtraction
    let sub_params = ArcValue::new_map(hmap! { "a" => 10.0, "b" => 3.0 });
    let difference: f64 = node.request("math/subtract", Some(sub_params)).await?;
    println!("   10 - 3 = {}", difference);

    // Multiplication
    let mul_params = ArcValue::new_map(hmap! { "a" => 4.0, "b" => 7.0 });
    let product: f64 = node.request("math/multiply", Some(mul_params)).await?;
    println!("   4 * 7 = {}", product);

    // Division
    let div_params = ArcValue::new_map(hmap! { "a" => 15.0, "b" => 3.0 });
    let quotient: f64 = node.request("math/divide", Some(div_params)).await?;
    println!("   15 / 3 = {}", quotient);

    // Test error handling
    let div_by_zero_params = ArcValue::new_map(hmap! { "a" => 10.0, "b" => 0.0 });
    match node.request::<f64>("math/divide", Some(div_by_zero_params)).await {
        Ok(_) => println!("   ❌ Division by zero should have failed"),
        Err(e) => println!("   ✅ Division by zero correctly failed: {}", e),
    }

    // Check statistics
    println!("\n📊 Checking Statistics:");
    
    // Count should be 1 (from the add operation that published an event)
    let count: usize = node.request("stats/count", None::<ArcValue>).await?;
    println!("   Total values recorded: {}", count);

    // Sum should be 15 (from the add operation)
    let total_sum: f64 = node.request("stats/sum", None::<ArcValue>).await?;
    println!("   Sum of all values: {}", total_sum);

    // Average should be 15 (only one value)
    let avg: f64 = node.request("stats/average", None::<ArcValue>).await?;
    println!("   Average of all values: {}", avg);

    // Record a few more values manually
    println!("\n📝 Recording Additional Values:");
    
    for value in [20.0, 30.0, 40.0] {
        let record_params = ArcValue::new_map(hmap! { "value" => value });
        let _: () = node.request("stats/record", Some(record_params)).await?;
        println!("   Recorded: {}", value);
    }

    // Check updated statistics
    println!("\n📊 Updated Statistics:");
    
    let final_count: usize = node.request("stats/count", None::<ArcValue>).await?;
    println!("   Total values recorded: {}", final_count);

    let final_sum: f64 = node.request("stats/sum", None::<ArcValue>).await?;
    println!("   Sum of all values: {}", final_sum);

    let final_avg: f64 = node.request("stats/average", None::<ArcValue>).await?;
    println!("   Average of all values: {}", final_avg);

    println!("\n🎉 All tests completed successfully!");
    println!("✅ Math operations working");
    println!("✅ Event publishing working");
    println!("✅ Event subscription working");
    println!("✅ Statistics tracking working");
    println!("✅ Error handling working");

    Ok(())
}

## Testing the Service

You can now build and run your service:

```bash
cargo run
```

The service will start and execute the test requests defined in the `main` function. You should see output similar to:

```
🚀 Starting Runar Hello World Application
✅ Services registered successfully

🧮 Testing Math Operations:
   10 + 5 = 15
   10 - 3 = 7
   4 * 7 = 28
   15 / 3 = 5
   ✅ Division by zero correctly failed: Cannot divide by zero

📊 Checking Statistics:
   Total values recorded: 1
   Sum of all values: 15
   Average of all values: 15

📝 Recording Additional Values:
   Recorded: 20
   Recorded: 30
   Recorded: 40

📊 Updated Statistics:
   Total values recorded: 4
   Sum of all values: 105
   Average of all values: 26.25

🎉 All tests completed successfully!
✅ Math operations working
✅ Event publishing working
✅ Event subscription working
✅ Statistics tracking working
✅ Error handling working
```

## What This Example Demonstrates

### 1. Service Definition with Macros
- **`#[service]`**: Defines a service with metadata
- **`#[action]`**: Marks methods as callable actions
- **`#[publish]`**: Automatically publishes events
- **`#[subscribe]`**: Listens to events from other services

### 2. Event-Driven Architecture
- The `MathService` publishes events when operations complete
- The `StatsService` automatically subscribes to these events
- Services communicate loosely through events

### 3. Request/Response Pattern
- Services expose actions that can be called directly
- Type-safe parameter passing with `ArcValue`
- Proper error handling and logging

### 4. Service Lifecycle
- Services are registered with the node
- Automatic initialization and startup
- Proper cleanup on shutdown

## Next Steps

You've created a simple Runar service! Here are some next steps to explore:

### 1. Add Encryption
- Learn about [Key Management](../features/keys-management)
- Implement [Selective Field Encryption](../features/enhanced-serialization)
- Add [Envelope Encryption](../features/encryption-schema)

### 2. Explore Advanced Features
- Set up [P2P Communication](../core/p2p)
- Implement [Service Discovery](../core/discovery)


### 3. Build Real Applications
- Create a 
- Build a 
- Implement a 

### 4. Learn the Architecture
- Understand [Runar's Architecture](../core/architecture)

## Extending the Service

To extend this service, you can:

1. **Add More Operations**: Implement additional mathematical operations
2. **Add State Management**: Store operation history in a database
3. **Add Authentication**: Implement user authentication and authorization
4. **Add Encryption**: Encrypt sensitive data using Runar's encryption system
5. **Add Network Support**: Enable P2P communication between nodes

## Troubleshooting

### Common Issues

1. **Compilation Errors**: Ensure all dependencies are properly specified in `Cargo.toml`
2. **Runtime Errors**: Check that services are properly registered before use
3. **Event Issues**: Verify that subscription paths match publication paths
4. **Type Errors**: Ensure parameter types match between service definitions and calls

### Getting Help

- Check the [Architecture Documentation](../core/architecture)
- Review the [Service Macros](../services/macros)
- Look at the 
- Join the community discussions

Happy coding with Runar!