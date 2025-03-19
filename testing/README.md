# Runar Testing Documentation

This directory contains documentation related to testing methodologies and approaches for the Runar project.

## Contents

- [Macro Testing Approach](./macro_testing_approach.md) - Comprehensive documentation on testing procedural macros
- [Using Macro Test Tools](./macro-tests/using_test_tools.md) - Guide to using the procedural macro testing tools

## Testing Philosophy

The Runar project employs several testing approaches:

1. **Unit Testing**: Testing individual components in isolation
2. **Integration Testing**: Testing interactions between components
3. **End-to-End Testing**: Testing complete workflows from start to finish
4. **Procedural Macro Testing**: Special techniques for testing compile-time code generation

## Testing Tools

Various tools are used for testing across the project:

- **Standard Rust Testing Framework**: `cargo test` for unit and integration tests
- **Cargo Expand**: For inspecting expanded macro code
- **Custom Scripts**: For automating and simplifying testing workflows 
- **Mock Implementations**: For isolating components during testing

## Contributing Testing Documentation

When adding new testing documentation:

1. Create a markdown file with a descriptive name
2. Include clear examples and code snippets
3. Document both the approach and the rationale
4. Reference any tools or scripts that assist with testing
5. Update this README.md file with a link to your new documentation

## Testing Scripts

The project includes several scripts to simplify testing workflows:

- [`check_expansions.sh`](../rust-macros-tests/tools/check_expansions.sh): Checks all macro expansions
- [`check_specific_macro.sh`](../rust-macros-tests/tools/check_specific_macro.sh): Checks a specific macro expansion 