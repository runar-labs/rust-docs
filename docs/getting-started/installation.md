# Installing Runar

This guide covers how to install the Runar framework in various environments.

## Prerequisites

Before installing Runar, ensure you have the following prerequisites:

- Rust (1.65 or newer) with Cargo
- OpenSSL development libraries
- A C compiler (gcc, clang, etc.)

## Installing Rust

If you don't have Rust installed, you can install it using rustup:

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

Follow the on-screen instructions to complete the installation.

## As a Dependency in Your Project

To use Runar in your Rust project, add it to your `Cargo.toml`:

```toml
[dependencies]
runar_node = "0.1.0"
runar_macros = "0.1.0"  # For macro support
```

You can now import Runar in your Rust code:

```rust
use runar_node::prelude::*;
use runar_macros::*;  // For macro support
```

## As a Standalone Application

You can install the Runar framework as a standalone application:

### From Binary Releases

Download the latest release for your platform:

```bash
# Download the latest release
curl -L https://github.com/runar-labs/runar/releases/latest/download/runar-$(uname -s)-$(uname -m) -o runar

# Make it executable
chmod +x runar

# Move it to a directory in your PATH
sudo mv runar /usr/local/bin/
```

### From Source

To build Runar from source:

```bash
# Clone the repository
git clone https://github.com/runar-labs/runar.git
cd runar

# Build in release mode
cargo build --release

# The binary will be available at target/release/runar
```

### Verifying Installation

Verify the installation by running:

```bash
runar --version
```

This should output the version number of the installed Runar framework.

## Platform-Specific Instructions

### Windows

On Windows, you can download the pre-built binary from the releases page or build from source using a similar approach as above. We recommend using Windows Subsystem for Linux (WSL) for the best experience.

### macOS

On macOS, you can use Homebrew to install Runar:

```bash
brew tap runar-labs/runar
brew install runar
```

### Docker

You can also run Runar using Docker:

```bash
docker pull runar-labs/runar:latest
docker run -it runar-labs/runar:latest
```

## Next Steps

Now that you have Runar installed, you can:

- Follow the [Quick Start Guide](quickstart) to create your first Runar application
- Explore the [API Reference](../services/api) to learn about available functionality
- Check out the  for a complete implementation