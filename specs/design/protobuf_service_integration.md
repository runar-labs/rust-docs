# Protocol Buffers Integration in Runar Serializer

## Overview

This document describes the Protocol Buffers integration for the Runar Serializer system. **The goal is to replace bincode serialization with protobuf while preserving all existing encryption functionalit and ArcValue functionality (Lazy deserializatio and etc**. This approach leverages the existing `runar-serializer` and `runar-serializer-macros` infrastructure.

## Current Architecture Analysis

### Existing Serialization Flow
```
Rust Struct → ArcValue → SerializerRegistry → Bincode → Network/Storage
```

### Current Encryption Flow
```
Rust Struct → #[derive(Encrypt)] → EncryptedStruct → Bincode → Network/Storage
```

GOAL:
```
Rust Struct → ArcValue → SerializerRegistry → Protobuffer → Network/Storage
```

```
Rust Struct → #[derive(Encrypt)] → EncryptedStruct → Protobuffer → Network/Storage
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
- `UserProfileProto` struct (protobuf equivalent) - Not sure if we need this.. if we never serializat this one. skip it for now.. until we now for sure we needed it. 
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

## Implementation Strategy ##
 1 - Change the macros Encrypt to generate the Proto entities.
 create a test that proves that it works. that all expected Proto structs are genrate and works as expected.

 2 - generate the Protobuf Schema 
create a test that proves that it works

3 - Generate a build.ts that auaomted the protofbuff parts. so the types and schema can be properly used.
create a test that proves that it works

4 - change the seriaqlization from bincode to use the new components generated in the previous steps.
create a test that proves that it works
