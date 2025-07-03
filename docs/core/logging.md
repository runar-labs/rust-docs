# Logging System

## Overview

The Runar Logging System provides a consistent, context-aware logging interface that works seamlessly in both asynchronous and synchronous code. Through clever use of macros, it eliminates the need to handle `.await` calls manually while ensuring that contextual information is uniformly included.

## Key Features

- **Unified API for async/sync contexts**: Same syntax regardless of execution context
- **Contextual metadata**: Automatic inclusion of request, node, and network IDs
- **Structured logging**: Field-based logging for better filtering and analysis
- **ID truncation**: Improved readability while maintaining searchability 
- **Customizable fields**: Easy addition of custom metadata to log entries
- **Log level control**: Fine-grained control over which messages are logged

## Basic Usage

### Simple Logging

The logging macros can be used with or without a context:

```rust
// Basic logging with just a message
info!("Server started on port 8080");

// Logging with additional fields
info!("Request processed", "duration_ms" => 42, "status" => "success");

// Logging with a context object that provides additional metadata
info!("Handling request", request_context);
```

### Context-Aware Logging

When a context is provided, relevant metadata is automatically extracted:

```rust
// With a RequestContext, this automatically includes request_id, node_id, etc.
info!("Processing request", context);

// Example output:
// [INFO] [req:a7f3b] [net:d8e2c] [node:c4f1e] Processing request
```

### Adding Custom Fields

Additional fields can be added as key-value pairs:

```rust
info!("Request processed", context, 
    "duration_ms" => 42, 
    "status" => "success", 
    "method" => "GET"
);

// Example output:
// [INFO] [req:a7f3b] [net:d8e2c] [node:c4f1e] [duration_ms:42] [status:success] [method:GET] Request processed
```

## Log Levels

The system provides multiple log level macros:

```rust
// Detailed information for debugging
debug!("Connection details", context, "bytes" => payload.len());

// Normal operational messages
info!("Service started successfully", context);

// Warning conditions
warn!("Retrying failed operation", context, "attempt" => retry_count);

// Error conditions
error!("Database connection failed", context, "reason" => e.to_string());
```

## Async vs. Sync Contexts

The same logging macros work in both async and sync contexts:

### In Async Functions

```rust
async fn process_request(request: Request, context: &RequestContext) -> Result<Response> {
    info!("Processing request", context);
    
    // Do async work...
    
    info!("Request completed", context, "duration_ms" => duration);
    Ok(response)
}
```

### In Sync Functions

```rust
fn validate_input(input: &str, context: &RequestContext) -> bool {
    debug!("Validating input", context, "length" => input.len());
    
    // Validate synchronously...
    
    let valid = input.len() > 0;
    debug!("Validation result", context, "valid" => valid);
    valid
}
```

## ID Management

IDs are automatically truncated for readability while maintaining full searchability:

```rust
// Log display shows truncated IDs (5 chars)
// [INFO] [req:a7f3b] [net:d8e2c] [node:c4f1e] Processing request

// But full IDs are included in the log entry for filtering
// Full IDs: request_id_full:a7f3b291c4e5d6 network_id_full:d8e2c3a4b5c6d7 node_id_full:c4f1e2d3b4a5c6
```

## Logging Flow

```mermaid
@include "../assets/images/logging-flow.txt"
```

The diagram above illustrates how the logging system works:

1. The logging macro is called with a message and optional context
2. The macro determines if it's in an async or sync context
3. In async contexts, the log operation is spawned as a task
4. In sync contexts, a synchronous logging method is used
5. Contextual metadata is automatically extracted and formatted
6. The formatted log entry is written to the configured output

## Implementation Details

### LogContext Trait

The system uses a trait to extract metadata from contexts:

```rust
pub trait LogContext {
    fn request_id(&self) -> Option<&str> { None }
    fn network_id(&self) -> Option<&str> { None }
    fn peer_id(&self) -> Option<&str> { None }
    fn node_id(&self) -> Option<&str> { None }
}

impl LogContext for RequestContext {
    // Implementations
}
```

### Macro Implementation

The macros detect whether they're in an async context and handle accordingly:

```rust
#[macro_export]
macro_rules! info {
    ($message:expr, $context:expr) => {
        {
            let formatted_context = format_context($context);
            
            #[cfg(feature = "async")]
            {
                if let Some(runtime) = tokio::runtime::Handle::try_current().ok() {
                    let _ = runtime.spawn(async {
                        Logger::global().info($message, formatted_context).await
                    });
                } else {
                    // Fall back to sync logging if not in an async context
                    Logger::global().info_sync($message, formatted_context);
                }
            }
            
            #[cfg(not(feature = "async"))]
            {
                Logger::global().info_sync($message, formatted_context);
            }
        }
    };
    
    // Other variants...
}
```

## Best Practices

1. **Use appropriate log levels**: Reserve `debug!` for detailed information and `info!` for significant events
2. **Always include context**: Pass relevant context objects to enable proper request tracing
3. **Add relevant fields**: Include operation-specific data as key-value fields
4. **Be consistent**: Use similar field names across related operations
5. **Keep messages concise**: Place details in fields rather than in the message text
6. **Use structured data**: Avoid embedding JSON or complex data in message strings

## Configuration

Logging can be configured at several levels:

### Global Configuration

```rust
// Set global log level
Logger::global().set_level(LogLevel::Info);

// Configure outputs
Logger::global().add_output(FileOutput::new("/var/log/runar.log"));
Logger::global().add_output(ConsoleOutput::new());

// Set filter patterns
Logger::global().add_filter("req:a7f3b*", LogLevel::Debug);
```

### Environment Variables

The logging system respects environment variables for dynamic configuration:

```
# Set default log level
export RUNAR_LOG_LEVEL=info

# Enable debug logs for specific components
export RUNAR_LOG_FILTER="p2p=debug,node=debug"

# Configure output format
export RUNAR_LOG_FORMAT="json"
```

## Integration with Other Systems

The logging system integrates with:

- **Distributed tracing**: Compatible with OpenTelemetry and Jaeger
- **Log aggregation**: Supports structured formats for Elasticsearch/Kibana
- **Monitoring systems**: Can emit metrics along with logs
- **Cloud environments**: Works with Kubernetes, Docker, and cloud logging services 

## Related Documentation

- [Context System](context.md) - How context enables secure and traceable communication
- [Request Handling](request_handling.md) - Best practices for using logging in request handlers
- [Service Lifecycle](lifecycle.md) - Understanding service logging during different lifecycle phases
- [ValueMap (VMap)](vmap.md) - Core abstraction for working with structured data 