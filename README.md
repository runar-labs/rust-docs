# Runar Documentation

This directory contains all documentation for the Runar project.

## Directory Structure

```
rust-docs/
├── specs/                 # Technical specifications and implementation plans
│   ├── under_construction/  # Work-in-progress specs and plans
│   └── final/               # Finalized specifications
├── testing/                # Testing documentation
│   └── macro_testing_approach.md  # Documentation for testing procedural macros
├── markdown/               # Source Markdown files for public documentation
│   ├── development/        # Developer documentation
│   ├── services/           # Service documentation
│   ├── core/               # Core concepts documentation
│   ├── features/           # Feature documentation
│   ├── getting-started/    # Tutorials and guides
│   ├── refactoring/        # Refactoring documentation
│   └── assets/             # Images and other assets
├── website/                # Generated documentation website (do not edit manually)
│   └── content/            # Generated HTML content from markdown
└── build/                  # Website builder code (MD to HTML conversion)
```

## Documentation Guidelines

1. **Public Documentation**
   - Place public-facing documentation in the `markdown/` directory
   - Organize content by topic in appropriate subdirectories
   - Follow the documentation guidelines in `markdown/guidelines.md`

2. **Work-in-Progress Specifications**
   - Place work-in-progress specifications in the `specs/under_construction/` directory
   - Use Markdown format for all documentation
   - Include status indicators at the top of documents (Draft, In Review, Final)

3. **Testing Documentation**
   - Document testing approaches and methodologies in the `testing/` directory
   - Include practical examples and code snippets

4. **Specification Format**
   - Use clear headings and sections
   - Include implementation details where appropriate
   - Add examples for complex functionality
   - Document design decisions and trade-offs

## Documentation Website

The `markdown` directory contains the source content, the `build` directory contains the code to transform markdown into HTML, and the `website` directory contains the generated output. **Do not manually edit files in the `website` directory** as they will be overwritten by the build process.

### Building the Documentation

*Note: This feature is under development*

```bash
# Navigate to the build directory
cd build

# Install dependencies
npm install

# Build the documentation
npm run build
```

## Contributing

When adding new documentation:

1. For public documentation, add files to the appropriate subdirectory in `markdown/`
2. For work-in-progress specifications, use the `specs/under_construction/` directory
3. Follow the naming convention: `feature_name_description.md`
4. Include the date and author at the top of the document
5. When a specification is finalized, move it to the `specs/final/` directory

## Recent Consolidation

This documentation structure has been recently consolidated and reorganized:

1. Separated source markdown files (`markdown/`) from the generated website (`website/`)
2. Separated website content from the build system (`build/`)
3. Testing documentation has been consolidated into comprehensive guides
4. Specifications have been organized by status (under construction/final)
5. Public documentation has been organized by topic in the markdown directory

This reorganization aims to make documentation more maintainable and reduce duplication 