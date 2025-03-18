# Kagi Quick Start Guide

This guide will help you get started with Kagi by building a simple application.

## Creating a New Project

Start by creating a new Rust project:

```bash
cargo new kagi-hello-world
cd kagi-hello-world
```

Add Kagi as a dependency in your `Cargo.toml` file:

```toml
[dependencies]
kagi_node = "0.1.0"
kagi_macros = "0.1.0"
tokio = { version = "1", features = ["full"] }
anyhow = "1.0"
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
```

## Creating a Simple Service

Let's create a simple "greeting" service. Replace the contents of `src/main.rs` with the following code:

```rust
use kagi_node::prelude::*;
use kagi_node::macros::*;
use anyhow::Result;
use serde_json::json;

// Define a service
#[kagi::service(name = "greeter", description = "A greeting service")]
struct GreeterService {
    greeting_formats: std::collections::HashMap<String, String>,
}

impl GreeterService {
    // Constructor
    fn new() -> Self {
        let mut greeting_formats = std::collections::HashMap::new();
        greeting_formats.insert("standard".to_string(), "Hello, {}!".to_string());
        greeting_formats.insert("friendly".to_string(), "Hey there, {}! How are you?".to_string());
        greeting_formats.insert("formal".to_string(), "Good day, {}. It's a pleasure to meet you.".to_string());
        
        Self { greeting_formats }
    }
    
    // Action handler for generating greetings
    #[action("greet")]
    async fn greet(&self, _context: &RequestContext, 
                  #[param("name")] name: String,
                  #[param("format", default = "standard")] format: String) -> Result<ServiceResponse> {
        
        // Get the greeting format (default to standard if not found)
        let format_template = self.greeting_formats
            .get(&format)
            .unwrap_or(&self.greeting_formats["standard"])
            .clone();
        
        // Generate the greeting
        let greeting = format_template.replace("{}", &name);
        
        // Return the response
        Ok(ServiceResponse {
            status: ResponseStatus::Success,
            message: greeting.clone(),
            data: Some(vmap! {
                "greeting" => greeting,
                "format_used" => format
            }),
        })
    }
    
    // Action handler for adding new greeting formats
    #[action("add_format")]
    async fn add_format(&self, context: &RequestContext,
                       #[param("name")] name: String,
                       #[param("template")] template: String) -> Result<ServiceResponse> {
        
        // Add the new format
        {
            let mut formats = self.greeting_formats.clone();
            formats.insert(name.clone(), template.clone());
            self.greeting_formats = formats;
        }
        
        // Publish event about the new format
        let event_data = json!({
            "format_name": name,
            "template": template,
            "timestamp": chrono::Utc::now().to_rfc3339()
        });
        
        context.publish("greeter/format_added", event_data).await?;
        
        // Return success response
        Ok(ServiceResponse {
            status: ResponseStatus::Success,
            message: format!("Added new greeting format: {}", name),
            data: Some(vmap! {
                "name" => name,
                "template" => template
            }),
        })
    }
    
    // Event handler for demonstration
    #[subscribe("greeter/format_added")]
    async fn handle_format_added(&self, payload: serde_json::Value) -> Result<()> {
        if let (Some(name), Some(template)) = (
            payload.get("format_name").and_then(|v| v.as_str()),
            payload.get("template").and_then(|v| v.as_str())
        ) {
            println!("EVENT: New greeting format added: {} with template: {}", name, template);
        }
        Ok(())
    }
}

// Application entry point
#[kagi::main]
async fn main() -> Result<()> {
    // Create configuration
    let config = NodeConfig::new(
        "greeter_node",
        "./data",
        "./data/db",
    );
    
    // Create service
    let greeter_service = GreeterService::new();
    
    // Create and start the node
    Node::builder()
        .with_config(config)
        .add_service(greeter_service)
        .build_and_run()
        .await
}
```

## Running the Application

Build and run your application:

```bash
cargo run
```

This will start a Kagi node with your greeting service.

## Interacting with the Service

You can interact with your service using the Kagi CLI or by writing a client application.

### Using the Kagi CLI

Install the Kagi CLI if you haven't already:

```bash
cargo install kagi-cli
```

Send a request to your service:

```bash
kagi-cli request greeter greet --param name="World"
```

You should see a response with the greeting "Hello, World!".

Try different formats:

```bash
kagi-cli request greeter greet --param name="World" --param format="friendly"
```

Add a new greeting format:

```bash
kagi-cli request greeter add_format --param name="enthusiastic" --param template="WOW!!! {} !!! AMAZING!!!"
```

Test the new format:

```bash
kagi-cli request greeter greet --param name="World" --param format="enthusiastic"
```

## Next Steps

You've created a simple Kagi service! Here are some next steps to explore:

- Learn about [Kagi's Architecture](../core/architecture)
- Understand [Service Definition](../development/macros)
- Explore [Action Handlers](../services/api#action-handlers)
- Set up [Event Subscriptions](../services/api#event-system)
- Build a [Complete Example Service](getting-started/example)

Happy coding with Kagi!