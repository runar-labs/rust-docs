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

## Solution: Fix the Core System

### 1. API Changes: Support Async Callbacks

Update the core APIs to properly support async callbacks:

```rust
// In NodeRequestHandler trait
async fn subscribe_async<F>(&self, topic: String, callback: F) -> Result<String>
where
    F: (Fn(ValueType) -> Pin<Box<dyn Future<Output = Result<()>> + Send>>) + Send + Sync + 'static;

// In RequestContext
pub async fn subscribe_async<T: Into<String>, F>(
    &self, 
    topic: T,
    callback: F
) -> Result<String>
where
    F: (Fn(ValueType) -> Pin<Box<dyn Future<Output = Result<()>> + Send>>) + Send + Sync + 'static,
{
    self.node_handler.subscribe_async(topic.into(), callback).await
}
```

### 2. Event Processing: Proper Error Handling

When processing events, the core system should:

1. Await the futures returned by async callbacks ( this shuold not impact other areas of the core.. the system shuoold continue to process other events in parallel and not wait for one event ot complete to then handle other.. this is related to make sure the rsuitl of a event handler is properly handled.)
2. Track success/failure for each handler
3. Log errors consistently
4. Collect performance metrics

### 3. Subscription Registry: Enhanced Metadata

Update the subscription registry to:

1. Track whether a handler is sync or async
2. Store success/failure metrics
3. Track processing time
4. Support configurable behavior (required success count, etc.)

## Implementation Requirements

1. **Backward Compatibility**: Keep supporting synchronous callbacks
2. **Proper Type Detection**: Auto-detect async methods in macros
3. **Consistent API**: Make both sync and async subscription methods work similarly
4. **Error Propagation**: Ensure errors are properly captured and logged
5. **Metrics Collection**: Add metrics for handler performance

## Lessons Learned

1. **Avoid Workarounds**: Task spawning is a workaround that hides errors
2. **Observability Matters**: System-level visibility into event processing is critical
3. **API Design**: Core APIs should directly support async patterns
4. **Consistency**: Error handling should be consistent throughout the system

## Implementation Approach

1. Fix the core system first rather than building more workarounds
2. Update macros to detect async methods and use the appropriate API
3. Create comprehensive tests to verify both synchronous and asynchronous patterns

## Implementation Tasks

1. **NodeRequestHandler Updates**
   - Add `subscribe_async` method to trait
   - Implement in all concrete implementations

2. **ServiceRegistry Updates**
   - Add async subscription support
   - Enhance metadata tracking
   - Improve error handling

3. **RequestContext Updates**
   - Add `subscribe_async` method
   - Update documentation

4. **Macro Updates**
   - Modify `#[subscribe]` to detect async methods
   - Generate proper code based on method type

5. **Testing**
   - Test both sync and async patterns
   - Verify error handling
   - Measure performance 