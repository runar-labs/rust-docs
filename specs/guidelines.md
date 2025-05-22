ALWAYS USE IDE TOOLS don t use cat vi grep etc to read and modify file.s. use the IDE too.s if tgheuy fail.. let me know so I can restart the IDE
DO NOT USE clic tools to change files.

Split into two roles the coder and the designer/reviewer. after every code change. the reviewer. needs to double check if the code just written is aligned ewith this guidelines and the architecreu of tehs sytem.


1. **Source of Truth**: Documentation in source files and test files is the source of truth
   - Every component, module, and test has documented INTENTION
   - Documentation describes architectural boundaries, responsibilities, and contracts
   - Examples live in the source code, not in external documentation

2. **Respecting Documentation**:
   - All code changes MUST respect the documented intentions and boundaries
   - If you find documentation that contradicts the code, the documentation is likely correct
   - The documentation represents the intended architecture and design

3. **Permission Required for Architectural Changes**:
   - If a change would violate documented architectural boundaries, STOP
   - Request explicit permission and explain why the architectural change is needed
   - Document the decision before implementing any code changes

## Refactoring Process

When refactoring code:

IMPORTANT: DO NOT CHANGE THE INTENTION OF TESTS AND CORE FUNCTIONS WITIOUT the USER CONFIRMATION. ALways ask before doing this. that is how we prevent unwanted changes to the codebase.

1. **Create a Detailed Plan**:
   - Document the plan in `rust-docs/specs/under_construction/`
   - Get the plan validated before proceeding
   - Include clear steps, architectural impacts, and testing approach

2. **Documentation First, Code Second**:
   - First update the documentation to reflect the intended changes
   - Then update the tests to align with the new documentation
   - Only after documentation and tests are updated, modify the implementation

3. **Test Intention**:
   - Each test has a clearly documented intention
   - Tests should verify architectural boundaries are maintained
   - Test documentation must be kept up-to-date with architectural changes

4. **Progress Tracking**:
   - Keep the refactoring plan up-to-date with progress
   - Document issues encountered and solutions implemented
   - Move completed plans to `rust-docs/specs/completed/`

## First Principles Thinking

When solving problems or implementing new features:

1. **Avoid Trial and Error**:
   - Do not make random changes to "see what works"
   - Each change should be purposeful and well-understood
   - Understand the root cause before attempting a fix

2. **Think From First Principles**:
   - Break problems down to their fundamental elements
   - Understand the Rust type system and ownership model
   - Consider architectural implications before coding

3. **Design Before Implementation**:
   - Sketch the solution and identify potential issues
   - Choose appropriate Rust patterns (traits, generics, etc.)
   - Consider error handling, performance, and maintainability

4. **Use Idiomatic Rust**:
   - Follow established Rust idioms and patterns
   - Leverage the type system to prevent errors
   - Use traits to define clear interfaces between components

Remember that a well-designed solution may take longer initially but saves substantial time in maintenance, debugging, and refactoring later. When implementing complex features, spend proportionally more time on design and less on coding.

## Core Architectural Principles

1. **Service Boundaries**: Services should be well-defined with clear boundaries
2. **API-First Approach**: All service interactions should go through documented API interfaces
3. **Request-Based Communication**: Use request/response patterns for service interactions
4. **Event-Driven Design**: Use publish/subscribe for event notifications

This is a new codebase. NO BACKWARDS COMPATIBILITY, no STUBS, no MOCKS, no shims.;. if u change a method signature, find all places in this repon that uses that methods or field and make the changes.. NO BACKWARDS COMPATIBILITY

## Constructor Design Principle

To prevent constructor proliferation and maintain a clean, maintainable API:

1. **Single Primary Constructor**:
   - Each struct should have ONE primary constructor named `new()`
   - This constructor should accept ONLY required parameters
   - All parameters must be essential for creating a valid instance

2. **Builder Pattern for Optional Parameters**:
   - Use builder methods with the `with_` prefix for optional parameters
   - Builder methods should return `self` for method chaining
   - Example: `Context::new(id, path, logger).with_config(config).with_metadata(md)`

