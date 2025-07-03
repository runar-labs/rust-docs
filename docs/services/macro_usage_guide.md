# Macro Usage Guide: Current Simplified Implementation

This guide explains how to use the simplified macros in the Runar framework. The macros have been temporarily simplified to pass through their inputs without adding complex functionality, which means you'll need to manually implement certain aspects that were previously automated.

## Overview of Current Approach

In the current implementation:

1. The macros primarily serve as markers for service structures and methods
2. You need to manually implement the `AbstractService` trait for service structs
3. You need to manually wire up action handlers and event subscriptions

## Service Macro

The `#[service]` macro currently just marks a struct as a Runar service:

```rust
#[service(
    name = "example_service",
    description = "Example service that demonstrates the simplified macro approach",
    version = "1.0.0"
)]
pub struct ExampleService {
    counter: u32,
}
```

### Manual Implementation

You need to manually implement the `AbstractService` trait:

```rust
impl AbstractService for ExampleService {
    fn name(&self) -> &str {
        "example_service"
    }

    fn description(&self) -> &str {
        "Example service that demonstrates the simplified macro approach"
    }

    fn version(&self) -> &str {
        "1.0.0"
    }

    async fn init(&mut self) -> Result<(), anyhow::Error> {
        // Initialize your service here
        // Set up any event subscriptions
        Ok(())
    }

    async fn handle_request(&self, request: ServiceRequest) -> Result<ServiceResponse, anyhow::Error> {
        // Manually dispatch to action handlers based on operation name
        match request.operation.as_str() {
            "get_counter" => self.get_counter(request).await,
            "increment_counter" => self.increment_counter(request).await,
            _ => Err(anyhow::anyhow!("Unknown operation: {}", request.operation)),
        }
    }
}
```

## Action Macro

The `#[action]` macro currently just marks a method as a service action:

```rust
#[action]
async fn get_counter(&self, request: ServiceRequest) -> Result<ServiceResponse, anyhow::Error> {
    // Extract parameters if needed
    
    // Create and return a response
    Ok(ServiceResponse {
        status: ResponseStatus::Success,
        data: ValueType::Number(self.counter as f64),
        error: None,
    })
}

#[action]
async fn increment_counter(&self, request: ServiceRequest) -> Result<ServiceResponse, anyhow::Error> {
    // Extract the increment value
    let increment = match &request.params {
        ValueType::Map(map) => {
            if let Some(ValueType::Number(increment)) = map.get("increment") {
                *increment as u32
            } else {
                1 // Default increment
            }
        },
        _ => 1, // Default increment
    };
    
    // Update the counter (note: this requires interior mutability since we have &self)
    let mut counter = self.counter.lock().await;
    *counter += increment;
    
    // Create and return a response
    Ok(ServiceResponse {
        status: ResponseStatus::Success,
        data: ValueType::Number(*counter as f64),
        error: None,
    })
}
```

### Action Handler Pattern

For action methods:

1. Accept a `ServiceRequest` parameter
2. Return a `Result<ServiceResponse, anyhow::Error>`
3. Manually extract parameters from `request.params`
4. Manually create a `ServiceResponse` with the appropriate status and data

## Subscribe Macro

The `#[subscribe]` macro currently just marks a method as an event handler:

```rust
#[subscribe(topic = "example/events")]
async fn handle_event(&self, payload: ValueType) -> Result<(), anyhow::Error> {
    // Process the event payload
    if let ValueType::Map(map) = &payload {
        if let Some(ValueType::String(message)) = map.get("message") {
            println!("Received event message: {}", message);
        }
    }
    
    Ok(())
}
```

### Manual Subscription Setup

You need to manually set up the subscription in your service's `init` method:

```rust
async fn init(&mut self) -> Result<(), anyhow::Error> {
    // Get a reference to the event bus
    let event_bus = self.context.event_bus();
    
    // Register the subscription
    let service_clone = self.clone();
    event_bus.subscribe("example/events", move |payload| {
        let service = service_clone.clone();
        async move {
            service.handle_event(payload).await
        }
    }).await?;
    
    Ok(())
}
```

## Complete Example

Here's a complete example of a service using the simplified macro approach:

```rust
use std::sync::Arc;
use tokio::sync::Mutex;
use anyhow::Result;
use runar_node::{
    service::{AbstractService, ServiceRequest, ServiceResponse, ResponseStatus},
    value::ValueType,
};

#[service(
    name = "counter_service",
    description = "A simple counter service",
    version = "1.0.0"
)]
pub struct CounterService {
    counter: Arc<Mutex<u32>>,
    context: ServiceContext,
}

impl CounterService {
    pub fn new(context: ServiceContext) -> Self {
        Self {
            counter: Arc::new(Mutex::new(0)),
            context,
        }
    }
    
    #[action]
    async fn get_counter(&self, _request: ServiceRequest) -> Result<ServiceResponse, anyhow::Error> {
        let counter = *self.counter.lock().await;
        
        Ok(ServiceResponse {
            status: ResponseStatus::Success,
            data: ValueType::Number(counter as f64),
            error: None,
        })
    }
    
    #[action]
    async fn increment_counter(&self, request: ServiceRequest) -> Result<ServiceResponse, anyhow::Error> {
        let increment = match &request.params {
            ValueType::Map(map) => {
                if let Some(ValueType::Number(increment)) = map.get("increment") {
                    *increment as u32
                } else {
                    1 // Default increment
                }
            },
            _ => 1, // Default increment
        };
        
        let mut counter = self.counter.lock().await;
        *counter += increment;
        
        Ok(ServiceResponse {
            status: ResponseStatus::Success,
            data: ValueType::Number(*counter as f64),
            error: None,
        })
    }
    
    #[subscribe(topic = "counter/events")]
    async fn handle_counter_event(&self, payload: ValueType) -> Result<(), anyhow::Error> {
        if let ValueType::Map(map) = &payload {
            if let Some(ValueType::String(action)) = map.get("action") {
                match action.as_str() {
                    "reset" => {
                        let mut counter = self.counter.lock().await;
                        *counter = 0;
                        println!("Counter reset to 0");
                    },
                    "set" => {
                        if let Some(ValueType::Number(value)) = map.get("value") {
                            let mut counter = self.counter.lock().await;
                            *counter = *value as u32;
                            println!("Counter set to {}", *counter);
                        }
                    },
                    _ => println!("Unknown action: {}", action),
                }
            }
        }
        
        Ok(())
    }
}

impl AbstractService for CounterService {
    fn name(&self) -> &str {
        "counter_service"
    }

    fn description(&self) -> &str {
        "A simple counter service"
    }

    fn version(&self) -> &str {
        "1.0.0"
    }

    async fn init(&mut self) -> Result<(), anyhow::Error> {
        // Register the subscription
        let event_bus = self.context.event_bus();
        let service_clone = self.clone();
        
        event_bus.subscribe("counter/events", move |payload| {
            let service = service_clone.clone();
            async move {
                service.handle_counter_event(payload).await
            }
        }).await?;
        
        println!("Counter service initialized");
        Ok(())
    }

    async fn handle_request(&self, request: ServiceRequest) -> Result<ServiceResponse, anyhow::Error> {
        match request.operation.as_str() {
            "get_counter" => self.get_counter(request).await,
            "increment_counter" => self.increment_counter(request).await,
            _ => Err(anyhow::anyhow!("Unknown operation: {}", request.operation)),
        }
    }
}

impl Clone for CounterService {
    fn clone(&self) -> Self {
        Self {
            counter: Arc::clone(&self.counter),
            context: self.context.clone(),
        }
    }
}
```

## Best Practices

1. **Use consistent naming** between macro attributes and manual implementations
2. **Implement Clone** for all services that use subscriptions
3. **Use Arc and Mutex** for shared state when using `&self` methods
4. **Be explicit with error handling** by using anyhow::Error
5. **Log or trace** important operations for debugging
6. **Add clear match arms** in handle_request for all actions
7. **Use explicit type annotations** to avoid inference issues

## Future Direction

The current simplified implementation is temporary. In future versions, the macros will be enhanced to provide more automation while maintaining flexibility. The current approach ensures services can be built and tested while the macros are being refined.

## Reporting Issues

If you encounter any issues with the current simplified approach, please report them via the project's issue tracker. 