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

2.5 - Anotate the gebneratd Proto structs with  the proper macro for protobufer to map each field to the sceham. so protobudfdfer works as expected in rust..

3 - Generate a build.ts that auaomted the protofbuff parts. so the types and schema can be properly used.
create a test that proves that it works
the test should show the serialization using protobuffer structs and deserialization (NOT BINCODE)

4 - change the seriaqlization from bincode to use the new components generated in the previous steps.
create a test that proves that it works

## Lazy `ArcValue` – dual-view requirements

The serializer layer **MUST** support both of the following access patterns for the *same* on-wire byte buffer wrapped in an `ArcValue`:

1. **Plain-Struct View (business-logic path)**
   • Caller asks for the original Rust struct `T` (e.g. `UserProfile`).<br/>
   • If the `ArcValue` already holds an in-memory instance of `T` the call return  `&T`. (NO CLONE)
   • If the `ArcValue` is lazy:
     1.   Deserialize bytes into `EncryptedT` using prost.
     2.   Decrypt the label groups that the current context (keystore + label-resolver) can decrypt.
     3.   Produce a new `T` with the accessible fields filled, others left default/empty.

2. **Encrypted-Struct View (storage path)**
   • Caller asks for `EncryptedT` (naming convention: `Encrypted<Original>`).<br/>
   • If the `ArcValue` already holds an in-memory plaintext `T` **this is an error**: we cannot invent an encrypted form that never existed.
   • If the `ArcValue` is lazy, simply deserialize the bytes into `EncryptedT` and return it **without decrypting anything**.

### Header / type-name convention

• The serialization header continues to store the **plaintext type name** (`T`). This keeps the common “give me a `T`” fast path simple.<br/>
• When a caller requests `EncryptedT`, the registry derives the encrypted type name from the header by prefix rule (`Encrypted + last_segment(type_name)`) and attempts to deserialize accordingly.

### Error matrix

| ArcValue holds | Request type | Result |
|---------------|-------------|--------|
| in-memory **T** | **T** | success (clone) |
| in-memory **T** | **EncryptedT** | ❌ error: cannot manufacture encrypted variant |
| lazy bytes | **T** | success (deserialize→decrypt) |
| lazy bytes | **EncryptedT** | success (deserialize only) |

Unit and integration tests **MUST** cover all four cells above.

These rules supersede earlier notes; refer back here if behaviour questions arise during implementation.
