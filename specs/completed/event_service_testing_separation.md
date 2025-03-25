# Event Service Testing Architecture Separation

> **PARTIAL COMPLETION**: Core event routing has been fixed. This document describes remaining work needed for test architecture separation.

## Overview
This document describes the architectural decision to separate testing implementations for the event routing system, creating a clear distinction between direct API implementations and macro-based implementations.

## Current State
We've fixed the core event routing mechanism, ensuring proper topic path handling and event delivery. However, we still need to complete the separation of testing implementations:

- ✅ Fixed core event routing with topic paths
- ✅ Ensured consistent path formatting throughout the system 
- ✅ Added detailed debug logging for better diagnostics
- 🔄 Still need to separate direct API and macro-based testing approaches

## Solution
Implement a clean separation between direct API and macro-based implementations:

1. **rust-node tests**: Use only direct API implementations
   - Simpler, more explicit service definitions
   - Clear request/response patterns
   - No reliance on macro-generated code
   - Focus on core API functionality testing

2. **rust-macros tests**: Use macro-based implementations
   - Test the macro functionality itself
   - Ensure macros generate correct service code
   - Validate macro subscription handlers

## Implementation Plan

### 1. Direct API Services (rust-node) 🔄 (In Progress)
- Create clean, direct implementations of all test services
- Implement publisher and subscriber services using only AbstractService trait
- Use request-based API for all service interactions
- Follow architectural guidelines for clean separation of concerns

### 2. Macro-Based Services (rust-macros) 🔄 (Not Started)
- Move all macro-based test services to the rust-macros crate
- Include sufficient tests to verify macro functionality
- Reuse test service patterns for consistency

### 3. Test Utilities 🔄 (In Progress)
- Create clear utility functions for each approach
- Maintain consistent patterns and naming
- Document the purpose and usage of each utility

## Progress
- ✅ Fixed core event routing issues with topic paths
- ✅ Ensured proper subscription and event delivery
- ✅ Verified with simple_events test
- 🔄 Working on creating clean direct API implementations
- 🔄 Still need to move macro-based implementations to rust-macros crate

## Architectural Guidelines Followed
- **Service Boundaries**: Clear separation between publisher and subscriber services
- **API-First Approach**: All service interactions go through well-defined APIs
- **Request-Based Communication**: Using request/response patterns for service interactions
- **Event-Driven Design**: Using publish/subscribe for event notifications

## Completion Criteria
- All rust-node tests use only direct API implementations
- All macro-based tests moved to rust-macros crate
- Test coverage maintained for both approaches
- All tests pass with the new architecture
