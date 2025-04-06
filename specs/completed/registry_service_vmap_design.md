# Registry Service vmap Integration Design

## Overview

This document outlines the design for enhancing the Registry Service by integrating the vmap macro system for type-safe value extraction and manipulation. The goal is to improve data transformation between ValueType and native Rust types while simplifying response construction with structured data mapping.

## Key Requirements

1. **Type-Safe Value Extraction**: Replace manual HashMap manipulation with vmap macro for type safety
2. **Consistent Response Construction**: Use vmap for creating consistent response structures
3. **Improved Error Handling**: Better validation of incoming requests with clear error messages
4. **Simplified Code**: Reduce boilerplate and improve readability in data transformation code
5. **Maintainability**: Make future service expansion easier with standardized patterns

## Current Implementation Analysis

The Registry Service currently uses manual HashMap manipulation for:

1. **Data Extraction**: Manually checking and extracting values from request parameters
2. **Response Construction**: Building response maps by manually inserting key-value pairs
3. **Service Metadata Handling**: Converting between service metadata objects and ValueType maps

This approach is verbose, error-prone, and lacks type safety, making it difficult to maintain.

## vmap Macro Overview

The vmap macro system provides:

1. **Map Creation**: Easy creation of ValueType::Map instances
   ```rust
   let params = vmap! {
       "name" => "Registry Service",
       "version" => "1.0",
       "enabled" => true
   };
   ```

2. **Value Extraction**: Type-safe extraction of values with defaults
   ```rust
   let name = vmap_str!(params, "name", "Unknown Service");
   let version = vmap_str!(params, "version", "0.0.0");
   let enabled = vmap_bool!(params, "enabled", false);
   ```

3. **Nested Value Extraction**: Support for dot notation for nested structures
   ```rust
   let address = vmap_str!(params, "metadata.contact.address", "");
   ```

## Design Changes

### 1. Extract Service Path Helper

Replace the current implementation with vmap macros:

```rust
fn extract_service_path(&self, ctx: &RequestContext) -> Result<String> {
    let service_path = vmap_str!(ctx.path_params, "service_path", "");
    if service_path.is_empty() {
        ctx.logger.error("Missing required 'service_path' parameter");
        return Err(anyhow!("Missing required 'service_path' parameter"));
    }
    Ok(service_path)
}
```

### 2. List Services Handler

Update the response construction:

```rust
async fn handle_list_services(&self, _params: ValueType, _ctx: RequestContext) -> Result<ServiceResponse> {
    let service_states = self.registry_delegate.get_all_service_states().await;
    let service_metadata = self.registry_delegate.get_all_service_metadata().await;
    
    let mut services = Vec::new();
    
    for (path, state) in service_states {
        // Use vmap to create the service information map
        let metadata = service_metadata.get(&path).cloned();
        let service_info = match metadata {
            Some(meta) => vmap! {
                "path" => path,
                "state" => format!("{:?}", state),
                "name" => meta.name,
                "version" => meta.version,
                "description" => meta.description
            },
            None => vmap! {
                "path" => path,
                "state" => format!("{:?}", state)
            }
        };
        
        services.push(service_info);
    }
    
    Ok(ServiceResponse::ok(ValueType::Array(services)))
}
```

### 3. Service Info Handler

Simplify with vmap macro:

