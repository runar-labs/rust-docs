# Logging

Runar provides a comprehensive logging system built on top of the `tracing` crate, offering structured logging with context-aware components and flexible configuration.

## Overview

The logging system is designed around the `Logger` struct and `LoggingContext` trait, providing:

- **Structured logging** with automatic context propagation
- **Component-based logging** for different parts of the system
- **Configurable log levels** and output formats
- **Context-aware logging** in services and handlers

## Core Components

### Logger

The main logging interface that provides methods for different log levels:

```rust
use runar_common::logging::Logger;

let logger = Logger::new("my-component");

logger.info("Application started");
logger.debug("Processing request");
logger.warn("Resource usage high");
logger.error("Failed to connect to database");
```

### LoggingContext

A trait that provides logging capabilities to contexts used throughout the system:

```rust
use runar_common::logging::LoggingContext;

// RequestContext and LifecycleContext implement LoggingContext
context.info("Processing request");
context.debug("Request parameters: {:?}", params);
context.warn("Deprecated API used");
context.error("Validation failed: {}", error);
```

## Usage in Services

Services use the logging context provided by the framework, not by creating their own logger instances.

### Lifecycle Methods

In service lifecycle methods (`init`, `start`, `stop`), use the `LifecycleContext`:

```rust
use runar_node::services::{AbstractService, LifecycleContext};
use anyhow::Result;

impl AbstractService for MyService {
    async fn init(&self, context: LifecycleContext) -> Result<()> {
        context.info("Initializing MyService");
        context.debug(format!("Service path: {}", self.path()));
        
        // Register actions and subscriptions...
        
        context.info("MyService initialized successfully");
        Ok(())
    }

    async fn start(&self, context: LifecycleContext) -> Result<()> {
        context.info("Starting MyService");
        // Start service operations...
        context.info("MyService started successfully");
        Ok(())
    }

    async fn stop(&self, context: LifecycleContext) -> Result<()> {
        context.info("Stopping MyService");
        // Cleanup operations...
        context.info("MyService stopped");
        Ok(())
    }
}
```

### Request Handlers

In request handlers, use the `RequestContext`:

```rust
async fn handle_operation(
    &self,
    params: Option<ArcValue>,
    context: RequestContext,
) -> Result<ArcValue> {
    context.info("Handling operation request");
    
    // Extract and validate parameters
    let data = params.unwrap_or_else(ArcValue::null);
    context.debug(format!("Request parameters: {:?}", data));
    
    // Process the request
    match self.process_operation(data, &context).await {
        Ok(result) => {
            context.info("Operation completed successfully");
            Ok(ArcValue::new_primitive(result))
        }
        Err(e) => {
            context.error(format!("Operation failed: {}", e));
            Err(anyhow!("Operation failed: {}", e))
        }
    }
}
```

### Internal Service Methods

For internal service methods that receive a context parameter:

```rust
async fn process_operation(
    &self,
    data: ArcValue,
    ctx: &RequestContext,
) -> Result<f64> {
    ctx.debug("Processing operation");
    
    // Validate input
    if data.is_null() {
        ctx.error("Invalid input: null data");
        return Err(anyhow!("Invalid input"));
    }
    
    // Process the operation
    let result = self.calculate(data)?;
    ctx.debug(format!("Operation result: {}", result));
    
    Ok(result)
}
```

### Event Handlers

In event subscription handlers:

```rust
context
    .subscribe(
        "my/event",
        Box::new(move |event_ctx, payload| {
            Box::pin(async move {
                event_ctx.info("Received my/event");
                event_ctx.debug(format!("Event payload: {:?}", payload));
                
                // Process the event...
                
                event_ctx.info("Event processed successfully");
                Ok(())
            })
        }),
    )
    .await?;
```

## Configuration

### Basic Setup

Initialize logging with default configuration:

```rust
use runar_common::logging::init_logging;

fn main() {
    init_logging().expect("Failed to initialize logging");
    // ... rest of application
}
```

### Custom Configuration

Configure logging with specific settings:

```rust
use runar_common::logging::{init_logging_with_config, LoggingConfig};

fn main() {
    let config = LoggingConfig {
        level: "debug".to_string(),
        format: "json".to_string(),
        output: "stdout".to_string(),
    };
    
    init_logging_with_config(config).expect("Failed to initialize logging");
    // ... rest of application
}
```

## Best Practices

### 1. Use Context for Service Logging

Always use the provided context for logging in services:

```rust
// ✅ Correct - use context
context.info("Processing request");
context.error(format!("Failed to process: {}", error));

// ❌ Incorrect - don't create your own logger in services
let logger = Logger::new("service");
logger.info("Processing request");
```

### 2. Include Relevant Context

Add useful information to log messages:

```rust
context.info(format!("User {} logged in from {}", user_id, ip_address));
context.debug(format!("Request parameters: {:?}", params));
context.error(format!("Database query failed: {} (query: {})", error, sql));
```

### 3. Use Appropriate Log Levels

- **Error**: For errors that need immediate attention
- **Warn**: For potentially harmful situations
- **Info**: For general application flow
- **Debug**: For detailed diagnostic information

### 4. Avoid Sensitive Data

Never log sensitive information like passwords, tokens, or personal data:

```rust
// ✅ Correct
context.info("User authentication successful");

// ❌ Incorrect
context.info(format!("User {} logged in with password {}", user, password));
```

### 5. Structured Logging

Use structured data when available:

```rust
context.info(format!("Processing order {} for customer {}", order_id, customer_id));
context.debug(format!("Order details: {:?}", order));
```

## Integration with Tracing

The logging system is built on top of `tracing`, so you can use tracing macros and spans:

```rust
use tracing::{info, debug, error, instrument};

#[instrument(skip(context))]
async fn handle_request(
    &self,
    params: Option<ArcValue>,
    context: RequestContext,
) -> Result<ArcValue> {
    info!("Handling request");
    debug!("Request parameters: {:?}", params);
    
    // ... implementation
    
    info!("Request completed successfully");
    Ok(result)
}
```

## Testing

When testing services, you can create mock contexts or use the actual logging system:

```rust
#[tokio::test]
async fn test_service_operation() {
    // Initialize logging for tests
    init_logging().expect("Failed to initialize logging");
    
    let service = MyService::new("test-service", "/test");
    // ... test implementation
}
```

This logging system provides a consistent, context-aware approach to logging throughout the Runar framework, ensuring that all log messages include relevant context and follow best practices for production applications. 