import { serve } from "bun";
import { existsSync } from "node:fs";
import { join, extname } from "node:path";

const PORT = process.env.PORT || 3000;
// Simplified: only use public and root directories
const STATIC_DIRS = ["./public", "./"];

// MIME type mapping
const MIME_TYPES: Record<string, string> = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "application/javascript",
  ".mjs": "application/javascript",
  ".ts": "application/javascript",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".txt": "text/plain",
  ".pdf": "application/pdf",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".eot": "application/vnd.ms-fontobject",
  ".otf": "font/otf",
  ".map": "application/json",
};

function getMimeType(path: string): string {
  const ext = extname(path).toLowerCase();
  const mimeType = MIME_TYPES[ext] || "application/octet-stream";
  
  // Special handling for TypeScript module files
  if (ext === ".ts" && path.includes("main.ts")) {
    console.log(`Serving TypeScript module: ${path} with MIME type application/javascript`);
    return "application/javascript";
  }
  
  return mimeType;
}

serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);
    let path = url.pathname;
    
    // Print debugging info about the request
    console.log(`Request: ${req.method} ${path}`);
    
    // Handle root path
    if (path === "/") {
      path = "/index.html";
    }
    
    // Try to serve the file from any of the static directories
    for (const dir of STATIC_DIRS) {
      const filePath = join(dir, path);
      if (existsSync(filePath)) {
        const mimeType = getMimeType(filePath);
        console.log(`Serving ${filePath} with MIME type ${mimeType}`);
        
        // If it's a module script, make sure we set the proper MIME type
        const headers: Record<string, string> = {
          "Content-Type": mimeType,
        };
        
        // For TypeScript files, we need to transform them on the fly
        if (path.endsWith(".ts")) {
          // Read the file and serve its content directly with proper MIME type
          try {
            const text = await Bun.file(filePath).text();
            return new Response(text, { headers });
          } catch (error) {
            console.error(`Error reading TypeScript file: ${filePath}`, error);
            return new Response("Error reading file", { status: 500 });
          }
        }
        
        return new Response(Bun.file(filePath), { headers });
      }
    }
    
    // If file not found, serve index.html (for SPA routing) if not a file request
    if (!path.includes(".")) {
      for (const dir of STATIC_DIRS) {
        const indexPath = join(dir, "index.html");
        if (existsSync(indexPath)) {
          console.log(`Routing to index.html for path ${path}`);
          return new Response(Bun.file(indexPath), {
            headers: {
              "Content-Type": "text/html",
            },
          });
        }
      }
    }
    
    // Return 404 if no file is found
    console.log(`404 Not Found: ${path}`);
    return new Response("File not found", { status: 404 });
  },
});

console.log(`Server running at http://localhost:${PORT}`); 