# Runar Macros Documentation

This document provides comprehensive documentation for the Runar macro system, which enables seamless service development, action definition, and event handling within the Runar ecosystem.

## Overview

Runar macros simplify common tasks in service development by generating the necessary boilerplate code for:

- Service definition and registration
- Action handling and parameter extraction
- Event publication and subscription
- Service initialization and middleware

The macros support two implementation approaches:
1. **Distributed Slices (Compile-time)**: Uses the `linkme` crate for compile-time registration, requiring the unstable `#[used(linker)]` attribute.
2. **Runtime Registration (Default)**: Registers handlers at runtime, compatible with stable Rust, allowing for easier testing without unstable features.

## Available Macros

### Service Macro

The `#[service]` macro defines a Runar service by implementing the `AbstractService` trait and setting up metadata.

#### Parameters:

- `name`: The display name of the service (default: struct name in snake_case)
- `path`: The routing path for this service (default: same as name)
- `description`: Human-readable description (default: "{name} service")
- `version`: Version string (default: "0.1.0")

#### Example:

```rust
use runar_macros::service;
use runar_node::services::{ServiceResponse, RequestContext, ValueType};
use anyhow::Result;

#[service(
    name = "calculator",
    path = "math/calculator",
    description = "A calculator service",
    version = "1.0.0"
)]
struct CalculatorService {
    operation_count: std::sync::atomic::AtomicU64,
}

impl CalculatorService {
    pub fn new() -> Self {
        Self {
            operation_count: std::sync::atomic::AtomicU64::new(0),
        }
    }
}
```

#### Generated Implementations:

- `AbstractService` trait implementation
- Service metadata methods (name, path, description, version)
- Request handling and dispatching

### Action Macro

The `#[action]` macro marks methods as service operations that can be invoked through the Node API.

#### Parameters:

- `name`: The name of the action (default: method name)
- `description`: Human-readable description (default: None)

#### Example:

```rust
use runar_macros::{service, action};
use runar_node::services::{ServiceResponse, RequestContext, ValueType, ResponseStatus};
use anyhow::Result;

#[service(name = "calculator")]
struct CalculatorService {
    operation_count: std::sync::atomic::AtomicU64,
}

impl CalculatorService {
    #[action(name = "add")]
    async fn add(&self, context: &RequestContext, a: i32, b: i32) -> Result<ServiceResponse> {
        let count = self.operation_count.fetch_add(1, std::sync::atomic::Ordering::SeqCst);
        
        Ok(ServiceResponse::success(
            a + b,
            Some(ValueType::Object(serde_json::json!({
                "operation_count": count + 1
            })))
        ))
    }
    
    #[action]  // Uses method name as action name
    async fn multiply(&self, context: &RequestContext, a: i32, b: i32) -> Result<ServiceResponse> {
        let count = self.operation_count.fetch_add(1, std::sync::atomic::Ordering::SeqCst);
        
        Ok(ServiceResponse::success(
            a * b,
            Some(ValueType::Object(serde_json::json!({
                "operation_count": count + 1
            })))
        ))
    }
}
```

#### Generated Code:

- Parameter extraction and validation
- Request context handling
- Response wrapping

### Subscribe Macro

The `#[subscribe]` macro marks methods as event handlers that will receive events published on the specified topic.

#### Parameters:

- `topic`: The event topic to subscribe to (required)
- `filters`: Optional filters to apply (default: None)

#### Example:

```rust
use runar_macros::{service, subscribe};
use runar_node::services::{ValueType};
use anyhow::Result;

#[service(name = "log_service")]
struct LogService {
    event_count: std::sync::atomic::AtomicU64,
}

impl LogService {
    #[subscribe(topic = "system/events")]
    async fn log_system_event(&self, payload: ValueType) -> Result<()> {
        let count = self.event_count.fetch_add(1, std::sync::atomic::Ordering::SeqCst);
        println!("System event #{}: {:?}", count + 1, payload);
        Ok(())
    }
    
    #[subscribe(topic = "user/events", filters = "type=login,logout")]
    async fn log_user_event(&self, payload: ValueType) -> Result<()> {
        println!("User login/logout event: {:?}", payload);
        Ok(())
    }
}
```

#### Generated Code:

- Event subscription registration
- Topic and filter setup
- Handler invocation

### Publish Macro

The `#[publish]` macro marks methods that publish events to a specified topic.

#### Parameters:

- `topic`: The event topic to publish to (required)

#### Example:

```rust
use runar_macros::{service, action, publish};
use runar_node::services::{ServiceResponse, RequestContext, ValueType};
use anyhow::Result;

#[service(name = "user_service")]
struct UserService {
    // Fields...
}

impl UserService {
    #[action]
    #[publish(topic = "user/events")]
    async fn login(&self, context: &RequestContext, username: String, password: String) -> Result<ServiceResponse> {
        // Authentication logic...
        
        // This method will automatically publish an event to "user/events" topic
        // with the return value's metadata as the payload
        
        Ok(ServiceResponse::success(
            "Login successful",
            Some(ValueType::Object(serde_json::json!({
                "type": "login",
                "username": username,
                "timestamp": chrono::Utc::now().to_rfc3339()
            })))
        ))
    }
}
```

