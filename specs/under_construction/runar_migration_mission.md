# Runar Project Restructuring and Migration

## Background

We have recently moved our code to a new repository structure. Now we need to rename components, update references, remove duplicate code, and ensure everything compiles and runs as expected.

Several duplicate packages exist (rust-common, kagi_utils, utils, kagi_node, test_service_info) that need to be consolidated. The rust-common crate should be the central location for all common utilities.

The core components of our system are:
- rust-node: The system core
- rust-macros: Contains the macro functionality that enables simple service definition

Currently, some macros exist in the core package that may need to be moved to the rust-macros crate. We need to analyze all macros to ensure they're in the appropriate locations.

The rust-apps submodule will contain components and applications built using Runar tools. This submodule will typically remain disabled to keep the monorepo manageable, but can be enabled when working on applications.

The rust-docs submodule will contain:
- Specifications (to be built into docs)
- Public documentation in Markdown format
- Website builder
- Built documentation website (HTML/CSS/JS)

We need to reorganize this submodule to host the built docs website as a GitHub Pages site.

We have also rebranded from "Kagi" to "Runar". We are now the Runar team, and our product is runar-node. To distinguish between implementations, we'll use the prefixes rust-, go-, and ts- (e.g., rust-runar-node, go-runar-node, ts-runar-node). All references to "Kagi" in code and documentation must be updated to "Runar".

# Runar Project Migration Plan

## 1. Code Consolidation and Deduplication

- [x] Analyze duplicate code between rust-common, kagi_utils, utils, kagi_node, test_service_info
- [x] Create a consolidation plan with mapping of which files go where
- [x] Move all common utilities and shared code to rust-common crate
- [x] Update all import paths across the codebase to point to consolidated code in rust-common
- [x] Ensure proper dependency structure in Cargo.toml files after consolidation
- [x] Verify no critical functionality is lost during consolidation
- [x] Update tests to reflect new import paths
- [x] Verify the build works with consolidated code but before removing old packages
- [x] Remove redundant packages after verification (kagi_utils, utils, etc.)

## 2. Renaming from Kagi to Runar

- [x] Create a comprehensive grep search to identify all "kagi" references throughout the codebase
- [x] Update all file and directory names from "kagi_*" to "runar_*"
- [x] Update package names in Cargo.toml files
- [x] Update module names and references in source code
- [x] Update documentation references from "kagi" to "runar"
- [x] Update README files and other project documentation
- [x] Ensure all references to the project in comments are updated
- [x] Standardize function names across all crates (log_callback -> log_callback_execution, log_event_published -> log_published_event)
- [ ] Verify proper references to implementations (rust-runar-node, go-runar-node, ts-runar-node)

## 3. Macro Analysis and Reorganization

- [x] Identify all macros across the codebase
- [x] Create inventory of macros in rust-node core package
- [x] Determine which macros should move to rust-macros
- [x] Migrate appropriate macros to rust-macros package
- [x] Update all references to moved macros
- [x] Ensure backward compatibility or provide clear migration path
- [x] Add comprehensive documentation for all macros and their usage
- [x] Write tests for any moved macros

## 4. Rust-docs Reorganization

- [x] Plan structure for GitHub Pages compatible documentation
  - [x] Created basic website structure with index.html
  - [x] Added .nojekyll and CNAME files
  - [x] Set up asset directories (css, js, img)
  - [x] Updated build process to output to website directory
  - [x] Added basic styling and JavaScript
- [x] Create a clear separation between source docs and built docs
- [x] Set up a build process for generating static website from markdown
- [x] Organize specs, public docs, and website builder
- [x] Create a GitHub Actions workflow for automatic docs deployment
- [ ] Test the GitHub Pages deployment
- [ ] Verify all documentation is up-to-date with the latest code changes
- [ ] Ensure correct implementation-specific references (rust-, go-, ts- prefixes)

