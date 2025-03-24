# Runar Service and Action Macros

This document provides an overview of the service macros in the Runar framework. For detailed usage information with the current simplified implementation, please refer to the [Macro Usage Guide](macro_usage_guide.md).

## Important Update

The macros in the Runar framework have been simplified to pass through their inputs without adding complex functionality. This means:

1. The macros primarily serve as markers for service structures and methods
2. You'll need to manually implement the required traits and methods
3. The approach provides flexibility while we develop a more comprehensive macro system

**Please refer to the [Macro Usage Guide](macro_usage_guide.md) for current best practices and example code.**

## Table of Contents

- [Service Macro](#service-macro)
- [Action Macro](#action-macro)
- [Subscribe Macro](#subscribe-macro)
- [Value Handling](#value-handling)
- [Example Usage](#example-usage)
- [Best Practices](#best-practices)

## Service Macro

The `#[service]` macro marks a struct as a Runar service. With the current simplified implementation, you'll need to manually implement the `AbstractService` trait.

### Syntax

```rust
#[service(
    name = "service_name",
    description = "Service description",
    version = "1.0.0"
)]
struct MyService {
    // Service state fields
}

// Manual implementation of AbstractService trait needed - see Macro Usage Guide
```

## Action Macro

The `#[action]` macro marks a method as a service action handler. With the current simplified implementation, you'll still need to manually add this action to your `handle_request` method's match statement.

### Syntax

```rust
#[action]
async fn my_action(&self, request: ServiceRequest) -> Result<ServiceResponse> {
    // Implementation...
}

// This action must be manually added to handle_request - see Macro Usage Guide
```

## Subscribe Macro

The `#[subscribe]` macro marks a method as an event subscription handler. With the current simplified implementation, you'll need to manually set up the subscription in your service's `init` method.

### Syntax

```rust
#[subscribe(topic = "event/topic")]
async fn handle_event(&self, payload: ValueType) -> Result<()> {
    // Implementation...
}

// Manual subscription setup needed in init method - see Macro Usage Guide
```

## Value Handling

When working with parameters and responses, follow the patterns demonstrated in the [Macro Usage Guide](macro_usage_guide.md) for type-safe value extraction and response creation.

## Example Usage

For complete examples of the current recommended approach, please refer to the [Macro Usage Guide](macro_usage_guide.md).

## Best Practices

1. **Follow the new usage guide** for the current simplified implementation
2. **Manually implement** the `AbstractService` trait for your services
3. **Use explicit type annotations** to avoid inference issues
4. **Report any issues** you encounter with the current implementation 