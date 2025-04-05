# Runar Development Guidelines

## Documentation-First Development

Our codebase follows a documentation-first development approach:

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

## Enabling LLM-Friendly Development

1. **Documentation-Driven Development**:
   - LLMs can understand and follow clear documentation
   - Document architectural intentions to guide LLM code generation
   - Use intention comments to make architecture explicit

2. **Test-Driven Refactoring**:
   - Tests document expected behavior
   - LLMs can understand test intentions to guide refactoring
   - Document constraints and boundaries in tests

3. **Clear Refactoring Plans**:
   - Document refactoring steps in detail
   - LLMs can follow structured plans more effectively
   - Track progress in the plan as refactoring proceed