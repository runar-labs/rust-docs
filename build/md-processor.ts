import { marked } from 'marked';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { writeFile, mkdir } from 'node:fs/promises';
import { join, dirname, basename, relative } from 'node:path';

// Configure marked to use syntax highlighting
marked.setOptions({
  // @ts-ignore - The highlight function is supported but not properly typed
  highlight: function(code: string, lang: string) {
    // Special handling for Mermaid diagrams
    if (lang === 'mermaid') {
      return `<div class="mermaid">${code}</div>`;
    }
    
    // Regular code blocks
    return `<div class="code-block ${lang}">${code}</div>`;
  },
  headerIds: true,
  gfm: true
});

// Map for special case file name to route name conversions
const FILE_TO_ROUTE_MAP: Record<string, string> = {
  // Core docs
  'architecture.md': 'core/architecture',
  'p2p.md': 'core/p2p',
  'discovery.md': 'core/discovery',
  'system-diagrams.md': 'core/system-diagrams',
  
  // Services docs
  'api.md': 'services/api',
  'gateway.md': 'services/gateway',
  
  // Features docs
  'caching.md': 'features/caching',
  'keys-management.md': 'features/keys-management',
  'logging.md': 'features/logging',
  'metrics.md': 'features/metrics',
  
  // Development docs
  'macros.md': 'development/macros',
  'mobile.md': 'development/mobile',
  
  // Getting started docs
  'overview.md': 'getting-started/overview',
  'installation.md': 'getting-started/installation',
  'quickstart.md': 'getting-started/quickstart',
  'example-service.md': 'getting-started/example',
  
  // Root docs
  'index.md': 'home'
};

// We still need these default routes for navigation
const DEFAULT_ROUTES = [
  { id: 'home', title: 'Home' },
  { id: 'getting-started/overview', title: 'Overview' },
  { id: 'getting-started/installation', title: 'Installation' },
  { id: 'getting-started/quickstart', title: 'Quick Start' }
];

// Category structure for navigation
const CATEGORIES = [
  {
    name: 'Getting Started',
    routes: [
      'getting-started/overview',
      'getting-started/installation',
      'getting-started/quickstart',
      'getting-started/example'
    ]
  },
  {
    name: 'Core',
    routes: [
      'core/architecture',
      'core/p2p',
      'core/discovery',
      'core/system-diagrams'
    ]
  },
  {
    name: 'Services',
    routes: [
      'services/api',
      'services/gateway'
    ]
  },
  {
    name: 'Features',
    routes: [
      'features/caching',
      'features/keys-management',
      'features/logging',
      'features/metrics'
    ]
  },
  {
    name: 'Development',
    routes: [
      'development/macros',
      'development/mobile'
    ]
  }
];

// Base directory for markdown files - using the actual docs folder
// const DOCS_DIR = '/home/rafael/Developer/kagi/docs';
const DOCS_DIR = '/home/rafael/dev/kagi/docs';
// Output directory for generated HTML
const OUTPUT_DIR = './public/content';

// Ensure the output directory exists
async function ensureDirectory(dir: string) {
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }
}

// Process a markdown file and return the HTML
function processMarkdown(filePath: string): string {
  if (!existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    return '<div class="error">Content not found</div>';
  }
  
  const markdown = readFileSync(filePath, 'utf-8');
  // Use marked.parse synchronously to ensure we return a string
  let html = marked.parse(markdown) as string;
  
  // Replace mermaid code blocks with mermaid divs
  html = html.replace(/<div class="code-block mermaid">([\s\S]*?)<\/div>/g, 
                     '<div class="mermaid">$1</div>');
  
  return html;
}

// Generate a route ID from a filename
function getRouteId(filename: string, directory: string = ''): string {
  const lowercaseFilename = filename.toLowerCase();
  
  // Check if we have a predefined mapping
  if (FILE_TO_ROUTE_MAP[lowercaseFilename]) {
    return FILE_TO_ROUTE_MAP[lowercaseFilename];
  }
  
  // Otherwise, generate a slug from the filename and directory
  const fileSlug = basename(filename, '.md')
    .toLowerCase()
    .replace(/[^\w]+/g, '-')
    .replace(/(^-|-$)/g, '');
    
  if (directory) {
    return `${directory}/${fileSlug}`;
  }
  
  return fileSlug;
}

