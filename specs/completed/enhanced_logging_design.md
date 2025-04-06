# Enhanced Logging System Design

## Overview

This design document outlines improvements to the Runar Node logging system to include action and event paths in logs for better context and traceability.

## Key Requirements

1. **Action/Event Context in Logs**: Include the action or event path in log messages for better traceability
2. **Consistent Format**: Maintain a consistent log format: `[nodeID] [component] [action_or_event] [message]`
3. **Auto-Detection**: Automatically extract the relevant action/event path from contexts
4. **Minimal Changes**: Only modify logger creation, not usage across the codebase
5. **Performance**: Minimal performance impact for high-volume logging

## Current Implementation Analysis

The current Logger implementation in `rust-common/src/logging/mod.rs` includes:
- Component-based logging with node ID tracking
- Methods for different log levels (debug, info, warn, error)
- Support for hierarchical components
- No action/event path context in logs

## Design Changes

### 1. Enhanced Logger Structure

Update the Logger structure to include an optional action_or_event field:

```rust
#[derive(Clone)]
pub struct Logger {
    /// Component this logger is for
    component: Component,
    
    /// Node ID for distributed tracing
    node_id: String,
    
    /// Parent component for hierarchical logging (if any)
    parent_component: Option<Component>,
    
    /// Optional action or event path for context
    action_or_event: Option<String>,
}
```

### 2. Add Action/Event Context Methods

Add methods to set and use action/event context:

```rust
impl Logger {
    // ... existing methods ...
    
    /// Create a new logger with a specific action or event path
    pub fn with_action_or_event(&self, path: impl Into<String>) -> Self {
        Self {
            component: self.component,
            node_id: self.node_id.clone(),
            parent_component: self.parent_component,
            action_or_event: Some(path.into()),
        }
    }
}
```

### 3. Update Log Message Formatting

Modify the log message formatting to include the action/event context when available, but always include the component prefix:

```rust
impl Logger {
    /// Get the component prefix for logging, including parent if available
    fn component_prefix(&self) -> String {
        match self.parent_component {
            Some(parent) if parent != Component::Node => 
                format!("{}.{}", parent.as_str(), self.component.as_str()),
            _ => self.component.as_str().to_string(),
        }
    }
    
    /// Log a debug message
    pub fn debug(&self, message: impl Into<String>) {
        if log::log_enabled!(log::Level::Debug) {
            match &self.action_or_event {
                Some(path) => debug!("[{}][{}][{}] {}", self.node_id, self.component_prefix(), path, message.into()),
                None => debug!("[{}][{}] {}", self.node_id, self.component_prefix(), message.into())
            }
        }
    }
    
    // Similarly update info, warn, and error methods...
}
```

### 4. Context Integration

Update the RequestContext and EventContext to automatically include action/event information in their loggers, using the proper TopicPath methods:

```rust
impl RequestContext {
    pub fn new(topic_path: &TopicPath, logger: Logger) -> Self {
        // Use action_path() method to get just the action portion
        let action_path = topic_path.action_path();
        
        Self {
            topic_path: topic_path.clone(),
            path_params: HashMap::new(),
            logger: logger.with_action_or_event(action_path),
            // ... other fields ...
        }
    }
}

impl EventContext {
    pub fn new(topic_path: &TopicPath, logger: Logger) -> Self {
        // Use action_path() method to get just the action portion
        let action_path = topic_path.action_path();
        
        Self {
            topic_path: topic_path.clone(),
            logger: logger.with_action_or_event(action_path),
            // ... other fields ...
        }
    }
}
```

### 5. Integration with Existing Logger Creation

Ensure that we maintain the current logger lifecycle, only enhancing it with additional context:

```rust
// In Node class, when handling requests:
async fn handle_request(&self, topic_path: &TopicPath, data: ValueType) -> Result<ServiceResponse> {
    // Create a base logger for this component
    let base_logger = self.logger.with_component(Component::Service);
    
    // Add action context using the proper method
    let action_path = topic_path.action_path();
    let request_logger = base_logger.with_action_or_event(action_path);
    
    // Use the enhanced logger
    request_logger.debug("Processing request");
    
    // Create context with the enhanced logger
    let context = RequestContext::new(topic_path, request_logger);
    
    // ... rest of implementation ...
}
```

## Usage Examples

### Log Messages with Action/Event Context

With the enhanced logging system, logs will automatically include the action path when available:

```
// Original log format
[node1][Service] Processing request

// Enhanced log format
[node1][Service][login] Processing request  // Just the action part, not the full path
```

### Creating Loggers with Action/Event Context

```rust
// In a service action handler
async fn handle_login(&self, params: ValueType, ctx: RequestContext) -> Result<ServiceResponse> {
    // ctx.logger already has the action context from RequestContext::new()
    ctx.logger.info("Processing login request"); // Logs: [node1][Service][login] Processing login request
    
    // ...implementation...
}

// Adding context manually where needed
let logger = base_logger.with_action_or_event("custom_operation");
logger.debug("Starting operation"); // Logs: [node1][Service][custom_operation] Starting operation
```

## Benefits

1. **Improved Traceability**: Logs now include the specific action or event, without extraneous path information
2. **Better Context**: Quickly identify which action or event is associated with a log message
3. **Minimal Changes**: Only logger creation code needs to be updated, not every logging call
4. **Consistent Format**: All logs follow a consistent format for easy parsing

## Implementation Steps

1. Update the Logger structure to include the action_or_event field
2. Add the with_action_or_event method
3. Update the logging methods to include action/event information when available
4. Modify RequestContext and EventContext to automatically set action/event context using TopicPath.action_path()
5. Update places where loggers are created to add action/event context
6. Add tests to verify correct context in logs
7. Update documentation with examples

## Testing Strategy

1. **Unit Tests**: Test logger methods with and without action/event context
2. **Integration Tests**: Verify context information appears correctly in logs for different scenarios
3. **Varied Contexts**: Test with different types of actions and events to ensure correct representation

## Expected Outcomes

1. All logs will include action/event context when available, making it easier to trace operations
2. Debugging will be significantly improved with more contextual information
3. Log parsing and analysis will be able to filter and group logs by action/event
4. Changes will be minimal and focused on logger creation, not widespread usage 