#### Generated Code:

- Event publication setup
- Payload extraction and formatting

### Init Macro

The `#[init]` macro marks methods that should be called during service initialization.

#### Parameters:

- `timeout_ms`: Maximum time allowed for initialization in milliseconds (default: 5000)

#### Example:

```rust
use runar_macros::{service, init};
use anyhow::Result;

#[service(name = "database_service")]
struct DatabaseService {
    connection: Option<Connection>,
}

impl DatabaseService {
    #[init(timeout_ms = 10000)]
    async fn initialize(&mut self) -> Result<()> {
        // Connect to database...
        self.connection = Some(connect_to_db().await?);
        Ok(())
    }
}
```

#### Generated Code:

- Initialization sequence registration
- Timeout handling

### Middleware Macro

The `#[middleware]` macro marks methods that implement request processing middleware.

#### Example:

```rust
use runar_macros::{service, middleware};
use runar_node::services::{ServiceRequest, ServiceResponse};
use anyhow::Result;

#[service(name = "auth_service")]
struct AuthService {
    // Fields...
}

impl AuthService {
    #[middleware]
    async fn check_auth(&self, request: &mut ServiceRequest) -> Result<Option<ServiceResponse>> {
        // Check if the request has valid authentication
        if let Some(token) = request.headers.get("Authorization") {
            // Validate token...
            if !is_valid_token(token) {
                return Ok(Some(ServiceResponse::error(
                    "Unauthorized",
                    401,
                    None
                )));
            }
        } else {
            return Ok(Some(ServiceResponse::error(
                "Authentication required",
                401,
                None
            )));
        }
        
        // Return None to continue processing the request
        Ok(None)
    }
}
```

#### Generated Code:

- Middleware registration
- Request interception

### Gateway Macro

The `#[gateway]` macro defines REST API gateways that can expose Runar services via HTTP.

#### Parameters:

- `prefix`: URL prefix for all routes (default: "/")

#### Example:

```rust
use runar_macros::{gateway, route};
use runar_node::node::Node;
use anyhow::Result;

#[gateway(prefix = "/api/v1")]
struct ApiGateway {
    node: Node,
}

impl ApiGateway {
    #[route(method = "GET", path = "/users/:id")]
    async fn get_user(&self, req: HttpRequest) -> Result<HttpResponse> {
        let id = req.params.get("id").unwrap();
        
        // Forward to user service
        let response = self.node
            .request("user_service/get_user", serde_json::json!({ "id": id }))
            .await?;
            
        Ok(HttpResponse::from(response))
    }
}
```

#### Generated Code:

- HTTP server integration
- Route registration
- Parameter extraction

### Route Macro

The `#[route]` macro defines HTTP endpoints within a gateway.

#### Parameters:

- `method`: HTTP method (GET, POST, PUT, DELETE, etc.)
- `path`: URL path, can include parameters with `:param` syntax

#### Example:

See the gateway example above.

## Testing with Macros

When writing tests for code that uses Runar macros, you don't need to enable the `distributed_slice` feature, as the runtime registration approach is used automatically in test environments.

### Example Test:

```rust
#[tokio::test]
async fn test_calculator_service() -> Result<()> {
    // Create a test node
    let config = NodeConfig::test();
    let mut node = Node::new(config).await?;
    
    // Register our service
    let calculator = CalculatorService::new();
    node.add_service(calculator).await?;
    
    // Test an action
    let response = node
        .request("calculator/add", serde_json::json!({ "a": 5, "b": 3 }))
        .await?;
        
    assert_eq!(response.data, 8);
    
    Ok(())
}
```

## Best Practices

1. **Explicit Service Names**: Always provide explicit service names for clarity.

2. **Method Visibility**: Keep service methods that aren't actions or event handlers as private methods.

3. **Error Handling**: Return proper `Result` types from all service methods.

4. **Documentation**: Add comments to services and actions to document their purpose.

5. **Testing**: Write tests for each service and its actions.

6. **Parameter Naming**: Use clear parameter names in action methods.

7. **Async Consistency**: Make all service methods async for consistency.

8. **State Management**: Be careful with mutable state in services, especially with event handlers.

## Troubleshooting

### Common Issues

1. **Macro Expansion Errors**: If you encounter cryptic errors during macro expansion, try simplifying your service structure or breaking it into smaller components.

2. **Missing Abstract Service**: Ensure that you have the correct dependencies and imports.

3. **Event Handlers Not Called**: Make sure your service is properly registered and that the topics match exactly.

4. **Parameter Type Errors**: Ensure that parameter types in action methods match the JSON data being passed.

5. **Lifetime Issues**: Be mindful of lifetime annotations, especially when working with references in action methods.

## Migration from Earlier Versions

If you're migrating from earlier versions of the Runar macros:

1. Update import paths from `kagi_macros` to `runar_macros`
2. Update import paths from `kagi_node` to `runar_node`
3. Replace `kagi_common` references with `runar_common`
4. Check macro parameter names for any changes
5. Update any custom serialization/deserialization code

## References

- [Runar Node Documentation](../core/node.md)
- [Service Architecture](../services/overview.md)
- [Event System](../features/events.md) 