// Process markdown files in a directory
async function processDirectory(dir: string, baseRoute: string = ''): Promise<Array<{ id: string, title: string }>> {
  console.log(`Processing directory: ${dir}`);
  
  if (!existsSync(dir)) {
    console.error(`Directory not found: ${dir}`);
    return [];
  }
  
  const files = readdirSync(dir, { withFileTypes: true });
  const routes: Array<{ id: string, title: string }> = [];
  
  // Process each file
  for (const file of files) {
    const fullPath = join(dir, file.name);
    
    if (file.isDirectory()) {
      // Process subdirectory
      const subRoutes = await processDirectory(fullPath, baseRoute ? `${baseRoute}/${file.name}` : file.name);
      routes.push(...subRoutes);
    } else if (file.name.endsWith('.md')) {
      console.log(`Processing file: ${fullPath}`);
      
      // Generate route ID
      const routeId = getRouteId(file.name, baseRoute);
      
      // Add to routes
      routes.push({
        id: routeId,
        title: file.name.replace('.md', '').replace(/-spec$/, '')
      });
      
      // Generate HTML
      const html = processMarkdown(fullPath);
      
      // Ensure output directory exists
      const outputDir = dirname(join(OUTPUT_DIR, `${routeId}.html`));
      await ensureDirectory(outputDir);
      
      // Path for the output HTML file
      const outputPath = join(OUTPUT_DIR, `${routeId}.html`);
      
      // Write the HTML file
      await writeFile(outputPath, html);
      console.log(`Created ${outputPath}`);
    }
  }
  
  return routes;
}

// Create the Get Started page
async function createGetStartedPage(): Promise<string> {
  const content = `
# Get Started with Kagi

Kagi is a powerful Rust framework for building distributed, event-driven applications. It provides a robust foundation for creating scalable services that can communicate seamlessly across a peer-to-peer network.

## Installation

### Prerequisites

- [Rust](https://www.rust-lang.org/tools/install) (1.70 or later)
- [Cargo](https://doc.rust-lang.org/cargo/getting-started/installation.html) (comes with Rust)

### Installing Kagi

Kagi can be used in two ways:

1. **As a Rust dependency in your project**:
   
   Add Kagi to your \`Cargo.toml\`:
   
   \`\`\`toml
   [dependencies]
   kagi = "0.1.0"
   \`\`\`

2. **As a standalone application**:
   
   \`\`\`bash
   cargo install kagi-cli
   \`\`\`

## Creating Your First Service

Here's a simple example of defining a service in Kagi:

\`\`\`rust
use kagi::{service, action, event};

#[service]
struct HelloService {
    greeting_format: String,
}

impl HelloService {
    pub fn new() -> Self {
        Self {
            greeting_format: "Hello, {}!".to_string(),
        }
    }
    
    #[action]
    fn greet(&self, name: String) -> String {
        format!("{}", self.greeting_format.replace("{}", &name))
    }
    
    #[action]
    fn add_greeting_format(&mut self, format: String) -> bool {
        if format.contains("{}") {
            self.greeting_format = format;
            // Publish an event when the greeting format changes
            self.publish_event("greeting_format_changed", &self.greeting_format);
            true
        } else {
            false
        }
    }
    
    #[event]
    fn publish_event(&self, event_type: &str, data: &str) {
        // This method is transformed by the event macro to publish events
    }
}
\`\`\`

## Next Steps

- Explore the [Architecture](core/architecture) to understand Kagi's design
- Learn about [Services](services/api) and how they communicate
- Discover [P2P networking](core/p2p) capabilities
- Check out [Example Services](getting-started/example) for more inspiration
`;

  // Parse the markdown to HTML
  return processMarkdown(content);
}

