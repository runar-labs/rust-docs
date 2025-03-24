# Event Service Testing Architecture Separation

## Overview
This document describes the architectural decision to separate testing implementations for the event routing system, creating a clear distinction between direct API implementations and macro-based implementations.

## Current State
Currently, test implementations mix direct API and macro-based approaches in the rust-node crate, leading to:
- Increased complexity in test files
- Difficulty maintaining clear architectural boundaries
- Challenges in understanding which patterns should be used when

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

### 1. Direct API Services (rust-node)
- Create clean, direct implementations of all test services
- Implement publisher and subscriber services using only AbstractService trait
- Use request-based API for all service interactions
- Follow architectural guidelines for clean separation of concerns

### 2. Macro-Based Services (rust-macros)
- Move all macro-based test services to the rust-macros crate
- Include sufficient tests to verify macro functionality
- Reuse test service patterns for consistency

### 3. Test Utilities
- Create clear utility functions for each approach
- Maintain consistent patterns and naming
- Document the purpose and usage of each utility

## Progress
- Created DirectPublisherService and DirectSubscriberService implementations
- Created test utilities for setting up direct API test environments
- Working on moving macro-based implementations to the rust-macros crate

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
