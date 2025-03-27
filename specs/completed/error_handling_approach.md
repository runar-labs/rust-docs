# Standardized Error Handling Approach

## Current State Analysis

The codebase currently uses a mix of error handling approaches:

1. **anyhow::Result** - Used extensively throughout the codebase for general error handling
2. **ServiceResponse** - A custom type representing service operation results with success/error status and messages
3. **Direct unwrap()** - Used in some places for simplicity but lacks proper error context
4. **map_err() chains** - Used to transform errors at API boundaries

### Identified Inconsistencies

- Inconsistent use of error context in `anyhow::anyhow!()` calls
- Different approaches to error reporting in services
- Inconsistent propagation of errors between layers
- Missing domain-specific error types
- Lack of standardized error codes

## Proposed Error Handling Strategy

### 1. Domain Error Types

Create domain-specific error types using `thiserror` for each major subsystem:

```rust
use thiserror::Error;

#[derive(Error, Debug)]
pub enum ServiceError {
    #[error("Service {0} not found")]
    ServiceNotFound(String),
    
    #[error("Action {0} not supported by service {1}")]
    UnsupportedAction(String, String),
    
    #[error("Invalid request: {0}")]
    InvalidRequest(String),
    
    #[error("Database error: {0}")]
    Database(#[from] DatabaseError),
    
    #[error("Internal error: {0}")]
    Internal(String),
}

#[derive(Error, Debug)]
pub enum DatabaseError {
    #[error("Connection error: {0}")]
    ConnectionError(String),
    
    #[error("Query error: {0}")]
    QueryError(String),
    
    #[error("Migration error: {0}")]
    MigrationError(String),
}

// Additional domain-specific error types as needed
```

### 2. Error Context Pattern

Standardize how context is added to errors:

```rust
use anyhow::{Context, Result};

fn load_service(name: &str) -> Result<Service> {
    db.get_service(name)
        .context(format!("Failed to load service '{}'", name))
}
```

### 3. Error Mapping Strategy

Establish clear patterns for mapping errors across module boundaries:

```rust
// When crossing API boundaries, map to domain-specific errors
fn handle_request(&self, request: ServiceRequest) -> Result<ServiceResponse> {
    match self.validate_request(&request) {
        Ok(_) => {
            // Process request
            Ok(ServiceResponse::success("Request processed".to_string(), Some(result)))
        }
        Err(e) => {
            let error_message = format!("Request validation failed: {}", e);
            log::error!("{}", error_message);
            Ok(ServiceResponse::error(error_message))
        }
    }
}
```

### 4. Result Type Standardization

Standardize on the following result type usage:

- `anyhow::Result<T>` for internal functions where the specific error type doesn't matter
- Domain-specific `Result<T, ErrorEnum>` for API boundaries and public interfaces
- `Result<ServiceResponse>` for service API methods

### 5. Error Reporting

Standardize error reporting:

```rust
// Error response helper
fn error_response(error: &impl std::error::Error) -> ServiceResponse {
    // Log detailed error internally
    log::error!("Service error: {}\n{:?}", error, error);
    
    // Return user-facing error with appropriate message
    ServiceResponse::error(error.to_string())
}
```

## Implementation Plan

### Phase 1: Define Error Types

1. Create a new `rust-common/src/errors` module
2. Define core error types for major subsystems
3. Add conversion implementations between error types

### Phase 2: Service Error Handling

1. Update service trait to use standardized error patterns
2. Implement consistent error mapping in service implementations
3. Refactor direct unwraps to proper error handling

### Phase 3: Client-Facing Errors

1. Establish standardized error responses for API clients
2. Implement error code system for machine-readable errors
3. Add proper error documentation for API consumers

### Phase 4: Validation

1. Audit existing error handling code
2. Refactor problematic patterns
3. Add tests specifically for error handling

## Success Criteria

- All direct unwraps replaced with proper error handling except where panic is appropriate
- Domain-specific error types for all major subsystems
- Consistent error mapping at API boundaries
- Well-documented error types and codes
- Clear error messages for user-facing errors 