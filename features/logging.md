# Logging Framework Usage Guidelines


## Table of Contents

- [Introduction](#introduction)
## Overview

This document outlines the standard approach for logging within the Kagi codebase, including both application code and test code. Instead of using `println!()` statements, all logging should use the structured logging framework provided by the project, which allows for consistent formatting, level-based filtering, and component-specific logging.

## Core Principles

1. Use the logging framework instead of `println!()` for all diagnostic output
2. Always specify the appropriate component when logging
3. Choose the appropriate log level for the message
4. Remember to `.await` all logging calls, as they are async functions

## Log Levels

- **TRACE**: Very detailed information, typically only useful when diagnosing specific issues
- **DEBUG**: Detailed information on the flow through the system
- **INFO**: Notable events but not issues (service start/stop, connections established)
- **WARN**: Potentially harmful situations that might still allow the application to continue
- **ERROR**: Error events that might still allow the application to continue running

## Components

The `Component` enum identifies different parts of the system:

```rust
pub enum Component {
    Node,
    Service,
    P2P,
    Registry,
    Test,
    ServiceRegistry,
    IPC,
}
```

Always choose the most specific component applicable for your log message.

## Logging Functions

The following async functions are available for logging:

```rust
pub async fn trace_log(component: Component, message: &str)
pub async fn debug_log(component: Component, message: &str)
pub async fn info_log(component: Component, message: &str)
pub async fn warn_log(component: Component, message: &str)
pub async fn error_log(component: Component, message: &str)
```

There's also a special version for debug logging that includes formatted debug output of a value:

```rust
pub fn debug_log_with_data<T: std::fmt::Debug>(component: Component, message: &str, data: &T)
```

## Important: Awaiting Log Calls

Because the logging functions are async, they must be awaited or the log messages may not be processed. 

```rust
// Correct usage:
info_log(Component::Test, "Starting test").await;

// Incorrect (warning will be generated):
info_log(Component::Test, "Starting test"); // Missing await!
```

The compiler will warn about "unused implementer of `futures::Future` that must be used" when the await is missing.

## Usage in Tests

For tests, use the `Component::Test` component with appropriate log levels. Before running tests that use logging, call `configure_test_logging()` to set up logging with the right levels for tests:

```rust
#[tokio::test]
async fn test_something() -> Result<()> {
    // Set up logging for tests
    configure_test_logging();
    
    // Use logging instead of println
    info_log(Component::Test, "Starting test").await;
    
    // Test logic...
    
    // Log test completion
    info_log(Component::Test, "Test completed successfully").await;
    Ok(())
}
```

## Controlling Log Levels

Log levels can be controlled using the `RUST_LOG` environment variable. For example:

```bash
RUST_LOG=debug cargo test
RUST_LOG=info,kagi_node::p2p=debug cargo run
```

## Examples

### Instead of println in tests:

```rust
// Bad:
println!("Starting test service");

// Good:
info_log(Component::Test, "Starting test service").await;
```

### For debugging in tests:

```rust
// Bad:
println!("Request details: {:?}", request);

// Good:
debug_log_with_data(Component::Test, "Request details", &request);
```

### For error conditions:

```rust
// Bad:
println!("Failed to connect: {}", error);

// Good:
error_log(Component::Test, &format!("Failed to connect: {}", error)).await;
```

## Guidelines for Converting println to Logging

1. Identify the appropriate component for the log message
2. Choose the appropriate log level (info, debug, error, etc.)
3. Format string messages inside the log call
4. Remember to await the logging call

## Implementation Notes

The logging implementation in `util::logging.rs` is built on top of the standard Rust `log` crate and integrates with the node ID system to provide context for logs. This allows logs to be filtered and aggregated effectively in multi-node environments. 