// Create index.md file in the docs folder
async function createIndexFile() {
  console.log('Creating index.md file in the docs folder...');
  
  const indexMd = `# Kagi Documentation

Welcome to the official documentation for the Kagi distributed system framework.

## Overview

Kagi is a powerful Rust-based framework for building resilient, peer-to-peer distributed applications. It provides a declarative API inspired by actor-based frameworks like Actix, making it easy to define services, handle actions, and manage communication between system components.

## Getting Started

- [Overview](getting-started/overview) - Introduction to Kagi's concepts
- [Installation](getting-started/installation) - How to install Kagi
- [Quick Start](getting-started/quickstart) - Build your first Kagi application

## Core Concepts

- [Architecture](core/architecture) - High-level overview of Kagi's architecture
- [P2P Communication](core/p2p) - How peer-to-peer communication works in Kagi
- [Discovery](core/discovery) - Node discovery mechanisms
- [System Diagrams](core/system-diagrams) - Visual representations of Kagi's architecture

## Services

- [API Reference](services/api) - Comprehensive API documentation
- [Gateway](services/gateway) - Gateway service specification
- [Example Service](getting-started/example) - Complete example implementation

## Features

- [Caching](features/caching) - Caching strategies and implementation
- [Keys Management](features/keys-management) - Cryptographic key management
- [Logging](features/logging) - Logging configuration and usage
- [Metrics](features/metrics) - Performance metrics and monitoring

## Development

- [Macros System](development/macros) - How to use Kagi's declarative macros
- [Mobile Support](development/mobile) - Building mobile applications with Kagi
`;

  // Write the index.md file to the docs folder
  const indexPath = join(DOCS_DIR, 'index.md');
  await writeFile(indexPath, indexMd);
  console.log(`Created ${indexPath}`);
  
  // Generate HTML
  const html = processMarkdown(indexMd) as string;
  
  // Write the home.html file
  const outputPath = join(OUTPUT_DIR, 'home.html');
  await writeFile(outputPath, html);
  console.log(`Created ${outputPath}`);
}

// Create a sample file in a folder
async function createSampleFile(filepath: string, title: string, content: string) {
  console.log(`Creating sample file: ${filepath}`);
  
  // Ensure directory exists
  const dir = dirname(filepath);
  await ensureDirectory(dir);
  
  // Write the file
  await writeFile(filepath, content);
  console.log(`Created ${filepath}`);
}

