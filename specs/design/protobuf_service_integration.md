# Protocol Buffers Integration in Runar Serializer

## Overview

This document describes the Protocol Buffers integration for the Runar Serializer system. **The goal is to replace bincode serialization with protobuf while preserving all existing encryption functionality**. This approach leverages the existing `runar-serializer` and `runar-serializer-macros` infrastructure rather than modifying service macros.

## Current Architecture Analysis

### Existing Serialization Flow
```
Rust Struct → ArcValue → SerializerRegistry → Bincode → Network/Storage
```

### Current Encryption Flow
```
Rust Struct → #[derive(Encrypt)] → EncryptedStruct → Bincode → Network/Storage
```

### Key Components

1. **runar-serializer**: Core serialization crate with `SerializerRegistry`
2. **runar-serializer-macros**: Derive macros for encryption (`#[derive(Encrypt)]`)
3. **ArcValue**: Lazy deserialization container from `runar-common`
4. **Encryption**: Label-based field encryption using `runar-keys`

### Current Macro System
```rust
#[derive(Encrypt, serde::Serialize, serde::Deserialize, Debug, PartialEq, Clone)]
pub struct UserProfile {
    pub id: String,
    #[runar(user, system, search)]
    pub name: String,
    #[runar(user, system, search)]
    pub email: String,
    #[runar(user)]
    pub user_private: String,
    pub created_at: u64,
}
```

**Generated:**
- `EncryptedUserProfile` struct
- `UserProfileUserFields` substruct
- `UserProfileSystemFields` substruct
- `UserProfileSearchFields` substruct
- `From<UserProfile> for EncryptedUserProfile`
- `From<EncryptedUserProfile> for UserProfile`

## New Protobuf Integration Design

### Core Design Principle
```
Local Operations: Rust Types ↔ ArcValue (no serialization)
Network/Storage: Rust Types ↔ ArcValue ↔ Protobuf ↔ Serialized Bytes
Encryption: Preserved at the protobuf level
```

### Enhanced Encrypt Macro
```rust
#[derive(Encrypt, serde::Serialize, serde::Deserialize, Debug, PartialEq, Clone)]
pub struct UserProfile {
    pub id: String,
    #[runar(user, system, search)]
    pub name: String,
    #[runar(user, system, search)]
    pub email: String,
    #[runar(user)]
    pub user_private: String,
    pub created_at: u64,
}
```

**Generated:**
- `UserProfileProto` struct (protobuf equivalent)
- `EncryptedUserProfile` struct (existing encryption)
- `EncryptedUserProfileProto` struct (encrypted protobuf)
- All existing encryption substructs (`UserProfileUserFields`, etc.)
- All protobuf substructs (`UserProfileUserFieldsProto`, etc.)
- `From<UserProfile> for UserProfileProto`
- `From<UserProfileProto> for UserProfile`
- `From<EncryptedUserProfile> for EncryptedUserProfileProto`
- `From<EncryptedUserProfileProto> for EncryptedUserProfile`
- `From<UserProfile> for EncryptedUserProfile` (existing)
- `From<EncryptedUserProfile> for UserProfile` (existing)

### Generated Protobuf Schema
```protobuf
// Generated: user_profile.proto
syntax = "proto3";

package runar_serializer.user_profile;

// Plain protobuf version
message UserProfileProto {
  string id = 1;
  string name = 2;
  string email = 3;
  string user_private = 4;
  uint64 created_at = 5;
}

// Encrypted protobuf version
message EncryptedUserProfileProto {
  string id = 1;  // Plaintext field
  uint64 created_at = 2;  // Plaintext field
  
  // Encrypted label groups
  bytes user_encrypted = 3;
  bytes system_encrypted = 4;
  bytes search_encrypted = 5;
}

// Label group substructs (for encryption)
message UserProfileUserFieldsProto {
  string name = 1;
  string email = 2;
  string user_private = 3;
}

message UserProfileSystemFieldsProto {
  string name = 1;
  string email = 2;
}

message UserProfileSearchFieldsProto {
  string name = 1;
  string email = 2;
}
```

