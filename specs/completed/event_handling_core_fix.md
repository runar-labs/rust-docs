# Event Handling System: Core Fix

## Problem Identified

During our reference implementation work, we discovered a fundamental issue in the Node API event subscription system:

1. **Core Issue**: The Node API only supports synchronous callbacks for event subscriptions `Fn(ValueType) -> Result<()>`

2. **Current Patterns Force Bad Practices**: When handling events asynchronously, services must:
   - Spawn separate tasks with `tokio::spawn`
   - Return immediate success without waiting for actual processing
   - Handle errors locally, removing system-level visibility
   - Locally log errors that should be tracked centrally

3. **Architectural Violations**:
   - Error handling is inconsistent (some errors invisible to the core)
   - Success/failure metrics cannot be collected
   - No way to guarantee "at least one handler succeeds"
   - Performance metrics are impossible to collect

## Current Pattern (Reference Implementation)

Our reference implementation in `StringService` uses this workaround:

```rust
context.subscribe("events/text_event", move |payload: ValueType| {
    // Extract parameters...
    
    // Spawn a separate task to handle the async work
    tokio::spawn(async move {
        if let Err(e) = service.handle_text_event(text).await {
            // Local error handling only - system never sees this
            let _ = warn_log(Component::Service, &format!("Error: {}", e));
        }
    });
    
    // Return immediate success to core system regardless of actual result
    Ok(())
}).await?;
```

This pattern fundamentally violates our architectural principles around error handling and observability.

## Solution: Transition Fully to Async Callbacks

We will completely replace the synchronous callback system with a fully async implementation. This is not about supporting both patterns but transitioning entirely to the async pattern for all subscription handlers.

### 1. API Changes: Replace Sync with Async Callbacks

Replace the current synchronous API with a fully async implementation:

```rust
// In NodeRequestHandler trait
async fn subscribe<F>(&self, topic: String, callback: F) -> Result<String>
where
    F: (Fn(ValueType) -> Pin<Box<dyn Future<Output = Result<()>> + Send>>) + Send + Sync + 'static;

// In RequestContext
pub async fn subscribe<T: Into<String>, F, Fut>(
    &self, 
    topic: T,
    callback: F
) -> Result<String>
where
    F: Fn(ValueType) -> Fut + Send + Sync + 'static,
    Fut: Future<Output = Result<()>> + Send + 'static,
{
    // Implementation converts the callback to the expected format
    // then calls the node_handler.subscribe
    let topic_str = topic.into();
    
    // Create a wrapper function that properly handles futures
    let wrapper = Box::new(move |value: ValueType| -> Pin<Box<dyn Future<Output = Result<()>> + Send>> {
        Box::pin(callback(value))
    });
    
    self.node_handler.subscribe(topic_str, wrapper).await
}
```

### 2. Event Processing: Proper Error Handling

When processing events, the core system should:

1. Await the futures returned by async callbacks (this should not impact other areas of the core - the system should continue to process other events in parallel)
2. Track success/failure for each handler
3. Log errors consistently
4. Collect performance metrics

### 3. Subscription Registry: Enhanced Metadata

Update the subscription registry to:

1. Store success/failure metrics
2. Track processing time
3. Support configurable behavior (required success count, etc.)

## Implementation Requirements

1. **No Backward Compatibility**: Remove support for synchronous callbacks entirely
2. **Proper Type Detection**: Detect and reject non-async methods in macros
3. **Consistent API**: Ensure clear, idiomatic async patterns
4. **Error Propagation**: Ensure errors are properly captured and logged
5. **Metrics Collection**: Add metrics for handler performance

## Lessons Learned

1. **Avoid Workarounds**: Task spawning is a workaround that hides errors
2. **Observability Matters**: System-level visibility into event processing is critical
3. **API Design**: Core APIs should directly support async patterns
4. **Consistency**: Error handling should be consistent throughout the system

## Implementation Approach

1. Modify the core API to only support async callbacks
2. Update all existing code to use the new async pattern
3. Remove all synchronous callback support
4. Update macros to generate async-compliant code
5. Create comprehensive tests that verify the async pattern

## Implementation Tasks

1. **NodeRequestHandler Updates**
   - Replace synchronous `subscribe` method with async implementation
   - Update all concrete implementations to use async callbacks
   - Remove any synchronous callback handling code

2. **ServiceRegistry Updates**
   - Replace synchronous subscription mechanisms
   - Enhance metadata tracking
   - Improve error handling

3. **RequestContext Updates**
   - Update `subscribe` method to only accept async callbacks
   - Update documentation to reflect the change to async-only

4. **Macro Updates**
   - Modify `#[subscribe]` to require async methods
   - Generate proper async code based on method type
   - Add compile-time errors for non-async methods

5. **Migration Tasks**
   - Identify all services using synchronous callbacks
   - Convert all existing subscriptions to use async pattern
   - Update any test code to use async callbacks
   - Remove all synchronous callback workarounds (tokio::spawn)

6. **Testing**
   - Test async patterns
   - Verify error handling
   - Measure performance

## Migration Approach for Existing Code

For each service using the synchronous callback pattern:

1. Identify all subscription handlers
2. Convert handlers to use async syntax:

```rust
// OLD (synchronous callback with spawn)
context.subscribe("events/text_event", move |payload: ValueType| {
    // Spawn task to handle async work
    tokio::spawn(async move {
        if let Err(e) = service.handle_text_event(text).await {
            // Local error handling
        }
    });
    
    Ok(())
}).await?;

// NEW (async callback)
context.subscribe("events/text_event", move |payload: ValueType| async move {
    // Direct async handling
    match service.handle_text_event(text).await {
        Ok(_) => Ok(()),
        Err(e) => {
            // Error is now properly propagated to the system
            Err(e)
        }
    }
}).await?;
```

3. Test the converted handlers thoroughly
4. Update any related documentation 