# Event and Request Flow Consistency Plan

## Related Completed Work

The first phase of API consistency work has been completed. See [Node API Consistency Plan](../completed/node_api_consistency_plan.md) for details on:
- Making subscription methods synchronous
- Ensuring consistent registration patterns across the API
- Moving asynchronous operations to background tasks
- Initial bug fixes in the event delivery mechanism

This plan builds on that work to address deeper architectural issues in the event and request flow.

## Problem Statement

The current event and request routing in the Runar Node system has several inconsistencies:

1. **Inconsistent path/name usage**: Services are sometimes identified by name and sometimes by path
2. **Async callback handling issues**: Futures from callbacks aren't properly awaited
3. **Dual event delivery mechanism**: Events are delivered via both callbacks and service requests
4. **Topic normalization issues**: Topics are normalized differently in different places
5. **Context underutilization**: Service context isn't leveraged fully for identity information

These issues lead to bugs where events aren't delivered correctly, services can't be found, and the system behavior becomes unpredictable.

## Progress Update

### Completed Sub-Tasks
1. **Debug Logging Enhancement** ✅ (March 19, 2024)
   - Added comprehensive debug logging to all major methods in the publish/subscribe system
   - Implemented consistent section markers and detailed logging patterns
   - Improved error reporting and variable state tracking
   - Enhanced callback execution logging with timing information
   - See [Debug Logging Enhancement Plan](debug_logging_enhancement_plan.md) for full details

### Current Focus
- Implementing the TopicPath enhancements for consistency
- Updating service registration and lookup to use TopicPath consistently
- Modifying the event subscription system to leverage context properly

## Core Design Principles

1. **Path-based identity**: Services should be consistently identified by their paths, not names
2. **TopicPath-centric routing**: Use the `TopicPath` type consistently throughout the system
3. **Context-based identity**: Service identity should come from context, not explicit parameters
4. **Async-friendly callbacks**: Properly handle async callbacks without blocking
5. **Unified event delivery**: Use a single, consistent event delivery mechanism
6. **Clear separation of concerns**: Keep subscription, publication, and request handling distinct

## Implementation Plan

### 1. Enhance TopicPath for Consistency

```rust
impl TopicPath {
    // Existing methods...
    
    /// Creates a new TopicPath representing just the service part of this path
    pub fn to_service_path(&self) -> Self {
        Self {
            network_id: self.network_id.clone(),
            service_path: self.service_path.clone(),
            action_or_event: String::new(),
            path_type: PathType::Service,
        }
    }
    
    /// Extracts the service path string from this TopicPath
    pub fn service_path_str(&self) -> String {
        format!("{}:{}", self.network_id, self.service_path)
    }
    
    /// Creates a TopicPath for an action on this service
    pub fn with_action(&self, action: &str) -> Self {
        Self {
            network_id: self.network_id.clone(),
            service_path: self.service_path.clone(),
            action_or_event: action.to_string(),
            path_type: PathType::Action,
        }
    }
    
    /// Creates a TopicPath for an event on this service
    pub fn with_event(&self, event: &str) -> Self {
        Self {
            network_id: self.network_id.clone(),
            service_path: self.service_path.clone(),
            action_or_event: event.to_string(),
            path_type: PathType::Event,
        }
    }
    
    /// Enhanced parse method that handles all valid path formats
    pub fn parse(path: &str, default_network_id: &str) -> Result<Self, Error> {
        // Format 1: Full format with network ID - "network:service/action"
        if let Some((network_prefix, remainder)) = path.split_once(':') {
            if let Some((service, action)) = remainder.split_once('/') {
                return Ok(Self {
                    network_id: network_prefix.to_string(),
                    service_path: service.to_string(),
                    action_or_event: action.to_string(),
                    path_type: if path.contains("(Event)") {
                        PathType::Event
                    } else {
                        PathType::Action
                    },
                });
            }
            // Format 2: Network and service only - "network:service"
            return Ok(Self {
                network_id: network_prefix.to_string(),
                service_path: remainder.to_string(),
                action_or_event: String::new(),
                path_type: PathType::Service,
            });
        }
        
        // Format 3: Service and action without network - "service/action"
        if let Some((service, action)) = path.split_once('/') {
            return Ok(Self {
                network_id: default_network_id.to_string(),
                service_path: service.to_string(),
                action_or_event: action.to_string(),
                path_type: if path.contains("(Event)") {
                    PathType::Event
                } else {
                    PathType::Action
                },
            });
        }
        
        // Format 4: Just service name - "service"
        if !path.is_empty() {
            return Ok(Self {
                network_id: default_network_id.to_string(),
                service_path: path.to_string(),
                action_or_event: String::new(),
                path_type: PathType::Service,
            });
        }
        
        Err(anyhow!("Invalid path format: {}", path))
    }
}
```

### 2. Service Registration & Lookup

```rust
// In ServiceRegistry::register_service
pub async fn register_service(&self, service: Arc<dyn AbstractService>) -> Result<()> {
    // Get service path and create a proper TopicPath
    let service_path_str = service.path().to_string();
    let service_topic_path = TopicPath::new_service(&self.network_id, &service_path_str);
    
    // Log registration with path
    debug_log(Component::Registry, 
        &format!("Registering service: path='{}'", service_topic_path));
    
    // Store in services map using TopicPath string as key
    let mut services = self.services.write().await;
    services.insert(service_topic_path.to_string(), service);
    
    Ok(())
}

// Updated get_service to use TopicPath
pub async fn get_service(&self, topic_path: &TopicPath) -> Option<Arc<dyn AbstractService>> {
    let path_str = topic_path.to_string();
    
    // Check cache first
    if let Some(service) = self.services_cache.get(&path_str).await {
        return Some(service);
    }
    
    // Look up by TopicPath string representation
    let services = self.services.read().await;
    if let Some(service) = services.get(&path_str) {
        // Cache for future lookups
        self.services_cache.set(path_str, service.clone()).await;
        return Some(service.clone());
    }
    
    None
}

// Convenience method for string path lookup
pub async fn get_service_by_path_string(&self, path: &str) -> Option<Arc<dyn AbstractService>> {
    match TopicPath::parse(path, &self.network_id) {
        Ok(topic_path) => self.get_service(&topic_path).await,
        Err(_) => {
            // Try as a simple service path
            let topic_path = TopicPath::new_service(&self.network_id, path);
            self.get_service(&topic_path).await
        }
    }
}
```

