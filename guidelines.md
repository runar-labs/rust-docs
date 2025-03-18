# Kagi Development Guidelines

## Workflow & Quality Standards

- Check design docs in `docs/` before making changes
- Document your process in `spec/under_construction/`:
  - Progress, issues, solutions, and design decisions
  - Use as input for documentation updates
  - Remove when work is complete (all tests pass and docs updated)
- Clean up warnings and unused code in any files you modify
- Maintain consistent formatting, naming, and organization

## Rust Best Practices

- Leverage strong typing to prevent errors at compile time
- Prefer ownership over borrowing when appropriate
- Handle errors properly (no unwraps in production code)
- Use `Option` and `Result` for representing absence or failure
- Follow naming conventions: snake_case for functions, CamelCase for types
- Use enums for state machines and variants
- Keep functions focused on a single responsibility
- Use meaningful error types with context
- Write documentation comments for public APIs
- Apply clippy lints to catch common mistakes

## API Design Principles

- Design from the consumer's perspective first
- Return domain-specific values rather than generic wrappers
- Support both direct value and mapped parameters:
  ```rust
  // Both styles should work for single parameters
  node.request("service/action", "value")
  node.request("service/action", vmap!{"param" => "value"})
  ```
- Use `vmap!` for clean parameter extraction with defaults:
  ```rust
  // Instead of: data.as_ref().and_then(|v| v.as_str()).unwrap_or_default()
  let value = vmap!(data, => String::new());
  ```
- Provide sensible defaults to reduce error handling burden

## KAGI Service Implementation

### Service Definition

- Use the `#[service]` macro with clear metadata:
  ```rust
  #[service(
      name = "data",
      path = "data_service", 
      description = "Manages data records",
      version = "1.0.0"
  )]
  struct DataService {
      records: Arc<Mutex<HashMap<String, DataRecord>>>, // Thread-safe state
  }
  ```
- Implement `Clone` for services with event subscriptions

### Action Methods

- Use `#[action]` with descriptive operation names
- Return actual data types in `Result<T>`, not `ServiceResponse`:
  ```rust
  // ✅ Good: Returns the actual data type
  #[action(name = "get")]
  async fn get_record(&self, _ctx: &RequestContext, id: &str) -> Result<DataRecord>
  ```
- Include `context` parameter for operations that publish events
- Use descriptive parameter names matching API calls

### Event Handling

- Use `#[subscribe]` for event handlers:
  ```rust
  #[subscribe(topic = "data_service/created")]
  async fn handle_created(&self, payload: ValueType) -> Result<()> {
      let id = vmap!(payload, "id" => String::new());
      // Implementation...
  }
  ```
- Extract fields with `vmap!` and provide defaults
- Keep handlers small and focused

### Using Node API

- For single parameters, prefer direct parameter passing:
  ```rust
  node.request("data_service/get", record_id) // Direct value
  ```
- For multiple parameters, use `vmap!`:
  ```rust
  node.request("data_service/create", 
      vmap!{"name" => "test", "value" => "data"}
  ).await?;
  ```
- Extract response values with `vmap!`:
  ```rust
  let record_id = vmap!(result.data, => String::new());
  let name = vmap!(result.data, "name" => String::new());
  ```

### Code Patterns

- Use `async/await` for service operations
- Validate inputs early
- Publish events with structured data for state changes
- Use descriptive variable names
- Handle errors with Rust's `?` operator

## Testing Philosophy

- Keep tests simple, focused, and readable
- Test one thing per test and test it well
- Avoid over-engineering test code
- Question existing approaches before carrying them forward
- Test both value-based and map-based parameter passing
- For end-to-end tests, cover the complete flow including edge cases

## Verification Process

- Run all relevant tests in macro and node crates
- Fix underlying code, not tests (unless tests are incorrect)
- Update all affected code when changing APIs
- Make documentation ready for external consumption:
  - Match existing style
  - Include examples and diagrams where helpful
  - Update existing docs instead of duplicating
- Document security considerations for sensitive features

## Service Macro Best Practices

- Return actual data types in `Result<T>` from action handlers
- Let the `#[action]` macro handle response wrapping
- Implement proper error handling (errors convert to error responses)
- Group related events under logical topic hierarchies
- Publish events with all necessary context

## Common Pitfalls to Avoid

- Keep core code (macros and node) generic
- Don't carry over complexity from existing code without reason
- Understand requirements before coding
- Keep interfaces clean and intuitive
- Fix bugs at their root cause
- Don't make users handle implementation details
- Avoid nested, chained method calls for data extraction

## Macro Development

- Understand macro fundamentals (declarative vs. procedural)
- Debug systematically:
  - Use `cargo expand` to see expanded output
  - Add print statements for procedural macros
  - Test in isolation before complex usage
- Check for hygiene issues and proper error handling
- Design for user experience:
  - Keep macros simple with clear documentation
  - Provide helpful error messages
  - Support both basic and advanced use cases 