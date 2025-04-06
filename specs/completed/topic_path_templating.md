# TopicPath Templating Enhancement

## INTENTION
Provide a unified mechanism for template-based path matching and parameter extraction in the TopicPath module, enabling services to handle hierarchical paths with variable components.

## Problem Statement

Services often need to handle paths with variable components, such as:
- `services/{service_path_param}/state` - Get state for a specific service
- `users/{user_id}/profile` - Get profile for a specific user
- `devices/{device_id}/config/{config_name}` - Get specific config for a device

Without a templating system, services would need to implement their own path parsing logic, leading to code duplication and inconsistent error handling.

## TopicPath Template Extensions

1. **Template Pattern Matching**: Allow services to define URL-like templates with named parameters that can be matched against incoming requests.

2. **Parameter Extraction**: Extract named parameters from paths that match a template pattern.

3. **Path Generation**: Create new paths by filling in templates with parameter values.

## Implementation

### 1. TopicPath Methods

The TopicPath struct has been extended with the following methods:

```rust
// Extract parameters from a path based on a template
pub fn extract_params(&self, template: &str) -> Result<HashMap<String, String>, String>

// Check if a path matches a template pattern
pub fn matches_template(&self, template: &str) -> bool

// Create a new path from a template and parameter values
pub fn from_template(
    template: &str, 
    params: HashMap<String, String>,
    network_id: &str
) -> Result<Self, String>
```

### 2. Integration with Action/Event Registration

Rather than creating new methods, we'll extend the existing options pattern:

```rust
pub struct ActionRegistrationOptions {
    pub description: Option<String>,
    pub params_schema: Option<ValueType>,
    pub return_schema: Option<ValueType>,
    // Add path template for parameter extraction
    pub path_template: Option<String>,
}

pub struct EventRegistrationOptions {
    pub description: Option<String>,
    pub data_schema: Option<ValueType>,
    // Add path template for parameter extraction
    pub path_template: Option<String>,
}
```

### 3. Enhanced RequestContext

The RequestContext will be enhanced to include extracted path parameters:

```rust
pub struct RequestContext {
    // Existing fields
    pub topic_path: Option<TopicPath>,
    pub logger: Logger,
    // Add path parameters field
    pub path_params: HashMap<String, String>,
}
```

## Implementation Flow

When registering an action or event:
1. If `path_template` is provided in options, store it with the action/event
2. When a request is received, check if the action has a path template
3. If yes, extract parameters using TopicPath.extract_params()
4. Add parameters to the RequestContext when handling the request
5. Service handlers can access parameters via `context.path_params`

## Example Usage

```rust
// During service initialization
pub async fn init(&self, context: LifecycleContext) -> Result<()> {
    // Register with path template
    let mut options = ActionRegistrationOptions::default();
    options.path_template = Some("services/{service_path_param}/state".to_string());
    
    context.register_action_with_options(
        "state",
        Box::new(|params, ctx| {
            // Access extracted parameters in handler
            let service_path = ctx.path_params.get("service_path_param").unwrap_or_default();
            
            // Handler implementation using service_path
            Box::pin(async move {
                // ...
                Ok(ServiceResponse::ok(ValueType::Null))
            })
        }),
        options
    ).await?;
    
    Ok(())
}
```

## Registry Service Integration

The Registry Service API will use template parameters for endpoints like:
- `services/{service_path_param}` - Get detailed information about a specific service
- `services/{service_path_param}/state` - Get just the state of a service
- `services/{service_path_param}/actions` - List actions of a service
- `services/{service_path_param}/events` - List events of a service

Example implementation:

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
    
    // More templated actions for state, actions, events
    // ...
    
    Ok(())
}
```

## Benefits

1. **Simplified API Implementation**: Services can define templates in options
2. **Consistent Parameter Extraction**: All services use the same mechanism
3. **Improved Error Handling**: Template matching includes built-in validation
4. **Cleaner Service Logic**: Business logic code can focus on processing
5. **RESTful Path Structure**: Encourages path hierarchies similar to RESTful APIs
6. **Consistent with Existing Patterns**: Uses the established options pattern

## Testing

Comprehensive tests have been added in `topic_path_template_test.rs` that verify:
- Parameter extraction from paths
- Template matching
- Path creation from templates
- Integration with options pattern 