## Implementation Strategy

### Phase 1: Enhance Existing Encrypt Macro

#### Enhanced Macro: `#[derive(Encrypt)]`
```rust
// runar-serializer-macros/src/lib.rs
#[proc_macro_derive(Encrypt, attributes(runar))]
pub fn derive_encrypt(input: TokenStream) -> TokenStream {
    // 1. Parse struct definition
    // 2. Generate existing encryption components:
    //    - EncryptedStruct
    //    - Label substructs
    //    - From implementations
    // 3. Generate new protobuf components:
    //    - StructProto
    //    - EncryptedStructProto
    //    - Proto label substructs
    //    - Proto From implementations
    // 4. Generate protobuf schema file
    // 5. Generate build.rs integration
}
```

#### Generated Rust Types
```rust
// Generated in user_profile_pb.rs
use prost::Message;

#[derive(Clone, Message, Debug, PartialEq)]
pub struct UserProfileProto {
    #[prost(string, tag = "1")]
    pub id: String,
    #[prost(string, tag = "2")]
    pub name: String,
    #[prost(string, tag = "3")]
    pub email: String,
    #[prost(string, tag = "4")]
    pub user_private: String,
    #[prost(uint64, tag = "5")]
    pub created_at: u64,
}

// Conversion implementations
impl From<UserProfile> for UserProfileProto {
    fn from(original: UserProfile) -> Self {
        UserProfileProto {
            id: original.id,
            name: original.name,
            email: original.email,
            user_private: original.user_private,
            created_at: original.created_at,
        }
    }
}

impl From<UserProfileProto> for UserProfile {
    fn from(proto: UserProfileProto) -> Self {
        UserProfile {
            id: proto.id,
            name: proto.name,
            email: proto.email,
            user_private: proto.user_private,
            created_at: proto.created_at,
        }
    }
}
```

### Phase 2: Enhanced SerializerRegistry

#### New Protobuf Serialization Methods
```rust
// runar-serializer/src/registry.rs
impl SerializerRegistry {
    /// Register a type with protobuf serialization
    pub fn register_protobuf<T>(&mut self) -> Result<()>
    where
        T: 'static + ProtobufSerializable + Clone + Send + Sync,
    {
        let type_name = std::any::type_name::<T>();
        
        // Register protobuf serializer
        let serializer = Box::new(move |value: &dyn Any| -> Result<Vec<u8>> {
            if let Some(typed_value) = value.downcast_ref::<T>() {
                typed_value.to_protobuf()
            } else {
                Err(anyhow!("Type mismatch during protobuf serialization"))
            }
        });
        
        self.base_registry.register_custom_serializer(type_name, serializer)?;
        
        // Register protobuf deserializer
        let deserializer = DeserializerFnWrapper::new(move |bytes: &[u8]| -> Result<Box<dyn Any + Send + Sync>> {
            let typed_value = T::from_protobuf(bytes)?;
            Ok(Box::new(typed_value))
        });
        
        self.base_registry.register_custom_deserializer(type_name, deserializer)?;
        
        Ok(())
    }
}
```

### Phase 3: Combined Encryption + Protobuf

#### Enhanced Derive Macro
```rust
#[derive(Encrypt, Protobuf, serde::Serialize, serde::Deserialize, Debug, PartialEq, Clone)]
pub struct UserProfile {
    pub id: String,
    #[runar(user, system, search)]
    pub name: String,
    #[runar(user, system, search)]
    pub email: String,
    #[runar(user)]
    pub user_private: String,
    pub created_at: u64,
}
```

**Generated:**
1. **Plain Protobuf**: `UserProfileProto`
2. **Encrypted Struct**: `EncryptedUserProfile` (existing)
3. **Encrypted Protobuf**: `EncryptedUserProfileProto`
4. **Label Substructs**: `UserProfileUserFieldsProto`, etc.
5. **All From implementations**