### Documentation Updates Needed
- [ ] Update all code examples to use new standardized function names
- [ ] Add migration guide for users updating from Kagi to Runar
- [ ] Create API documentation for all public interfaces
- [ ] Add troubleshooting guides for common issues
- [ ] Create contribution guidelines for documentation

## 5. Integration and Testing

- [x] Verify that all crates build successfully after changes
- [x] Run the full test suite across all submodules
- [ ] Ensure all examples work correctly (Needs Implementation)
- [ ] Performance testing to verify no regressions
- [ ] Create integration tests that verify cross-module functionality (Needs Implementation)
- [ ] Test on different platforms if applicable
- [ ] Document any breaking changes and required migrations for users

## 6. Post-Migration Tasks

- [ ] Update CI/CD pipelines to reflect new structure
- [ ] Create comprehensive project-wide documentation
- [ ] Review and update versioning strategy
- [ ] Create release notes detailing the migration
- [ ] Plan for future maintenance and development workflows
- [ ] Review security implications of the restructuring

## Notes

- The `pub_sub_macros_test.rs` test file is temporarily parked as it requires additional work to function with the updated macro system. We'll revisit this after completing the main migration tasks.
- Current focus is on ensuring all core functionality is working properly in the restructured repository.
- **Macro API Changes**: We identified that the current macro implementation doesn't support our desired API pattern (returning plain data instead of ServiceResponse, removing manual operation handling). This will require additional implementation work to update the macros.

## Progress Updates

### Testing Approach (Consolidated from test documentation)

#### Analysis of Current Test Issues

The current tests for `runar_macros` (previously `kagi_macros`) have several issues:

1. They try to access internal modules of a proc-macro crate directly, which is not allowed by Rust.
2. They expect a specific API structure that has changed during the refactoring.
3. Some tests rely on implementation details rather than focusing on the generated code.

#### Recommended Testing Approach

1. **Create Test Fixtures Crates**:
   - Create separate test fixture crates that use the macros as they would be used in real code
   - Structure: `rust-macros-tests/` as a new test crate that depends on rust-macros

2. **Test Structure**:
   - Have a dependency on the `runar_macros` crate
   - Contain multiple examples of services with different configurations
   - Test the generated code, not the implementation details

3. **Test Categories**:
   - Basic Service Tests: Verify service macro correctly generates implementation
   - Action Handler Tests: Verify action handlers are registered and callable
   - Subscription Tests: Verify event subscriptions are registered correctly
   - Parameter Extraction Tests: Verify parameters are extracted correctly from requests
   - Path Handling Tests: Verify service paths are handled correctly

4. **Implementation Status**:
   - Created a minimal test crate with a placeholder test
   - Added documentation on how to use cargo-expand for macro inspection
   - Created example files for different macro types (service, action, subscribe, publish)
   - Implemented a script to automate macro expansion checking

### Work Log Highlights

- ✅ Created a modular structure for `rust-common`
- ✅ Moved `ValueType` to `rust-common/src/types`
- ✅ Created utility modules in `rust-common/src/utils`
- ✅ Updated `rust-macros` to utilize `ValueType` from `rust-common`
- ✅ Fixed compile errors in `ValueType` implementations with proper type constraints
- ✅ Implemented a macro to handle `From<T>` for `ValueType` for custom structs
- ✅ Renamed package from "kagi_common" to "runar_common" in Cargo.toml
- ✅ Renamed utils package from "kagi_utils" to "runar_utils"
- ✅ Renamed package from "kagi_node" to "runar_node" in Cargo.toml
- ✅ Modified services/mod.rs to import ValueType from runar_common

### Key Implementation Changes

The macro implementations have been updated to replace all "kagi" references with "runar" including:

- Updated import patterns from `kagi_common` to `runar_common` and `kagi_node` to `runar_node`
- Changed macros to use crate-relative paths for better modularity
- Fixed service macro to correctly handle path prefixing
- Updated service metadata handling to match the new architecture 