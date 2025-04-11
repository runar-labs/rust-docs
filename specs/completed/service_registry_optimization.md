# ServiceRegistry Optimization with PathTrie

## Background & Motivation

The current ServiceRegistry implementation uses a combination of HashMaps and WildcardSubscriptionRegistry for storing and looking up service handlers, action handlers, and event subscriptions. While this works, benchmarks have shown that we can significantly improve lookup performance by replacing these with a more optimized data structure called PathTrie.

Performance is critical for the ServiceRegistry since it's used on every action call and event dispatch. Optimization here will benefit the entire system.

## Current Implementation Analysis

The ServiceRegistry currently uses:

1. **Local action handlers**: `HashMap<TopicPath, ActionHandler>` - Only supports exact path matches
2. **Remote action handlers**: `HashMap<TopicPath, Vec<ActionHandler>>` - Supports multiple handlers per path but only exact matches
3. **Local event subscriptions**: `WildcardSubscriptionRegistry<(String, EventCallback)>` - Supports wildcard matching but with linear search performance
4. **Remote event subscriptions**: `WildcardSubscriptionRegistry<(String, EventCallback)>` - Same limitations as local event subscriptions
5. **Local services**: `HashMap<TopicPath, Arc<ServiceEntry>>` - Only supports exact path matching
6. **Remote services**: `HashMap<TopicPath, Vec<Arc<RemoteService>>>` - Only supports exact path matching

The main limitations include:
- Limited pattern matching for action handlers (no template or wildcard support)
- Inefficient matching in WildcardSubscriptionRegistry
- Inconsistent matching logic between different registries
- Separate ID-to-path maps for local and remote event subscriptions

## Implementation Requirements

### CRITICAL: Public API Compatibility

The public API of ServiceRegistry **MUST NOT** change. This means:

1. **Method signatures stay exactly the same** - All existing method names, parameters, and return types must be preserved
2. **Behavior stays exactly the same** - Methods must return the same results for the same inputs
3. **Sequence of operations stays the same** - The flow in Node.rs that uses the registry must continue to work unchanged

The goal is to replace the internal implementation without affecting any code that uses ServiceRegistry.

### CRITICAL: No Direct Path Segment Manipulation

1. **Never use `get_segments()`** - Do not directly access or manipulate path segments
2. **All path matching must be done by PathTrie** - Let the data structure handle all pattern matching
3. **Use TopicPath's methods** - For any path transformation, use only TopicPath's public methods

Directly manipulating segments is an architectural violation and must be avoided.

## Proposed Changes

We will replace all registry storage mechanisms with PathTrie structures while maintaining perfect API compatibility. PathTrie provides:

1. Efficient exact, template, and wildcard pattern matching
2. Fast lookups with minimal iteration
3. Consistent lookup behavior across all registries

### New Structure

```rust
pub struct ServiceRegistry {
    // --- Service Registries ---
    local_services: RwLock<PathTrie<Arc<ServiceEntry>>>,
    remote_services_by_topic: RwLock<PathTrie<Vec<Arc<RemoteService>>>>,
    
    // --- Other mappings (Unchanged) ---
    remote_services_by_peer: RwLock<HashMap<PeerId, HashSet<String>>>,
    service_states_by_service_path: Arc<RwLock<HashMap<String, ServiceState>>>,
    logger: Logger,
}
```

Key changes:
1. Replace all lookup structures with PathTrie
2. Keep the same public API methods and signatures
3. Update internal implementations to use PathTrie for lookups

### Existing Method Reference (MUST remain unchanged)

```rust
// Local action handling (unchanged signature)
pub async fn find_local_action_handler(
    &self, 
    topic_path: &TopicPath,
    metadata: Option<ActionMetadata>
) -> Option<ActionHandlerWithMetadata> { /* ... */ }

// Remote action handling (unchanged signature)
pub async fn find_remote_action_handlers(
    &self, 
    topic_path: &TopicPath
) -> Vec<Arc<RemoteService>> { /* ... */ }

// Other methods similarly must keep the same signatures
```

## Implementation Strategy

We will follow a phased approach:

1. **Phase 1: Infrastructure**
   - Move PathTrie from tests to main codebase
   - Update PathTrie to handle all cases needed for ServiceRegistry

2. **Phase 2: Registry Implementation**
   - Implement the new storage structure
   - Update all method implementations to use the new structure
   - Preserve exact API compatibility
   
3. **Phase 3: Testing**
   - Run all existing tests against the new implementation
   - Validate that behavior is unchanged
   - Benchmark to confirm performance improvements

## Testing Approach

We will:
1. **Use existing tests** - All current tests should pass without modification
2. **Preserve API compatibility** - No changes to method signatures or behavior
3. **Focus on regression testing** - Ensure no behavior changes during refactoring

This approach minimizes risk while delivering significant performance improvements.

## Expected Benefits

1. **Faster lookups** - Based on benchmarks, we expect 2-10x improvement in lookup performance
2. **Support for complex patterns** - All registries will support template and wildcard matching
3. **Consistent behavior** - Uniform path matching across all registry types
4. **Code simplification** - Some code duplication will be eliminated
5. **Future extensibility** - The PathTrie structure is more easily extended for future needs 

## Example Flow (MUST be preserved)

Here is the request flow from Node.rs that uses the ServiceRegistry. This flow MUST continue to work without any changes:

```rust
pub async fn request(&self, path: impl Into<String>, payload: ValueType) -> Result<ServiceResponse> {
    let path_string = path.into();
    let topic_path = match TopicPath::new(&path_string, &self.network_id) {
        Ok(tp) => tp,
        Err(e) => return Err(anyhow!("Failed to parse topic path: {} : {}", path_string, e)),
    };

    self.logger.debug(format!("Processing request: {}", topic_path));
    
    // First check for local handlers
    if let Some(handler) = self.service_registry.find_local_action_handler(&topic_path).await {
        self.logger.debug(format!("Executing local handler for: {}", topic_path));
        
        // Create request context
        let context = RequestContext::new(&topic_path, self.logger.clone());
        
        // Execute the handler and return result
        return handler(Some(payload), context).await;
    }
    
    // If no local handler found, look for remote handlers
    let remote_handlers = self.service_registry.find_remote_action_handlers(&topic_path).await;
    if !remote_handlers.is_empty() {
        self.logger.debug(format!("Found {} remote handlers for: {}", remote_handlers.len(), topic_path));
        
        // Create request context
        let context = RequestContext::new(&topic_path, self.logger.clone());
        
        // Apply load balancing strategy to select a handler
        let load_balancer = self.load_balancer.read().await;
        let handler_index = load_balancer.select_handler(&remote_handlers, &context);
        
        self.logger.debug(format!("Selected remote handler {} of {} for: {}", 
            handler_index + 1, remote_handlers.len(), topic_path));
        
        // Execute the selected handler
        return remote_handlers[handler_index](Some(payload), context).await;
    }
    
    // No handler found
    Err(anyhow!("No handler found for action: {}", topic_path))
}
``` 