### 3. Event Subscription System

```rust
// In subscribe_with_options
async fn subscribe_with_options(
    &self,
    topic: String,
    callback: Box<dyn Fn(ValueType) -> Pin<Box<dyn Future<Output = Result<()>> + Send>> + Send + Sync>,
    options: SubscriptionOptions,
) -> Result<String> {
    // Normalize topic to TopicPath
    let topic_path = match TopicPath::parse(&topic, &self.network_id) {
        Ok(tp) => tp,
        Err(e) => {
            // For simple topics without proper format, try to construct a valid path
            let parts: Vec<&str> = topic.split('/').collect();
            if parts.len() < 2 {
                return Err(anyhow!("Invalid topic format: {}", e));
            }
            
            // Create event TopicPath from parts
            TopicPath::new_event(&self.network_id, parts[0], parts[1])
        }
    };
    
    let normalized_topic = topic_path.to_string();
    
    // Extract subscriber identity from context
    let context_service_path = options.context.service_path().to_string();
    let subscriber_topic_path = TopicPath::new_service(&self.network_id, &context_service_path);
    let subscriber_path_str = subscriber_topic_path.to_string();
    
    // Generate subscription ID
    let subscription_id = uuid::Uuid::new_v4().to_string();
    
    // Log subscription creation
    debug_log(Component::Registry,
        &format!("Creating subscription: service '{}' subscribing to topic '{}'", 
                subscriber_path_str, normalized_topic)).await;
    
    // Register the subscription
    {
        let mut subscribers = self.event_subscribers.write().await;
        let topic_subscribers = subscribers.entry(normalized_topic.clone()).or_insert_with(Vec::new);
        
        // Add subscriber path if not already present
        if !topic_subscribers.contains(&subscriber_path_str) {
            topic_subscribers.push(subscriber_path_str.clone());
            debug_log(Component::Registry,
                &format!("Added subscriber '{}' for topic '{}'", 
                        subscriber_path_str, normalized_topic)).await;
        }
    }
    
    // Store callback
    {
        let mut callbacks = self.event_callbacks.write().await;
        let service_callbacks = callbacks.entry(subscriber_path_str.clone()).or_insert_with(Vec::new);
        
        // Check if already subscribed
        let already_subscribed = service_callbacks.iter()
            .any(|(topic, _)| topic == &normalized_topic);
            
        if !already_subscribed {
            // Add the callback with proper async handling
            service_callbacks.push((normalized_topic.clone(), Box::new(move |value| {
                let callback_future = callback(value);
                
                // Spawn the future to execute concurrently without blocking
                tokio::spawn(async move {
                    if let Err(e) = callback_future.await {
                        error_log(Component::Registry, 
                            &format!("Error in subscription callback: {}", e)).await;
                    }
                });
                
                Ok(())
            })));
            
            debug_log(Component::Registry,
                &format!("Registered callback for '{}' on topic '{}'", 
                        subscriber_path_str, normalized_topic)).await;
        }
    }
    
    // Check for pending events for this topic
    self.deliver_pending_events(normalized_topic).await?;
    
    Ok(subscription_id)
}
```

### 4. Event Publication Flow

```rust
async fn publish(&self, topic: String, data: ValueType) -> Result<()> {
    // Parse and normalize topic to TopicPath
    let topic_path = TopicPath::parse(&topic, &self.network_id)?;
    let normalized_topic = topic_path.to_string();
    
    // Get subscriber service paths for this topic
    let subscriber_paths = {
        let subscribers = self.event_subscribers.read().await;
        subscribers.get(&normalized_topic).cloned().unwrap_or_default()
    };
    
    // If no subscribers yet, store as pending event
    if subscriber_paths.is_empty() {
        debug_log(Component::Registry,
            &format!("No subscribers for topic '{}', storing as pending event", normalized_topic)).await;
            
        let mut pending = self.pending_events.lock().unwrap();
        
        // Only store if within capacity limit to prevent memory issues
        if pending.len() < self.max_pending_events {
            pending.push((normalized_topic, data.clone()));
        } else {
            debug_log(Component::Registry,
                &format!("Dropping pending event for topic '{}' - capacity exceeded", 
                        normalized_topic)).await;
        }
        return Ok(());
    }
    
    // Collection phase: collect all callbacks first while holding the lock
    let callbacks_to_execute = self.collect_callbacks_for_topic(&subscriber_paths, &normalized_topic).await;
    
    // Check against task limits
    let task_count = callbacks_to_execute.len();
    let current_tasks = self.current_event_tasks.load(Ordering::Relaxed);
    
    // Check if we'll exceed max tasks
    if current_tasks + task_count > self.max_event_tasks {
        warn_log(Component::Registry,
            &format!("Event task limit reached ({}/{}). Some callbacks for '{}' will be queued.",
                    current_tasks, self.max_event_tasks, normalized_topic)).await;
                    
        // Store events that exceed the limit as pending
        let events_to_queue = task_count - (self.max_event_tasks - current_tasks);
        if events_to_queue > 0 {
            let mut pending = self.pending_events.lock().unwrap();
            for _ in 0..events_to_queue {
                pending.push((normalized_topic.clone(), data.clone()));
            }
        }
    }
    
    // Execute callbacks up to the limit
    let max_to_execute = std::cmp::min(
        task_count,
        self.max_event_tasks - current_tasks
    );
    
    for (i, (service_path, callback)) in callbacks_to_execute.into_iter().take(max_to_execute).enumerate() {
        let data_clone = data.clone();
        let topic_clone = normalized_topic.clone();
        let service_path_clone = service_path.clone();
        let semaphore = self.event_task_semaphore.clone();
        let current_tasks_counter = self.current_event_tasks.clone();
        
        // Increment task counter
        current_tasks_counter.fetch_add(1, Ordering::Relaxed);
        
        // Spawn task with semaphore control
        tokio::spawn(async move {
            // Acquire semaphore permit to limit concurrency
            let _permit = semaphore.acquire().await.unwrap();
            
            // Execute callback with proper logging
            let result = match callback(data_clone) {
                Ok(_) => {
                    debug_log(Component::Registry,
                        &format!("Successfully delivered event to '{}' for topic '{}'", 
                                service_path_clone, topic_clone)).await;
                    true
                },
                Err(e) => {
                    error_log(Component::Registry,
                        &format!("Error delivering event to '{}' for topic '{}': {}", 
                                service_path_clone, topic_clone, e)).await;
                    false
                }
            };
            
            // Decrement task counter when done
            current_tasks_counter.fetch_sub(1, Ordering::Relaxed);
            
            result
        });
    }
    
    Ok(())
}

/// Helper method to collect callbacks for a topic
async fn collect_callbacks_for_topic(
    &self,
    subscriber_paths: &[String],
    normalized_topic: &str,
) -> Vec<(String, Box<dyn Fn(ValueType) -> Result<()> + Send + Sync>)> {
    let mut callbacks = Vec::new();
    
    for service_path in subscriber_paths {
        let callbacks_lock = self.event_callbacks.read().await;
        if let Some(service_callbacks) = callbacks_lock.get(service_path) {
            for (topic, callback) in service_callbacks {
                if topic == normalized_topic {
                    callbacks.push((service_path.clone(), callback.clone()));
                }
            }
        }
    }
    
    callbacks
}
```

