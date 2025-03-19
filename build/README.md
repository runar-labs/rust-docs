# Runar Documentation Website Builder

This directory contains the code to build the Runar documentation website, converting Markdown files from the `../markdown/` directory into a static HTML website in the `../website/` directory.

## Technology Stack

The website builder uses:
- **Bun**: JavaScript runtime and package manager
- **TypeScript**: For type-safe code
- **Marked**: For Markdown parsing
- **Custom Static Site Generator**: For converting Markdown to HTML

## Directory Structure

```
build/
├── src/                   # Source code for website components
├── public/                # Public files for the website
├── build.ts               # Main build script
├── md-processor.ts        # Markdown processing code
├── server.ts              # Development server
└── configuration files    # Package.json, tsconfig.json, etc.
```

## Input and Output

- **Input**: Markdown files from `../markdown/`
- **Output**: Generated HTML in `../website/`

## Building the Documentation

To build the website:

```bash
# Install dependencies
npm install

# Build the documentation
npm run build
```

This will:
1. Process all Markdown files from the `../markdown/` directory
2. Generate HTML files in the `../website/content/` directory
3. Create a `routes.json` file for navigation
4. Copy assets from `../markdown/assets/` to `../website/assets/`

## Development

For local development and preview:

```bash
# Start the development server
npm run dev
```

This will:
1. Build the site
2. Start a local server
3. Watch for changes in the Markdown files

## Scripts

- `npm run build`: Build the static site
- `npm run dev`: Start development server
- `npm run start`: Start production server
- `npm run clean`: Clean build artifacts

## Markdown Processing

The `md-processor.ts` script is responsible for:
1. Reading Markdown files from the `../markdown/` directory
2. Parsing frontmatter metadata
3. Converting Markdown to HTML
4. Generating navigation structure
5. Handling internal links between pages

## Customization

To customize the site appearance, modify:
- Templates in the `src/templates` directory
- CSS in the `public/assets/css` directory
- JavaScript components in the `src/components` directory 