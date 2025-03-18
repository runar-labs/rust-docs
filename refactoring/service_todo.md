# Service Architecture TODO List

## ServiceInfo Trait

- [ ] Update all services to implement both `AbstractService` and `ServiceInfo` traits
- [x] Rename the `ServiceInfo` struct in the P2P module to `P2PServiceInfo` to avoid confusion
- [ ] Implement helper macros to generate both trait implementations consistently

## Service Registry

- [ ] Fix the ServiceRegistry tests in `service_tests.rs`
- [ ] Implement missing methods in ServiceRegistry (`set_db`, `start`, `stop`)
- [ ] Implement value conversion from serde_json to ValueType

## Service Manager

- [ ] Clean up the ServiceManager implementation to be more robust
- [ ] Add more comprehensive tests for service lifecycle management

## Service Interfaces

- [ ] Consider moving more common service interfaces to the `common` crate
- [ ] Create a clear separation between local and remote service interfaces
- [ ] Standardize error handling across service implementations

## Service Documentation

- [ ] Create updated documentation for service architecture
- [ ] Document the relationship between `AbstractService` and `ServiceInfo`
- [ ] Create examples of proper service implementation

## Testing

- [ ] Expand test coverage for services
- [ ] Create integration tests for service interactions
- [ ] Add benchmarks for service performance

## Code Quality

- [ ] Clean up unused code and warnings
- [ ] Fix visibility issues (e.g., QR code types)
- [ ] Address mutable variables that don't need to be mutable
- [ ] Clean up log statements and ensure consistent logging practices

## Service Discovery

- [ ] Improve service discovery mechanism
- [ ] Create a more robust service registry
- [ ] Optimize service lookup performance

## Service Communication

- [ ] Standardize message format between services
- [ ] Implement more robust error handling
- [ ] Add tracing and metrics for service communication

## Security

- [ ] Review service authentication and authorization
- [ ] Implement proper access control between services
- [ ] Ensure service communication is secure 