# Service Macros Implementation Plan

## Main Goal

**Implement all necessary features in the KAGI macros and node core to enable the full functionality demonstrated in `docs/services/macros_example.rs`.**

The primary focus is to support service operations through the Node API (not direct method calls), including:
1. Service registration with the Node
2. Action execution via `node.request()`
3. Event subscription and publishing through the Node
4. Support for both direct value and mapped parameters
5. Create an example file based on `docs/services/macros_example.rs` and make sure it compiles and runs correctly

At project completion, the example code must compile and run exactly as expected, with all features fully implemented (no mocks or shortcuts).

## Target API

As shown in `docs/services/macros_example.rs`, the desired API has these key features:

### 1. Service Creation and Registration with Node
```rust
// Define the service
#[service(
    name = "data",
    description = "Processes and transforms data",
    version = "1.0.0"
)]
struct DataProcessorService {
    counter: u32,
}

// Create and register with Node
let data_processor = DataProcessorService::new();
node.add_service(data_processor).await?;
```

### 2. Action Methods Invoked via Node API
```rust
// Define action in service
#[action(name = "transform")]
async fn transform(&self, context: &RequestContext, data: &str) -> Result<String> {
    // Implementation...
    Ok(transformed)
}

// Invoke through Node API
// With mapped parameters:
let transform_result = node.request(
    "data/transform",
    vmap! {
        "data" => "hello world"
    }
).await?;

// With direct parameter:
let transform_result2 = node.request(
    "data/transform",
     "hello world" 
).await?;
```

### 3. Event Subscriptions and Publishing Through Node
```rust
// Define subscription in service
#[subscribe(topic = "text_events")]
async fn handle_text_events(&mut self, payload: ValueType) -> Result<()> {
    // Implementation...
    Ok(())
}

// Publish event through context in action method
context.publish("events/data_events", event_data).await?;

// Publish event directly through Node API
node.publish(
    "events/custom",
    vmap! {
        "message" => "direct publish",
        "timestamp" => chrono::Utc::now().to_rfc3339(),
        "data" => "custom event data"
    }
).await?;
```

## Components to Implement

To achieve the target API, we need to implement or modify the following components:

1. **Service Macro (`service`)**
   - Generate AbstractService implementation for Node integration
   - Support registration with Node via `node.add_service()`
   - Implement metadata methods (name, path, description, version)
   - Handle request dispatch to action methods

2. **Action Macro (`action`)**
   - Allow action invocation via `node.request()`
   - Support both direct and mapped parameter extraction
   - Preserve method signatures returning `Result<T>` (not ServiceResponse)
   - Convert results to ServiceResponse when returning to Node

3. **Subscribe Macro (`subscribe`)**
   - Register handlers with Node's subscription system
   - Support both full path and service-relative topic paths
   - Support handler cloning for subscription callbacks

4. **Node API Extensions**
   - Implement `node.request()` to support both direct values and vmap parameters
   - Implement `node.publish()` for direct event publishing
   - Support service registration via `node.add_service()`
   - Handle parameter type conversion in request handling

5. **RequestContext Implementation**
   - Support event publishing via `context.publish()`
   - Provide access to request metadata
   - Bridge between handler and Node

## Implementation Plan

### Phase 1: Core Macro Development

#### Service Macro Implementation
- Parse struct and extract attributes (name, path, description, version)
- Generate AbstractService implementation that integrates with Node
- Implement dispatch logic in `handle_request` method
- Support subscription setup during service initialization

#### Action Macro Implementation
- Parse method and attributes
- Keep original method signature returning `Result<T>`
- Generate operation handlers that map to service methods
- Implement parameter extraction from both direct and mapped parameters
- Convert return values to ServiceResponse format

#### Subscribe Macro Implementation
- Parse method and topic attribute
- Support relative and absolute topic paths
- Register subscriptions with the Node during initialization
- Handle event payload extraction using vmap pattern

### Phase 2: Node API Integration

#### Node Request Method Enhancement
- Support both direct values and vmap! for parameters
- Implement path parsing to identify service and operation
- Route requests to the appropriate service handler
- Convert responses back to client-friendly format

#### Service Registry and Event System
- Implement service registration and lookup
- Support event subscription registration
- Implement event publishing and routing
- Handle service lifecycle events (init, start, stop)

### Phase 3: RequestContext Implementation
- Provide access to request metadata
- Implement event publishing
- Support parameter extraction

### Phase 4: Testing and Integration
- Create comprehensive tests for each macro
- Test Node API with various parameter patterns
- Validate event subscription and publishing
- Ensure example file works end-to-end
- Use standardized logging functions (log_callback_execution, log_published_event) for consistent event tracking

## Specific Implementation Details

### Service Macro Code Generation
```
## Testing Strategy

1. Unit Tests for Each Macro
   - Test service macro with different attribute combinations
   - Test action macro with various parameter patterns
   - Test subscribe macro with different topic formats
   - Use standardized logging functions (log_callback_execution, log_published_event) for consistent event tracking

2. Integration Tests for Node API