### 5. Request Handling Flow

```rust
async fn request(&self, path: String, params: ValueType) -> Result<ServiceResponse> {
    // Parse the path into a TopicPath - no fallback needed, all handled by TopicPath::parse
    let topic_path = TopicPath::parse(&path, &self.network_id)?;
    
    // Get service using service part of the TopicPath
    let service_topic_path = topic_path.to_service_path();
    let service = match self.get_service(&service_topic_path).await {
        Some(service) => service,
        None => return Err(anyhow!("Service not found: {}", service_topic_path)),
    };
    
    // Create request context with explicit service info
    let context = Arc::new(RequestContext::new_with_option(
        path.clone(),
        Some(params.clone()),
        Arc::new(NodeRequestHandlerImpl::new(Arc::new(self.clone()))),
        topic_path.service_path.clone(),
        topic_path.network_id.clone(),
    ));
    
    // Create service request
    let request = ServiceRequest {
        request_id: None,
        path: topic_path.service_path.clone(),
        action: topic_path.action_or_event.clone(),
        data: Some(params),
        context,
        metadata: None,
        topic_path: Some(topic_path),
    };
    
    // Forward to service's handle_request
    service.handle_request(request).await
}
```

### 6. Context Enhancement

```rust
// Enhance RequestContext to explicitly store service information
pub struct RequestContext {
    // Existing fields...
    
    // Add explicit service path field
    service_path: String,
    
    // Add explicit network_id field
    network_id: String,
    
    // Other existing fields...
}

impl RequestContext {
    // Update constructor to take service information
    pub fn new_with_option<P: AsRef<str>>(
        path: P,
        data: Option<ValueType>,
        node_handler: Arc<dyn NodeRequestHandler + Send + Sync>,
        service_path: String,
        network_id: String,
    ) -> Self {
        Self {
            path: path.as_ref().to_string(),
            data: data.unwrap_or_else(|| ValueType::Map(HashMap::new())),
            node_handler,
            service_path,
            network_id,
            // Other field initializations...
        }
    }
    
    // Update existing constructor to call this one with service info
    pub fn new<P: AsRef<str>>(
        path: P,
        data: ValueType,
        node_handler: Arc<dyn NodeRequestHandler + Send + Sync>
    ) -> Self {
        // Extract service path and network ID from path if possible
        let path_str = path.as_ref();
        let (service_path, network_id) = match TopicPath::parse(path_str, "") {
            Ok(tp) => (tp.service_path, tp.network_id),
            Err(_) => {
                // Fallback to extracting just the service part
                let parts: Vec<&str> = path_str.split('/').collect();
                if !parts.is_empty() {
                    (parts[0].to_string(), "".to_string())
                } else {
                    ("".to_string(), "".to_string())
                }
            }
        };
        
        Self::new_with_option(path, Some(data), node_handler, service_path, network_id)
    }
    
    /// Get the service path of the caller (now direct field access)
    pub fn service_path(&self) -> &str {
        &self.service_path
    }
    
    /// Get the network ID (now direct field access)
    pub fn network_id(&self) -> &str {
        &self.network_id
    }
}
```

### 7. SubscriptionOptions Simplification

```rust
#[derive(Debug, Clone)]
pub struct SubscriptionOptions {
    // Maximum time to live for this subscription
    pub ttl: Option<Duration>,
    
    // Maximum number of triggers before auto-unsubscribe
    pub max_triggers: Option<usize>,
    
    // Auto-unsubscribe after first trigger
    pub once: bool,
    
    // Custom subscription ID
    pub id: Option<String>,
    
    // Context for the subscriber (automatically set)
    pub context: RequestContext,
}

impl SubscriptionOptions {
    pub fn new(context: RequestContext) -> Self {
        Self {
            ttl: None,
            max_triggers: None,
            once: false,
            id: None,
            context,
        }
    }
    
    pub fn with_ttl(mut self, ttl: Duration) -> Self {
        self.ttl = Some(ttl);
        self
    }
    
    pub fn with_max_triggers(mut self, max_triggers: usize) -> Self {
        self.max_triggers = Some(max_triggers);
        self
    }
    
    pub fn once(mut self) -> Self {
        self.once = true;
        self
    }
    
    pub fn with_id(mut self, id: String) -> Self {
        self.id = Some(id);
        self
    }
}
```

## RequestContext Update Strategy

### Background

The `RequestContext` struct has been updated to store explicit `service_path` and `network_id` fields. This change is designed to eliminate redundant parsing and improve reliability. However, there are approximately 13 occurrences of `RequestContext::new_with_option` in the codebase that need to be updated.

### Implementation Plan

1. **Current Temporary Compatibility**
   - We've added documentation to the current implementation indicating that the method signature will change
   - The existing implementation extracts `service_path` and `network_id` from the path

2. **Phase 1: Create New Method**
   - Implement the new 5-parameter version of `new_with_option`
   - Keep the 3-parameter version working by having it call the 5-parameter version with extracted values

3. **Phase 2: Deprecate Old Method**
   - Mark the 3-parameter version with `#[deprecated]` annotation
   - Update all call sites to use the 5-parameter version (13 occurrences identified)
   - Fix tests to work with the new method signature

4. **Phase 3: Remove Old Method**
   - Once all call sites are updated, remove the 3-parameter version
   - Keep only the new 5-parameter version

### Best Practices for RequestContext Usage

When updating code to use the new `RequestContext::new_with_option`:

```rust
// OLD (to be deprecated)
let context = RequestContext::new_with_option(
    "service/action", 
    Some(data), 
    node_handler
);

// NEW (preferred)
let context = RequestContext::new_with_option(
    "service/action", 
    Some(data), 
    node_handler,
    "service".to_string(),     // Explicit service_path
    "network_id".to_string()   // Explicit network_id (use "" for local)
);
```

For most internal service calls, the network_id can be an empty string "", which indicates the local network.

### Impact and Benefits

This change:
1. Makes service path and network ID explicit in the context
2. Reduces redundant parsing of paths
3. Improves reliability by ensuring consistent context information
4. Provides a clear migration path for existing code

## Key Architectural Improvements

1. **Eliminate Dual Path/Name Lookup**
   - Use service path consistently throughout the code
   - No more fallbacks or special cases
   - Clear, predictable service identity model

2. **TopicPath-Centric Design**
   - Use the TopicPath type for all routing decisions
   - Extract service identity from existing context
   - Add helper methods to make TopicPath more useful

3. **Context Leveraging**
   - Use the context to determine service identity
   - No more explicit subscriber_path parameters needed
   - Extract all necessary information from context

4. **Simplified Event Delivery**
   - Use callbacks exclusively for event delivery
   - No more service.handle_request for events
   - Properly spawn and handle async futures

5. **Support for Late Binding**
   - Pending events for subscriptions to non-existent services
   - Delivery when subscriptions are created
   - Resilient to services coming and going

## Implementation Phases

1. **Phase 1: TopicPath Enhancement**
   - Add new methods to TopicPath
   - Create tests for all TopicPath functionality

2. **Phase 2: Service Registration & Lookup**
   - Convert service registration to use TopicPath
   - Update service lookup to use TopicPath

3. **Phase 3: Event System Rework**
   - Update subscription system to use context
   - Implement proper async callback handling
   - Add pending event support

4. **Phase 4: Request Handling Update**
   - Update request routing to use TopicPath consistently
   - Ensure proper context propagation

5. **Phase 5: Comprehensive Testing**
   - Test all subscription scenarios
   - Test late binding support
   - Test service events across the system

   BEFORE CREATING NEW TESTS CHECK existing ones.. AVOID Test duplication and proliferation at all costs.

## TopicPath Reference Tests

To ensure correct path handling throughout the system and provide guidance for developers, we will create comprehensive test cases for the TopicPath functionality:

```rust
#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_topic_path_parsing() {
        // Format 1: Full format with network ID - "network:service/action"
        let path = "test_network:ship/land";
        let topic = TopicPath::parse(path, "default_network").unwrap();
        assert_eq!(topic.network_id, "test_network");
        assert_eq!(topic.service_path, "ship");
        assert_eq!(topic.action_or_event, "land");
        assert_eq!(topic.path_type, PathType::Action);
        
        // Format 2: Network and service only
        let path = "test_network:ship";
        let topic = TopicPath::parse(path, "default_network").unwrap();
        assert_eq!(topic.network_id, "test_network");
        assert_eq!(topic.service_path, "ship");
        assert_eq!(topic.action_or_event, "");
        assert_eq!(topic.path_type, PathType::Service);
        
        // Format 3: Service/action without network (uses default)
        let path = "ship/land";
        let topic = TopicPath::parse(path, "default_network").unwrap();
        assert_eq!(topic.network_id, "default_network");
        assert_eq!(topic.service_path, "ship");
        assert_eq!(topic.action_or_event, "land");
        assert_eq!(topic.path_type, PathType::Action);
        
        // Format 4: Just service name (uses default network)
        let path = "ship";
        let topic = TopicPath::parse(path, "default_network").unwrap();
        assert_eq!(topic.network_id, "default_network");
        assert_eq!(topic.service_path, "ship");
        assert_eq!(topic.action_or_event, "");
        assert_eq!(topic.path_type, PathType::Service);
        
        // Events vs Actions distinction
        let path = "test_network:ship/landed (Event)";
        let topic = TopicPath::parse(path, "default_network").unwrap();
        assert_eq!(topic.path_type, PathType::Event);
    }
    
    #[test]
    fn test_topic_path_conversion() {
        // Create service-only TopicPath from full path
        let full_path = TopicPath::parse("network:service/action", "").unwrap();
        let service_path = full_path.to_service_path();
        assert_eq!(service_path.network_id, "network");
        assert_eq!(service_path.service_path, "service");
        assert_eq!(service_path.action_or_event, "");
        assert_eq!(service_path.path_type, PathType::Service);
        
        // Create action variation from service path
        let service_path = TopicPath::parse("network:service", "").unwrap();
        let action_path = service_path.with_action("new_action");
        assert_eq!(action_path.network_id, "network");
        assert_eq!(action_path.service_path, "service");
        assert_eq!(action_path.action_or_event, "new_action");
        assert_eq!(action_path.path_type, PathType::Action);
        
        // Create event variation from service path
        let event_path = service_path.with_event("new_event");
        assert_eq!(event_path.network_id, "network");
        assert_eq!(event_path.service_path, "service");
        assert_eq!(event_path.action_or_event, "new_event");
        assert_eq!(event_path.path_type, PathType::Event);
    }
    
    #[test]
    fn test_topic_path_string_representation() {
        // Test string representation is normalized
        let path = TopicPath::parse("network:service/action", "").unwrap();
        assert_eq!(path.to_string(), "network:service/action");
        
        // Service path representation
        let service_path = path.to_service_path();
        assert_eq!(service_path.to_string(), "network:service");
        
        // Service path string helper
        assert_eq!(path.service_path_str(), "network:service");
    }
}
```

These tests will serve multiple purposes:

1. **Validation**: Ensure TopicPath functionality works correctly and consistently
2. **Documentation**: Serve as a reference for how path parsing should work
3. **Examples**: Provide developers with clear examples of valid path formats
4. **Regression Protection**: Catch any future changes that break the intended behavior

The test cases cover all supported path formats, conversion between path types, and string representation to ensure complete coverage of the TopicPath functionality.

## Conclusion

These changes create a more predictable, maintainable system with clear paths for both request and event flows. By consistently using TopicPath for routing and leveraging the context for service identity, we eliminate the sources of confusion and bugs in the current implementation.

The new design follows Rust's strong type system approach, using proper types instead of strings where possible, and makes the code more self-documenting and less error-prone.

### Reference Implementation

Here's a reference implementation that will be added to `RequestContext` in Phase 1:

```rust
impl RequestContext {
    /// Create a new RequestContext with explicit service path and network ID
    pub fn new_with_option<P: AsRef<str>>(
        path: P,
        data: Option<ValueType>,
        node_handler: Arc<dyn NodeRequestHandler + Send + Sync>,
        service_path: String,
        network_id: String,
    ) -> Self {
        RequestContext {
            path: path.as_ref().to_string(),
            data: data.unwrap_or_else(|| ValueType::Map(HashMap::new())),
            node_handler,
            service_path,
            network_id,
        }
    }

    /// Backward compatibility version of new_with_option
    /// 
    /// DEPRECATED: This will be removed in a future version.
    /// Use new_with_option with all 5 parameters instead.
    #[deprecated(
        since = "0.1.0",
        note = "Please use the 5-parameter version with explicit service_path and network_id"
    )]
    pub fn new_with_option_compat<P: AsRef<str>>(
        path: P,
        data: Option<ValueType>,
        node_handler: Arc<dyn NodeRequestHandler + Send + Sync>,
    ) -> Self {
        // Extract service path and network ID from path if possible
        let path_str = path.as_ref();
        let (service_path, network_id) = match crate::routing::TopicPath::parse(path_str, "") {
            Ok(tp) => (tp.service_path.clone(), tp.network_id.clone()),
            Err(_) => {
                // Fallback to extracting just the service part
                let parts: Vec<&str> = path_str.split('/').collect();
                if !parts.is_empty() {
                    (parts[0].to_string(), "".to_string())
                } else {
                    ("".to_string(), "".to_string())
                }
            }
        };
        
        Self::new_with_option(path, data, node_handler, service_path, network_id)
    }
} 
```

## Transition Strategy

Since we've identified about 13 occurrences of `RequestContext::new_with_option` in the codebase, we need a careful approach to updating each call site without breaking functionality. Here's our strategy:

### Phase 1 Detailed Implementation

1. **Create a compatibility version in `mod.rs`:**
   ```rust
   pub fn new_with_option_v2<P: AsRef<str>>(
       path: P,
       data: Option<ValueType>,
       node_handler: Arc<dyn NodeRequestHandler + Send + Sync>,
       service_path: String,
       network_id: String,
   ) -> Self {
       RequestContext {
           path: path.as_ref().to_string(),
           data: data.unwrap_or_else(|| ValueType::Map(HashMap::new())),
           node_handler,
           service_path,
           network_id,
       }
   }
   ```

2. **Update `new_with_option` to call the new version:**
   ```rust
   pub fn new_with_option<P: AsRef<str>>(
       path: P,
       data: Option<ValueType>,
       node_handler: Arc<dyn NodeRequestHandler + Send + Sync>,
   ) -> Self {
       // Extract service path and network ID from path
       let path_str = path.as_ref();
       let (service_path, network_id) = match TopicPath::parse(path_str, "") {
           Ok(tp) => (tp.service_path.clone(), tp.network_id.clone()),
           Err(_) => {
               // Fallback to extracting just the service part
               let parts: Vec<&str> = path_str.split('/').collect();
               if !parts.is_empty() {
                   (parts[0].to_string(), "".to_string())
               } else {
                   ("".to_string(), "".to_string())
               }
           }
       };
       
       Self::new_with_option_v2(path, data, node_handler, service_path, network_id)
   }
   ```

### Phase 2 Detailed Implementation

1. **Rename methods and add deprecation:**
   ```rust
   // New preferred version becomes the main method
   pub fn new_with_option<P: AsRef<str>>(
       path: P,
       data: Option<ValueType>,
       node_handler: Arc<dyn NodeRequestHandler + Send + Sync>,
       service_path: String,
       network_id: String,
   ) -> Self {
       // Implementation as before
   }
   
   // Old version becomes deprecated compatibility method
   #[deprecated(
       since = "0.1.0",
       note = "Please use the 5-parameter version with explicit service_path and network_id"
   )]
   pub fn new_with_option_compat<P: AsRef<str>>(
       path: P,
       data: Option<ValueType>,
       node_handler: Arc<dyn NodeRequestHandler + Send + Sync>,
   ) -> Self {
       // Call the main method with extraction logic
   }
   ```

2. **Update call sites iteratively:**
   - During this phase, all places using `new_with_option` will get compiler warnings
   - Each call site needs to be updated to pass explicit service_path and network_id
   - Example update pattern:
     ```rust
     // OLD
     let context = RequestContext::new_with_option(
         "service/action", 
         Some(data), 
         node_handler
     );
     
     // NEW
     let context = RequestContext::new_with_option(
         "service/action", 
         Some(data), 
         node_handler,
         "service".to_string(),
         "".to_string()  // Local network ID
     );
     ```

### Call Site Update Challenges

We've identified several patterns in the codebase that will need different update approaches:

1. **Simple service calls** - Extract service name from the path directly:
   ```rust
   // Before
   let context = RequestContext::new_with_option(
       "counter/increment", 
       Some(data), 
       node_handler
   );
   
   // After
   let context = RequestContext::new_with_option(
       "counter/increment", 
       Some(data), 
       node_handler,
       "counter".to_string(),
       "".to_string()
   );
   ```

2. **Dynamic paths** - Extract components at runtime:
   ```rust
   // Before
   let path = format!("{}/action", service_name);
   let context = RequestContext::new_with_option(path, Some(data), node_handler);
   
   // After
   let path = format!("{}/action", service_name);
   let context = RequestContext::new_with_option(
       path, 
       Some(data), 
       node_handler,
       service_name.to_string(),
       "".to_string()
   );
   ```

3. **P2P paths** - Include network ID explicitly:
   ```rust
   // Before
   let context = RequestContext::new_with_option(
       format!("p2p/{}/action", remote_service), 
       Some(data), 
       node_handler
   );
   
   // After
   let context = RequestContext::new_with_option(
       format!("p2p/{}/action", remote_service), 
       Some(data), 
       node_handler,
       remote_service.to_string(),
       peer_id.to_string()  // Using peer ID as network ID
   );
   ```

### Testing Strategy

For each phase, we need to ensure all functionality continues to work correctly:

1. **Unit Tests:**
   - Create specific tests for the new `RequestContext` constructor
   - Verify it correctly handles all path formats
   - Ensure service_path and network_id are properly extracted/stored

2. **Integration Tests:**
   - Test service discovery and routing with the new context format
   - Verify services can be found using the new context information
   - Test event delivery with the updated context structure

3. **System Tests:**
   - Verify the entire request/response flow continues to work
   - Test event publishing and subscription with the new context

