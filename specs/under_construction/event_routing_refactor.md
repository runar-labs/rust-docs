# Event Routing Refactoring Plan

## Current Status

We've started refactoring the event routing tests to align with our architectural principles:

1. Moved direct API implementations to the fixtures directory
2. Created clean EventPublisherService and EventSubscriberService implementations
3. Updated test helpers to use the new service implementations
4. Added documentation for the fixture directory structure

## Current Issues

1. **Compilation Errors**: Several test files are failing compilation
   - Missing `topic_path` field in `ServiceRequest` initializations
   - References to outdated macro-based services
   - `event_service.rs` using outdated field names (`params` vs. `data`)

2. **Code Quality Issues**:
   - Some code is still referring to outdated patterns and methods
   - Legacy macro-based tests need to be cleaned up

## Refactoring Steps

### Phase 1: Fix Direct API Services (Current Phase)

1. ✅ Create fixture directory structure
2. ✅ Implement `EventPublisherService` and `EventSubscriberService`
3. ✅ Update test helpers to use new services
4. ✅ Clean up direct event service implementation
5. 🔄 Fix ValueType handling in fixture services
6. 🔄 Update direct event routing tests to use new services

### Phase 2: Address Compilation Errors

1. Fix the ServiceRequest initialization in test files
   - Add missing `topic_path` field to all ServiceRequest instances
   - Ensure all fields are correctly initialized according to current API

2. Fix the event service fixture implementations
   - Update ValueType usage to match current API
   - Ensure consistent method signatures and parameter handling

3. Resolve missing field errors
   - Update macro-based services to be compatible with current API structure
   - Add transition path for legacy macro-based implementations

### Phase 3: Clean Up and Documentation

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

- [x] Move direct API implementations to fixtures directory
- [x] Create README for fixtures directory
- [x] Update event test utils
- [ ] Fix ValueType handling in fixtures
- [ ] Update all ServiceRequest initializations to include topic_path
- [ ] Clean up macro-based services