#### Serialization Flow
```
UserProfile → EncryptedUserProfile → EncryptedUserProfileProto → Network/Storage
```

#### Deserialization Flow
```
Network/Storage → EncryptedUserProfileProto → EncryptedUserProfile → UserProfile
```

### Phase 4: Build System Integration

#### Auto-Generated build.rs
```rust
// Auto-generated build.rs - DO NOT EDIT
fn main() {
    tonic_build::configure()
        .build_server(false)
        .build_client(false)
        .compile(&[
            "proto/user_profile.proto",
            "proto/account_info.proto",
            "proto/billing_info.proto",
        ], &["proto"])
        .unwrap();
}
```

#### Directory Structure
```
runar-serializer/
├── src/
│   ├── lib.rs
│   ├── registry.rs
│   ├── encryption.rs
│   ├── traits.rs
│   └── protobuf.rs          # New protobuf module
├── proto/                   # Auto-generated
│   ├── user_profile.proto
│   ├── account_info.proto
│   └── billing_info.proto
├── generated/               # Auto-generated
│   ├── mod.rs
│   ├── user_profile_pb.rs
│   ├── account_info_pb.rs
│   └── billing_info_pb.rs
├── Cargo.toml
└── build.rs                # Auto-generated
```

## Detailed Implementation Plan

### Step 1: Add Protobuf Dependencies
```toml
# runar-serializer/Cargo.toml
[dependencies]
prost = "0.12"

[build-dependencies]
tonic-build = "0.10"
```

### Step 2: Create Protobuf Module
```rust
// runar-serializer/src/protobuf.rs
pub mod generated;

use anyhow::Result;
use prost::Message;

/// Trait for types that have protobuf equivalents
pub trait ProtobufConvertible {
    type Proto: Message + Default + Clone + Send + Sync;
}

/// Helper trait for protobuf serialization
pub trait ProtobufSerializable: ProtobufConvertible {
    fn to_protobuf(&self) -> Result<Vec<u8>>;
    fn from_protobuf(bytes: &[u8]) -> Result<Self>
    where
        Self: Sized;
}

impl<T> ProtobufSerializable for T
where
    T: ProtobufConvertible + Into<T::Proto> + From<T::Proto>,
{
    fn to_protobuf(&self) -> Result<Vec<u8>> {
        let proto: T::Proto = self.clone().into();
        Ok(proto.encode_to_vec())
    }
    
    fn from_protobuf(bytes: &[u8]) -> Result<Self> {
        let proto = T::Proto::decode(bytes)?;
        Ok(proto.into())
    }
}
```

### Step 3: Enhanced SerializerRegistry
```rust
// runar-serializer/src/registry.rs
impl SerializerRegistry {
    /// Register a type with protobuf serialization
    pub fn register_protobuf<T>(&mut self) -> Result<()>
    where
        T: 'static + ProtobufSerializable + Clone + Send + Sync,
    {
        let type_name = std::any::type_name::<T>();
        
        // Register protobuf serializer
        let serializer = Box::new(move |value: &dyn Any| -> Result<Vec<u8>> {
            if let Some(typed_value) = value.downcast_ref::<T>() {
                typed_value.to_protobuf()
            } else {
                Err(anyhow!("Type mismatch during protobuf serialization"))
            }
        });
        
        self.base_registry.register_custom_serializer(type_name, serializer)?;
        
        // Register protobuf deserializer
        let deserializer = DeserializerFnWrapper::new(move |bytes: &[u8]| -> Result<Box<dyn Any + Send + Sync>> {
            let typed_value = T::from_protobuf(bytes)?;
            Ok(Box::new(typed_value))
        });
        
        self.base_registry.register_custom_deserializer(type_name, deserializer)?;
        
        Ok(())
    }
}
```