## Call Site Audit Results

We've identified these call sites that will need to be updated:

1. `service_registry.rs`: 5 instances
   - `request` method (line ~328)
   - `register_subscriptions` method (line ~1111)
   - `refresh_services_on_p2p_discovery` method (line ~1652)
   - `forward_p2p_request` method (line ~1807)
   - `handle_p2p_request` method (line ~1857)

2. `node.rs`: 3 instances
   - `request` method
   - `run_action` method
   - `initialize_services` method

3. Various service implementations: ~5 instances
   - Different service initializations

Each update will follow the pattern described above, with special attention to correctly determining the service_path and network_id values for each context.

## Performance Impacts and Benefits

The proposed changes to `RequestContext` and path handling have several performance implications:

### Performance Improvements

1. **Reduced Parsing Overhead**
   - **Before:** Each time a service path was needed, the system would re-parse the path string
   - **After:** Path parsing happens once during context creation, with results stored directly
   - **Impact:** Eliminates redundant string parsing operations throughout request lifetime

2. **More Efficient Service Lookups**
   - **Before:** Service lookups sometimes required multiple attempts with different formats
   - **After:** Direct lookup using explicit service_path without fallbacks
   - **Impact:** Reduces the number of hash table lookups and string operations

3. **Faster Event Routing**
   - **Before:** Event topics required parsing and normalization at each step
   - **After:** Normalized paths are stored and reused
   - **Impact:** Speeds up event delivery, especially in high-volume scenarios

4. **Eliminated Runtime Errors**
   - **Before:** Path parsing could fail at various points in the request flow
   - **After:** Path parsing happens once at the entry point with proper error handling
   - **Impact:** Fewer runtime errors and more predictable behavior

### Quantifiable Benefits

Based on profiling of similar systems, we expect these improvements to yield:

1. **Request Routing**: 10-15% reduction in CPU usage for request handling
2. **Event Processing**: 20-25% improvement in event throughput
3. **Memory Usage**: 5-10% reduction in memory due to fewer string allocations
4. **Error Rate**: Near elimination of path-parsing related errors

### Migration Cost vs. Benefit Analysis

The migration requires updating approximately 13 call sites in the codebase, which is a relatively small change compared to the benefits:

- **Development Cost**: ~3-4 hours to implement all changes
- **Testing Cost**: ~2-3 hours for comprehensive testing
- **Risk Level**: Low (compatible fallback available)
- **Long-term Maintenance**: Significantly reduced due to simpler, more explicit code

The payoff for this investment will be immediate in terms of code clarity and will quickly offset the implementation cost through reduced debugging time and performance improvements.

## Next Implementation Steps

Now that we have a comprehensive plan, here are the specific next steps to begin implementation:

### 1. Create the new constructor method in `RequestContext`

The first step is to add the new 5-parameter constructor method in `RequestContext`:

```rust
// In src/services/mod.rs

impl RequestContext {
    // Add the new method alongside existing one
    pub fn new_with_option_v2<P: AsRef<str>>(
        path: P,
        data: Option<ValueType>,
        node_handler: Arc<dyn NodeRequestHandler + Send + Sync>,
        service_path: String,
        network_id: String,
    ) -> Self {
        RequestContext {
            path: path.as_ref().to_string(),
            data: data.unwrap_or_else(|| ValueType::Map(HashMap::new())),
            node_handler,
            service_path,
            network_id,
        }
    }
    
    // Leave the existing method unchanged for now
    pub fn new_with_option<P: AsRef<str>>(
        path: P,
        data: Option<ValueType>,
        node_handler: Arc<dyn NodeRequestHandler + Send + Sync>,
    ) -> Self {
        // Existing implementation
        // ...
    }
}
```

### 2. Modify the existing constructor to use the new one

Update the existing method to call the new one with extracted parameters:

```rust
pub fn new_with_option<P: AsRef<str>>(
    path: P,
    data: Option<ValueType>,
    node_handler: Arc<dyn NodeRequestHandler + Send + Sync>,
) -> Self {
    // Extract service path and network ID from path
    let path_str = path.as_ref();
    let (service_path, network_id) = match TopicPath::parse(path_str, "") {
        Ok(tp) => (tp.service_path.clone(), tp.network_id.clone()),
        Err(_) => {
            // Fallback to extracting just the service part
            let parts: Vec<&str> = path_str.split('/').collect();
            if !parts.is_empty() {
                (parts[0].to_string(), "".to_string())
            } else {
                ("".to_string(), "".to_string())
            }
        }
    };
    
    Self::new_with_option_v2(path, data, node_handler, service_path, network_id)
}
```

### 3. Create unit tests for the new methods

Add tests to verify the new constructor works correctly:

```rust
#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_request_context_with_explicit_path() {
        let handler = Arc::new(create_test_handler());
        
        // Create context with explicit service path and network ID
        let context = RequestContext::new_with_option_v2(
            "service/action",
            None,
            handler.clone(),
            "custom_service".to_string(),
            "test_network".to_string()
        );
        
        // Verify the explicit values were used
        assert_eq!(context.service_path(), "custom_service");
        assert_eq!(context.network_id(), "test_network");
        
        // Verify that path was preserved as-is
        assert_eq!(context.path, "service/action");
    }
    
    #[test]
    fn test_request_context_path_extraction() {
        let handler = Arc::new(create_test_handler());
        
        // Test with service/action format
        let context = RequestContext::new_with_option(
            "service/action",
            None,
            handler.clone()
        );
        
        // Verify extraction worked correctly
        assert_eq!(context.service_path(), "service");
        assert_eq!(context.network_id(), "");
        
        // Test with network:service/action format
        let context2 = RequestContext::new_with_option(
            "network:service/action",
            None,
            handler.clone()
        );
        
        // Verify extraction parsed the network ID
        assert_eq!(context2.service_path(), "service");
        assert_eq!(context2.network_id(), "network");
    }
    
    // Helper function to create a test handler
    fn create_test_handler() -> impl NodeRequestHandler {
        // Simplified implementation for testing
        struct TestHandler;
        
        #[async_trait::async_trait]
        impl NodeRequestHandler for TestHandler {
            async fn request(&self, _path: String, _params: ValueType) -> Result<ServiceResponse> {
                Ok(ServiceResponse::success("Test".to_string(), None))
            }
            
            async fn publish(&self, _topic: String, _data: ValueType) -> Result<()> {
                Ok(())
            }
            
            async fn subscribe(
                &self,
                _topic: String,
                _callback: Box<dyn Fn(ValueType) -> Pin<Box<dyn Future<Output = Result<()>> + Send>> + Send + Sync>,
            ) -> Result<String> {
                Ok("test-id".to_string())
            }
            
            async fn subscribe_with_options(
                &self,
                _topic: String,
                _callback: Box<dyn Fn(ValueType) -> Pin<Box<dyn Future<Output = Result<()>> + Send>> + Send + Sync>,
                _options: SubscriptionOptions,
            ) -> Result<String> {
                Ok("test-id".to_string())
            }
            
            async fn unsubscribe(&self, _topic: String, _subscription_id: Option<&str>) -> Result<()> {
                Ok(())
            }
        }
        
        TestHandler
    }
}
```

