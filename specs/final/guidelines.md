# Guidelines for Fixing Issues and Implementing Features

## General Workflow

When fixing issues or implementing new features, follow these steps:

- Before making any change, always check the design docs in the `docs/` folder
- Create a detailed plan and save it in a file under `spec/under_construction/`
- As you progress, keep the detailed plan up to date with:
  - Progress
  - Issues encountered
  - Solutions implemented
  - Design decisions made along the way
- At the end, use this plan as input for documentation updates
- Once all tests pass and documentation is updated, this file can be removed, signaling the work is complete

## Code Quality Guidelines

- For each file you touch, always clean up all warnings, unused code, etc.
- Keep the codebase clean - this includes formatting, naming, and organization

## Rust Best Practices

- Leverage Rust's type system to prevent errors at compile time
- Prefer ownership over borrowing when appropriate
- Handle errors appropriately (no unwraps in production code)
- Use `Option` and `Result` for representing potential absence or failure
- Follow the Rust naming conventions (snake_case for functions, CamelCase for types)
- Use enums for state machines and expressing variants
- Prefer composition over inheritance
- Use trait objects for runtime polymorphism only when needed
- Keep functions and methods focused - they should do one thing well
- Use meaningful error types that provide context
- Write documentation comments for public APIs
- Use lifetimes judiciously - keep them simple when possible
- Apply clippy lints to catch common mistakes and anti-patterns

## API Design Best Practices

- Design APIs from the consumer's perspective first
- Strive for simplicity and intuitiveness in public interfaces
- Return domain-specific values from functions rather than generic wrappers where possible
- For action handlers, return the actual data type (e.g., `Result<String>`) instead of wrapping in generic containers
- Support both direct value parameters and mapped parameters for flexibility:
  ```rust
  // Both styles should work for single-parameter actions
  node.request("service/action", "value")
  node.request("service/action", vmap!{"param" => "value"})
  ```
- Use the `vmap!` macro for parameter extraction to reduce boilerplate:
  ```rust
  // Instead of chained unwraps
  let value = data.as_ref().and_then(|v| v.as_str()).unwrap_or_default();
  
  // Use vmap! for cleaner extraction with defaults
  let value = vmap!(data, => String::new());
  ```
- Provide helpful defaults and fallbacks in your API to reduce error handling burden
- Design for both simple and advanced use cases

## Service Implementation Best Practices

### Service Metadata

When implementing services, provide metadata through the `AbstractService` trait methods directly:

```rust
// PREFERRED: Implement methods directly in AbstractService
#[async_trait]
impl AbstractService for MyService {
    fn name(&self) -> &str {
        "my_service"
    }
    
    fn path(&self) -> &str {
        "my_service"  // No leading slash
    }
    
    fn description(&self) -> &str {
        "My custom service"
    }
    
    fn version(&self) -> &str {
        "1.0.0"
    }
    
    fn state(&self) -> ServiceState {
        // Return current service state
    }
    
    // Other required methods...
}

// DISCOURAGED: Using a separate metadata() method constructor
fn name(&self) -> &str { "my_service" }
fn path(&self) -> &str { "my_service" }
fn description(&self) -> &str { "My custom service" }
fn metadata(&self) -> ServiceMetadata {
    ServiceMetadata {
        name: self.name().to_string(),
        path: self.path().to_string(),
        state: self.state(),
        description: self.description().to_string(),
        operations: vec!["action1".to_string(), "action2".to_string()],
        version: "1.0.0".to_string(),
    }
}
```

This direct implementation approach:
- Reduces duplication and boilerplate code
- Follows Rust's trait-based design patterns
- Makes the service implementation more straightforward
- Eliminates unnecessary trait complexity

### Request Handling

Each service should implement a clean, focused `handle_request` method that delegates to specialized handler methods:

```rust
async fn handle_request(&self, request: ServiceRequest) -> Result<ServiceResponse> {
    debug_log(Component::Service, &format!("Handling request: {}", request.operation));
    
    // Delegate to specialized methods based on operation
    match request.operation.as_str() {
        "create" => self.handle_create(request).await,
        "read" => self.handle_read(request).await,
        "update" => self.handle_update(request).await,
        "delete" => self.handle_delete(request).await,
        _ => {
            warn_log(Component::Service, &format!("Unknown operation: {}", request.operation));
            Ok(ServiceResponse::error(format!("Unknown operation: {}", request.operation)))
        }
    }
}

// Specialized handler for the create operation
async fn handle_create(&self, request: ServiceRequest) -> Result<ServiceResponse> {
    // Implementation for create operation
    // ...
    
    Ok(ServiceResponse::success("Resource created successfully", Some(result)))
}
```