3. **No Specialized Constructors**:
   - DO NOT create separate constructors for different parameter combinations
   - Avoid methods like `new_with_config()`, `new_with_logger_and_config()`
   - If many parameters are commonly used together, create a configuration struct

4. **Parameter Grouping**:
   - Group related parameters into dedicated structs
   - Use configuration objects when a component has many optional settings

The builder pattern strikes a balance between API simplicity and flexibility, making code more maintainable and self-documenting.

## Anti-Patterns to Avoid

1. **Thread-Local Storage**: Makes code unpredictable with async runtimes
2. **Context Storage**: Each request should have its own isolated context
3. **Direct Service Registry Access**: Use the documented API instead
4. **Implementation-First Development**: Understanding requirements comes before coding

## Documentation Standards

1. **Intention Documentation**:
   - Every component must have a clear documented intention
   - Tests must document what they verify and why
   - Architecture boundaries must be explicitly documented

2. **Living Documentation**:
   - Documentation lives with the code it describes
   - Update documentation whenever code changes
   - Documentation is the design specification

3. **Clear Boundaries**:
   - Document component responsibilities and non-responsibilities
   - Clearly mark architectural violations in legacy code
   - Document migration paths for anti-patterns

1. **Documentation-Driven Development**:
   - Document architectural intentions 
   - Use intention comments to make architecture explicit

2. **Test-Driven Refactoring**:
   - Tests document expected behavior
   - Document constraints and boundaries in tests

3. **Clear Refactoring Plans**:
   - Document refactoring steps in detail
   - Track progress in the plan as refactoring proceed
 
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

 ## Core Architectural Principles USE THIS WHEN IMPLEMENTING TESTS so tu properly use tyhe FMK API (THIS DOES NOT APPLY TO HOW WE IMPLEMENT THE CORE CODE)

1. **Service Boundaries**: Services should be well-defined with clear boundaries
2. **API-First Approach**: All service interactions should go through documented API interfaces
3. **Request-Based Communication**: Use request/response patterns for service interactions
4. **Event-Driven Design**: Use publish/subscribe for event notifications

## API Design Best Practices

- Design APIs from the consumer's perspective first
- Strive for simplicity and intuitiveness in public interfaces
- Return domain-specific values from functions rather than generic wrappers where possible
- For action handlers, return the actual data type (e.g., `Result<String>`) instead of wrapping in generic containers
- Support both direct value parameters and mapped parameters for flexibility:

```rust
  // Both styles should work for single-parameter actions
  node.request("service/action", "value") 
```
  
### Service Registration Example

```rust
// Creating a node
let mut node = Node::new(config).await?;

// Creating service instances
let counter_service = CounterService::new("counter");
let event_service = EventService::new("events");

// Correct registration
node.add_service(counter_service).await?;
node.add_service(event_service).await?;

// Start the node
node.start().await?;
```
 
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
- Never change the purpose of an existing test - if a test was designed to test a specific feature or macro,
  maintain that purpose in any modifications. If you need to test something else, create a new test file
  or add a new test case rather than repurposing existing tests.

### Testing Macros

When working with test files in macro crates:
- **Never remove macro usage from test files** - tests in macro crates exist specifically to test macro functionality
- **Don't work around macro issues by removing macros** - if tests fail due to macro issues, fix the macro implementation
- The purpose of tests is to identify and fix issues, not to make tests pass at any cost
- If a macro test is failing, investigate the root cause in the macro implementation
- Document macro limitations clearly, but don't modify tests to avoid using macros
- When adding new test cases, ensure they properly test the macro's behavior in various scenarios
 

## Documentation Best Practices

- Always check for existing documentation before creating new files:
  - Look in `rust-docs/specs/under_construction/` for ongoing work
  - Check `rust-docs/markdown/` for existing design docs
  - Review `rust-docs/specs/completed/` for previously resolved issues
- **Do not create new documentation files** unless absolutely necessary
- Use the existing documentation structure and plans provided:
  