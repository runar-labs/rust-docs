# Topic Path Refactoring Design

## Problem Statement

Our current approach to handling service paths, actions, and event topics lacks clear structure and consistency, leading to recurring issues:

1. **Terminology Confusion**: The terms `path`, `service_name`, `action`, etc. are used inconsistently across the codebase.
2. **Ambiguous Request Structure**: The `ServiceRequest` structure uses `path` field for the service name, creating confusion.
3. **Duplicated Parsing Logic**: Path parsing logic is repeated in multiple places with subtle differences.
4. **Missing Network Context**: Network IDs aren't consistently included in path routing.
5. **Error-Prone String Concatenation**: Manual formatting (`format!("{}/{}",...)`) is error-prone.

These issues manifest in event routing tests where topics created by publishers don't match the subscription paths, causing event delivery failures.

## Solution: TopicPath Structure

We'll introduce a `TopicPath` structure to standardize path representation and handling throughout the system:

```rust
/// Represents a standardized path in the system with clear semantics
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub struct TopicPath {
    /// Network ID for this path
    pub network_id: String,
    
    /// Service path - the actual routing path for the service
    pub service_path: String,
    
    /// Action name or event topic
    pub action_or_event: String,
    
    /// Path type indicator (action vs event)
    pub path_type: PathType,
}

/// Indicates whether a path references an action or event
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum PathType {
    Action,
    Event,
}
```

## Path Format

The standardized string representation will use:
- Network ID and service path separated by a colon (`network:service_path`)
- Action or event separated by a forward slash (`/action`)
- Complete format: `network:service_path/action_or_event`

## Implementation Details

### Core Functions

```rust
impl TopicPath {
    /// Create a new action path
    pub fn new_action(network_id: &str, service_path: &str, action: &str) -> Self {
        Self {
            network_id: network_id.to_string(),
            service_path: service_path.to_string(),
            action_or_event: action.to_string(),
            path_type: PathType::Action,
        }
    }
    
    /// Create a new event path
    pub fn new_event(network_id: &str, service_path: &str, event: &str) -> Self {
        Self {
            network_id: network_id.to_string(),
            service_path: service_path.to_string(),
            action_or_event: event.to_string(),
            path_type: PathType::Event,
        }
    }
    
    /// Parse a path string into a TopicPath
    pub fn parse(path_str: &str, default_network_id: &str) -> Result<Self> {
        // Full implementation in code
    }
    
    /// Convert TopicPath to string representation with network ID
    pub fn to_string(&self) -> String {
        format!("{}:{}/{}", self.network_id, self.service_path, self.action_or_event)
    }
    
    /// Convert TopicPath to string representation without network ID
    pub fn to_local_string(&self) -> String {
        format!("{}/{}", self.service_path, self.action_or_event)
    }
}
```

### Integration with Node

The Node will need to be updated to:
1. Create TopicPath instances for all requests and events
2. Use the node's network ID when constructing paths
3. Pass TopicPath objects to the service registry for routing

### Integration with Service Registry

The service registry will be updated to:
1. Accept TopicPath objects for lookups
2. Parse existing path strings into TopicPath objects
3. Update subscription matching to use TopicPath

## Migration Strategy

1. Implement the TopicPath structure and utility functions
2. Update the Node's request handling to use TopicPath
3. Modify the service registry to use TopicPath for lookups
4. Enhance event subscription and publishing to use TopicPath
5. Update tests to use the new format

## Benefits

This approach will:
1. Eliminate ambiguity in path handling
2. Centralize path parsing and formatting
3. Explicitly include network IDs for cross-network routing
4. Provide clear type distinction between actions and events
5. Reduce error-prone string manipulations

## Testing Strategy

1. Unit tests for TopicPath parsing and formatting
2. Integration tests for path routing with the new structure
3. Verification that existing event routing tests pass with the new system

## Impact on API Design

This change enhances our API-first approach by providing a consistent, well-defined structure for all service interactions. It aligns with our architectural principles of service boundaries and request-based communication.

## Implementation Timeline

1. Implement TopicPath structure: 2 hours
2. Update Node request handling: 3 hours
3. Modify service registry: 4 hours
4. Update event system: 3 hours
5. Fix tests: 2 hours

Total estimated time: 14 hours
