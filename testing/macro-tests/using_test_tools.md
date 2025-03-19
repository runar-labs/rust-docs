# Using the Runar Macro Testing Tools

This guide explains how to use the testing tools available in the `rust-macros-tests` crate to verify the functionality of the procedural macros in the `runar_macros` crate.

## Available Tools

The `rust-macros-tests` crate includes two main tools for testing procedural macros:

1. `check_expansions.sh`: Checks all macro expansions
2. `check_specific_macro.sh`: Checks a specific macro expansion

These tools are located in the `tools/` directory of the `rust-macros-tests` crate.

## Prerequisites

Before using the tools, ensure you have `cargo-expand` installed:

```bash
cargo install cargo-expand
```

## Testing All Macros

To test all macros at once:

```bash
cd rust-macros-tests
./tools/check_expansions.sh
```

This will:
1. Run `cargo-expand` on each example file in `src/examples/`
2. Save the output to the `expansion_outputs/` directory
3. Verify that each expansion was generated successfully

## Testing a Specific Macro

To test a specific macro:

```bash
cd rust-macros-tests
./tools/check_specific_macro.sh <macro_type>
```

Where `<macro_type>` is one of:
- `service_macro`
- `action_macro`
- `event_macros`

For example:

```bash
./tools/check_specific_macro.sh service_macro
```

This will:
1. Run `cargo-expand` on the specified macro example
2. Save the output to `expansion_outputs/<macro_type>_expansion.rs`
3. Display a summary of the expansion output

## Understanding the Output

The expansion output shows how the macro transforms your code. For example, the `#[service]` macro:

- Creates a struct that implements `AbstractService`
- Registers the service with the global registry
- Adds trait implementations for your service methods

When examining the output, look for:
- Whether the service/action/event registration code is generated
- If the parameter extraction logic is correct
- If the correct implementation traits are applied
- Any compiler errors in the generated code

## Available Examples

The following examples are available in the `src/examples/` directory:

### Service Macro (`service_macro.rs`)

Demonstrates the `#[service]` macro which:
- Registers a service with the global registry
- Implements `AbstractService` for your struct
- Sets up service metadata

### Action Macro (`action_macro.rs`)

Demonstrates the `#[action]` macro which:
- Registers action handlers for a service
- Sets up parameter extraction
- Implements request handling

### Event Macros (`event_macros.rs`)

Demonstrates the `#[subscribe]` and `#[publish]` macros which:
- Register event subscribers
- Set up event publication methods
- Implement event handling

## Custom Testing

You can also create your own test files to verify specific macro behaviors:

1. Create a new file in the `src/examples/` directory
2. Add your test code using the macros you want to test
3. Run `cargo expand --package runar-macros-tests --features=full_test --file src/examples/your_file.rs`

## Troubleshooting

If you encounter issues with the testing tools:

1. **Empty expansion output**: Make sure you have `cargo-expand` installed and that you're using a nightly Rust toolchain.
2. **Macro doesn't expand as expected**: Check if you're using the macro correctly and that all dependencies are properly set up.
3. **Compilation errors in expansion**: The macro may be generating invalid code. Check the error messages and fix the macro implementation.

## Integration with Documentation

The testing tools are integrated with the documentation system. You can find more detailed information about the macro testing approach in the `rust-docs/testing/macro_testing_approach.md` file. 