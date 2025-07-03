# Runar Documentation Content

This directory contains all the Markdown content for the Runar project documentation.

## Directory Structure

```
markdown/
├── development/           # Developer documentation
├── services/              # Service-specific documentation
├── core/                  # Core concepts documentation
├── features/              # Feature documentation
├── getting-started/       # Getting started guides
├── assets/                # Images and other assets
├── guidelines.md          # Documentation guidelines
├── DOCUMENTATION_UPDATES.md  # History of documentation updates
└── index.md               # Main landing page
```

## Purpose

This directory contains the source Markdown files that are processed by the website builder in the `../build/` directory. The website builder converts these Markdown files into HTML for the documentation website.

## Contributing

When adding or modifying documentation:

1. Place files in the appropriate subdirectory
2. Follow the documentation guidelines in `guidelines.md`
3. Update the `DOCUMENTATION_UPDATES.md` file with your changes

## Building the Documentation

To build the website from these Markdown files:

```bash
# Navigate to the build directory
cd ../build

# Install dependencies
npm install

# Build the documentation
npm run build
```

This will process all Markdown files in this directory and generate HTML files in the build output directory. 