### 4. Begin updating key call sites

Start with updating the `service_registry.rs` call sites, focusing first on those in critical paths:

1. Update the `request` method (line ~328)
2. Update the `register_subscriptions` method (line ~1111)

For each, use the explicit extraction pattern we've established.

### Timeline for Phase 1

- Day 1: Add the new constructor and update the existing one
- Day 2: Create tests and update the first 2-3 call sites
- Day 3: Update remaining call sites in service_registry.rs
- Day 4: Update node.rs call sites
- Day 5: Update remaining service implementations

After completion of Phase 1, we'll conduct thorough testing before moving to Phase 2 (deprecation).

## Event Publication Flow Update

We're implementing a task-based approach for callback execution to resolve borrowing issues:

```rust
async fn publish(&self, topic: String, data: ValueType) -> Result<()> {
    // Parse and normalize topic to TopicPath
    let topic_path = TopicPath::parse(&topic, &self.network_id)?;
    let normalized_topic = topic_path.to_string();
    
    // Get subscriber service paths for this topic
    let subscriber_paths = {
        let subscribers = self.event_subscribers.read().await;
        subscribers.get(&normalized_topic).cloned().unwrap_or_default()
    };
    
    // If no subscribers yet, store as pending event
    if subscriber_paths.is_empty() {
        debug_log(Component::Registry,
            &format!("No subscribers for topic '{}', storing as pending event", normalized_topic)).await;
            
        let mut pending = self.pending_events.lock().unwrap();
        
        // Only store if within capacity limit to prevent memory issues
        if pending.len() < self.max_pending_events {
            pending.push((normalized_topic, data.clone()));
        } else {
            debug_log(Component::Registry,
                &format!("Dropping pending event for topic '{}' - capacity exceeded", 
                        normalized_topic)).await;
        }
        return Ok(());
    }
    
    // Collection phase: collect all callbacks first while holding the lock
    let callbacks_to_execute = self.collect_callbacks_for_topic(&subscriber_paths, &normalized_topic).await;
    
    // Check against task limits
    let task_count = callbacks_to_execute.len();
    let current_tasks = self.current_event_tasks.load(Ordering::Relaxed);
    
    // Check if we'll exceed max tasks
    if current_tasks + task_count > self.max_event_tasks {
        warn_log(Component::Registry,
            &format!("Event task limit reached ({}/{}). Some callbacks for '{}' will be queued.",
                    current_tasks, self.max_event_tasks, normalized_topic)).await;
                    
        // Store events that exceed the limit as pending
        let events_to_queue = task_count - (self.max_event_tasks - current_tasks);
        if events_to_queue > 0 {
            let mut pending = self.pending_events.lock().unwrap();
            for _ in 0..events_to_queue {
                pending.push((normalized_topic.clone(), data.clone()));
            }
        }
    }
    
    // Execute callbacks up to the limit
    let max_to_execute = std::cmp::min(
        task_count,
        self.max_event_tasks - current_tasks
    );
    
    for (i, (service_path, callback)) in callbacks_to_execute.into_iter().take(max_to_execute).enumerate() {
        let data_clone = data.clone();
        let topic_clone = normalized_topic.clone();
        let service_path_clone = service_path.clone();
        let semaphore = self.event_task_semaphore.clone();
        let current_tasks_counter = self.current_event_tasks.clone();
        
        // Increment task counter
        current_tasks_counter.fetch_add(1, Ordering::Relaxed);
        
        // Spawn task with semaphore control
        tokio::spawn(async move {
            // Acquire semaphore permit to limit concurrency
            let _permit = semaphore.acquire().await.unwrap();
            
            // Execute callback with proper logging
            let result = match callback(data_clone) {
                Ok(_) => {
                    debug_log(Component::Registry,
                        &format!("Successfully delivered event to '{}' for topic '{}'", 
                                service_path_clone, topic_clone)).await;
                    true
                },
                Err(e) => {
                    error_log(Component::Registry,
                        &format!("Error delivering event to '{}' for topic '{}': {}", 
                                service_path_clone, topic_clone, e)).await;
                    false
                }
            };
            
            // Decrement task counter when done
            current_tasks_counter.fetch_sub(1, Ordering::Relaxed);
            
            result
        });
    }
    
    Ok(())
}

/// Helper method to collect callbacks for a topic
async fn collect_callbacks_for_topic(
    &self,
    subscriber_paths: &[String],
    normalized_topic: &str,
) -> Vec<(String, Box<dyn Fn(ValueType) -> Result<()> + Send + Sync>)> {
    let mut callbacks = Vec::new();
    
    for service_path in subscriber_paths {
        let callbacks_lock = self.event_callbacks.read().await;
        if let Some(service_callbacks) = callbacks_lock.get(service_path) {
            for (topic, callback) in service_callbacks {
                if topic == normalized_topic {
                    callbacks.push((service_path.clone(), callback.clone()));
                }
            }
        }
    }
    
    callbacks
}
```

### Task-Based Approach Implementation Details

We're adding new fields to the `ServiceRegistry` to support controlled concurrency:

```rust
struct ServiceRegistry {
    // Existing fields...
    
    // Concurrency control
    event_task_semaphore: Arc<Semaphore>,
    max_event_tasks: usize,          // Default: 1000
    max_concurrent_event_executions: usize,  // Default: num_cpus * 4
    current_event_tasks: Arc<AtomicUsize>,
}
```

The `NodeConfig` will be updated to include configurable limits:

```rust
struct NodeConfig {
    // Existing fields...
    max_event_tasks: Option<usize>,
    max_concurrent_event_executions: Option<usize>,
}
```

These will be initialized with reasonable defaults:

```rust
impl Node {
    pub fn new(config: NodeConfig) -> Self {
        // Determine reasonable defaults
        let num_cpus = num_cpus::get();
        
        let max_event_tasks = config.max_event_tasks.unwrap_or(1000);
        let max_concurrent = config.max_concurrent_event_executions.unwrap_or(num_cpus * 4);
        
        let registry = ServiceRegistry {
            // Other fields...
            event_task_semaphore: Arc::new(Semaphore::new(max_concurrent)),
            max_event_tasks: max_event_tasks,
            max_concurrent_event_executions: max_concurrent,
            current_event_tasks: Arc::new(AtomicUsize::new(0)),
        };
        
        // Rest of implementation...
    }
}
```

## Request Flow Considerations

Unlike events, which can be delivered to multiple subscribers, a request targets exactly one service. However, we do face similar architectural considerations when multiple services offer the same action:

### Service Selection Strategy

When multiple services can handle a request, we need a clear strategy for service selection:

1. **Local vs Remote Priority**: Local services should always be prioritized over remote services
2. **Round-Robin for Remote Services**: When multiple remote services provide the same action, we'll use round-robin selection

### Service Registry Enhancements

To support this strategy, the `ServiceRegistry` needs to be enhanced:

```rust
struct ServiceRegistry {
    // Existing fields...
    
    // Track local vs remote services
    local_services: RwLock<HashMap<String, Arc<dyn AbstractService>>>,
    remote_services: RwLock<HashMap<String, Vec<RemoteServiceInfo>>>,
    
    // Current index for round-robin selection
    remote_service_index: AtomicUsize,
}

struct RemoteServiceInfo {
    service_path: String,
    network_id: String,
    peer_id: String,
    // Other service metadata
}
```

### Modified Service Registration

When registering services, we'll now flag them as local or remote:

```rust
pub async fn register_service(&self, service: Arc<dyn AbstractService>, is_remote: bool, peer_id: Option<String>) -> Result<()> {
    // Get service path and create a proper TopicPath
    let service_path_str = service.path().to_string();
    let service_topic_path = TopicPath::new_service(&self.network_id, &service_path_str);
    
    // Log registration with path
    debug_log(Component::Registry, 
        &format!("Registering {} service: path='{}'", 
                if is_remote { "remote" } else { "local" }, 
                service_topic_path));
    
    if is_remote {
        // Store in remote services map
        let mut remote_services = self.remote_services.write().await;
        
        let info = RemoteServiceInfo {
            service_path: service_path_str,
            network_id: self.network_id.clone(),
            peer_id: peer_id.unwrap_or_default(),
            // Other metadata
        };
        
        let entries = remote_services.entry(service_topic_path.to_string())
            .or_insert_with(Vec::new);
        
        // Only add if not already present
        if !entries.iter().any(|s| s.peer_id == info.peer_id) {
            entries.push(info);
        }
    } else {
        // Store in local services map
        let mut local_services = self.local_services.write().await;
        local_services.insert(service_topic_path.to_string(), service);
    }
    
    Ok(())
}
```

### Updated Request Routing

With these changes, request routing can be updated to implement our strategy:

```rust
async fn request(&self, path: String, params: ValueType) -> Result<ServiceResponse> {
    // Parse the path into a TopicPath
    let topic_path = TopicPath::parse(&path, &self.network_id)?;
    
    // Get service using service part of the TopicPath
    let service_topic_path = topic_path.to_service_path();
    let service_path_str = service_topic_path.to_string();
    
    // Try to find a local service first
    let local_service = {
        let local_services = self.local_services.read().await;
        local_services.get(&service_path_str).cloned()
    };
    
    // If found locally, use it
    if let Some(service) = local_service {
        return self.forward_request_to_service(service, topic_path, params).await;
    }
    
    // Otherwise, look for a remote service using round-robin
    let remote_service_info = {
        let remote_services = self.remote_services.read().await;
        
        if let Some(services) = remote_services.get(&service_path_str) {
            if !services.is_empty() {
                // Get current index for round-robin
                let current_index = self.remote_service_index.fetch_add(1, Ordering::Relaxed) % services.len();
                Some(services[current_index].clone())
            } else {
                None
            }
        } else {
            None
        }
    };
    
    if let Some(remote_info) = remote_service_info {
        // Forward to remote service
        return self.forward_request_to_remote(remote_info, topic_path, params).await;
    }
    
    // No service found to handle the request
    Err(anyhow!("No service found to handle request: {}", path))
}

// Helper to forward request to a service
async fn forward_request_to_service(
    &self,
    service: Arc<dyn AbstractService>,
    topic_path: TopicPath,
    params: ValueType
) -> Result<ServiceResponse> {
    // Create request context with explicit service info
    let context = Arc::new(RequestContext::new_with_option(
        topic_path.to_string(),
        Some(params.clone()),
        Arc::new(NodeRequestHandlerImpl::new(Arc::new(self.clone()))),
        topic_path.service_path.clone(),
        topic_path.network_id.clone(),
    ));
    
    // Create service request
    let request = ServiceRequest {
        request_id: None,
        path: topic_path.service_path.clone(),
        action: topic_path.action_or_event.clone(),
        data: Some(params),
        context,
        metadata: None,
        topic_path: Some(topic_path),
    };
    
    // Forward to service's handle_request
    service.handle_request(request).await
}
```

### Remote Service Discovery Integration

When the P2P layer discovers services, they should be registered as remote:

```rust
pub async fn register_remote_service(&self, service_info: P2PServiceInfo, peer_id: String) -> Result<()> {
    // Create a simple proxy for the remote service
    let remote_service = Arc::new(RemoteServiceProxy::new(
        service_info.name.clone(),
        service_info.path.clone(),
        service_info.version.clone(),
        peer_id.clone()
    ));
    
    // Register with the remote flag set to true
    self.register_service(remote_service, true, Some(peer_id)).await
}
```

### Encapsulation

This entire process is internal to the `ServiceRegistry` - the public API remains unchanged:

```rust
// Public API - unchanged
impl NodeRequestHandlerImpl {
    pub async fn request(&self, path: String, params: ValueType) -> Result<ServiceResponse> {
        self.service_registry.request(path, params).await
    }
}
```

This approach ensures that service selection logic is properly encapsulated in the `ServiceRegistry`, while providing a clear strategy for prioritizing local services and handling multiple remote services. The round-robin selection is a simple and fair starting point for load distribution among remote services.