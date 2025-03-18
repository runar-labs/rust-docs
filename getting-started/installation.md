# Installing Kagi

This guide covers how to install the Kagi framework in various environments.

## Prerequisites

Before installing Kagi, ensure you have the following prerequisites:

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

To use Kagi in your Rust project, add it to your `Cargo.toml`:

```toml
[dependencies]
kagi_node = "0.1.0"
kagi_macros = "0.1.0"  # For macro support
```

You can now import Kagi in your Rust code:

```rust
use kagi_node::prelude::*;
use kagi_node::macros::*;  // For macro support
```

## As a Standalone Application

You can install the Kagi framework as a standalone application:

### From Binary Releases

Download the latest release for your platform:

```bash
# Download the latest release
curl -L https://github.com/kagi-framework/kagi/releases/latest/download/kagi-$(uname -s)-$(uname -m) -o kagi

# Make it executable
chmod +x kagi

# Move it to a directory in your PATH
sudo mv kagi /usr/local/bin/
```

### From Source

To build Kagi from source:

```bash
# Clone the repository
git clone https://github.com/kagi-framework/kagi.git
cd kagi

# Build in release mode
cargo build --release

# The binary will be available at target/release/kagi
```

### Verifying Installation

Verify the installation by running:

```bash
kagi --version
```

This should output the version number of the installed Kagi framework.

## Platform-Specific Instructions

### Windows

On Windows, you can download the pre-built binary from the releases page or build from source using a similar approach as above. We recommend using Windows Subsystem for Linux (WSL) for the best experience.

### macOS

On macOS, you can use Homebrew to install Kagi:

```bash
brew tap kagi-framework/kagi
brew install kagi
```

### Docker

You can also run Kagi using Docker:

```bash
docker pull kagi-framework/kagi:latest
docker run -it kagi-framework/kagi:latest
```

## Next Steps

Now that you have Kagi installed, you can:

- Follow the [Quick Start Guide](quickstart) to create your first Kagi application
- Explore the [API Reference](../services/api) to learn about available functionality
- Check out the [Example Service](getting-started/example) for a complete implementation