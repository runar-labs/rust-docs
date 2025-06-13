# Runar Key Management Specification

This specification defines how Runar generates, stores, and uses cryptographic keys to provide identity, authentication, encryption, and access control across multiple user-defined peer-to-peer networks.

---
## Table of Contents
1. [Overview](#overview)
2. [Key Classes](#key-classes)
3. [Hierarchical Derivation](#hierarchical-derivation)
4. [Encryption Modes](#encryption-modes)
5. [Epoch Rotation & Forward Secrecy](#epoch-rotation--forward-secrecy)
6. [Access Tokens](#access-tokens)
7. [QUIC Transport Security](#quic-transport-security)
8. [Security Considerations](#security-considerations)
9. [Glossary](#glossary)

---
## Overview
Runar uses a single 32-byte Ed25519 **User Master Key** as the root of trust.  All other keys are deterministically derived and divided into *signing* (Ed25519) and *encryption* (X25519) roles:
* Ed25519 → signatures, certificates, token signing.
* X25519 → Diffie-Hellman (sealed box, shared keys).

---
## Key Classes
| Class | Algo | Derivation | Purpose |
|-------|------|------------|---------|
| **User Master Key** | Ed25519 | random | Root; backups, seed for HD paths |
| **User Profile Key** | Ed25519 | `m/44'/0'/profile'` + index | Signs user content; public key = *ProfileId*; converted to X25519 for sealed-box decryption |
| **Network Key** | Ed25519 | `m/44'/0'/net'` + index | Owns a network, signs access tokens; may be used as per-network QUIC certificate |
| **Node Key** | Ed25519 | `m/44'/0'/node'` + index | Identifies a peer instance; encrypts node-local data |
| **X25519 Conversion** | X25519 | clamp(Ed25519 scalar) | Used whenever DH is needed (sealed box, shared keys) |

> Only the **User Master Key** and **User Profile Keys** leave the node (mobile backup, secure gateway).  All other keys stay on the node in encrypted storage.

---
## Hierarchical Derivation
Derivation follows BIP-44 style hardened paths:
```
m / 44' / 0' / <class>' / <index>'
```
* `class = 0` profile, `1` network, `2` node.
* All indices hardened so child keys cannot compromise parents.

---
## Encryption Modes
| Data Class | Needs to read | Mode |
|------------|--------------|------|
| **User-private** (profile data) | User only | **Sealed Box**: ephemeral X25519 → user_pub, AEAD cipher ⇒ `(epub||nonce||cipher)` |
| **User → System shared** (e.g. e-mail for notifications) | System **until TTL** | X25519 static–static DH `(user_priv,node_pub)` + **per-record TTL** in header → symmetric key → AEAD |
| **System internal** (telemetry, gossip) | All nodes in network | X25519 static–static DH `(user_priv,node_pub)` + **epoch tag** → AEAD |
| **Node-local** | Same node | Symmetric key derived once from Node Key secret |

AEAD algorithm = ChaCha20-Poly1305 (mobile) or AES-GCM (desktop).  AAD always includes `NetworkId`, `ProfileId`, and a version byte.

---
## Epoch Rotation & Forward Secrecy
`GLOBAL_EPOCH` is a monotonically increasing `u64` **per network**.  It protects **system-internal traffic only** (row “System internal”).  It is signed by the Network Key and gossiped periodically.

```
ss        = X25519(user_priv, node_pub)
info_tag  = format!("epoch:{}", GLOBAL_EPOCH)
k_epoch   = HKDF-SHA256(ss, info = info_tag)
```
* Nodes cache only the last *N* epochs for system traffic; older keys are purged.
* **User-shared keys ignore epoch** and are deleted strictly after their individual TTL.
* New nodes fetch the current epoch during discovery and verify the signature to prevent replay.

---
## Access Tokens
* Signed by a **Network Key**.
* Payload: `peer_id, network_id, expiry, capabilities[]`.
* Used during QUIC handshake (or pub/sub subscribe) for authorisation.

---
## QUIC Transport Security
| Model | Certificate Key | Conns per node-pair | Pros | Cons |
|-------|-----------------|---------------------|------|------|
| **A Per-network** | Network Key | O(networks²) | Perfect isolation, simple auth | More TLS handshakes & sockets |
| **B Per-node** | Node Key | 1 | Fewer connections | Needs in-stream proof of NetworkKey; cross-network isolation relies on higher layers |

**POC** adopts Model A.  Model B can be added later using TLS ALPN + stream signatures.

---
## Security Considerations
* Key separation: signing vs encryption keys.
* Forward secrecy: sealed box + epoch rotation.
* Compromise impact:
  * lost User Master Key ⇒ full account takeover.
  * lost Node Key ⇒ node-local data leak only.
* Backups: Master & Profile keys must be exported securely (Ledger, seed phrase).  All other keys are re-derivable.
* Revocation:
  * **Network keys** – rotate Network Key → issue new tokens, new QUIC cert.
  * **System shared keys** – bump `GLOBAL_EPOCH`; nodes keep last _RETENTION_EPOCHS_ for system traffic only.
  * **User shared keys** – stored with explicit TTL; node deletes key + ciphertext immediately after expiry.

---
## Glossary
* **AAD** – Additional Authenticated Data.
* **AEAD** – Authenticated Encryption with Associated Data.
* **Epoch** – uint64 counter providing key-rotation window.
* **HD Path** – BIP-44 hardened derivation path.
* **Sealed Box** – Ephemeral sender → static receiver encryption pattern (NaCl).
* **X25519 Clamp** – Standard private-key conversion from Ed25519 scalar.

---
*Last updated: 2025-06-12*
