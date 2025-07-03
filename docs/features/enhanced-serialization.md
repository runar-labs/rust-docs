# Enhanced Serialization with Selective Field Encryption

This document describes the enhanced serialization system in Runar that provides selective field encryption with label-based key resolution.

## Table of Contents

1. [Overview](#overview)
2. [Selective Field Encryption](#selective-field-encryption)
3. [Label-Based Key Resolution](#label-based-key-resolution)
4. [Encryption Groups](#encryption-groups)
5. [API Reference](#api-reference)
6. [Usage Examples](#usage-examples)
7. [Integration with Key Management](#integration-with-key-management)

## Overview

The `runar-serializer` provides enhanced serialization capabilities that go beyond simple data serialization. It enables:

- **Selective Field Encryption**: Encrypt specific fields while leaving others in plaintext
- **Label-Based Key Resolution**: Map field labels to cryptographic keys
- **Multi-Recipient Access Control**: Different entities can access different fields
- **Envelope Encryption Integration**: Leverages the envelope encryption system
- **Type-Safe Serialization**: Maintains type safety throughout the encryption process

## Selective Field Encryption

### Field Annotation

Fields can be annotated with labels that determine their encryption behavior:

```rust
#[derive(Encrypt, serde::Serialize, serde::Deserialize, Debug, PartialEq, Clone)]
pub struct TestProfile {
    pub id: String,                    // Always in plaintext (no annotation)
    #[runar(user, system, search)]
    pub name: String,                  // Encrypted with user, system, and search keys
    #[runar(user, system, search)]
    pub email: String,                 // Encrypted with user, system, and search keys
    #[runar(user)]
    pub user_private: String,          // Encrypted with user key only
    #[runar(user, system, search)]
    pub created_at: u64,               // Encrypted with user, system, and search keys
}
```

### Label Semantics

- **No Annotation**: Field remains in plaintext
- **Single Label**: Field encrypted with one key type
- **Multiple Labels**: Field encrypted with multiple key types for different access patterns

### Common Label Patterns

| Label | Purpose | Access Control |
|-------|---------|----------------|
| `user` | User-specific data | Mobile device with profile key |
| `system` | System-wide data | Nodes with network key |
| `search` | Searchable data | Nodes with network key for indexing |
| `admin` | Administrative data | Admin nodes only |
| `public` | Public data | No encryption (for compatibility) |

## Label-Based Key Resolution

### Key Mapping Configuration

Labels are resolved to cryptographic keys through a configurable resolver:

```rust
use runar_serializer::traits::{KeyScope, LabelKeyInfo};

let mobile_label_config = KeyMappingConfig {
    label_mappings: HashMap::from([
        (
            "user".to_string(),
            LabelKeyInfo {
                public_key: profile_pk.clone(),
                scope: KeyScope::Profile,
            },
        ),
        (
            "system".to_string(),
            LabelKeyInfo {
                public_key: network_pub.clone(),
                scope: KeyScope::Network,
            },
        ),
        (
            "search".to_string(),
            LabelKeyInfo {
                public_key: network_pub.clone(),
                scope: KeyScope::Network,
            },
        ),
    ]),
};
```

### Key Scope Types

- **Profile**: Keys derived from user profile (mobile device)
- **Network**: Keys shared across network nodes
- **Node**: Keys specific to a single node
- **System**: Keys for system-wide operations

### Resolver Implementation

```rust
pub trait LabelResolver {
    fn resolve_label(&self, label: &str) -> Result<Option<Vec<u8>>>;
    fn resolve_label_info(&self, label: &str) -> Result<Option<LabelKeyInfo>>;
    fn can_resolve(&self, label: &str) -> bool;
    fn available_labels(&self) -> Vec<String>;
}
```

## Encryption Groups

### Group Structure

Fields with the same labels are grouped and encrypted together:

```rust
pub struct EncryptedLabelGroup {
    pub label: String,                    // The label this group was encrypted with
    pub envelope: EnvelopeEncryptedData,  // Envelope-encrypted payload
}
```

### Group Formation

1. **Field Analysis**: Analyze struct fields for label annotations
2. **Grouping**: Group fields by their labels
3. **Serialization**: Serialize each group into a separate structure
4. **Encryption**: Encrypt each group using envelope encryption

### Generated Structures

For the `TestProfile` example, the following structures are generated:

```rust
// Plaintext structure (no encryption)
pub struct TestProfilePlaintext {
    pub id: String,
}

// User-encrypted structure
pub struct TestProfileUserFields {
    pub name: String,
    pub email: String,
    pub user_private: String,
    pub created_at: u64,
}

// System-encrypted structure
pub struct TestProfileSystemFields {
    pub name: String,
    pub email: String,
    pub created_at: u64,
}

// Search-encrypted structure
pub struct TestProfileSearchFields {
    pub name: String,
    pub email: String,
    pub created_at: u64,
}

// Encrypted structure
pub struct EncryptedTestProfile {
    pub id: String,                           // Plaintext
    pub user_encrypted: Option<EncryptedLabelGroup>,
    pub system_encrypted: Option<EncryptedLabelGroup>,
    pub search_encrypted: Option<EncryptedLabelGroup>,
}
```

## API Reference

### Serializer Registry

```rust
pub struct SerializerRegistry {
    // Create registry with keystore and label resolver
    pub fn with_keystore(
        logger: Arc<Logger>,
        keystore: Arc<dyn KeyStore>,
        resolver: Arc<dyn LabelResolver>,
    ) -> Self;
    
    // Register encryptable types
    pub fn register_encryptable<T: Encrypt + 'static>(&mut self) -> Result<()>;
    
    // Register plain types (no encryption)
    pub fn register<T: 'static>(&mut self) -> Result<()>;
    
    // Serialize with encryption
    pub fn serialize_value(&self, value: &ArcValue) -> Result<Vec<u8>>;
    
    // Deserialize with decryption
    pub fn deserialize_value(&self, data: Vec<u8>) -> Result<ArcValue>;
    
    // Decrypt label group
    pub fn decrypt_label_group<T: for<'de> Deserialize<'de>>(&self, group: &EncryptedLabelGroup) -> Result<T>;
}
```

### Encryption Functions

```rust
// Encrypt a group of fields that share the same label
pub fn encrypt_label_group<T: Serialize>(
    label: &str,
    fields_struct: &T,
    keystore: &KeyStore,
    resolver: &dyn LabelResolver,
) -> Result<EncryptedLabelGroup>;

// Decrypt a label group back into its original struct
pub fn decrypt_label_group<T: for<'de> Deserialize<'de>>(
    encrypted_group: &EncryptedLabelGroup,
    keystore: &KeyStore,
) -> Result<T>;
```

### Traits

```rust
// Mark a type as encryptable
pub trait Encrypt {
    // This trait is automatically implemented by the derive macro
}

// Key store interface
pub trait KeyStore {
    fn encrypt_with_envelope(
        &self,
        data: &[u8],
        network_id: &str,
        profile_ids: Vec<String>,
    ) -> Result<EnvelopeEncryptedData>;
    
    fn decrypt_envelope_data(&self, envelope: &EnvelopeEncryptedData) -> Result<Vec<u8>>;
}

// Label resolver interface
pub trait LabelResolver {
    fn resolve_label(&self, label: &str) -> Result<Option<Vec<u8>>>;
    fn resolve_label_info(&self, label: &str) -> Result<Option<LabelKeyInfo>>;
    fn can_resolve(&self, label: &str) -> bool;
    fn available_labels(&self) -> Vec<String>;
}
```

## Usage Examples

### Basic Usage

```rust
use runar_serializer::*;
use runar_common::types::ArcValue;

// Define an encryptable struct
#[derive(Encrypt, serde::Serialize, serde::Deserialize, Debug, PartialEq, Clone)]
pub struct UserProfile {
    pub id: String,
    #[runar(user, system)]
    pub name: String,
    #[runar(user)]
    pub private_notes: String,
    #[runar(system)]
    pub public_info: String,
}

// Create serializer registry
let mut registry = SerializerRegistry::with_keystore(
    logger.clone(),
    keystore.clone(),
    Arc::new(resolver),
);

// Register the type
registry.register_encryptable::<UserProfile>()?;

// Create data
let profile = UserProfile {
    id: "user123".to_string(),
    name: "Alice".to_string(),
    private_notes: "Secret notes".to_string(),
    public_info: "Public information".to_string(),
};

// Serialize with encryption
let arc_value = ArcValue::from_struct(profile.clone());
let serialized = registry.serialize_value(&arc_value)?;

// Deserialize with decryption
let deserialized = registry.deserialize_value(serialized)?;
let roundtrip_profile = deserialized.as_struct_ref::<UserProfile>()?;
assert_eq!(&*roundtrip_profile, &profile);
```

### Access Control Example

```rust
// Mobile side - can decrypt user and system fields
let mobile_registry = SerializerRegistry::with_keystore(
    logger.clone(),
    mobile_keystore.clone(),
    Arc::new(mobile_resolver),
);

let mobile_profile = mobile_registry.deserialize_value(serialized.clone())?;
let mobile_data = mobile_profile.as_struct_ref::<UserProfile>()?;
assert_eq!(mobile_data.name, "Alice");           // ✅ Can decrypt
assert_eq!(mobile_data.private_notes, "Secret notes"); // ✅ Can decrypt
assert_eq!(mobile_data.public_info, "Public information"); // ✅ Can decrypt

// Node side - can only decrypt system fields
let node_registry = SerializerRegistry::with_keystore(
    logger.clone(),
    node_keystore.clone(),
    Arc::new(node_resolver),
);

let node_profile = node_registry.deserialize_value(serialized)?;
let node_data = node_profile.as_struct_ref::<UserProfile>()?;
assert_eq!(node_data.name, "Alice");             // ✅ Can decrypt (system label)
assert_eq!(node_data.private_notes, "");         // ❌ Cannot decrypt (user only)
assert_eq!(node_data.public_info, "Public information"); // ✅ Can decrypt
```

### Advanced Usage with Generated Structures

```rust
// Access the encrypted structure directly
let encrypted_profile = deserialized.as_struct_ref::<EncryptedUserProfile>()?;

// Check which groups are available
if let Some(user_group) = &encrypted_profile.user_encrypted {
    // Decrypt user-specific fields
    let user_fields: UserProfileUserFields = registry.decrypt_label_group(user_group)?;
    println!("User fields: {:?}", user_fields);
}

if let Some(system_group) = &encrypted_profile.system_encrypted {
    // Decrypt system fields
    let system_fields: UserProfileSystemFields = registry.decrypt_label_group(system_group)?;
    println!("System fields: {:?}", system_fields);
}
```

## Integration with Key Management

### Mobile Integration

```rust
use runar_keys::mobile::MobileKeyManager;

// Create mobile key manager
let mut mobile = MobileKeyManager::new(logger)?;
mobile.initialize_user_root_key()?;

// Derive profile key
let profile_pk = mobile.derive_user_profile_key("user")?;

// Create label resolver
let mobile_resolver = ConfigurableLabelResolver::new(KeyMappingConfig {
    label_mappings: HashMap::from([
        ("user".to_string(), LabelKeyInfo {
            public_key: profile_pk,
            scope: KeyScope::Profile,
        }),
    ]),
});

// Create serializer registry
let registry = SerializerRegistry::with_keystore(
    logger,
    Arc::new(mobile),
    Arc::new(mobile_resolver),
);
```

### Node Integration

```rust
use runar_keys::node::NodeKeyManager;

// Create node key manager
let mut node = NodeKeyManager::new(logger)?;

// Install network key from mobile
node.install_network_key(network_key_message)?;

// Create label resolver
let node_resolver = ConfigurableLabelResolver::new(KeyMappingConfig {
    label_mappings: HashMap::from([
        ("system".to_string(), LabelKeyInfo {
            public_key: network_pub,
            scope: KeyScope::Network,
        }),
    ]),
});

// Create serializer registry
let registry = SerializerRegistry::with_keystore(
    logger,
    Arc::new(node),
    Arc::new(node_resolver),
);
```

### Cross-Device Data Sharing

```rust
// Mobile encrypts data for sharing
let profile = UserProfile { /* ... */ };
let arc_value = ArcValue::from_struct(profile);
let serialized = mobile_registry.serialize_value(&arc_value)?;

// Node can decrypt system fields
let node_profile = node_registry.deserialize_value(serialized)?;
let node_data = node_profile.as_struct_ref::<UserProfile>()?;

// Mobile can decrypt all fields
let mobile_profile = mobile_registry.deserialize_value(serialized)?;
let mobile_data = mobile_profile.as_struct_ref::<UserProfile>()?;
```

## Best Practices

### Label Design

1. **Use Semantic Labels**: Choose labels that reflect the data's purpose
2. **Minimize Labels**: Use the fewest labels necessary for access control
3. **Consistent Naming**: Use consistent label names across your application
4. **Document Labels**: Document what each label means and who can access it

### Performance Considerations

1. **Group Similar Fields**: Fields with the same labels are encrypted together
2. **Avoid Over-Encryption**: Don't encrypt fields that don't need protection
3. **Cache Resolvers**: Reuse label resolvers when possible
4. **Batch Operations**: Process multiple objects together when possible

### Security Considerations

1. **Key Management**: Ensure keys are properly managed and rotated
2. **Access Control**: Verify that label resolvers provide appropriate access
3. **Audit Trail**: Log encryption/decryption operations for security auditing
4. **Key Separation**: Use different keys for different purposes

---

*This documentation reflects the current implementation as of the latest release. For implementation details, see the tests in `runar-serializer/src/tests.rs`.* 