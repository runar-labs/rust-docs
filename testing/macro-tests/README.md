# Runar Macro Testing Documentation

This directory contains documentation about testing procedural macros in the Runar project.

## Available Documentation

- [Macro Testing Approach](macro_testing_approach.md) - Overview of our testing strategy for procedural macros
- [Node Lifecycle](node_lifecycle.md) - Documentation of the node initialization and lifecycle
- [Using Test Tools](using_test_tools.md) - Guide on using the macro testing tools

## Quick Start

To test macros, navigate to the `rust-macros-tests` directory and run:

```bash
# Install cargo-expand if you haven't already
cargo install cargo-expand

# Check all macro expansions
./tools/check_expansions.sh

# Or check a specific macro
./tools/check_specific_macro.sh service_macro
```

## Testing Strategy

Our current testing approach focuses on **expansion testing** rather than runtime testing due to the challenges of testing procedural macros.

1. **Expansion Testing**: Check that macros generate the expected code structure
2. **Minimal Compilation**: Verify that expanded macros compile correctly
3. **Documentation**: Keep examples up-to-date with API changes

## Common Issues

- **API Changes**: The underlying API changes (e.g., node lifecycle methods) can break macro tests even if the macros themselves are unchanged
- **Private Types**: Macros may depend on types that are not exposed in the public API
- **Framework Changes**: Changes to the overall Runar architecture can affect how macros should behave

## Recommended Workflow

1. First, check the macro expansion using `cargo-expand`
2. Ensure examples are commented with expected behavior
3. Update examples when API changes occur
4. Focus on the structure of generated code rather than runtime behavior

## Related Resources

- [Rust Procedural Macros Documentation](https://doc.rust-lang.org/reference/procedural-macros.html)
- [Cargo Expand Repository](https://github.com/dtolnay/cargo-expand)
- [Runar Macros Implementation](../../rust-macros) 