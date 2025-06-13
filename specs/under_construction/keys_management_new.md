# Keys Management – New Implementation Plan

Status: **Draft – awaiting validation**

## Motivation
The existing `runar-keys/POC_1` code is incomplete and diverges from the authoritative specification in `rust-docs/markdown/features/keys-management.md`.  We will replace it with a clean, idiomatic Rust implementation that fully respects the documented intentions and architectural boundaries.

## Scope
1. Provide a production-ready `runar-keys` crate implementing:
   * Key ​types: **UserMasterKey, UserProfileKey (PeerId), NetworkKey, QuicKey, NodeKey, NetworkId**
   * HD derivation helpers for all required paths
   * Symmetric-encryption helpers for NodeKey data at rest; all other encryption uses public-key encryption (encrypt with public key, decrypt with private key).
   * Ephemeral *shared keys* (user↔node, user↔network) with expiration metadata
   * Access-token issuance & verification exactly as specced
2. Comprehensive unit tests covering **all scenarios** described in the spec, including encryption / decryption, token lifecycle, key derivation correctness, and error cases.
3. Removal of `runar-keys/POC_1` after replacement is stable.

## Architectural Principles Respected
* Documentation-first → this plan precedes code changes.
* Single primary constructor `new()` with optional builder `with_…` methods.
* No backwards compatibility with POC_1; all call-sites will be updated.
* No thread-local storage; keys are passed explicitly.
* All public APIs live under `runar-keys/src`, organised per module below.

## Proposed Module Layout
```
runar-keys/src/
 ├── lib.rs              // Re-exports & facade
 ├── error.rs            // KeyError enum
 ├── types.rs            // All structs & basic impls (UserMasterKey, …)
 ├── hd.rs               // HD derivation helpers
 ├── encryption.rs       // AES-GCM helpers + shared-key logic
 ├── access_token.rs     // AccessToken + Capability
 └── manager.rs          // KeyManager (in-memory) – optional
```
Each module will have a *clear doc-comment* stating its intention and contract.

## HD Derivation Paths
| Key            | Path Format                     | Notes |
|----------------|---------------------------------|-------|
| NetworkKey     | `m/44'/0'/<network>'`           | `<network>` = u32 index |
| QuicKey        | `m/44'/0'/<network>'/1`         | deterministic per network |
| NodeKey        | `m/44'/0'/<node>'`              | `<node>` = u32 index |
| UserProfileKey | `m/44'/1'/<profile>'`           | multiple profiles |

(Exact paths lifted from the spec; we will encode them via `ed25519_hd_key::DerivationPath`.)

## Encryption Model

The system employs two complementary encryption schemes:

1. **Node Data (at rest)** – encrypted with a *symmetric* key derived from the local `NodeKey` (AES-GCM-256).
2. **User & Network Data (in transit / shared)** – encrypted with the **receiver's public key** and decrypted with the matching private key, e.g. the user encrypts with `NetworkKey` public component, network decrypts with its private component.
3. When Runar runtime components need to access user-owned data they must rely on *Shared Keys* negotiated by the user:
   * `NodeSharedKey` – derived from **UserProfileKey × NodeKey** (ECDH + HKDF).
   * `NetworkSharedKey` – derived from **UserProfileKey × NetworkKey** (ECDH + HKDF).

Shared keys contain an `expires_at` unix timestamp and must be renewed proactively by the client or an automated policy.

## Encryption API
```rust
/// Derive a 256-bit AES key via HKDF-SHA256 from the given Ed25519 secret.
pub fn derive_symmetric_key(secret: &SigningKey, context: &[u8]) -> [u8; 32];

/// Encrypt plaintext with optional AAD. Returns (ciphertext, nonce)
pub fn encrypt(key: &[u8; 32], plaintext: &[u8], aad: Option<&[u8]>) -> Result<(Vec<u8>, [u8; 12])>;

/// Decrypt ciphertext with nonce & optional AAD
pub fn decrypt(key: &[u8; 32], ciphertext: &[u8], nonce: &[u8; 12], aad: Option<&[u8]>) -> Result<Vec<u8>>;
```
Shared-key derivation (EC Diffie-Hellman style) will combine the user-profile private key and the node/network public key, then HKDF the result.

## Shared Keys
```rust
pub struct SharedKey {
    key: [u8; 32],
    expires_at: Option<u64>, // unix ts
    // type marker could distinguish NodeSharedKey / NetworkSharedKey
}
```
Helpers to `renew_if_expired()` etc.

## Tests Plan
1. **Key Generation & Derivation**
   * Deterministic derivation matches expected vectors
2. **Encryption / Decryption**
   * NodeKey encrypts → NodeKey decrypts (positive)
   * Wrong key fails (negative)
   * AAD mismatch fails
3. **Shared Keys**
   * User ↔ Node shared key symmetry
   * Expiration logic
4. **Access Tokens**
   * Issuance, verification, expiration, capability checks
5. **Storage Round-Trips** (serde round-trip of each public type)

## Migration / Cleanup Steps
1. **Implement new modules** in `src/` alongside POC_1 temporarily.
2. Update `lib.rs` re-exports.
3. Migrate tests to `runar-keys/tests/…`.
4. Delete `runar-keys/POC_1` once all tests pass and dependants compile.

## Timeline Estimate
* Day 0-1  : Implement core `types.rs`, `error.rs`, unit tests
* Day 2    : `hd.rs` derivation & tests
* Day 3    : `encryption.rs` (+ shared keys) & tests
* Day 4    : `access_token.rs` implementation & tests
* Day 5    : Integrate `KeyManager`, update dependants, delete POC_1

## Open Questions
* Confirm exact HD paths for **QuicKey**. `PeerId` is now defined as the public key of `UserProfileKey`, so no separate PeerKey is required.
* Should `KeyManager` persist keys or stay memory-only?  (Current plan: memory-only; future storage abstraction TBD.)

---
**Please review this plan.** On approval, I will update the documentation where needed, create the new test skeletons, and implement the code accordingly.