### Step 4: Enhanced Macro Implementation
```rust
// runar-serializer-macros/src/lib.rs
#[proc_macro_derive(Encrypt, attributes(runar))]
pub fn derive_encrypt(input: TokenStream) -> TokenStream {
    let input = parse_macro_input!(input as DeriveInput);
    let struct_name = input.ident.clone();
    let encrypted_name = format_ident!("Encrypted{}", struct_name);
    let proto_name = format_ident!("{}Proto", struct_name);
    let encrypted_proto_name = format_ident!("Encrypted{}Proto", struct_name);
    
    // Generate existing encryption components
    let encryption_components = generate_encryption_components(&input, &struct_name, &encrypted_name);
    
    // Generate new protobuf components
    let protobuf_components = generate_protobuf_components(&input, &struct_name, &proto_name, &encrypted_proto_name);
    
    // Generate protobuf schema
    let proto_schema = generate_protobuf_schema(&input, &struct_name);
    
    // Write schema to file
    write_proto_file(&proto_schema, &struct_name.to_string());
    
    // Update build.rs
    update_build_script(&struct_name.to_string());
    
    TokenStream::from(quote! {
        // Generated encryption components (existing)
        #encryption_components
        
        // Generated protobuf components (new)
        #protobuf_components
        
        // Implement ProtobufConvertible for both plain and encrypted types
        impl runar_serializer::protobuf::ProtobufConvertible for #struct_name {
            type Proto = #proto_name;
        }
        
        impl runar_serializer::protobuf::ProtobufConvertible for #encrypted_name {
            type Proto = #encrypted_proto_name;
        }
    })
}
```

## Migration Strategy

### Phase 1: Enhance Encrypt Macro (Backward Compatible)
- Enhance existing `#[derive(Encrypt)]` macro to generate protobuf types
- Keep bincode as default serialization
- All existing code continues to work unchanged
- Protobuf types are generated but not used by default

### Phase 2: Dual Serialization Support
- Support both bincode and protobuf serialization in SerializerRegistry
- Registry can handle both formats
- Automatic format detection
- Opt-in to protobuf serialization

### Phase 3: Protobuf as Default
- Make protobuf the default serialization format
- Keep bincode for backward compatibility
- Deprecate bincode for new types
- Existing encrypted data continues to work

### Phase 4: Remove Bincode (Future)
- Remove bincode dependencies
- Clean up legacy code
- Protobuf-only serialization
- Consider renaming `Encrypt` macro to better reflect its capabilities

## Benefits of This Approach

1. **Single Macro**: Developers only need one `#[derive(Encrypt)]` macro for both encryption and protobuf
2. **Preserves Encryption**: All existing encryption functionality remains intact
3. **Leverages Existing Infrastructure**: Uses proven `runar-serializer` architecture
4. **Backward Compatible**: Existing code continues to work without changes
5. **Type Safety**: Compile-time type checking with `From` implementations
6. **Performance**: Protobuf is more efficient than bincode for network transmission
7. **Interoperability**: Protobuf enables cross-language service consumption
8. **Incremental Migration**: Can be adopted gradually without breaking changes
9. **Future-Proof**: The macro name can be renamed later to better reflect its full capabilities

## Testing Strategy

### Unit Tests
- Test protobuf struct generation
- Test From implementations
- Test serialization/deserialization round trips
- Test encryption + protobuf integration

### Integration Tests
- Test with existing encryption functionality
- Test ArcValue lazy deserialization
- Test SerializerRegistry integration
- Test build system integration

### Performance Tests
- Compare protobuf vs bincode serialization performance
- Test memory usage
- Test network transmission efficiency

## Conclusion

This approach integrates protobuf serialization into the existing `runar-serializer` architecture while preserving all encryption functionality. The implementation is backward compatible, type-safe, and can be adopted incrementally. The key insight is to treat protobuf as an alternative serialization format rather than replacing the entire serialization system.
