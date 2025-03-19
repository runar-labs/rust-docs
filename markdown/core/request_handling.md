# Request Handling Best Practices

This document outlines the recommended practices for implementing the `handle_request` method in services and working with request data within the Kagi framework.

## Table of Contents

- [General Pattern](#general-pattern)
- [Method Delegation](#method-delegation)
- [Data Format Handling](#data-format-handling)
- [Logging Best Practices](#logging-best-practices)
- [Error Handling](#error-handling)
- [Request Context Usage](#request-context-usage)
- [Testing Services](#testing-services)

## General Pattern

When implementing an AbstractService, follow these general patterns for request handling:

1. Each service should implement a clean, focused `handle_request` method
2. The `handle_request` method should match on the operation and delegate to specialized handler methods
3. Always use the context-aware logging system
4. Provide informative error messages to users

```rust
async fn handle_request(&self, request: ServiceRequest) -> Result<ServiceResponse> {
    debug!("Handling request", &request.request_context, 
        "operation" => &request.operation,
        "path" => &request.path
    );
    
    // Delegate to specialized methods based on operation
    match request.operation.as_str() {
        "create" => self.handle_create(request).await,
        "read" => self.handle_read(request).await,
        "update" => self.handle_update(request).await,
        "delete" => self.handle_delete(request).await,
        _ => {
            warn!("Unknown operation requested", &request.request_context, 
                "operation" => &request.operation
            );
            Ok(ServiceResponse::error(format!("Unknown operation: {}", request.operation)))
        }
    }
}
```

## Method Delegation

Create specialized methods for each operation to improve code readability and maintainability:

```rust
/// Handle the create operation
async fn handle_create(&self, request: ServiceRequest) -> Result<ServiceResponse> {
    debug!("Processing create operation", &request.request_context);
    
    // Implementation for create operation
    // ...
    
    Ok(ServiceResponse::success("Resource created successfully", Some(result)))
}
```

This approach has several benefits:
- Makes code more maintainable and easier to understand
- Allows unit testing of specific operations in isolation
- Improves error handling by localizing operation-specific logic
- Makes it easier to add new operations in the future

## Data Format Handling

The Kagi service architecture supports two primary data formats: JSON and VMap. Follow these best practices:

### When to use JSON vs VMap

1. **Incoming data**:
   - If the data is already in JSON format (like from network requests), extract fields directly using JSON methods
   - Use VMap when working with complex nested structures that need to be accessed programmatically

2. **Internal processing**:
   - VMap is preferable for internal data processing when type safety is important
   - Avoid unnecessary conversions between formats

3. **Data storage and serialization**:
   - Choose the format that best matches your storage mechanism
   - For databases that accept JSON (like MongoDB or PostgreSQL JSON columns), keep data in JSON format

### Avoid unnecessary conversions

```rust
// GOOD: Work directly with JSON when it's already available
if let Some(json_data) = request.get_json_param("data") {
    let topic = json_data["topic"].as_str().unwrap_or_default();
    // Process using the topic value
}

// BAD: Converting to VMap unnecessarily
if let Some(json_data) = request.get_json_param("data") {
    // Don't do this if you just need a few fields
    let vmap = ValueType::from_json(json_data).as_map().unwrap_or_default();
    let topic = vmap.get("topic").and_then(|v| v.as_str()).unwrap_or_default();
}
```

## Logging Best Practices

Use context-aware logging throughout your service implementation:

1. **Include the request context**:
   ```rust
   debug!("Processing create operation", &request.request_context);
   ```

2. **Add relevant fields to log entries**:
   ```rust
   info!("Resource created successfully", &request.request_context,
       "resource_id" => &resource_id,
       "resource_type" => &resource_type
   );
   ```

3. **Log appropriate information at each level**:
   - `debug!`: Implementation details useful for troubleshooting
   - `info!`: Successful operations and important state changes
   - `warn!`: Issues that don't prevent operation but might need attention
   - `error!`: Failures that prevent successful operation

## Error Handling

Provide informative error messages and use the Result type consistently:

```rust
async fn handle_update(&self, request: ServiceRequest) -> Result<ServiceResponse> {
    let resource_id = match request.get_param("id") {
        Some(ValueType::String(id)) => id,
        _ => {
            warn!("Missing or invalid resource ID for update", &request.request_context);
            return Ok(ServiceResponse::error("Missing or invalid resource ID"));
        }
    };
    
    // Rest of the implementation
    // ...
}
```

## Request Context Usage

The `RequestContext` contains valuable information that should be utilized:

1. Pass the context to all operations that might log information
2. Include the context in all log statements
3. Use the context to trace request flow through different components
4. Access request metadata like user information when available

```rust
async fn handle_request(&self, request: ServiceRequest) -> Result<ServiceResponse> {
    let user_id = request.request_context.user_id.as_deref().unwrap_or("anonymous");
    
    debug!("Handling request", &request.request_context,
        "user_id" => user_id,
        "operation" => &request.operation
    );
    
    // Rest of implementation
    // ...
}
```

## Testing Services

Proper testing is essential for services implementing the `AbstractService` trait. Here are recommended testing practices:

### Unit Testing Service Handlers

Create unit tests for each operation handler:

```rust
#[tokio::test]
async fn test_handle_create() {
    let service = create_test_service();
    let context = RequestContext::new();
    
    let request = ServiceRequest {
        path: "/test/service".to_string(),
        operation: "create".to_string(),
        params: Some(create_test_params()),
        request_context: context,
    };
    
    let response = service.handle_create(request).await.unwrap();
    assert_eq!(response.status, ResponseStatus::Success);
    // Additional assertions
}
```

### Integration Testing Complete Request Flow

Test the full request handling flow through the service:

```rust
#[tokio::test]
async fn test_integration_flow() {
    let mut service = create_test_service();
    let context = RequestContext::new();
    
    // Initialize the service
    service.init(&context).await.unwrap();
    service.start().await.unwrap();
    
    // Test create operation
    let create_request = ServiceRequest::new(
        "/test/service".to_string(),
        "create".to_string(),
        Some(create_test_params()),
        context.clone(),
    );
    
    let create_response = service.handle_request(create_request).await.unwrap();
    assert_eq!(create_response.status, ResponseStatus::Success);
    
    // Test additional operations
    // ...
    
    // Cleanup
    service.stop().await.unwrap();
}
```

### Testing Context-Awareness

Verify that your service properly uses and propagates the request context:

```rust
#[tokio::test]
async fn test_context_propagation() {
    let service = create_test_service();
    
    // Create a context with custom values
    let mut context = RequestContext::new();
    context.insert("user_id", "test_user");
    context.insert("request_id", "test_123");
    
    let request = ServiceRequest::new(
        "/test/service".to_string(),
        "read".to_string(),
        Some(ValueType::Map(vmap!{
            "id" => "resource_1"
        })),
        context,
    );
    
    // Use a test logger to capture log output
    let logs = capture_logs(|| {
        let _ = service.handle_request(request).await.unwrap();
    });
    
    // Verify context was included in logs
    assert!(logs.contains("user_id") && logs.contains("test_user"));
    assert!(logs.contains("request_id") && logs.contains("test_123"));
}
```

### Testing Error Handling

Verify that your service handles errors gracefully:

```rust
#[tokio::test]
async fn test_error_handling() {
    let service = create_test_service();
    let context = RequestContext::new();
    
    // Test with invalid parameters
    let request = ServiceRequest::new(
        "/test/service".to_string(),
        "update".to_string(),
        None, // Missing required parameters
        context,
    );
    
    let response = service.handle_request(request).await.unwrap();
    assert_eq!(response.status, ResponseStatus::Error);
    assert!(response.message.contains("Missing parameters"));
}
``` 