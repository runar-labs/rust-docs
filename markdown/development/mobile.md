# iOS P2P Network Mobile App Specification

This specification defines an iOS mobile application built with Swift, designed to integrate with the Runar Node P2P network architecture. The app leverages QUIC for transport, Kademlia DHT for decentralized storage, and implements the secure key management system defined in the Keys Management Specification.

## Table of Contents

1. [Introduction](#introduction)
2. [Alignment with Runar Node Architecture](#alignment-with-runar-node-architecture)
3. [Key Features](#key-features)
4. [Requirements](#requirements)
   - [Functional Requirements](#functional-requirements)
   - [Non-Functional Requirements](#non-functional-requirements)
5. [Architecture](#architecture)
   - [Components](#components)
   - [Data Model](#data-model)
   - [Integration with Runar Node](#integration-with-runar-node)
6. [Key Management System](#key-management-system)
   - [Key Types](#key-types)
   - [HD Key Derivation](#hd-key-derivation)
   - [Key Generation](#key-generation)
   - [Key Storage](#key-storage)
   - [Access Tokens](#access-tokens)
7. [P2P Transport Layer](#p2p-transport-layer)
   - [QUIC Integration](#quic-integration)
   - [Message Handling](#message-handling)
   - [DHT Operations](#dht-operations)
   - [NAT Traversal](#nat-traversal)
8. [Discovery Mechanism](#discovery-mechanism)
   - [UDP Multicast](#udp-multicast)
   - [Message Format](#message-format)
   - [Peer Discovery](#peer-discovery)
9. [User Interface](#user-interface)
   - [Structure](#structure)
   - [Screens](#screens)
   - [UX Workflows](#ux-workflows)
10. [QR Code System](#qr-code-system)
    - [Use Cases](#use-cases)
    - [Data Encoding](#data-encoding)
    - [Token Exchange Workflow](#token-exchange-workflow)
    - [Implementation](#implementation)
11. [Implementation Details](#implementation-details)
    - [Dependencies](#dependencies)
    - [Permissions](#permissions)
    - [Error Handling](#error-handling)
    - [Security Measures](#security-measures)
12. [Complete Workflows](#complete-workflows)
    - [Network Creation Workflow](#network-creation-workflow)
    - [Network Joining Workflow](#network-joining-workflow)
    - [Peer Connection Workflow](#peer-connection-workflow)
    - [DHT Interaction Workflow](#dht-interaction-workflow)

## Introduction

This mobile application provides a native iOS interface to the Runar Node P2P network architecture. It implements the cryptographic identity system, transport layer, and distributed hash table functionality defined in the core Runar specifications, while providing intuitive mobile-specific interfaces for network participation.

## Alignment with Runar Node Architecture

The iOS application fully aligns with the core Runar Node architecture:

- **P2P Transport Layer**: Implements the QUIC-based transport protocol as defined in the P2P Transport Layer Specification
- **Key Management**: Follows the hierarchical deterministic (HD) key derivation system defined in the Keys Management Specification
- **DHT Implementation**: Uses the Kademlia-based distributed hash table for decentralized storage and peer discovery
- **Discovery Mechanism**: Implements the UDP multicast discovery protocol for local peer discovery
- **Network Access Control**: Enforces the AccessToken system for network access control and authentication

## Key Features

- **Full P2P Compatibility**: Seamless interaction with desktop and server Runar Node instances
- **Key Management**: Generate, derive, and securely store cryptographic keys according to the Keys Management Specification
- **QR Code Interface**: Exchange network metadata, access tokens, and connection details through a QR code interface
- **Modern UI**: SwiftUI-based interface providing intuitive access to P2P functionality
- **Offline Operation**: Support for local network operation without internet connectivity

## Requirements

### Functional Requirements

- **Network Administration**:
  - Create new networks (generate NetworkId via HD derivation from master key)
  - Issue access tokens to peers with configurable expiration
  - Manage network metadata and access control

- **Network Participation**:
  - Join existing networks using AccessTokens
  - Discover peers through multicast UDP and DHT routing
  - Connect to peers using QUIC transport with NAT traversal

- **Peer Functionality**:
  - Send and receive messages to/from specific peers
  - Store and retrieve data in the network-specific DHT
  - Subscribe to topics and publish events

- **QR Code Interface**:
  - Generate QR codes for sharing network metadata and tokens
  - Scan QR codes to join networks and connect to peers
  - Display peer's connection details as QR code for easy pairing

### Non-Functional Requirements

- **Platform**: iOS 17+
- **Performance**: Low-latency message delivery and DHT operations
- **Security**: Secure storage for keys, validated token exchange
- **Usability**: Simplified UX for complex P2P operations
- **Connectivity**: Operation across cellular networks with NAT traversal

## Architecture

### Components

- **Core Rust Libraries** (compiled for iOS):
  - `runar-transport`: Implements QUIC transport, DHT, and message routing
  - `runar-keys`: Implements the HD key derivation and token management
  - `runar-discovery`: Implements the UDP multicast discovery protocol
  
- **Swift Wrapper Layer**:
  - FFI bindings to the Rust core
  - Asynchronous APIs using Swift Concurrency (async/await)
  - Type-safe interfaces for Rust functionality

- **Application Layer**:
  - **UI Module**: SwiftUI views and view models
  - **Key Management Module**: Interface to key generation and storage
  - **Network Module**: Handles connections and message routing
  - **QR Code Module**: Generates and processes QR codes

### Data Model

The application uses the same data model defined in the core specifications:

- **PeerId**: 32-byte SHA-256 hash of the peer's Ed25519 public key
- **NetworkId**: 32-byte Ed25519 public key derived from administrator's master key
- **AccessToken**: Structure containing peer_id, network_id, expiration time, and a cryptographic signature
- **Connection**: Represents a QUIC connection to a remote peer
- **NetworkMetadata**: Contains information about a network (name, admin public key, etc.)

### Integration with Runar Node

The mobile app represents a fully-functional Runar Node that implements the same interfaces and protocols as the desktop/server version:

```swift
/// The primary interface to the Runar Node functionality
class RunarNode {
    /// Initialize the node with configuration
    init(config: NodeConfig) async throws
    
    /// Get the node's peer ID
    var peerId: PeerId { get }
    
    /// Send a message to a specific peer
    func sendToPeer<T: Encodable>(_ message: T, peerId: PeerId) async throws
    
    /// Broadcast a message to multiple peers
    func broadcast<T: Encodable>(_ message: T, peerIds: [PeerId]) async throws
    
    /// Listen for incoming messages
    func startListening() -> AsyncStream<(PeerId, Data)>
    
    /// Store a value in the DHT
    func dhtPut(networkId: NetworkId, key: Data, value: Data) async throws
    
    /// Retrieve a value from the DHT
    func dhtGet(networkId: NetworkId, key: Data) async throws -> Data?
    
    /// Add an access token for a network
    func addNetworkToken(networkId: NetworkId, token: AccessToken)
    
    /// Connect to a peer using their address
    func connectToPeer(peerId: PeerId, networkId: NetworkId, address: String) async throws -> Connection
    
    /// Subscribe to network events
    func subscribe(networkId: NetworkId, topic: String, handler: @escaping (Data) -> Void) -> Subscription
    
    /// Publish an event to the network
    func publish(networkId: NetworkId, topic: String, message: Data) async throws
}
```

## Key Management System

### Key Types

The application implements the three key types defined in the Keys Management specification:

1. **Master Key**: Ed25519 key pair used by administrators to derive network keys
2. **Network Key**: Ed25519 key pair derived from the master key, where the public key serves as the NetworkId
3. **Peer Key**: Unique Ed25519 key pair generated for each device, where the PeerId is the SHA-256 hash of the public key

### HD Key Derivation

The application implements hierarchical deterministic key derivation for network keys following the specification:

```swift
/// Derives a network key from the master key
func deriveNetworkKey(masterKey: Ed25519PrivateKey, networkIndex: UInt32) -> Ed25519KeyPair {
    // Use BIP-32 path m/44'/0'/networkIndex'
    let path = "m/44'/0'/\(networkIndex)'"
    return rustFFI.deriveEd25519Key(masterKey: masterKey.rawRepresentation, path: path)
}
```

### Key Generation

For key generation, the application uses:

- Swift CryptoKit for generating Ed25519 keys
- Rust FFI for HD derivation of network keys from master keys

```swift
/// Generate a new master key
func generateMasterKey() -> Ed25519KeyPair {
    let privateKey = Curve25519.Signing.PrivateKey()
    return Ed25519KeyPair(privateKey: privateKey, publicKey: privateKey.publicKey)
}

/// Generate a new peer key
func generatePeerKey() -> Ed25519KeyPair {
    let privateKey = Curve25519.Signing.PrivateKey()
    return Ed25519KeyPair(privateKey: privateKey, publicKey: privateKey.publicKey)
}
```

### Key Storage

Keys are securely stored in the iOS Keychain with appropriate protection levels:

```swift
/// Store a private key in the Keychain
func storePrivateKey(_ key: Ed25519PrivateKey, withIdentifier identifier: String) throws {
    let query: [String: Any] = [
        kSecClass as String: kSecClassGenericPassword,
        kSecAttrAccount as String: identifier,
        kSecValueData as String: key.rawRepresentation,
        kSecAttrAccessible as String: kSecAttrAccessibleWhenUnlockedThisDeviceOnly
    ]
    
    // Add to keychain
    let status = SecItemAdd(query as CFDictionary, nil)
    guard status == errSecSuccess else {
        throw KeychainError.unableToStore
    }
}
```

### Access Tokens

The application implements the AccessToken structure as defined in the Keys Management specification:

```swift
struct AccessToken: Codable {
    let peerId: PeerId
    let networkId: NetworkId
    let expiration: Date?
    let signature: Data
    
    /// Create a new access token and sign it with the network's private key
    static func create(peerId: PeerId, 
                      networkId: NetworkId, 
                      networkPrivateKey: Ed25519PrivateKey, 
                      expiration: Date? = nil) -> AccessToken {
        // Create token data
        let tokenData = peerId.rawRepresentation + 
                       networkId.rawRepresentation + 
                       (expiration?.timeIntervalSince1970.data ?? Data())
        
        // Sign token data
        let signature = try! networkPrivateKey.signature(for: tokenData)
        
        return AccessToken(
            peerId: peerId,
            networkId: networkId,
            expiration: expiration,
            signature: signature
        )
    }
    
    /// Verify the token using the network's public key (NetworkId)
    func verify() -> Bool {
        let tokenData = peerId.rawRepresentation + 
                       networkId.rawRepresentation + 
                       (expiration?.timeIntervalSince1970.data ?? Data())
        
        return try! networkId.isValidSignature(signature, for: tokenData)
    }
}
```

## P2P Transport Layer

### QUIC Integration

The application integrates with the Rust 'quinn' library via FFI to implement QUIC transport:

```swift
class QuinnTransport {
    private var endpoint: OpaquePointer?
    
    /// Initialize the QUIC transport
    init() throws {
        endpoint = rustFFI.quinnCreateEndpoint()
        guard endpoint != nil else {
            throw TransportError.initializationFailed
        }
    }
    
    /// Connect to a remote peer
    func connect(to address: String) throws -> Connection {
        let conn = rustFFI.quinnConnect(endpoint, address)
        guard let conn = conn else {
            throw TransportError.connectionFailed
        }
        return Connection(pointer: conn)
    }
    
    /// Send data over a connection
    func send(data: Data, over connection: Connection) throws {
        let result = rustFFI.quinnSend(connection.pointer, data.baseAddress, data.count)
        if result != 0 {
            throw TransportError.sendFailed
        }
    }
    
    /// Start listening for incoming connections
    func startListening() -> AsyncStream<Connection> {
        // Implementation omitted for brevity
        // Returns AsyncStream of new connections
    }
}
```

### Message Handling

The application implements the message sending and receiving APIs defined in the P2P Transport specification:

```swift
extension RunarNode {
    /// Send a message to a specific peer
    func sendToPeer<T: Encodable>(_ message: T, peerId: PeerId) async throws {
        // Serialize the message using Bincode
        let data = try Bincode.serialize(message)
        
        // Get connection to peer
        let connection = try await getOrCreateConnection(to: peerId)
        
        // Send over QUIC
        try transport.send(data: data, over: connection)
    }
    
    /// Broadcast a message to multiple peers
    func broadcast<T: Encodable>(_ message: T, peerIds: [PeerId]) async throws {
        // Serialize the message once using Bincode
        let data = try Bincode.serialize(message)
        
        // Send to each peer
        try await withThrowingTaskGroup(of: Void.self) { group in
            for peerId in peerIds {
                group.addTask {
                    let connection = try await self.getOrCreateConnection(to: peerId)
                    try self.transport.send(data: data, over: connection)
                }
            }
        }
    }
    
    /// Start listening for incoming messages
    func startListening() -> AsyncStream<(PeerId, Data)> {
        // Implementation returns AsyncStream of (PeerId, message data) tuples
    }
}
```

### DHT Operations

The application implements DHT operations with caching support:

```swift
extension RunarNode {
    /// Store a value in the DHT with optional caching
    func dhtPut(networkId: NetworkId, key: Data, value: Data, cache: Bool = true) async throws {
        // Store in DHT
        try await rustFFI.dhtPut(networkId: networkId.rawRepresentation,
                               key: key,
                               value: value)
        
        // Update cache if enabled
        if cache {
            try await rustFFI.cacheSet(networkId: networkId.rawRepresentation,
                                    key: key,
                                    value: value)
        }
    }
    
    /// Retrieve a value from the DHT with caching
    func dhtGet(networkId: NetworkId, key: Data) async throws -> Data? {
        // Check cache first
        if let cached = try await rustFFI.cacheGet(networkId: networkId.rawRepresentation,
                                                 key: key) {
            return cached
        }
        
        // Fallback to DHT
        return try await rustFFI.dhtGet(networkId: networkId.rawRepresentation,
                                     key: key)
    }
    
    /// Bootstrap the DHT with a known peer
    func dhtBootstrap(networkId: NetworkId, bootstrapPeer: PeerId) async throws {
        try await rustFFI.dhtBootstrap(networkId: networkId.rawRepresentation,
                                     bootstrapPeer: bootstrapPeer.rawRepresentation)
    }
}
```

### Metrics Collection

The application implements P2P metrics collection:

```swift
class P2PMetrics {
    // Connection metrics
    private let activeConnections: Gauge
    private let totalConnections: Counter
    private let failedConnections: Counter
    
    // Network metrics
    private let activeNetworks: Gauge
    private let peersPerNetwork: Histogram
    
    // Message metrics
    private let messagesSent: Counter
    private let messagesReceived: Counter
    private let messageSize: Histogram
    
    // DHT metrics
    private let dhtOperations: Counter
    private let dhtLatency: Histogram
    private let dhtStorageSize: Gauge
    
    // Token metrics
    private let tokenValidations: Counter
    private let tokenValidationFailures: Counter
    
    func recordConnection(success: Bool) {
        totalConnections.increment()
        if success {
            activeConnections.increment()
        } else {
            failedConnections.increment()
        }
    }
    
    func recordMessage(size: Int, isOutbound: Bool) {
        messageSize.observe(Double(size))
        if isOutbound {
            messagesSent.increment()
        } else {
            messagesReceived.increment()
        }
    }
    
    func recordDHTOperation(type: String, duration: TimeInterval) {
        dhtOperations.increment(labels: ["type": type])
        dhtLatency.observe(duration)
    }
}

class NetworkMetrics {
    // Peer metrics
    private let activePeers: Gauge
    private let peerMessageRates: Histogram
    private let peerLatencies: Histogram
    
    // Bandwidth metrics
    private let bytesSent: Counter
    private let bytesReceived: Counter
    private let bandwidthUsage: Histogram
    
    // Discovery metrics
    private let discoveryAttempts: Counter
    private let discoverySuccesses: Counter
    private let discoveryTime: Histogram
    
    func recordPeerMessage(peerId: PeerId, size: Int, duration: TimeInterval) {
        peerMessageRates.observe(1.0)
        peerLatencies.observe(duration)
        bytesSent.increment(by: UInt64(size))
    }
    
    func recordDiscovery(success: Bool, duration: TimeInterval) {
        discoveryAttempts.increment()
        if success {
            discoverySuccesses.increment()
            discoveryTime.observe(duration)
        }
    }
}
```

### Cache Management

The application implements cache management through service actions:

```swift
extension RunarNode {
    /// Clear cache for a service
    func clearCache(service: String) async throws {
        try await request("\(service)/cache/clear", [:])
    }
    
    /// Delete specific cache entry
    func deleteCache(service: String, key: String) async throws {
        try await request("\(service)/cache/delete",
                        ["key": key])
    }
    
    /// Revoke cache entries by pattern
    func revokeCache(service: String, pattern: String) async throws {
        try await request("\(service)/cache/revoke",
                        ["pattern": pattern])
    }
}
```

### NAT Traversal

The application implements NAT traversal using a custom STUN-like server and UDP hole punching:

```swift
class NATTraversal {
    /// Get the device's public endpoint (IP:port)
    func getPublicEndpoint(localPort: UInt16, stunServer: String) async throws -> String {
        return try await rustFFI.getPublicEndpoint(localPort: localPort, 
                                                 stunServer: stunServer)
    }
    
    /// Perform UDP hole punching to establish connectivity
    func punchHole(localPort: UInt16, peerAddress: String) async throws {
        try await rustFFI.punchHole(localPort: localPort, 
                                   peerAddress: peerAddress)
    }
}
```

## Discovery Mechanism

### UDP Multicast

The application implements the discovery mechanism defined in the Discovery specification:

```swift
class DiscoveryService {
    private let multicastAddress = "239.255.255.250"
    private let multicastPort: UInt16 = 4445
    
    /// Start the discovery service
    func start() throws {
        try rustFFI.startDiscovery(multicastAddress: multicastAddress, 
                                  multicastPort: multicastPort)
    }
    
    /// Stop the discovery service
    func stop() {
        rustFFI.stopDiscovery()
    }
    
    /// Add a network to announce
    func addNetwork(networkId: NetworkId, token: AccessToken) {
        rustFFI.addNetworkToDiscovery(
            networkId: networkId.rawRepresentation,
            token: token.serialize()
        )
    }
    
    /// Get discovered peers for a network
    func getDiscoveredPeers(for networkId: NetworkId) -> [DiscoveredPeer] {
        return rustFFI.getDiscoveredPeers(networkId: networkId.rawRepresentation)
            .map { DiscoveredPeer(fromRawPeer: $0) }
    }
}
```

### Message Format

The discovery message format follows the specification:

```swift
struct DiscoveryMessage: Codable {
    let peerId: String // Base64-encoded peer ID
    let networks: [NetworkEntry]
    let ip: String
    let port: UInt16
    let timestamp: UInt64
    let version: String
    
    struct NetworkEntry: Codable {
        let networkId: String // Base64-encoded network ID
        let token: String // Base64-encoded access token
    }
}
```

### Peer Discovery

The application discovers peers through both local network multicast and DHT routing:

```swift
extension RunarNode {
    /// Discover peers for a network
    func discoverPeers(for networkId: NetworkId) async -> [DiscoveredPeer] {
        // Get peers from local discovery
        let localPeers = discoveryService.getDiscoveredPeers(for: networkId)
        
        // Get peers from DHT
        let dhtPeers = try? await rustFFI.dhtFindPeers(networkId: networkId.rawRepresentation)
            .map { DiscoveredPeer(fromDHTPeer: $0) } ?? []
        
        // Combine and deduplicate
        return Array(Set(localPeers + dhtPeers))
    }
}
```

## User Interface

### Structure

The application uses SwiftUI with a TabView-based interface containing the following tabs:

1. **Networks**: Manage and join P2P networks
2. **Peers**: View and connect to peers within selected network
3. **Data**: Interact with the DHT and messages
4. **Settings**: Configure application and manage keys

### Screens

The application includes the following key screens:

- **Network List**: Display joined networks with status indicators
- **Network Detail**: Show peers and network information
- **Create Network**: Generate a new network as an administrator
- **Join Network**: Scan QR code to join an existing network
- **Peer List**: Show active and discovered peers in a network
- **Peer Detail**: Display information about a peer and connection status
- **Connect to Peer**: Scan QR code to connect to a specific peer
- **DHT Browser**: Interface for storing and retrieving data in the DHT
- **Key Management**: View, export, and generate cryptographic keys

### UX Workflows

The UI facilitates the following key workflows:

1. **Network Creation**:
   - Generate/select master key
   - Specify network name and settings
   - Create network (derive network key)
   - Display QR code for others to join

2. **Network Joining**:
   - Scan network QR code
   - Generate/select peer key
   - Request access token (display PeerId QR)
   - Scan token QR code
   - Complete joining process

3. **Peer Connection**:
   - Select peer to connect to
   - Display/scan connection QR code
   - Establish QUIC connection
   - Display connected status

4. **DHT Interaction**:
   - Browse DHT key-value pairs
   - Store new values
   - Retrieve existing values
   - Monitor DHT activity

## QR Code System

### Use Cases

The QR code system facilitates three primary use cases:

1. **Network Sharing**: Administrator shares network metadata for joining
2. **Token Issuance**: Administrator grants access to a peer
3. **Connection Exchange**: Peers share connection details for direct connection

### Data Encoding

Each QR code type encodes specific JSON data, base64-encoded where appropriate, and cryptographically signed:

1. **Network Metadata QR Code**:
   ```json
   {
     "type": "network",
     "network_id": "<base64_encoded_network_id>",
     "name": "<network_name>",
     "admin_pubkey": "<base64_encoded_admin_public_key>",
     "signature": "<base64_encoded_signature>"
   }
   ```

2. **Access Token QR Code**:
   ```json
   {
     "type": "token",
     "peer_id": "<base64_encoded_peer_id>",
     "network_id": "<base64_encoded_network_id>",
     "expiration": "<unix_timestamp_or_null>",
     "signature": "<base64_encoded_signature>"
   }
   ```

3. **Peer Connection QR Code**:
   ```json
   {
     "type": "peer",
     "peer_id": "<base64_encoded_peer_id>",
     "network_id": "<base64_encoded_network_id>",
     "address": "<ip:port>",
     "token": "<base64_encoded_access_token>"
   }
   ```

### Token Exchange Workflow

The application implements a secure token exchange workflow:

1. **Administrator**:
   - Creates network (derives NetworkId)
   - Displays Network Metadata QR code

2. **Joining Peer**:
   - Scans Network Metadata QR code
   - Generates/selects Peer Key
   - Displays PeerId QR code

3. **Administrator**:
   - Scans PeerId QR code
   - Creates AccessToken for the peer
   - Displays AccessToken QR code

4. **Joining Peer**:
   - Scans AccessToken QR code
   - Verifies token with NetworkId
   - Stores token for network participation

### Implementation

The QR code functionality is implemented using:

- `CoreImage` for QR code generation
- `AVFoundation` for QR code scanning
- Native Swift cryptography for signature verification

```swift
class QRCodeGenerator {
    /// Generate a QR code from data
    func generateQRCode(from string: String) -> UIImage? {
        guard let data = string.data(using: .utf8) else { return nil }
        
        if let filter = CIFilter(name: "CIQRCodeGenerator") {
            filter.setValue(data, forKey: "inputMessage")
            filter.setValue("M", forKey: "inputCorrectionLevel")
            
            if let outputImage = filter.outputImage {
                // Scale the image
                let transform = CGAffineTransform(scaleX: 10, y: 10)
                let scaledImage = outputImage.transformed(by: transform)
                
                return UIImage(ciImage: scaledImage)
            }
        }
        
        return nil
    }
}

class QRCodeScanner {
    /// Scan a QR code and return the decoded data
    func scanQRCode() -> AsyncStream<String> {
        // Implementation omitted for brevity
        // Returns AsyncStream of decoded QR code strings
    }
}
```

## Implementation Details

### Dependencies

The application uses the following dependencies:

```swift
// Package.swift
dependencies: [
    .package(url: "https://github.com/runar-labs/runar-node-swift.git", from: "1.0.0"),
    .package(url: "https://github.com/apple/swift-metrics.git", from: "2.0.0"),
    .package(url: "https://github.com/apple/swift-nio.git", from: "2.0.0")
]
```

### Permissions

The application requires the following permissions, properly declared in Info.plist:

- `NSCameraUsageDescription`: Required for QR code scanning
- `NSLocalNetworkUsageDescription`: Required for peer discovery
- `NSBonjourServices`: Required for service advertisement/discovery
- `NSFaceIDUsageDescription`: Optional for securing key access with biometrics

### Error Handling

The application implements comprehensive error handling:

- Network connectivity issues with retry logic
- QR code scanning/parsing errors with user feedback
- Cryptographic operation failures with appropriate messaging
- DHT operation timeouts with configurable retry policies

### Security Measures

The application implements the following security measures:

- Secure key storage in the iOS Keychain
- Biometric authentication for sensitive operations
- Validation of all cryptographic signatures
- Encryption of all network traffic via QUIC
- Token verification before connection establishment
- Timestamp validation to prevent replay attacks

## Complete Workflows

### Network Creation Workflow

1. Administrator generates or selects a master key
2. Administrator creates a new network:
   ```swift
   // Generate or load master key
   let masterKey = keyStore.getMasterKey() ?? keyStore.generateMasterKey()
   
   // Derive network key (networkIndex distinguishes multiple networks)
   let networkKey = keyDerivation.deriveNetworkKey(masterKey: masterKey, networkIndex: 0)
   
   // Create network metadata
   let networkMetadata = NetworkMetadata(
       networkId: NetworkId(publicKey: networkKey.publicKey),
       name: "My Personal Network",
       adminPublicKey: masterKey.publicKey
   )
   
   // Sign the metadata
   networkMetadata.sign(with: masterKey.privateKey)
   
   // Generate QR code for network joining
   let qrCode = qrGenerator.generateNetworkQR(from: networkMetadata)
   
   // Display QR code to users who want to join
   displayQRCodeView.showQRCode(qrCode)
   ```

3. Administrator displays the Network Metadata QR code for peers to scan
4. When a peer requests access (by showing their PeerId QR):
   ```swift
   // Scan peer's QR code to get their PeerId
   let peerIdString = await qrScanner.scanQRCode().first(where: { _ in true })
   let peerId = PeerId(base64Encoded: peerIdString)
   
   // Create access token for the peer with 30-day expiration
   let expirationDate = Calendar.current.date(byAdding: .day, value: 30, to: Date())
   let accessToken = AccessToken.create(
       peerId: peerId,
       networkId: networkMetadata.networkId,
       networkPrivateKey: networkKey.privateKey,
       expiration: expirationDate
   )
   
   // Generate QR code with the access token
   let tokenQR = qrGenerator.generateTokenQR(from: accessToken)
   
   // Display token QR for peer to scan
   displayQRCodeView.showQRCode(tokenQR)
   ```

### Network Joining Workflow

1. Peer initiates joining process from Networks tab
2. Peer scans Network Metadata QR code:
   ```swift
   // Scan network metadata QR
   let networkQRString = await qrScanner.scanQRCode().first(where: { _ in true })
   
   // Parse network metadata
   let networkMetadata = try NetworkMetadata.fromQRString(networkQRString)
   
   // Verify the signature
   guard networkMetadata.verify() else {
       throw NetworkError.invalidSignature
   }
   
   // Generate or select peer key
   let peerKey = keyStore.getPeerKey() ?? keyStore.generatePeerKey()
   let peerId = PeerId(publicKey: peerKey.publicKey)
   
   // Display peer ID as QR for admin to scan
   let peerIdQR = qrGenerator.generatePeerIdQR(from: peerId)
   displayQRCodeView.showQRCode(peerIdQR)
   ```

3. Peer displays PeerId QR for administrator to scan
4. Peer scans AccessToken QR provided by administrator:
   ```swift
   // Scan access token QR
   let tokenQRString = await qrScanner.scanQRCode().first(where: { _ in true })
   
   // Parse access token
   let accessToken = try AccessToken.fromQRString(tokenQRString)
   
   // Verify the token
   guard accessToken.peerId == peerId && 
         accessToken.networkId == networkMetadata.networkId &&
         accessToken.verify() else {
       throw NetworkError.invalidToken
   }
   
   // Store the token and network metadata
   keyStore.storeAccessToken(accessToken, for: networkMetadata.networkId)
   networkStore.addNetwork(networkMetadata)
   
   // Join the network
   try await runarNode.joinNetwork(
       networkId: networkMetadata.networkId,
       accessToken: accessToken
   )
   ```

### Peer Connection Workflow

1. Peer A selects "Connect to Peer" from the Peers tab
2. Peer A obtains their public endpoint and generates a connection QR:
   ```swift
   // Get public endpoint via STUN
   let publicEndpoint = try await natTraversal.getPublicEndpoint(
       localPort: runarNode.listeningPort,
       stunServer: "stun.example.com:3478"
   )
   
   // Create connection QR data
   let connectionData = PeerConnectionData(
       peerId: runarNode.peerId,
       networkId: selectedNetwork.networkId,
       address: publicEndpoint,
       token: accessToken
   )
   
   // Generate and display QR
   let connectionQR = qrGenerator.generateConnectionQR(from: connectionData)
   displayQRCodeView.showQRCode(connectionQR)
   ```

3. Peer B scans the connection QR code:
   ```swift
   // Scan connection QR
   let connectionQRString = await qrScanner.scanQRCode().first(where: { _ in true })
   
   // Parse connection data
   let connectionData = try PeerConnectionData.fromQRString(connectionQRString)
   
   // Verify network and token
   guard connectionData.networkId == selectedNetwork.networkId &&
         connectionData.token.verify() else {
       throw ConnectionError.invalidData
   }
   
   // Perform hole punching
   try await natTraversal.punchHole(
       localPort: runarNode.listeningPort,
       peerAddress: connectionData.address
   )
   
   // Connect to the peer
   let connection = try await runarNode.connectToPeer(
       peerId: connectionData.peerId,
       networkId: connectionData.networkId,
       address: connectionData.address
   )
   
   // Store connection for future use
   peerStore.addConnection(connection, for: connectionData.peerId)
   ```

### DHT Interaction Workflow

1. User navigates to the Data tab
2. User stores a value in the DHT:
   ```swift
   // Create key and value
   let key = "user/profile/\(UUID().uuidString)".data(using: .utf8)!
   let value = try JSONEncoder().encode(userProfile)
   
   // Store in DHT
   try await runarNode.dhtPut(
   try await runarNode.dhtPut(
       networkId: selectedNetwork.networkId,
       key: key,
       value: value
   )
   ```

3. User retrieves a value from the DHT:
   ```swift
   // Retrieve from DHT
   if let valueData = try await runarNode.dhtGet(
       networkId: selectedNetwork.networkId,
       key: key
   ) {
       // Decode value
       let retrievedProfile = try JSONDecoder().decode(UserProfile.self, from: valueData)
       // Update UI
       updateUIWithProfile(retrievedProfile)
   } else {
       // Handle not found
       showNotFoundMessage()
   }
   ```


## Examples

This section will be expanded with practical examples.
