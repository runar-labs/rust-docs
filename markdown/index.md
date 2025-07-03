# Runar Documentation

Welcome to the official documentation for the Runar distributed system framework.

## Overview

Runar is a powerful Rust-based framework for building resilient, peer-to-peer and distributed microservice applications with end-to-end encryption. It provides a declarative API making it easy to define services, handle actions, and manage communication between system components.

## Getting Started

- [Overview](getting-started/overview) - Introduction to Runar's concepts
- [Installation](getting-started/installation) - How to install Runar
- [Quick Start](getting-started/quickstart) - Build your first Runar application

## Core Concepts

- [Architecture](core/architecture) - High-level overview of Runar's architecture
- [P2P Communication](core/p2p) - How peer-to-peer communication works in Runar
- [Discovery](core/discovery) - Node discovery mechanisms
- [System Diagrams](core/system-diagrams) - Visual representations of Runar's architecture
- [Context System](core/context) - Request and lifecycle context management
- [ValueMap (VMap)](core/vmap) - Type-safe parameter handling
- [Logging](core/logging) - Structured logging system
- [Request Handling](core/request_handling) - Best practices for service request handling
- [Service Lifecycle](core/lifecycle) - Service initialization and lifecycle management

## Services

- [API Reference](services/api) - Comprehensive API documentation
- [Gateway](services/gateway) - Gateway service specification
- [Example Service](getting-started/example) - Complete example implementation

## Features

- [Caching](features/caching) - Caching strategies and implementation
- [Key Management](features/keys-management) - Comprehensive PKI and key management system
- [Encryption Schema](features/encryption-schema) - End-to-end encryption and selective field encryption
- [Enhanced Serialization](features/enhanced-serialization) - Selective field encryption with label-based key resolution
- [Logging](features/logging) - Logging configuration and usage
- [Metrics](features/metrics) - Performance metrics and monitoring
- [Macros System](features/macros) - Declarative service definition with macros

## Development

- [Macros System](development/macros) - How to use Runar's declarative macros
- [Mobile Support](development/mobile) - Building mobile applications with Runar
- [Testing](development/testing) - Testing strategies and best practices

## Architecture Deep Dive

### Core Systems

Runar's architecture is built around several core systems that work together:

- **Service Registry**: Manages service registration, discovery, and communication
- **Request Context**: Provides uniform interface for service communication
- **ValueMap (VMap)**: Type-safe parameter handling with automatic conversion
- **Logging System**: Component-based structured logging
- **Lifecycle Management**: Service initialization, startup, and shutdown

### Security Architecture

- **PKI Infrastructure**: X.509 certificate-based identity and authentication
- **Envelope Encryption**: Multi-recipient encryption for cross-device data sharing
- **Selective Field Encryption**: Field-level encryption with label-based key resolution
- **Mobile Key Management**: Self-custodied keys with mobile wallet integration

### Communication Patterns

- **Request/Response**: Synchronous service-to-service communication
- **Publish/Subscribe**: Event-driven communication for loose coupling
- **P2P Transport**: QUIC-based secure peer-to-peer communication
- **Service Discovery**: Automatic service discovery across the network

## Quick Reference

### Service Definition with Macros

```rust
use runar_macros::{action, service, subscribe};

#[service(
    name = "math_service",
    path = "math",
    description = "Simple arithmetic API",
    version = "1.0.0"
)]
struct MathService;

impl MathService {
    #[action]
    async fn add(&self, a: f64, b: f64, ctx: &RequestContext) -> Result<f64> {
        ctx.debug(format!("Adding {a} + {b}"));
        Ok(a + b)
    }
}
```

### Node Setup

```rust
use runar_node::{Node, NodeConfig};

#[tokio::main]
async fn main() -> Result<()> {
    let config = NodeConfig::new_with_generated_id("default_network");
    let mut node = Node::new(config).await?;
    
    node.add_service(MathService).await?;
    
    let result: f64 = node.request("math/add", Some(params)).await?;
    println!("Result: {}", result);
    
    Ok(())
}
```

### Encryption Example

```rust
// Mobile side - encrypt data for sharing
let envelope = mobile.encrypt_with_envelope(
    data,
    &network_id,
    vec!["personal".to_string(), "work".to_string()],
)?;

// Node side - decrypt using network key
let decrypted = node.decrypt_envelope_data(&envelope)?;
```

## Feature Status

| Feature | Status | Notes |
| ------- | ------ | ----- |
| Declarative service & action macros | ✅ | `runar-macros` crate (`service`, `action`, `publish`, `subscribe`) |
| Event-driven pub/sub | ✅ | Built into `runar-node` with topic routing |
| Typed zero-copy serializer (`ArcValue`) | ✅ | Binary & JSON conversion, runtime type registry |
| Enhanced serialization with field encryption | ✅ | `runar-serializer` with selective field encryption and envelope encryption |
| Encrypted SQLite storage | ✅ | CRUD service in `runar-services::sqlite` |
| HTTP REST gateway | ✅ | Axum-based, auto-exposes registered actions |
| QUIC P2P transport & discovery | ✅ | Secure QUIC + multicast discovery in `runar-node::network` |
| Key management & encryption | ✅ | Complete PKI system with X.509 certificates, envelope encryption, and mobile key management |
| Configurable logging/tracing | ✅ | Structured logs via `runar-node::config` |
| iOS embeddings (FFI) | 🟡 | iOS bindings work-in-progress |
| Android embeddings (FFI) | 🟡 | Android bindings work-in-progress |
| Web UI dashboard | 🟡 | Node Setup and Management Screen `node_webui` SPA |
| Node CLI | ⚪ | Command-line interface for node management |
| GraphQL & WebSocket gateway | ⚪ | Planned extension of gateway service |
| Mobile App for Keys management | ⚪ | Planned |

> 🟡 Work-in-progress  |  ⚪ Planned

## Contributing

We welcome early contributors who share our vision of **secure, self-hosted software**.

1. Read the [architecture & guidelines](core/architecture).
2. Discuss sizeable changes in a GitHub issue before opening a PR.
3. Follow the *Documentation-First* workflow (update docs & tests **before** code).
4. Ensure `cargo test` passes and `cargo fmt` shows no diff.

Not sure where to start? Check `development/` for good first issues and the current roadmap.
