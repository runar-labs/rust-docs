# Macro Testing Approach

This document outlines our approach to testing procedural macros in the `runar_macros` crate.

## Testing Challenges

Testing procedural macros presents unique challenges:

1. Macros execute at compile time, making traditional unit tests insufficient
2. Macros generate code that interacts with the framework's runtime
3. Changes to the underlying framework can break macros even if the macro code remains unchanged

## Current Test Issues

The current test system has several issues:

1. It relies on runtime testing which requires a full node environment
2. The API has evolved (ex: node lifecycle methods), breaking existing tests
3. Tight coupling between the test code and implementation details creates brittleness

## Solution: A Two-Fold Testing Approach

### 1. Expansion Testing

- Use `cargo-expand` to verify macro expansion is correct
- Focus on the structure of the generated code
- Store examples showing proper usage patterns
- Keep examples in `#[cfg(feature = "full_test")]` blocks to prevent compilation errors

### 2. Minimal Compilation Testing

- Simple tests that verify macros compile correctly
- Avoid runtime dependency on node behavior
- Test basic integration with the framework

## Node Lifecycle Documentation

For reference, the current node lifecycle is:

1. Create a node with configuration: `let node = Node::new(config).await?;`
2. Initialize the node: `node.init().await?;`
3. Register services: `node.add_service(service).await?;`
4. Start the node: `node.start().await?;`
5. When finished, stop the node: `node.stop().await?;`

## Testing Tools

The `rust-macros-tests` crate includes tools to facilitate testing:

1. `/tools/check_expansions.sh` - Run expansion tests on all example macros
2. `/tools/check_specific_macro.sh` - Check expansion of a specific macro

### Example usage:

```bash
# Check all macro expansions
./tools/check_expansions.sh

# Check service macro specifically
./tools/check_specific_macro.sh service_macro
```

## Implementation Plan

1. Update example files to match current API but disable compilation with comments
2. Add commented expectations for how macros should expand
3. Update tools to support checking expansions against expected output
4. Add minimal compile tests that don't depend on runtime behavior 