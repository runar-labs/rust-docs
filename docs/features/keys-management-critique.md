# Critical Analysis: Runar Key Management Specification

*Analysis Date: 2025-06-12*

## Executive Summary

The current key management design is overly complex, lacks concrete implementation details, and has several security and practical concerns. While attempting to be comprehensive, it creates unnecessary complexity that will lead to implementation errors and poor user experience.

---

## Major Issues & Improvements

### 1. **Over-Engineering of Key Hierarchy**

**Problem**: The design derives 4+ different key types from a single master key using HD paths. This is unnecessary complexity for a P2P system.

**Issues**:
- Profile keys, network keys, and node keys could overlap in functionality
- HD path notation (`m/44'/0'/profile'`) is Bitcoin-specific and adds no value here
- No clear justification for why these need separate derivation paths

**Better Solution**:
```
Master Key (Ed25519)
├── Identity Key (Ed25519) - User identity across all networks
└── Device Key (Ed25519) - Per-device, rotatable
    └── Network Session Keys (X25519) - Ephemeral per network connection
```

Simplify to 2-3 key types maximum. Use simple HKDF with domain separation instead of HD paths.

### 2. **Encryption Modes Table is Confusing**

**Problem**: The encryption modes table mixes implementation details with high-level concepts, making it hard to understand what's actually being encrypted and why.

**Issues**:
- "User → System shared" is vague - what system? 
- Mixing static-static DH with sealed boxes adds complexity
- No clear threat model for each encryption type

**Better Solution**:
Define clear data categories:
1. **Personal Data**: User's private data → Use secret box (symmetric)
2. **Direct Messages**: User to user → Use sealed box (asymmetric)  
3. **Network Data**: Gossip, DHT → Use network-wide symmetric key with rotation
4. **Local Storage**: SQLite, cache → Use device key derived symmetric key

### 3. **Epoch Rotation is Half-Baked**

**Problem**: The epoch rotation mechanism is poorly specified and mixes concerns.

**Issues**:
- "GLOBAL_EPOCH per network" - who maintains this? How is consensus achieved?
- Mixing epoch rotation with TTL-based expiry creates two competing systems
- No clear key rotation schedule or trigger conditions
- Cache management ("last N epochs") is hand-wavy

**Better Solution**:
Use time-based symmetric key rotation:
```rust
// Derive key for current time window
fn get_network_key(network_id: &[u8], timestamp: u64) -> Key {
    let time_window = timestamp / (24 * 3600); // Daily rotation
    hkdf(master_key, &[network_id, &time_window.to_le_bytes()])
}
```

Keep it simple: time-based windows, no consensus required.

### 4. **QUIC Transport Security Models are Redundant**

**Problem**: Presenting two models (A and B) without choosing creates implementation confusion.

**Issues**:
- Model A creates O(n²) connections which won't scale
- Model B's "in-stream proof" is undefined
- QUIC already has TLS - why add another layer?

**Better Solution**:
Use QUIC's existing security:
- One QUIC connection per peer
- Use ALPN to negotiate network contexts
- Access tokens in the first stream frame
- Let QUIC handle the crypto

### 5. **Access Token Design is Underspecified**

**Problem**: Access tokens are mentioned but lack critical details.

**Missing**:
- Token format (JWT? Custom?)
- Revocation mechanism
- Storage requirements
- Verification performance

**Better Solution**:
```rust
struct AccessToken {
    version: u8,
    network_id: [u8; 32],
    issuer_id: [u8; 32],
    subject_id: [u8; 32],
    capabilities: u64,    // Bitmap for fast checks
    issued_at: u64,
    expires_at: u64,
    signature: [u8; 64],
}
```

Use fixed-size binary format for performance. Include bloom filter for revocation.

### 6. **Key Storage & Protection Completely Missing**

**Critical Gap**: No mention of how keys are actually stored and protected.

**Missing**:
- Platform-specific secure storage (iOS Keychain, Android Keystore)
- Key encryption at rest
- Memory protection (mlock, secure zeroing)
- Key backup/recovery UX

**Better Solution**:
Define platform-specific implementations:
```rust
trait SecureKeyStorage {
    fn store_master_key(&self, key: &SecretKey) -> Result<()>;
    fn retrieve_master_key(&self) -> Result<SecretKey>;
    fn delete_all_keys(&self) -> Result<()>;
}

// Platform implementations
struct IosKeychainStorage { ... }
struct AndroidKeystoreStorage { ... }
struct DesktopStorage { ... } // Using OS key management APIs
```

### 7. **No Performance Considerations**

**Problem**: Design ignores real-world performance constraints.

**Issues**:
- Key derivation on every operation is expensive
- No caching strategy
- Signature verification bottlenecks not addressed

**Better Solution**:
- Cache derived keys with TTL
- Batch signature verification
- Use symmetric crypto for high-frequency operations
- Benchmark targets: <1ms for key derivation, <10μs for symmetric ops

### 8. **Security Theater with "Clamp"**

**Problem**: Mentions "X25519 Clamp" as if it's a security feature.

**Reality**: Clamping is a required step in X25519, not an optional security enhancement. This suggests shallow understanding.

**Fix**: Just use a proper crypto library that handles this automatically.

---

## Recommended Architecture

### Simplified Key Hierarchy
```
User Identity (Ed25519)
├── Backup Seed (BIP39 mnemonic)
├── Device Keys (Ed25519, per device)
│   ├── Storage Key (ChaCha20)
│   └── Transport Keys (X25519, ephemeral)
└── Network Memberships
    └── Access Tokens (signed by network owner)
```

### Clear Separation of Concerns
1. **Identity**: Long-term user identity (rarely used)
2. **Device**: Per-device keys (rotatable without losing identity)
3. **Session**: Ephemeral keys for connections
4. **Storage**: Symmetric keys for local encryption

### Implementation Priorities
1. Get basic Ed25519 signing working
2. Add device key generation and storage
3. Implement access token creation/verification
4. Add network session key negotiation
5. Layer in advanced features only if needed

---

## What's Actually Good

To be fair, a few things are on the right track:
- Using Ed25519/X25519 is correct
- Separating signing from encryption keys
- Considering mobile vs desktop differences
- Thinking about forward secrecy

But these good ideas are buried under unnecessary complexity.

---

## Action Items

1. **Simplify the design** to 2-3 key types maximum
2. **Choose one approach** for each problem (not multiple "models")
3. **Add implementation details** for key storage and protection
4. **Define clear performance targets**
5. **Write example code** showing how keys are actually used
6. **Create a threat model** to justify security decisions
7. **Test with a POC** before committing to HD derivation

---

## Conclusion

The current design suffers from "architecture astronaut" syndrome - it's trying to solve every possible future problem while ignoring immediate practical concerns. A P2P system needs simple, fast, and reliable key management - not a complex hierarchy that will confuse developers and create bugs.

Start simple. You can always add complexity later if genuinely needed.
