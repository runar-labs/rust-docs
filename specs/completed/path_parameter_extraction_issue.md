# Path Parameter Extraction Issue

## Issue Description

We have identified a critical issue in the path parameter extraction mechanism of the framework. In the current implementation, when a request like `$registry/services/math` is made to a handler registered with a template path like `$registry/services/{service_path}`, the template parameter `service_path` (which should be "math") is not being populated in the `RequestContext.path_params` map.

This causes services to fail when they attempt to access these path parameters. For example, in the Registry Service, the `extract_service_path` method fails when trying to extract the service path parameter from the request.

## Current Implementation Analysis

1. **Template Registration**:
   - Handlers are correctly registered with template paths (e.g., `services/{service_path}`)
   - The PathTrie data structure correctly matches concrete paths against these templates

2. **Template Matching**:
   - When matching a path like `$registry/services/math` against a registered template like `$registry/services/{service_path}`, the PathTrie correctly finds the match
   - However, it doesn't extract the parameter values during this matching process

3. **RequestContext Creation**:
   - In `Node::request`, a new RequestContext is created as follows:
     ```rust
     let context = RequestContext::new(&topic_path, self.logger.clone());
     ```
   - However, this doesn't populate the path_params map with the extracted parameters

4. **Parameter Access**:
   - Services attempt to access these parameters via `ctx.path_params.get("service_path")`
   - Since the parameters weren't extracted during matching, this fails

5. **Tests Expectation**:
   - Tests expect that when a request is made to `$registry/services/math`, the parameter "service_path" with value "math" will be available in the context's path_params map

## Root Cause

The root cause is that while the framework correctly matches template paths, it doesn't have a mechanism to extract the parameter values during this process and populate them in the RequestContext. The issue is specifically in the Node::request method, which creates a RequestContext but doesn't extract and populate path parameters.

## Proposed Solution: Store Registration Template in Registry

The correct approach to solve this issue is to:

1. Store the original template path when handlers are registered
2. Return both the handler and its registration template path when looking up handlers
3. Extract path parameters only after a successful handler lookup, using the original template

### Implementation Details

1. **Modify ServiceRegistry to Store Template Paths**:
   ```rust
   // When handlers are registered, store the template path used for registration
   pub async fn register_local_action_handler<F>(&self, topic_path: &TopicPath, handler: F) -> Result<()>
   where
       F: ActionHandler + 'static,
   {
       // Store the handler along with the original registration topic path
       self.local_action_handlers.write().await.insert(
           topic_path.action_path().to_string(),
           (Box::new(handler), topic_path.clone())
       );
       Ok(())
   }
   ```

2. **Return Both Handler and Template Path**:
   ```rust
   pub async fn get_local_action_handler(&self, topic_path: &TopicPath) 
       -> Option<(Box<dyn ActionHandler>, TopicPath)> 
   {
       // Return both the handler and the original registration topic path
       self.local_action_handlers.read().await.get(
           &topic_path.action_path().to_string()
       ).cloned()
   }
   ```

3. **Extract Parameters in Node::request After Handler Lookup**:
   ```rust
   // In Node::request method
   if let Some((handler, registration_path)) = self.service_registry.get_local_action_handler(&topic_path).await {
       self.logger.debug(format!("Executing local handler for: {}", topic_path));
       
       // Create request context
       let mut context = RequestContext::new(&topic_path, self.logger.clone());
       
       // Extract parameters using the original registration path
       if let Ok(params) = topic_path.extract_params(&registration_path.action_path()) {
           // Populate the path_params in the context
           context.path_params = params;
       }
       
       // Execute the handler and return result
       return handler(Some(payload), context).await;
   }
   ```

### Advantages

- **No Hardcoded Templates**: Avoids the maintenance nightmare of hardcoded template paths
- **Single Source of Truth**: The original registration template is the authority for parameter extraction
- **Correct Information Flow**: Parameters are extracted only when needed, after a handler match is found
- **Efficient**: No need for a separate lookup to find the template that matched

### Implementation Plan

1. Update the `ServiceRegistry` to store and return the original registration topic path with handlers
2. Modify `Node::request` to extract parameters using the registration path after handler lookup
3. Add comprehensive tests to verify parameters are correctly extracted and populated
4. Remove any hardcoded template paths from the codebase

## Current Status

- We have identified the issue and its root cause
- We have fixed the `extract_service_path` function to correctly check for the "service_path" parameter
- Testing has confirmed that path parameters are not being populated in the RequestContext
- Next step is to implement the solution described above 

## Additional Improvement: Service Metadata Filtering

While implementing the path parameter extraction solution, we've identified another improvement needed in the `ServiceRegistry`. Currently, the `get_all_service_metadata` method doesn't provide a way to filter internal system services (those with paths starting with `$`).

### Issue

1. The current implementation uses a dummy path to retrieve all services:
   ```rust
   // Use a dummy path to get all handlers
   let dummy_path = TopicPath::new_service("default", "dummy");
   let service_matches = services.find_matches(&dummy_path);
   ```

2. This approach:
   - Uses a workaround rather than directly using the `local_services` data structure
   - Doesn't provide filtering options for internal services

### Proposed Solution

1. **Update the `get_all_service_metadata` method to include filtering:**
   ```rust
   async fn get_all_service_metadata(&self, include_internal_services: bool) -> HashMap<String, CompleteServiceMetadata> {
       let mut result = HashMap::new();
       let local_services = self.get_local_services().await;
       let states = self.service_states_by_service_path.read().await;
       
       // Create timestamp for registration
       let now = std::time::SystemTime::now()
           .duration_since(std::time::UNIX_EPOCH)
           .unwrap_or_default()
           .as_secs();
       
       // Iterate through all services
       for (_, service_entry) in local_services {
           let service = &service_entry.service;
           let path_str = service.path().to_string();
           
           // Skip internal services if not included
           if !include_internal_services && path_str.starts_with("$") {
               continue;
           }
           
           let state = states.get(&path_str).cloned().unwrap_or(ServiceState::Unknown);
           
           // Create metadata using individual getter methods from the service
           result.insert(path_str, CompleteServiceMetadata {
               name: service.name().to_string(),
               path: service.path().to_string(),
               version: service.version().to_string(),
               description: service.description().to_string(),
               registered_actions: HashMap::new(), // Would need more complex logic to populate
               registered_events: HashMap::new(),  // Would need more complex logic to populate
               current_state: state,
               registration_time: now,
               last_start_time: None,
           });
       }
       
       result
   }
   ```

2. **Update existing code to use the parameter for backward compatibility:**
   ```rust
   // When needing all services including internal ones
   let all_services = registry.get_all_service_metadata(true).await;
   
   // When only needing user-facing services
   let user_services = registry.get_all_service_metadata(false).await;
   ```

### Benefits

1. Provides explicit control over including/excluding internal services
2. Eliminates the dummy path workaround
3. Follows cleaner design practices by directly using the services collection

This improvement has been implemented alongside the path parameter extraction solution described earlier. 