// Create the getting started files
async function createGettingStartedFiles() {
  // Overview
  const overviewPath = join(DOCS_DIR, 'getting-started', 'overview.md');
  const overviewContent = `# Kagi Overview

## Introduction

Kagi is a powerful distributed system framework built in Rust. It provides a declarative, Actix-inspired approach to defining services, actions, and event subscriptions for building resilient peer-to-peer applications.

## Key Features

- **Distributed Architecture**: Fully distributed with no central points of failure
- **End-to-End Encryption**: Secure communication between nodes
- **Declarative API**: Easy-to-use macros for defining services and handlers
- **Event-Based Communication**: Publish-subscribe pattern for system events
- **Fault Tolerance**: Resilient to network failures and node crashes
- **Extensible**: Easy to add new services and functionality

## Core Components

Kagi consists of several core components:

1. **Node**: The main runtime that hosts services and manages communication
2. **Services**: Independent modules that provide specific functionality
3. **Actions**: Request handlers that process incoming service requests
4. **Events**: Asynchronous messages for inter-service communication
5. **Discovery**: Mechanism for finding other nodes in the network
6. **P2P Layer**: Peer-to-peer communication layer

## Architecture Overview

The following diagram illustrates the high-level architecture of a Kagi node:

\`\`\`mermaid
graph TD
    Client[Client Applications] --> Gateway
    Gateway[Gateway Service] --> Router
    Router[Action Router] --> S1[Service 1]
    Router --> S2[Service 2]
    Router --> S3[Service 3]
    S1 <--> EventBus[Event Bus]
    S2 <--> EventBus
    S3 <--> EventBus
    EventBus <--> P2P[P2P Layer]
    P2P <--> Network[Network]
\`\`\`

## Service Model

Services in Kagi are defined using a declarative approach with macros:

\`\`\`rust
#[kagi::service(name = "example_service")]
struct ExampleService {
    // Service state
}

impl ExampleService {
    #[action("perform_task")]
    async fn perform_task(&self, context: &RequestContext, 
                         #[param("input")] input: String) -> Result<ServiceResponse> {
        // Handler implementation
    }
    
    #[subscribe("event/type")]
    async fn handle_event(&self, payload: serde_json::Value) -> Result<()> {
        // Event handler implementation
    }
}
\`\`\`

## Next Steps

- [Installation Guide](installation) - Install Kagi and its dependencies
- [Quick Start Guide](quickstart) - Build your first Kagi application
- [Architecture](../core/architecture) - Detailed architecture documentation`;

  await createSampleFile(overviewPath, 'Overview', overviewContent);
  
  // Installation
  const installationPath = join(DOCS_DIR, 'getting-started', 'installation.md');
  const installationContent = `# Installing Kagi

This guide covers how to install the Kagi framework in various environments.

## Prerequisites

Before installing Kagi, ensure you have the following prerequisites:

- Rust (1.65 or newer) with Cargo
- OpenSSL development libraries
- A C compiler (gcc, clang, etc.)

## Installing Rust

If you don't have Rust installed, you can install it using rustup:

\`\`\`bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
\`\`\`

Follow the on-screen instructions to complete the installation.

## As a Dependency in Your Project

To use Kagi in your Rust project, add it to your \`Cargo.toml\`:

\`\`\`toml
[dependencies]
kagi_node = "0.1.0"
kagi_macros = "0.1.0"  # For macro support
\`\`\`

You can now import Kagi in your Rust code:

\`\`\`rust
use kagi_node::prelude::*;
use kagi_node::macros::*;  // For macro support
\`\`\`

## As a Standalone Application

You can install the Kagi framework as a standalone application:

### From Binary Releases

Download the latest release for your platform:

\`\`\`bash
# Download the latest release
curl -L https://github.com/kagi-framework/kagi/releases/latest/download/kagi-$(uname -s)-$(uname -m) -o kagi

# Make it executable
chmod +x kagi

# Move it to a directory in your PATH
sudo mv kagi /usr/local/bin/
\`\`\`

### From Source

To build Kagi from source:

\`\`\`bash
# Clone the repository
git clone https://github.com/kagi-framework/kagi.git
cd kagi

# Build in release mode
cargo build --release

# The binary will be available at target/release/kagi
\`\`\`

### Verifying Installation

Verify the installation by running:

\`\`\`bash
kagi --version
\`\`\`

This should output the version number of the installed Kagi framework.

## Platform-Specific Instructions

### Windows

On Windows, you can download the pre-built binary from the releases page or build from source using a similar approach as above. We recommend using Windows Subsystem for Linux (WSL) for the best experience.

### macOS

On macOS, you can use Homebrew to install Kagi:

\`\`\`bash
brew tap kagi-framework/kagi
brew install kagi
\`\`\`

### Docker

You can also run Kagi using Docker:

\`\`\`bash
docker pull kagi-framework/kagi:latest
docker run -it kagi-framework/kagi:latest
\`\`\`

## Next Steps

Now that you have Kagi installed, you can:

- Follow the [Quick Start Guide](quickstart) to create your first Kagi application
- Explore the [API Reference](../services/api) to learn about available functionality
- Check out the [Example Service](getting-started/example) for a complete implementation`;

  await createSampleFile(installationPath, 'Installation', installationContent);
  
  // Quickstart
  const quickstartPath = join(DOCS_DIR, 'getting-started', 'quickstart.md');
  const quickstartContent = `# Kagi Quick Start Guide

This guide will help you get started with Kagi by building a simple application.

## Creating a New Project

Start by creating a new Rust project:

\`\`\`bash
cargo new kagi-hello-world
cd kagi-hello-world
\`\`\`

Add Kagi as a dependency in your \`Cargo.toml\` file:

\`\`\`toml
[dependencies]
kagi_node = "0.1.0"
kagi_macros = "0.1.0"
tokio = { version = "1", features = ["full"] }
anyhow = "1.0"
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
\`\`\`

## Creating a Simple Service

Let's create a simple "greeting" service. Replace the contents of \`src/main.rs\` with the following code:

\`\`\`rust
use kagi_node::prelude::*;
use kagi_node::macros::*;
use anyhow::Result;
use serde_json::json;

// Define a service
#[kagi::service(name = "greeter", description = "A greeting service")]
struct GreeterService {
    greeting_formats: std::collections::HashMap<String, String>,
}

impl GreeterService {
    // Constructor
    fn new() -> Self {
        let mut greeting_formats = std::collections::HashMap::new();
        greeting_formats.insert("standard".to_string(), "Hello, {}!".to_string());
        greeting_formats.insert("friendly".to_string(), "Hey there, {}! How are you?".to_string());
        greeting_formats.insert("formal".to_string(), "Good day, {}. It's a pleasure to meet you.".to_string());
        
        Self { greeting_formats }
    }
    
    // Action handler for generating greetings
    #[action("greet")]
    async fn greet(&self, _context: &RequestContext, 
                  #[param("name")] name: String,
                  #[param("format", default = "standard")] format: String) -> Result<ServiceResponse> {
        
        // Get the greeting format (default to standard if not found)
        let format_template = self.greeting_formats
            .get(&format)
            .unwrap_or(&self.greeting_formats["standard"])
            .clone();
        
        // Generate the greeting
        let greeting = format_template.replace("{}", &name);
        
        // Return the response
        Ok(ServiceResponse {
            status: ResponseStatus::Success,
            message: greeting.clone(),
            data: Some(vmap! {
                "greeting" => greeting,
                "format_used" => format
            }),
        })
    }
    
    // Action handler for adding new greeting formats
    #[action("add_format")]
    async fn add_format(&self, context: &RequestContext,
                       #[param("name")] name: String,
                       #[param("template")] template: String) -> Result<ServiceResponse> {
        
        // Add the new format
        {
            let mut formats = self.greeting_formats.clone();
            formats.insert(name.clone(), template.clone());
            self.greeting_formats = formats;
        }
        
        // Publish event about the new format
        let event_data = json!({
            "format_name": name,
            "template": template,
            "timestamp": chrono::Utc::now().to_rfc3339()
        });
        
        context.publish("greeter/format_added", event_data).await?;
        
        // Return success response
        Ok(ServiceResponse {
            status: ResponseStatus::Success,
            message: format!("Added new greeting format: {}", name),
            data: Some(vmap! {
                "name" => name,
                "template" => template
            }),
        })
    }
    
    // Event handler for demonstration
    #[subscribe("greeter/format_added")]
    async fn handle_format_added(&self, payload: serde_json::Value) -> Result<()> {
        if let (Some(name), Some(template)) = (
            payload.get("format_name").and_then(|v| v.as_str()),
            payload.get("template").and_then(|v| v.as_str())
        ) {
            println!("EVENT: New greeting format added: {} with template: {}", name, template);
        }
        Ok(())
    }
}

// Application entry point
#[kagi::main]
async fn main() -> Result<()> {
    // Create configuration
    let config = NodeConfig::new(
        "greeter_node",
        "./data",
        "./data/db",
    );
    
    // Create service
    let greeter_service = GreeterService::new();
    
    // Create and start the node
    Node::builder()
        .with_config(config)
        .add_service(greeter_service)
        .build_and_run()
        .await
}
\`\`\`

## Running the Application

Build and run your application:

\`\`\`bash
cargo run
\`\`\`

This will start a Kagi node with your greeting service.

## Interacting with the Service

You can interact with your service using the Kagi CLI or by writing a client application.

### Using the Kagi CLI

Install the Kagi CLI if you haven't already:

\`\`\`bash
cargo install kagi-cli
\`\`\`

Send a request to your service:

\`\`\`bash
kagi-cli request greeter greet --param name="World"
\`\`\`

You should see a response with the greeting "Hello, World!".

Try different formats:

\`\`\`bash
kagi-cli request greeter greet --param name="World" --param format="friendly"
\`\`\`

Add a new greeting format:

\`\`\`bash
kagi-cli request greeter add_format --param name="enthusiastic" --param template="WOW!!! {} !!! AMAZING!!!"
\`\`\`

Test the new format:

\`\`\`bash
kagi-cli request greeter greet --param name="World" --param format="enthusiastic"
\`\`\`

## Next Steps

You've created a simple Kagi service! Here are some next steps to explore:

- Learn about [Kagi's Architecture](../core/architecture)
- Understand [Service Definition](../development/macros)
- Explore [Action Handlers](../services/api#action-handlers)
- Set up [Event Subscriptions](../services/api#event-system)
- Build a [Complete Example Service](getting-started/example)

Happy coding with Kagi!`;

  await createSampleFile(quickstartPath, 'Quick Start', quickstartContent);
}