Benefits of this approach:
- Makes code more maintainable and easier to understand
- Allows unit testing of specific operations in isolation
- Improves error handling by localizing operation-specific logic
- Makes it easier to add new operations in the future

### Data Format Handling

The Kagi service architecture supports two primary data formats: JSON and VMap. Follow these best practices:

1. **When to use JSON vs VMap**
   - Use JSON when the data is already in JSON format (e.g., from network requests)
   - Use VMap for complex nested structures that need programmatic access
   - Use VMap for internal data processing when type safety is important
   - Avoid unnecessary conversions between formats

2. **Parameter extraction**
   ```rust
   // GOOD: Use vmap! macro for clean parameter extraction
   let id = vmap!(request.params, "id" => String::new());
   let count = vmap!(request.params, "count" => 0);
   
   // BAD: Chained unwraps and excessive error handling
   let id = request
       .params
       .as_ref()
       .and_then(|p| p.get("id"))
       .and_then(|v| v.as_str())
       .unwrap_or_default()
       .to_string();
   ```

### Logging Best Practices

Use context-aware logging throughout your service implementation:

```rust
// Include operation and relevant fields
debug_log(Component::Service, &format!("Processing operation: {}", request.operation));

// Log successful completion with relevant data
info_log(Component::Service, &format!("Resource {} created successfully", resource_id));

// Log warnings for non-critical issues
warn_log(Component::Service, &format!("Deprecated parameter used: {}", param_name));

// Log errors with detailed context
error_log(Component::Service, &format!("Failed to update resource: {}", error));
```

### Error Handling

Provide informative error messages and use the Result type consistently:

```rust
async fn handle_update(&self, request: ServiceRequest) -> Result<ServiceResponse> {
    let resource_id = match request.get_param("id") {
        Some(ValueType::String(id)) => id,
        _ => {
            warn_log(Component::Service, "Missing or invalid resource ID for update");
            return Ok(ServiceResponse::error("Missing or invalid resource ID"));
        }
    };
    
    // Rest of the implementation
    // ...
}
```

## API Implementation Examples

### Defining Services with the Node API

When implementing services directly with the Node API, you need to implement the `AbstractService` trait:

```rust
use anyhow::Result;
use async_trait::async_trait;
use runar_node::services::abstract_service::{AbstractService, ServiceState};
use runar_node::services::ResponseStatus;
use runar_node::{RequestContext, ServiceRequest, ServiceResponse, ValueType, vmap};

struct AuthService {
    name: String,
    path: String,
    // Service state fields
}

impl AuthService {
    // Constructor
    pub fn new(name: &str) -> Self {
        Self {
            name: name.to_string(),
            path: format!("auth/{}", name),
            // Initialize state
        }
    }
    
    // Service-specific methods
    async fn login(&self, username: &str, password: &str) -> Result<ServiceResponse> {
        // Implementation...
        
        // Return a ServiceResponse with status, message, and optional data
        Ok(ServiceResponse {
            status: ResponseStatus::Success,
            message: "Login successful".to_string(),
            data: Some(ValueType::Json(json!({
                "token": "some-token"
            }))),
        })
    }
}

#[async_trait]
impl AbstractService for AuthService {
    fn name(&self) -> &str {
        &self.name
    }

    fn path(&self) -> &str {
        &self.path
    }

    fn state(&self) -> ServiceState {
        ServiceState::Running
    }

    fn description(&self) -> &str {
        "Authentication service"
    }
    
    fn version(&self) -> &str {
        "1.0.0"
    }

    async fn init(&mut self, _context: &RequestContext) -> Result<()> {
        // Initialization logic
        Ok(())
    }

    async fn start(&mut self) -> Result<()> {
        // Start service
        Ok(())
    }

    async fn stop(&mut self) -> Result<()> {
        // Stop service
        Ok(())
    }
    
    async fn handle_request(&self, request: ServiceRequest) -> Result<ServiceResponse> {
        // Dispatch request to appropriate method based on operation
        match request.operation.as_str() {
            "login" => {
                if let Some(params) = &request.params {
                    // Extract parameters
                    let username = vmap!(params, "username" => String::new());
                    let password = vmap!(params, "password" => String::new());
                    
                    // Call service method
                    self.login(&username, &password).await
                } else {
                    Ok(ServiceResponse {
                        status: ResponseStatus::Error,
                        message: "Missing parameters".to_string(),
                        data: None,
                    })
                }
            },
            // Handle other operations...
            _ => Ok(ServiceResponse {
                status: ResponseStatus::Error,
                message: format!("Unknown operation: {}", request.operation),
                data: None,
            })
        }
    }
}
```

