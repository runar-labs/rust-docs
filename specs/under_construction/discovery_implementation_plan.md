# MulticastDiscovery Implementation Plan

## Current Issues and Requirements

### 1. Type Rename and Field Changes
- `DiscoveryMessage` renamed to `PeerInfo`
- Field `peer_public_key` renamed to `public_key`
- Need to update all references to these types and fields

### 2. Discovery vs Full Node Info
- During discovery we only have `PeerInfo` (public key and addresses)
- Only after connection/handshake do we get full `NodeInfo` with capabilities
- Need to properly handle the transition from `PeerInfo` to `NodeInfo`

### 3. Serialization Requirements
- ValueType should be able to store structs directly without transformation
- Serialization to binary format should happen at the last possible moment (before network transmission)
- Deserialization should reconstruct the original typed objects
- In handshake process, we need to extract NodeInfo from ValueType payload

### 4. Handshake Process Updates
- Handshake message now includes full NodeInfo with capabilities
- Payload contains structured NodeInfo data: `payloads: !vec(ValueType::Struct(local_node))`
- Receiving side needs to extract typed objects: `let (_, peer_info, _) = message.payloads.get(0).unwrap()`

## Implementation Plan

### 1. Update Discovery Layer
- Complete renaming from `DiscoveryMessage` to `PeerInfo`
- Ensure all fields and methods use the new naming convention
- Update HashMap types: `HashMap<String, PeerInfo>` 
- Fix any affected comparison logic and type handling

### 2. Enhance ValueType Serialization (Simplified Approach)
- Update ValueType to store structs directly and provide serialization helpers
- Implement a direct flow without type registry:
  - Wrap object → ValueType::Struct → serialize → network → deserialize → ValueType::Bytes → as<T>() → original type
- Avoid unnecessary complexity while maintaining type safety

### 3. Update Handshake Protocol
- Modify handshake to include full NodeInfo
- Ensure proper serialization of NodeInfo to ValueType
- Implement extraction of NodeInfo from ValueType on receiving side
- Update handle_incoming_connection and related methods

### 4. Testing Strategy
- Test serialization and deserialization of complex objects
- Verify that type information is preserved across the network
- Test handshake with full NodeInfo exchange
- Validate proper functioning of discovery with PeerInfo

## Serialization Design (Simplified)

The serialization system should follow these principles:

1. **Late Serialization**: Objects should be kept in their original type as long as possible
2. **Type-Directed Deserialization**: Consumer code knows what type to expect and directs deserialization
3. **Efficient Binary Format**: Use binary serialization for network transmission
4. **Transparent Handling**: ValueType should handle complex objects without manual transformation

### ValueType Implementation

```rust
enum ValueType {
    // Other existing variants...
    Struct(Box<dyn Any + Send + Sync>),
    Bytes(Vec<u8>, String), // (serialized data, type_name for debugging)
}

impl ValueType {
    // Wrap any struct in ValueType
    pub fn from<T: 'static + Send + Sync>(value: T) -> Self {
        ValueType::Struct(Box::new(value))
    }
    
    // Convert to bytes for network transmission
    pub fn to_bytes<T: Serialize + 'static>(&self) -> Result<Vec<u8>> {
        match self {
            ValueType::Struct(boxed) => {
                if let Some(typed_value) = boxed.downcast_ref::<T>() {
                    // Serialize the specific type
                    bincode::serialize(typed_value)
                        .map_err(|e| anyhow!("Serialization error: {}", e))
                } else {
                    Err(anyhow!("Cannot serialize: incorrect type"))
                }
            },
            // Handle other variants...
            _ => Err(anyhow!("Cannot serialize this ValueType variant"))
        }
    }
    
    // Create ValueType from bytes (after network)
    pub fn from_bytes(bytes: Vec<u8>, type_name: &str) -> Self {
        ValueType::Bytes(bytes, type_name.to_string())
    }
    
    // Deserialize to specific type (when consumer knows the type)
    pub fn as<T: DeserializeOwned + 'static>(&self) -> Result<T> {
        match self {
            ValueType::Struct(boxed) => {
                // First try direct downcast if it's already the right type
                if let Some(value) = boxed.downcast_ref::<T>() {
                    // Clone is needed since we're returning a new instance
                    return Ok(value.clone());
                }
                Err(anyhow!("ValueType doesn't contain the expected type"))
            },
            ValueType::Bytes(bytes, _) => {
                // Type T is used implicitly here through Rust's type inference
                bincode::deserialize(bytes)
                    .map_err(|e| anyhow!("Deserialization error: {}", e))
            },
            // Handle other variants that might be convertible
            _ => Err(anyhow!("Cannot convert this ValueType to the requested type"))
        }
    }
}
```

## Connection Handling

The connection handling process needs to be updated:

1. During discovery, exchange only PeerInfo (public key and addresses)
2. During connection handshake, exchange full NodeInfo with capabilities 
3. In handle_incoming_connection, extract NodeInfo using the type-directed approach:

```rust
async fn handle_incoming_connection(...) {
    // Existing code...
    
    if let Some(value) = message.payloads.get(0) {
        // Type-directed conversion to NodeInfo
        if let Ok(node_info) = value.as::<NodeInfo>() {
            // Use node_info with full type information
            // Store capabilities, etc.
        }
    }
    
    // Continue with connection handling...
}
```

## Implementation Steps

1. Update ValueType with the new variants and methods
2. Change DiscoveryMessage to PeerInfo and update all references
3. Modify the handshake protocol to include NodeInfo
4. Update connection handling to properly extract typed information
5. Add tests to verify correct functioning

This approach ensures:
1. We maintain type safety throughout the system
2. Serialization is efficient and happens only when necessary
3. The original types can be recovered on the receiving side
4. No complex type registry is needed
5. The code follows a clear, direct flow from original type to network and back