// Process all markdown files in the docs directory with new structure
async function processAllDocs() {
  console.log('Processing markdown files from existing docs folder...');
  
  // Ensure the output directory exists
  await ensureDirectory(OUTPUT_DIR);
  
  // Create index.md file
  await createIndexFile();
  
  // Create Getting Started files
  await createGettingStartedFiles();
  
  // Process existing files and move them to the new structure
  await moveExistingFiles();
  
  // Process all files in the new structure
  const allRoutes = await processDirectory(DOCS_DIR);
  
  // Create structured routes for navigation
  const routes = createStructuredRoutes(allRoutes);
  
  // Create routes.json
  const routesPath = join(OUTPUT_DIR, 'routes.json');
  await writeFile(routesPath, JSON.stringify(routes, null, 2));
  console.log(`Created ${routesPath}`);
}

// Create structured routes for navigation
function createStructuredRoutes(allRoutes: Array<{ id: string, title: string }>): Array<{ id: string, title: string, category?: string }> {
  const routeMap = new Map<string, { id: string, title: string }>();
  
  // Create a map of all routes
  allRoutes.forEach(route => {
    // Get base title
    let title = route.title.replace(/-/g, ' ');
    
    // Capitalize first letter of each word
    title = title.replace(/\b\w/g, c => c.toUpperCase());
    
    // Special handling for specific slugs/titles
    if (route.id === 'core/p2p' || route.id.includes('p2p')) {
      title = title.replace('P2p', 'P2P');
    }
    
    if (route.id === 'services/api' || route.id.includes('api')) {
      title = title.replace('Api', 'API');
    }
    
    routeMap.set(route.id, {
      id: route.id,
      title: title
    });
  });
  
  // Start with the home route
  const structuredRoutes: Array<{ id: string, title: string, category?: string }> = [
    { id: 'home', title: 'Home' }
  ];
  
  // Add routes from categories
  CATEGORIES.forEach(category => {
    // Add a header for the category
    structuredRoutes.push({ id: '', title: category.name, category: category.name });
    
    // Add routes for the category
    category.routes.forEach(routeId => {
      const route = routeMap.get(routeId);
      if (route) {
        structuredRoutes.push({
          ...route,
          category: category.name
        });
      }
    });
  });
  
  return structuredRoutes;
}

