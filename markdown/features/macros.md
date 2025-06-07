# Runar Node Macros System

This document describes the macro system for the Runar Node architecture. Macros are the **recommended way** to define services, actions, and event subscriptions in Runar applications. They provide a declarative, concise approach that significantly reduces boilerplate code.

## Table of Contents

1. [Introduction](#introduction)
2. [Service Definition](#service-definition)
   - [`#[service]` Macro](#service-macro)
3. [Action Handlers](#action-handlers)
   - [`#[action]` Macro](#action-macro)
4. [Event System](#event-system)
   - [`#[subscribe]` Macro](#subscribe-macro)
   - [`#[publish]` Macro](#publish-macro)
5. [Testing with Macros](#testing-with-macros)
6. [Complete Example](#complete-example)
7. [Future Features](#future-features)
8. [Action Delegation Details](#action-delegation-details)

## Introduction

The Runar Node macro system is the **recommended approach** for building Runar services. It provides a declarative way to define services, actions, and event subscriptions. The macros significantly reduce boilerplate code while preserving the architectural principles of the Runar Node system. The macros internally use the existing API, making them fully compatible with manual implementations.

### Implementation Approaches

The Runar macro system supports two implementation approaches:

1. **Distributed Slices (Compile-time)**: Using the `linkme` crate to register handlers, actions, and subscriptions at compile time. This approach is more efficient but requires the unstable `#[used(linker)]` attribute.

2. **Runtime Registration (Default)**: A fallback mechanism that registers handlers, actions, and subscriptions at runtime. This approach is used when the `distributed_slice` feature is not enabled, making it compatible with stable Rust and testing environments.

> **Note**: Both approaches provide the same functionality and API. The runtime registration approach is used automatically when the `distributed_slice` feature is not enabled, ensuring compatibility across different environments.

## Service Definition

### `#[service]` Macro

The `#[service]` macro is used to define a service by decorating a struct. It automatically implements the `AbstractService` trait and its required methods.

```rust
use runar_node::prelude::*;
use runar_macros::service;

#[service(
    name = "data_service",
    path = "data", 
    description = "A service for managing data",
    version = "1.0.0"
)]
struct DataService {
    // Service fields
    records: HashMap<String, DataRecord>,
    // Other fields...
}

// Service implementation (constructor and helper methods)
impl DataService {
    fn new() -> Self {
        Self {
            records: HashMap::new(),
            // Initialize other fields...
        }
    }
    
    // Helper methods go here...
}
```

#### Features

The `#[service]` macro:
- Automatically implements the `Service` trait
- Generates `name()` and `path()` methods
- Creates default implementations for service lifecycle methods
- Sets up request routing to action handlers

#### Parameters

- `name`: The name of the service (required)
- `path`: The URL path for the service (required)
  - Used for routing requests to the service
  - Should match the service name for consistency

> **Note**: When using `node.call()`, you should use the service name directly (e.g., `node.call("service_name", "operation", params)`) regardless of the path configuration. Internally, the system uses the path for routing the request to the correct service and action handler. The HTTP gateway (when used) will also use this path to create endpoints, but that's an external feature built on top of the core routing system.

## Action Handlers

### `#[action]` Macro

The `#[action]` macro decorates methods to define them as action handlers that can be called through the service's request handling system. Actions can be called via HTTP requests or direct service calls.

#### Basic Usage

```rust
#[action]
async fn add(&self, a: f64, b: f64, ctx: &RequestContext) -> Result<f64> {
    Ok(a + b)
}
```

#### With Custom Path

```rust
#[action(path = "custom_path")]
async fn custom_action(&self, id: i32, ctx: &RequestContext) -> Result<MyData> {
    // Implementation
}
```

```rust
use runar_macros::action;
use anyhow::Result;
use runar_node::services::RequestContext;

impl DataService {
    // Parameters-only pattern
    #[action]
    async fn get_record(&self, id: String) -> Result<ServiceResponse> {
        // Implementation to get a record by ID
        if let Some(record) = self.records.get(&id) {
            Ok(ServiceResponse::success(
                "Record retrieved successfully",
                Some(ValueType::Json(json!(record)))
            ))
        } else {
            Ok(ServiceResponse::error(format!("Record not found: {}", id)))
        }
    }
    
    // Context and Parameters pattern
    #[action(name = "create_record")]
    async fn create_record(&self, context: &Arc<RequestContext>, name: String, value: String) -> Result<ServiceResponse> {
        // Implementation to create a record with context
        let record = Record::new(name, value);
        
        // Use context to publish an event
        context.publish("data/record_created", json!(record)).await?;
        
        Ok(ServiceResponse::success(
            "Record created successfully",
            Some(ValueType::Json(json!({"id": record.id})))
        ))
    }
    
    // Request-only pattern
    #[action(name = "process_raw")]
    async fn process_raw_request(&self, request: &ServiceRequest) -> Result<ServiceResponse> {
        // Access both context and parameters directly from the request
        let context = &request.context;
        let operation = &request.operation;
        
        // Custom processing based on the full request
        Ok(ServiceResponse::success(
            format!("Processed operation: {}", operation),
            None
        ))
    }
}
```

The `#[action]` macro marks methods that handle specific service operations. These methods can use any of the three parameter patterns described in the [Action Method Parameter Patterns](#action-method-parameter-patterns) section.

When a service receives a request with an operation name matching an action method, the request is automatically routed to that action method. The operation name is derived from the method name by default, or can be explicitly specified with the `name` parameter.

> **Note**: The `service` macro automatically generates a `handle_operation` method that properly routes requests to your action methods based on their parameter patterns. This means you can use actions with any of the supported parameter patterns without needing to write any additional routing code.

#### Action Method Parameter Patterns

The `#[action]` macro supports four different parameter patterns for action methods:

1. **Context and Parameters**: Methods that need access to both the request context and parameters.
   ```rust
   #[action]
   async fn create_record(&self, context: &RequestContext, name: String, value: String) -> Result<ServiceResponse> {
       // Implementation with access to both context and parameters
       context.publish("data/created", data_payload).await?;
       // ...
   }
   ```

2. **Request-only**: Methods that work directly with the entire service request.
   ```rust
   #[action]
   async fn process_raw(&self, request: &ServiceRequest) -> Result<ServiceResponse> {
       // Access both context and parameters from the request object
       let context = &request.context; 
       // ...
   }
   ```

3. **Parameters-only**: Methods that only need parameter values and don't interact with the context.
   ```rust
   #[action]
   async fn get_record(&self, id: String) -> Result<ServiceResponse> {
       // Implementation with just parameters, no context needed
       // ...
   }
   ```

4. **Request and Parameters**: Methods that need access to both the entire request object and additional parameters.
   ```rust
   #[action]
   async fn create_with_request(&self, request: &ServiceRequest, name: String, value: String) -> Result<ServiceResponse> {
       // Implementation with access to both the full request and extracted parameters
       let context = &request.context;
       let operation = &request.operation;
       // Use both the request object and the extracted parameters
       // ...
   }
   ```

   Parameters can also be received as a whole parameter object instead of individual extracted values:
   ```rust
   #[action]
   async fn process_with_request(&self, request: &ServiceRequest, payload: ValueType) -> Result<ServiceResponse> {
       // Implementation with access to both the request object and the entire parameter payload
       let context = &request.context;
       // Extract data from the payload as needed
       let name = payload["name"].as_str().unwrap_or_default();
       // ...
   }

The macro automatically generates appropriate routing code based on the parameter pattern of each action method. This flexibility allows you to define actions with the exact parameters they need, without requiring unnecessary context parameters when they're not used.

## Event System

### `#[subscribe]` Macro

The `#[subscribe]` macro defines event subscriptions that allow services to react to events from specified topics.

```rust
use runar_macros::subscribe;

#[subscribe(path = "math/my_data_changed")]
async fn on_my_data_changed(&self, data: MyData, ctx: &EventContext) -> Result<()> {
    // Handle the event
    Ok(())
}
```

#### Features

- Subscribes to the specified path
- Automatically deserializes messages to the parameter type
- Receives an `EventContext` for additional context

#### Parameters

- `path`: The topic path to subscribe to (required)

### `#[publish]` Macro

The `#[publish]` macro automatically publishes the result of an action to a specified topic. It's typically used in combination with `#[action]`.

```rust
use runar_macros::{publish, action};

#[publish(path = "my_data_auto")]
#[action(path = "my_data")]
async fn get_my_data(&self, id: i32, ctx: &RequestContext) -> Result<MyData> {
    // Implementation that returns MyData
}
```

#### Features

- Publishes the action result to the specified path
- Works with any serializable return type
- Must be used with `#[action]`

#### Parameters

- `path`: The topic path to publish to (required)

> **Note**: The `#[publish]` macro is a convenience wrapper around the `context.publish()` method. It automatically creates the necessary code to publish an event to the specified topic.

## Testing with Macros

The runtime registration approach makes testing services with macros straightforward without requiring unstable Rust features. You can write tests for your macro-based services the same way you write other tests:

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use runar_node::test_utils::TestNode;

    #[tokio::test]
    async fn test_create_record() {
        // Create a test node with the service
        let mut node = TestNode::new();
        let service = DataService::new();
        
        // Register the service with the node
        node.register_service(service).await.unwrap();
        
        // Test creating a record
        let response = node.request(
            "data_service/create_record", 
            json!({
                "name": "Test Record",
                "value": "Test Value"
            })
        ).await.unwrap();
        
        // Assert the response is successful
        assert_eq!(response.status, ResponseStatus::Success);
        assert!(response.data.is_some());
    }
}
```

The macros use runtime registration in test environments automatically, so you don't need to do anything special to test services defined with macros.

## Complete Example

Here's a complete example of a service defined using the macro system:

```rust
use runar_node::prelude::*;
use runar_macros::{service, action, process, subscribe};
use anyhow::Result;
use std::collections::HashMap;
use chrono::Utc;
use serde::{Serialize, Deserialize};

// Define a record type
#[derive(Clone, Debug, Serialize, Deserialize)]
struct DataRecord {
    id: String,
    name: String,
    value: String,
    created_at: String,
    updated_at: String,
}

impl DataRecord {
    fn new(name: &str, value: &str) -> Self {
        let id = uuid::Uuid::new_v4().to_string();
        let now = Utc::now().to_rfc3339();
        Self {
            id,
            name: name.to_string(),
            value: value.to_string(),
            created_at: now.clone(),
            updated_at: now,
        }
    }
}

// Define the service using the service macro
#[service(
    name = "data_service",
    path = "data",
    description = "A service for managing data records",
    version = "1.0.0"
)]
struct DataService {
    records: std::sync::Mutex<HashMap<String, DataRecord>>,
}

impl DataService {
    // Constructor
    fn new() -> Self {
        Self {
            records: std::sync::Mutex::new(HashMap::new()),
        }
    }
    
    // Create a record
    #[action]
    async fn create_record(&self, context: &RequestContext, name: String, value: String) -> Result<ServiceResponse> {
        let record = DataRecord::new(&name, &value);
        let record_id = record.id.clone();
        
        // Store the record
        {
            let mut records = self.records.lock().unwrap();
            records.insert(record_id.clone(), record.clone());
        }
        
        // Publish an event
        context.publish("data/created", json!(record)).await?;
        
        // Return success response
        Ok(ServiceResponse::success(
            format!("Record created with ID: {}", record_id),
            Some(ValueType::String(record_id))
        ))
    }
    
    // Get a record
    #[action]
    async fn get_record(&self, id: String) -> Result<ServiceResponse> {
        let records = self.records.lock().unwrap();
        
        if let Some(record) = records.get(&id) {
            Ok(ServiceResponse::success(
                format!("Record retrieved: {}", id),
                Some(ValueType::Json(serde_json::to_value(record)?))
            ))
        } else {
            Ok(ServiceResponse::error(
                format!("Record not found: {}", id),
                None
            ))
        }
    }
    
    // Update a record
    #[action]
    async fn update_record(&self, context: &RequestContext, id: String, value: String) -> Result<ServiceResponse> {
        let mut records = self.records.lock().unwrap();
        
        if let Some(record) = records.get_mut(&id) {
            // Update the record
            record.value = value.clone();
            record.updated_at = Utc::now().to_rfc3339();
            
            // Publish an event
            context.publish("data/updated", json!(record)).await?;
            
            Ok(ServiceResponse::success(
                format!("Record updated: {}", id),
                Some(ValueType::String(id))
            ))
        } else {
            Ok(ServiceResponse::error(
                format!("Record not found: {}", id),
                None
            ))
        }
    }
    
    // Delete a record
    #[action]
    async fn delete_record(&self, context: &RequestContext, id: String) -> Result<ServiceResponse> {
        let mut records = self.records.lock().unwrap();
        
        if records.remove(&id).is_some() {
            // Publish an event
            context.publish("data/deleted", json!({ "id": id })).await?;
            
            Ok(ServiceResponse::success(
                format!("Record deleted: {}", id),
                None
            ))
        } else {
            Ok(ServiceResponse::error(
                format!("Record not found: {}", id),
                None
            ))
        }
    }
    
    // List all records
    #[action]
    async fn list_records(&self) -> Result<ServiceResponse> {
        let records = self.records.lock().unwrap();
        let records_vec: Vec<&DataRecord> = records.values().collect();
        
        Ok(ServiceResponse::success(
            format!("Records retrieved: {}", records_vec.len()),
            Some(ValueType::Json(serde_json::to_value(&records_vec)?))
        ))
    }
    
    // Handle data updated events
    #[subscribe("data/updated")]
    async fn handle_data_updated(&self, context: &RequestContext, payload: ValueType) -> Result<()> {
        println!("Data updated event received: {:?}", payload);
        Ok(())
    }
    
    // Action for custom parameter handling (optional)
    #[action(name = "process_custom")]
    async fn process_custom(&self, context: &RequestContext, operation: &str, params: &ValueType) -> Result<ServiceResponse> {
        match operation {
            "create_record" => {
                let name = params["name"].as_str().unwrap_or_default().to_string();
                let value = params["value"].as_str().unwrap_or_default().to_string();
                self.create_record(context, name, value).await
            },
            "get_record" => {
                let id = params["id"].as_str().unwrap_or_default().to_string();
                self.get_record(id).await
            },
            "update_record" => {
                let id = params["id"].as_str().unwrap_or_default().to_string();
                let value = params["value"].as_str().unwrap_or_default().to_string();
                self.update_record(context, id, value).await
            },
            "delete_record" => {
                let id = params["id"].as_str().unwrap_or_default().to_string();
                self.delete_record(context, id).await
            },
            "list_records" => self.list_records().await,
            _ => Ok(ServiceResponse::error(format!("Unknown operation: {}", operation), None)),
        }
    }
}

// Main function to create and run a node with our service
async fn main() -> Result<()> {
    // Create a node configuration
    let config = NodeConfig::default();
    
    // Create a node
    let mut node = Node::new(config).await?;
    
    // Create and register our service
    let data_service = DataService::new();
    node.register_service(data_service).await?;
    
    // Start the node
    node.start().await?;
    
    // Wait for shutdown signal
    node.wait_for_shutdown().await;
    
    Ok(())
}
```

This example demonstrates:
1. A complete service with CRUD operations
2. Action methods for each operation
3. Event publication and subscription
4. A custom process method for parameter handling
5. Integration with a node instance

All of this is accomplished with minimal boilerplate code, thanks to the macro system.

## Future Features

Future enhancements to the macro system will include:

1. More attribute options for actions (validation, authorization, caching)
2. Integration with metrics collection
3. Automatic documentation generation
4. More sophisticated event handling capabilities
5. Built-in parameter validation and conversion

Stay tuned for updates to the macro system as runar continues to evolve.

## Action Delegation Details

The `#[service]` macro provides automatic action delegation through the `handle_request` method, a core part of the `AbstractService` trait. This section details how the action delegation mechanism works.

### Automatic Action Delegation

When you use the `#[service]` macro, it automatically:

1. Implements the `handle_request` method for your service
2. The `handle_request` method examines the incoming operation name
3. Routes the request to the appropriate action method based on the operation name
4. Handles parameter extraction and conversion
5. Returns the result from the action method wrapped in a `ServiceResponse`

Example of the automatically generated `handle_request` method:

```rust
// Automatically generated by the #[service] macro
async fn handle_request(&self, request: ServiceRequest) -> anyhow::Result<ServiceResponse> {
    match request.operation.as_str() {
        // Routes to method that takes context and parameters
        "create_record" => self.create_record(&request.context, extract_params(&request)?).await,
        
        // Routes to method that takes just the request
        "process_raw" => self.process_raw(&request).await,
        
        // Routes to method that takes only parameters
        "get_record" => self.get_record(extract_params(&request)?).await,
        
        // Routes to method that takes both request and parameters
        "create_with_request" => self.create_with_request(&request, extract_params(&request)?).await,
        
        // Other operations...
        _ => Ok(ServiceResponse::error(
            format!("Operation not implemented: {}", request.operation),
            None
        ))
    }
}
```

As shown above, the generated `handle_request` method intelligently routes requests to the appropriate action methods based on their parameter patterns. It will:

1. Extract the context and parameters for methods that need both
2. Pass the entire request for methods that work with the raw request
3. Extract only parameters for methods that don't need context
4. Pass both the request and extracted parameters for methods that need both

This intelligent routing happens automatically - you don't need to implement any special routing logic yourself.

### Custom Action Delegation

If you need custom routing or parameter handling logic, you can implement your own `handle_request` method:

```rust
impl AbstractService for MyService {
    // Your custom implementation
    async fn handle_request(&self, request: ServiceRequest) -> anyhow::Result<ServiceResponse> {
        // Custom logic for routing requests
        match request.operation.as_str() {
            "special_operation" => {
                // Special handling for this operation
                let param1 = request.params.get("param1").unwrap_or_default();
                // Custom processing...
                Ok(ServiceResponse::success("Special operation completed", None))
            },
            // Fall back to standard actions for other operations
            "create_record" => self.create_record(&request.context, extract_params(&request)?).await,
            // Other operations...
            _ => Ok(ServiceResponse::error(
                format!("Operation not implemented: {}", request.operation),
                None
            ))
        }
    }
}
```

**Important**: When you provide your own `handle_request` method, the `#[service]` macro detects this and does not generate one automatically. This allows you to have full control over request handling when needed, while still benefiting from the other features of the macro.

### Implementation Guidelines

When using the `#[service]` and `#[action]` macros:

1. **For standard services**:
   - Let the `#[service]` macro generate the `handle_request` method for you
   - Define your operations using the `#[action]` macro
   - The macro will take care of all the routing logic

2. **For custom routing**:
   - Implement your own `handle_request` method 
   - The macro will detect your implementation and not generate its own
   - You are responsible for routing requests to the appropriate action methods

3. **Best practices**:
   - Use the automatic delegation mechanism for most services
   - Implement custom delegation only when you need special parameter handling logic
   - When implementing a custom `handle_request`, consider delegating to action methods after your custom logic 