### Defining Services with Macros

Using macros significantly simplifies service implementation:

```rust
use anyhow::Result;
use kagi_macros::{action, service, subscribe};
use kagi_node::services::{RequestContext, ValueType};
use std::sync::Arc;

#[service(
    name = "data",
    description = "Processes and transforms data",
    version = "1.0.0"
)]
pub struct DataProcessorService {
    counter: i32,
    events_received: Vec<String>,
}

// The service macro generates the AbstractService implementation for you

impl DataProcessorService {
    pub fn new() -> Self {
        Self {
            counter: 0,
            events_received: Vec::new(),
        }
    }
    
    // Action handler with automatic parameter extraction
    #[action(name = "transform")]
    async fn transform(&self, context: &RequestContext, data: &str) -> Result<String> {
        // Implementation...
        
        // Publish event
        let event_data = vmap! {
            "source" => "transform",
            "data" => data.to_uppercase()
        };  
        context.publish("events/data_events", event_data).await?;
        
        // Return value directly - no need to wrap in ServiceResponse
        Ok(data.to_uppercase())
    }
    
    // Another action handler
    #[action(name = "increment")]
    async fn increment(&mut self, value: i32) -> Result<i32> {
        self.counter += value + 1;
        Ok(self.counter)
    }
    
    // Event subscription handler
    #[subscribe(topic = "events/math_events")]
    async fn on_math_events(&mut self, payload: ValueType) -> Result<()> {
        let data = vmap!(payload, "data" => String::new());
        if !data.is_empty() {
            self.events_received.push(data);
        }
        Ok(())
    }
}

// For subscription handlers, implement Clone
impl Clone for DataProcessorService {
    fn clone(&self) -> Self {
        Self {
            counter: self.counter,
            events_received: self.events_received.clone(),
        }
    }
}
```

The key differences with the macro approach:

1. The `#[service]` macro generates the `AbstractService` implementation
2. Action handlers use the `#[action]` macro and return their actual types
3. Event subscriptions use the `#[subscribe]` macro to register handlers
4. Parameter extraction is handled automatically
5. Return values are automatically wrapped in `ServiceResponse`

Both approaches are valid, but the macro-based implementation significantly reduces boilerplate code and is the recommended approach for new service development.

## Testing Philosophy

- Keep tests simple, focused, and succinct
- Each test should test one thing and test it well
- Avoid unnecessary abstractions in tests - directly test the functionality
- Don't over-engineer test code - it should be more straightforward than production code
- Question existing approaches before carrying them forward:
  - "Is this the simplest way to test this functionality?"
  - "Does this test actually test what we need to verify?"
  - "Is there a clearer way to express this test's intention?"
- Tests should be readable and maintainable - another developer should understand them immediately
- Avoid creating wrapper types or abstractions in tests unless absolutely necessary
- For new features, create comprehensive tests that cover all aspects
- Avoid test duplication - leverage existing test infrastructure when possible
- For end-to-end functionality, test the complete flow:
  - Consider testing from service endpoints
  - Simulate external systems (web UI, mobile apps) where needed
  - Test the "happy path" and error conditions
- Test both value-based and map-based parameter passing for service actions

### Testing Service Handlers

Create unit tests for each operation handler:

```rust
#[tokio::test]
async fn test_handle_create() {
    let service = create_test_service();
    let context = RequestContext::new();
    
    let request = ServiceRequest {
        path: "/test/service".to_string(),
        operation: "create".to_string(),
        params: Some(create_test_params()),
        request_context: context,
    };
    
    let response = service.handle_create(request).await.unwrap();
    assert_eq!(response.status, ResponseStatus::Success);
    // Additional assertions
}
```

### Testing Complete Request Flow

Test the full request handling flow through the service:

```rust
#[tokio::test]
async fn test_integration_flow() {
    let mut service = create_test_service();
    let context = RequestContext::new();
    
    // Initialize the service
    service.init(&context).await.unwrap();
    service.start().await.unwrap();
    
    // Test create operation
    let create_request = ServiceRequest::new(
        "/test/service".to_string(),
        "create".to_string(),
        Some(create_test_params()),
        context.clone(),
    );
    
    let create_response = service.handle_request(create_request).await.unwrap();
    assert_eq!(create_response.status, ResponseStatus::Success);
    
    // Test additional operations
    // ...
    
    // Cleanup
    service.stop().await.unwrap();
}
```

## Verification and Documentation

After each change:

- Run all relevant tests under macro and node crates to ensure everything works as expected
  - Never change tests to make them pass (unless the tests themselves are incorrect)
  - Fix the underlying code, not the tests
- No deprecation: if you change an API, find all references and update them as well
  - We can change our API as there are no other codebases depending on this one yet
- Make documentation ready for external consumption:
  - Use the same style as other existing docs
  - Add examples
  - Include diagrams if applicable to explain:
    - Data flow
    - Process flow
    - Sequence
  - If docs already exist, update them - don't duplicate files or content
- When implementing specs from design decision files, remove the original design decision files after completion
- For security-sensitive features (like key management):
  - Document security considerations
  - Provide a security assessment with recommendations for future iterations
  - Consider interfaces with external systems (web UI, mobile apps)
  - Document the API interfaces for those external systems
- Always include code examples in documentation that match the actual implemented API patterns

## Service Macro Best Practices

- Actions should return their actual data types wrapped in `Result<T>` instead of `ServiceResponse`
- Use the `#[action]` macro to automatically handle the wrapping of returned values
- Implement proper error handling in action methods - errors will be automatically converted to error responses
- Use descriptive parameter names that match the parameters in your action handler methods
- When using subscription handlers, implement `Clone` for your service
- For event handlers, use the `vmap!` macro to extract fields with defaults
- Group related events under logical topic hierarchies
- Return native Rust types from your action handlers rather than generic JSON structures when possible
- Publish events with structured data containing all necessary context

## Avoiding Common Mistakes

- The core code (macros and node crates) need to be generic, when fixing a testing scenario dont bring deatils into the core to make teh test pass, the generic mechanism need to work or be adjusted in a genric manner.
- Don't carry over complexity just because it exists in the current code
- Question why something was done a certain way before continuing with the same approach
- Avoid "implementation-first" thinking - understand the requirements before coding
- Don't add abstraction layers without clear justification
- Keep interfaces clean and intuitive
- When fixing bugs, understand the root cause first, then fix it properly
- Watch for test focus drift - ensure tests verify the intended functionality
- Don't make users handle implementation details (like wrapping parameters or unwrapping responses)
- Avoid nested, chained method calls for data extraction - use helpers like `vmap!` instead

## Macro Development Best Practices

- Understand macros from first principles before modifying them:
  - Declarative macros (`macro_rules!`) expand to code patterns
  - Procedural macros manipulate token streams directly
- Avoid trial and error approaches when debugging macros
- Analyze generated code systematically:
  - Use `cargo expand` to see the expanded macro output
  - For procedural macros, add print statements that output the generated code:
    ```rust
    let expanded = quote! { /* ... */ };
    println!("Expanded code: {}", expanded);
    ```
  - In complex procedural macros, print intermediate representations to understand transformations
- Test macro expansions in isolation with simple test cases before using in complex code
- Common macro debugging techniques:
  - Check for hygiene issues (unintended variable capture)
  - Verify that generated identifiers are correct
  - Confirm that type information is preserved correctly
  - Ensure proper error handling and reporting
- When designing new macros:
  - Keep them as simple as possible
  - Document their behavior clearly
  - Provide clear error messages for common mistakes
  - Use helper functions to avoid duplicating code logic within macros
- For custom derive macros:
  - Check field attributes correctly
  - Handle generic types appropriately
  - Generate code that works with different visibility modifiers
- Apply tracing to see the macro execution flow:
  ```rust
  #[proc_macro_derive(MyDerive)]
  pub fn my_derive(input: TokenStream) -> TokenStream {
      eprintln!("Input: {}", input);
      // ... processing ...
      eprintln!("Output: {}", output);
      output
  }
  ```
- Design macros to make the user experience as simple as possible
- Focus on reducing boilerplate while maintaining type safety
- Create macros that generate code a developer would reasonably write by hand
- Support both simple and advanced use cases with sensible defaults

> **Status**: Finalized  
> **Last Updated**: March 19, 2023  
> **Author**: Runar Team 