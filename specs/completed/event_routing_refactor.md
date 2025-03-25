# Event Routing Refactoring Plan

## Current Status

We've made significant progress with event routing:

1. ✅ Fixed the core event routing issue with topic path handling
2. ✅ Implemented consistent path formatting throughout the system
3. ✅ Ensured proper event delivery from publishers to subscribers
4. ✅ Added detailed debug logging for better diagnostics

## Remaining Issues

1. **Compilation Errors**: Several test files are still failing compilation
   - Missing `topic_path` field in `ServiceRequest` initializations
   - References to outdated macro-based services
   - `event_service.rs` using outdated field names (`params` vs. `data`)

2. **Code Quality Issues**:
   - Some code is still referring to outdated patterns and methods
   - Legacy macro-based tests need to be cleaned up

## Refactoring Steps

### Phase 1: Fix Core Event Routing ✅ (Completed)

1. ✅ Fixed `NodeRequestHandlerImpl::publish` to pass full topic path to ServiceRegistry
2. ✅ Updated `NodeRequestHandlerImpl::subscribe_with_options` for consistent path handling
3. ✅ Fixed `NodeRequestHandlerImpl::unsubscribe` to match the subscription approach
4. ✅ Added detailed debug logging to trace event flow
5. ✅ Fixed the `unsubscribe_wrapper` method in `ServiceRegistry`

### Phase 2: Address Compilation Errors 🔄 (In Progress)

1. Fix the ServiceRequest initialization in test files
   - Add missing `topic_path` field to all ServiceRequest instances
   - Ensure all fields are correctly initialized according to current API

2. Fix the event service fixture implementations
   - Update ValueType usage to match current API
   - Ensure consistent method signatures and parameter handling

3. Resolve missing field errors
   - Update macro-based services to be compatible with current API structure
   - Add transition path for legacy macro-based implementations

### Phase 3: Clean Up and Documentation 🔄 (In Progress)

1. Document the refactoring approach in detail
2. Add deprecation notices to legacy code
3. Update tests to use the new architectural patterns
4. Add README documentation explaining the migration path

## Implementation Details

### ServiceRequest Changes

The ServiceRequest structure now requires a `topic_path` field, which must be properly initialized:

```rust
ServiceRequest {
    source: String,
    service: String,
    path: String,
    data: Option<ValueType>,
    id: Option<String>,
    topic_path: Option<TopicPath>, // Required field
}
```

### Event Publishing Changes

Following our architectural principles, event publishing follows these patterns:

1. Clean separation between publisher and subscriber services
2. Direct API calls using request-based communication
3. Proper topic path handling for routing

### Deprecation Path

We are maintaining macro-based services in a separate directory for backward compatibility, but all new tests should use the direct API implementation.

## Progress Tracking

- [x] Fixed core event routing with topic paths
- [x] Fixed the ServiceRegistry implementation
- [x] Fixed NodeRequestHandlerImpl methods
- [x] Added debug logging
- [x] Verified with simple_events test
- [ ] Fix ValueType handling in fixtures
- [ ] Update all ServiceRequest initializations to include topic_path
- [ ] Clean up macro-based services
