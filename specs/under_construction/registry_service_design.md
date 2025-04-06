# Registry Service Design

## INTENTION
Provide a consistent API for accessing service metadata through the standard request interface, eliminating the need for direct methods and aligning with the architectural principle of using the service request pattern for all operations.

## Overview

The current implementation exposes methods like `node.get_service_state()` to retrieve service state information. This approach has several drawbacks:

1. **Inconsistent API pattern**: Services are accessed through `request()` but service metadata through direct methods
2. **Limited extensibility**: Each new piece of information requires a new method 
3. **Method proliferation**: As more metadata is exposed, more methods are added
4. **Inconsistent access patterns**: Some information is accessed via service-specific methods, other via requests

Instead, we will implement an internal registry service that provides access to service metadata through the standard request interface:

```rust
// Current approach
let state = node.get_service_state("math").await;

// New approach
let response = node.request("$registry/services/math", ValueType::Null).await?;
let service_info = response.data.unwrap();  // Contains full service metadata including state
```

## Service Design

1. **Service Path**: `$registry` (the `$` prefix indicates an internal service)

2. **Available Actions**:
   - `services/list` - List all services with basic metadata
   - `services/{service_path}` - Get detailed information about a specific service
   - `services/{service_path}/state` - Get just the state of a service
   - `services/{service_path}/actions` - List actions of a service
   - `services/{service_path}/events` - List events of a service

3. **Implementation**:
   - Create a dedicated `RegistryService` that is automatically registered with the Node
   - Special initialization to avoid circular dependencies
   - Privileged access to Node internals
   - Standard service interface for requests
   - Uses TopicPath template parameter extraction for path-based routing (see [topic_path_templating.md](./topic_path_templating.md))

4. **Response Format**:
   - For service listing:
   ```json
   [
     {
       "name": "Math",
       "path": "math",
       "state": "Running",
       "version": "1.0.0"
     },
     {
       "name": "UserService",
       "path": "users",
       "state": "Running",
       "version": "1.2.1"
     }
   ]
   ```
   
   - For detailed service information:
   ```json
   {
     "name": "Math",
     "path": "math",
     "state": "Running",
     "version": "1.0.0",
     "actions": ["add", "subtract", "multiply"],
     "events": ["calculation_completed", "error_occurred"],
     "metadata": {
       "description": "Basic math operations",
       "author": "Runar Team"
     },
     "started_at": "2023-06-10T15:30:45Z",
     "uptime_seconds": 3600
   }
   ```

## Integration with TopicPath Templating

The Registry Service will leverage the TopicPath templating feature to handle parameterized paths like:
- `services/{service_path}` 
- `services/{service_path}/state`

During service initialization, it will register pattern-based actions:

```rust
pub async fn init(&self, context: LifecycleContext) -> Result<()> {
    // Register standard actions
    context.register_action("services/list", 
        Box::new(|params, ctx| Box::pin(self.handle_list_services(params, ctx))))
        .await?;
    
    // Register templated actions
    let mut options = ActionRegistrationOptions::default();
    options.path_template = Some("services/{service_path_param}".to_string());
    
    context.register_action_with_options(
        "service_info",
        Box::new(|params, ctx| {
            // Access service_path from context
            let service_path = ctx.path_params.get("service_path_param").unwrap_or_default();
            Box::pin(self.handle_service_info(service_path, params, ctx))
        }),
        options
    ).await?;
    
    // Similarly for state, actions, events endpoints
    // ...
    
    Ok(())
}
```

## Benefits

1. **Consistent API pattern**: All service and metadata access through the same `request()` interface
2. **Extensibility**: Additional metadata can be added without changing the API
3. **Standard request/response format**: Uses the same format as other service responses
4. **Improved testability**: Can test registry access through the same service testing patterns
5. **Enhanced security**: Future permission models can be applied consistently
6. **No special path handling needed**: Using `$registry` instead of `internal/registry` avoids the need to handle slashes in service paths

## Implementation Steps

1. Create the `RegistryService` struct implementing `AbstractService`
2. Add special handling in Node to register this service automatically
3. Implement actions to retrieve service information from Node's state
4. Integrate TopicPath templating for parameterized paths
5. Update tests to use this new pattern
6. Maintain the direct methods temporarily for backward compatibility 
7. Add test coverage for registry service

This approach better aligns with the architectural principles of the system, treating service metadata as a first-class concept that is accessible through the standard service interface.

## Example Usage

```rust
// Get a specific service's state
let response = node.request("$registry/services/math/state", ValueType::Null).await?;
if let Some(ValueType::Map(state_info)) = response.data {
    if let Some(ValueType::String(state)) = state_info.get("state") {
        println!("Service 'math' is in state: {}", state);
    }
}

// List all services
let response = node.request("$registry/services/list", ValueType::Null).await?;
if let Some(ValueType::Array(services)) = response.data {
    for service in services {
        if let ValueType::Map(service_info) = service {
            // Process service info...
        }
    }
}
```

#### Example Implementation
 