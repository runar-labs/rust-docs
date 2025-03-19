# Kagi Documentation Site

A documentation site for the Kagi framework based on the PrettyDocs theme. This project uses Bun for all development and build processes.

## Prerequisites

- [Bun](https://bun.sh/) installed on your system
- Node.js (for some dependencies, though Bun is used for running)

## Getting Started

1. Clone the repository
2. Navigate to the kagi-docs directory
3. Install dependencies:

```bash
bun install
```

## Development

To run the development server with hot reloading:

```bash
bun run dev
```

This will start a server at http://localhost:3000 that watches for changes.

## Building the Site

To build the site (convert markdown to HTML and generate JavaScript files):

```bash
bun run build
```

This will:
1. Process all markdown files from the `/docs` directory
2. Generate HTML files in the `/public/content` directory
3. Create a `routes.json` file for navigation
4. Ensure all necessary assets are in the `public` directory

## Serving the Site

To serve the site:

```bash
bun run start
```

This will serve the files from the `public` directory at http://localhost:3000.

## Project Structure

- `docs/` - Markdown documentation files (outside of kagi-docs folder)
- `public/` - All static files and generated assets
  - `assets/` - CSS, images, and other static resources
  - `src/` - Generated JavaScript files
  - `content/` - Generated HTML files from markdown
  - `favicon.svg` - Site favicon
  - `index.html` - Main HTML template
- `md-processor.ts` - Script to convert markdown files to HTML
- `server.ts` - Bun static file server
- `build.ts` - Build script

## Available Scripts

- `bun run dev` - Start development server with hot reloading
- `bun run start` - Start production server
- `bun run build` - Build the site (convert markdown and generate assets)
- `bun run clean` - Remove generated files
- `bun run md` - Run the markdown processor directly

## Markdown Processing

The documentation site automatically converts markdown files from the `/docs` directory into HTML. Here's how it works:

1. The build process runs `md-processor.ts`
2. Markdown files are processed using the `marked` library
3. Each markdown file is converted to HTML and saved in `/public/content`
4. A `routes.json` file is generated for navigation
5. Links within markdown files are processed to work with the dynamic navigation system

### Adding New Documentation

To add new documentation:

1. Add your markdown files to the `/docs` directory
2. Run `bun run build` to process the files
3. The new content will automatically appear in the navigation

### Markdown Features

The processor supports:

- Standard Markdown syntax
- Code blocks with syntax highlighting
- Internal links between documentation pages
- Images and tables
- Headers with automatic ID generation for linking

## Dynamic Content Loading

The site uses a dynamic content loading system:

1. When a user clicks a navigation link, the site fetches the corresponding HTML file
2. The content is injected into the page without a full page reload
3. Internal links within the content are processed to use the same system
4. Browser history is updated to allow back/forward navigation

Benefits of this approach:

- Fast page loads
- Clean URLs using hash navigation
- Seamless reading experience when moving between documentation pages

## Recent Changes and Fixes

### Added Markdown Processing
- Added support for processing existing markdown files from `/docs`
- Created a dynamic navigation system based on available documentation
- Implemented internal link handling for seamless navigation

### Simplified Folder Structure
- Removed the redundant `dist` folder, using only `public` for all static files
- Server now looks in both `public` and root folders
- Build script now outputs directly to the `public` folder

### Fixed MIME Type Issues
- Updated server.ts to handle module scripts properly
- Switched from TypeScript modules to plain JavaScript to avoid MIME type issues
- Added detailed logging to help diagnose server issues

### Improved Styling and Navigation
- Enhanced CSS for better markdown rendering
- Added responsive design for mobile devices
- Improved navigation UI with active state indicators
- Enhanced loading indicators and error pages

## Troubleshooting

### Markdown Not Converting Properly

If your markdown isn't being converted properly:

1. Check that your markdown file is in the `/docs` directory (one level up from kagi-docs)
2. Make sure the file has a `.md` extension
3. Run `bun run md` to run the markdown processor directly and check for errors
4. Verify that the content directory exists at `/public/content`

### Missing Navigation Items

If navigation items are missing:

1. Make sure you've run `bun run build` after adding new markdown files
2. Check that `/public/content/routes.json` exists and contains your routes
3. Verify that the corresponding HTML files exist in `/public/content`

### Internal Links Not Working

If links between documentation pages aren't working:

1. Make sure internal links use the route ID, not the full filename
2. Route IDs are generated from filenames by:
   - Converting to lowercase
   - Replacing spaces and special characters with hyphens
   - Removing the `.md` extension
3. Example: `[Architecture](architecture)` not `[Architecture](Architecture.md)`

### JavaScript Module MIME Type Issues

If your application shows a blank page with console errors like "Failed to load module script: Expected MIME type 'application/javascript'":

1. This issue has been resolved by switching from TypeScript modules to plain JavaScript files
2. Run `bun run build` to generate all necessary JavaScript files
3. If the issue persists, check that the server is serving files with the correct MIME type

## Notes

- The build process must be run whenever changes are made to the markdown files
- The server automatically serves the generated HTML files with the correct MIME types
- The site will gracefully fallback to the home page if a route doesn't exist
