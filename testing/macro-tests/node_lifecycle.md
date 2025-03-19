# Runar Node Lifecycle

This document describes the lifecycle of a Runar Node, including initialization, service registration, startup, and shutdown procedures.

## Overview

The Runar Node follows a specific lifecycle that ensures proper initialization, service registration, and cleanup. Understanding this lifecycle is crucial for developing services and macros that interact with the node.

## Lifecycle Phases

### 1. Creation

A node is created with a configuration that defines its identity, storage paths, and other settings:

```rust
let config = NodeConfig::new(
    "my-node",                     // Node name
    "/path/to/node/data",          // Data directory
    "/path/to/node/data/db",       // Database path
);

let node = Node::new(config).await?;
```

### 2. Initialization

The node must be initialized before services can be registered. This sets up core components:

```rust
node.init().await?;
```

During initialization, the node:
- Sets up the database
- Initializes the event system
- Prepares the service registry
- Configures the P2P component

### 3. Service Registration

After initialization, services can be registered with the node:

```rust
let my_service = MyService::new();
node.add_service(my_service).await?;
```

Services must be added before the node is started.

### 4. Node Startup

Starting the node activates all registered services and begins P2P operations:

```rust
node.start().await?;
```

During startup:
- All services receive a start signal
- The P2P network begins peer discovery and connection
- The node becomes ready to handle requests and events

### 5. Runtime Operations

While running, the node:
- Routes service requests
- Manages the event system
- Handles P2P communications
- Maintains the service registry

### 6. Shutdown

Clean shutdown is important to ensure data is saved and connections are closed properly:

```rust
node.stop().await?;
```

During shutdown:
- All services receive a stop signal
- P2P connections are closed
- Database connections are properly terminated

## Service Lifecycle

Services follow their own lifecycle within the node:

1. **Construction**: Service is created (`MyService::new()`)
2. **Registration**: Service is added to the node (`node.add_service(service)`)
3. **Initialization**: The service receives setup callbacks
4. **Start**: When the node starts, the service also starts
5. **Runtime**: The service processes requests and events
6. **Stop**: When the node stops, the service also stops

## Best Practices

- Always follow the proper initialization order: create → init → add services → start
- Make sure services properly implement cleanup in their stop methods
- Use `async/await` throughout the lifecycle methods
- Register all services before starting the node
- For testing, ensure proper shutdown even in case of errors

## Troubleshooting

Common issues:
- **Service not found**: The service was not properly registered before the node started
- **Connection errors**: The node was not properly initialized or started
- **Database errors**: Check the database path in the config
- **Event subscription failures**: Ensure the node is properly initialized before adding services

## Example: Complete Node Lifecycle

```rust
use anyhow::Result;
use runar_node::{Node, NodeConfig};

async fn run_node() -> Result<()> {
    // Create and configure the node
    let config = NodeConfig::new("example-node", "./data", "./data/db");
    let mut node = Node::new(config).await?;
    
    // Initialize the node
    node.init().await?;
    
    // Register services
    let service = ExampleService::new();
    node.add_service(service).await?;
    
    // Start the node
    node.start().await?;
    
    println!("Node is running...");
    
    // Wait for shutdown signal (CTRL+C, etc.)
    // ...
    
    // Clean shutdown
    println!("Shutting down...");
    node.stop().await?;
    
    Ok(())
} 