// Move existing files to the new structure
async function moveExistingFiles() {
  console.log('Moving existing files to new structure...');
  
  const fileMap = {
    'Architecture.md': join(DOCS_DIR, 'core', 'architecture.md'),
    'P2P-spec.md': join(DOCS_DIR, 'core', 'p2p.md'),
    'Discovery.md': join(DOCS_DIR, 'core', 'discovery.md'),
    'System-Diagrams.md': join(DOCS_DIR, 'core', 'system-diagrams.md'),
    'API.md': join(DOCS_DIR, 'services', 'api.md'),
    'Gateway-spec.md': join(DOCS_DIR, 'services', 'gateway.md'),
    'ExampleService.md': join(DOCS_DIR, 'services', 'example-service.md'),
    'Caching.md': join(DOCS_DIR, 'features', 'caching.md'),
    'Keys Management.md': join(DOCS_DIR, 'features', 'keys-management.md'),
    'Logging-usage.md': join(DOCS_DIR, 'features', 'logging.md'),
    'Metrics-spec.md': join(DOCS_DIR, 'features', 'metrics.md'),
    'Macros-spec.md': join(DOCS_DIR, 'development', 'macros.md'),
    'Mobile-spec.md': join(DOCS_DIR, 'development', 'mobile.md')
  };
  
  for (const [source, destination] of Object.entries(fileMap)) {
    const sourcePath = join(DOCS_DIR, source);
    
    if (existsSync(sourcePath)) {
      console.log(`Moving ${sourcePath} to ${destination}`);
      
      // Ensure destination directory exists
      await ensureDirectory(dirname(destination));
      
      // Read the source file
      const content = readFileSync(sourcePath, 'utf-8');
      
      // Standardize and write to the destination
      await writeFile(destination, standardizeDocument(content, basename(destination, '.md')));
      
      // Note: We're not deleting the original files, just copying them
      console.log(`Created ${destination}`);
    } else {
      console.log(`Source file not found: ${sourcePath}`);
    }
  }
}