```rust
async fn handle_service_info(&self, _service_path: &str, _params: ValueType, ctx: RequestContext) -> Result<ServiceResponse> {
    let actual_service_path = match self.extract_service_path(&ctx) {
        Ok(path) => path,
        Err(_) => {
            return Ok(ServiceResponse::error(400, "Missing required 'service_path' parameter"));
        }
    };
    
    let service_states = self.registry_delegate.get_all_service_states().await;
    
    if let Some(state) = service_states.get(&actual_service_path) {
        let metadata = self.registry_delegate.get_service_metadata(&actual_service_path).await;
        
        // Start with basic info
        let mut service_info = vmap! {
            "path" => actual_service_path,
            "state" => format!("{:?}", state)
        };
        
        // Add metadata if available
        if let Some(meta) = metadata {
            // Create actions array
            let actions: Vec<ValueType> = meta.registered_actions.values()
                .map(|action| ValueType::String(action.name.clone()))
                .collect();
                
            // Create events array
            let events: Vec<ValueType> = meta.registered_events.values()
                .map(|event| ValueType::String(event.name.clone()))
                .collect();
            
            // Add all metadata fields
            service_info = vmap! {
                "path" => actual_service_path,
                "state" => format!("{:?}", state),
                "name" => meta.name,
                "version" => meta.version,
                "description" => meta.description,
                "actions" => ValueType::Array(actions),
                "events" => ValueType::Array(events),
                "registration_time" => meta.registration_time as f64
            };
            
            // Add optional fields
            if let Some(start_time) = meta.last_start_time {
                // Update the map with start time
                if let ValueType::Map(ref mut map) = service_info {
                    map.insert("started_at".to_string(), ValueType::Number(start_time as f64));
                    
                    // Calculate uptime if service is running
                    if *state == ServiceState::Running {
                        let now = SystemTime::now()
                            .duration_since(UNIX_EPOCH)
                            .unwrap_or_default()
                            .as_secs();
                        let uptime = now.saturating_sub(start_time);
                        map.insert("uptime_seconds".to_string(), ValueType::Number(uptime as f64));
                    }
                }
            }
        }
        
        Ok(ServiceResponse::ok(service_info))
    } else {
        ctx.logger.warn(format!("Service '{}' not found", actual_service_path));
        Ok(ServiceResponse::error(404, &format!("Service '{}' not found", actual_service_path)))
    }
}
```

### 4. Service State Handler

Simplify with vmap macro:

```rust
async fn handle_service_state(&self, _service_path: &str, _params: ValueType, ctx: RequestContext) -> Result<ServiceResponse> {
    let actual_service_path = match self.extract_service_path(&ctx) {
        Ok(path) => path,
        Err(_) => {
            return Ok(ServiceResponse::error(400, "Missing required 'service_path' parameter"));
        }
    };
    
    let service_states = self.registry_delegate.get_all_service_states().await;
    
    if let Some(state) = service_states.get(&actual_service_path) {
        // Return just the state information
        let state_info = vmap! {
            "service" => actual_service_path,
            "state" => format!("{:?}", state)
        };
        
        Ok(ServiceResponse::ok(state_info))
    } else {
        ctx.logger.warn(format!("Service '{}' not found", actual_service_path));
        Ok(ServiceResponse::error(404, &format!("Service '{}' not found", actual_service_path)))
    }
}
```

## Benefits

1. **Improved Type Safety**: vmap extracts values with proper types, reducing runtime errors.
2. **Reduced Boilerplate**: Significantly less code needed for data transformation.
3. **Better Maintainability**: More declarative style makes code intent clearer.
4. **Consistent Patterns**: Standardized approach to data handling across all handlers.
5. **Enhanced Error Messages**: Clear validation feedback for request parameters.

## Implementation Steps

1. Update the Registry Service to use vmap macros for parameter extraction
2. Convert the list_services handler to use vmap for response construction
3. Convert the service_info handler to use vmap for response construction
4. Convert the service_state handler to use vmap for response construction
5. Add comprehensive tests to verify correct data handling
6. Update documentation with examples of the new pattern

## Testing Strategy

1. **Unit Tests**: Test all handlers with various input combinations
2. **Integration Tests**: Test end-to-end service requests and responses
3. **Edge Cases**: Test with missing parameters, invalid types, etc.
4. **API Consistency**: Ensure response formats remain backward compatible

## Expected Outcomes

1. Registry Service code will be more concise and maintainable
2. Value extraction will be type-safe and have better error handling
3. Response construction will be more consistent and less error-prone
4. The pattern can be adopted by other services for similar benefits 