// Standardize document format
function standardizeDocument(content: string, title: string): string {
  // Check if the document already has a title
  if (!content.trim().startsWith('# ')) {
    content = `# ${title.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}\n\n${content}`;
  }
  
  // Ensure there's a table of contents
  if (!content.includes('## Table of Contents') && !content.includes('## Contents')) {
    // Find the position after the introduction
    const introPos = content.indexOf('## ');
    if (introPos > 0) {
      const tocSection = '\n## Table of Contents\n\n- [Introduction](#introduction)\n';
      content = content.slice(0, introPos) + tocSection + content.slice(introPos);
    }
  }
  
  // Ensure there's an examples section if it doesn't exist
  if (!content.includes('## Examples') && !content.includes('## Example')) {
    content += '\n\n## Examples\n\nThis section will be expanded with practical examples.\n';
  }
  
  return content;
}

// Create content.json with all the content data
async function createContentJson() {
  console.log('Creating content.json...');
  
  const contentData: Record<string, { html: string, path: string }> = {};
  
  // Read all HTML files in the content directory
  await processContentDirectory(OUTPUT_DIR, contentData);
  
  // Write the content.json file
  const contentJsonPath = join(OUTPUT_DIR, 'content.json');
  await writeFile(contentJsonPath, JSON.stringify(contentData, null, 2));
  console.log(`Created ${contentJsonPath}`);
}

// Process a content directory recursively
async function processContentDirectory(dir: string, contentData: Record<string, { html: string, path: string }>) {
  if (!existsSync(dir)) {
    console.error(`Content directory not found: ${dir}`);
    return;
  }
  
  const files = readdirSync(dir, { withFileTypes: true });
  
  // Process each item
  for (const file of files) {
    const fullPath = join(dir, file.name);
    
    if (file.isDirectory()) {
      // Process subdirectory
      await processContentDirectory(fullPath, contentData);
    } else if (file.name.endsWith('.html')) {
      // Process HTML file
      const relativePath = relative(OUTPUT_DIR, fullPath);
      const routeId = relativePath.replace(/\.html$/, '');
      
      // Read the HTML content
      const html = readFileSync(fullPath, 'utf-8');
      
      // Add to content data
      contentData[routeId] = {
        html,
        path: `/${routeId === 'home' ? '' : routeId}`
      };
    }
  }
}

// Main function
async function main() {
  console.log('Starting markdown processor...');
  
  // Process all docs with new structure
  await processAllDocs();
  
  // Create content.json
  await createContentJson();
  
  console.log('Markdown processing complete!');
}

// Run the processor
main().catch(error => {
  console.error('Error processing markdown:', error);
  process.exit(1);
}); 