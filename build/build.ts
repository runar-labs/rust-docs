import { mkdir, copyFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { spawnSync } from "node:child_process";

// Update paths to use website directory
const WEBSITE_DIR = "../website";
const ROOT_DIR = "./";
const SRC_DIR = "./src";

// Files from root that should be copied to website
const ROOT_FILES_TO_COPY = [
  "favicon.svg",
  "index.html",
  ".nojekyll",
  "CNAME"
];

async function ensureDirectory(dir: string) {
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }
}

async function copyRootFiles() {
  console.log("Copying files from root to website...");
  for (const file of ROOT_FILES_TO_COPY) {
    const rootSource = join(ROOT_DIR, file);
    const dest = join(WEBSITE_DIR, file);
    
    if (existsSync(rootSource) && !existsSync(dest)) {
      await copyFile(rootSource, dest);
      console.log(`Copied ${rootSource} to ${dest}`);
    } else {
      console.log(`File ${file} already exists in website or not found in root`);
    }
  }
}

async function createJsFiles() {
  console.log("Creating JS files...");
  
  // Create a bundle.js with dynamic route handling
  const bundleJs = `
    document.addEventListener('DOMContentLoaded', function() {
      console.log('Kagi Documentation site loaded');
      
      // Fetch the available routes
      fetch('/content/routes.json')
        .then(response => response.json())
        .then(routes => {
          // Create navigation links
          setupNavigation(routes);
          
          // Load initial content only if we're not on the home page
          const route = getCurrentRoute();
          if (route && route !== 'home') {
            loadContent(route);
            toggleView('docs');
          } else {
            // On home page, just show the landing view
            toggleView('landing');
          }
        })
        .catch(error => {
          console.error('Error loading routes:', error);
        });
      
      // Toggle between landing page and docs view
      function toggleView(view) {
        const landingElements = document.querySelectorAll('.landing-only');
        const docsElements = document.querySelectorAll('.docs-only');
        
        if (view === 'landing') {
          landingElements.forEach(el => el.style.display = 'block');
          docsElements.forEach(el => el.style.display = 'none');
        } else {
          landingElements.forEach(el => el.style.display = 'none');
          docsElements.forEach(el => el.style.display = 'block');
        }
      }
      
      // Set up navigation based on available routes
      function setupNavigation(routes) {
        const navContainer = document.querySelector('nav ul.navbar-items');
        if (!navContainer) return;
        
        // Save the original navigation for the landing page
        const originalNav = navContainer.innerHTML;
        
        // Create a landing nav with minimal items
        const landingNav = document.createElement('ul');
        landingNav.className = 'navbar-items landing-nav landing-only';
        landingNav.innerHTML = '<li class="nav-item"><a href="#" class="active">Home</a></li>' +
          '<li class="nav-item"><a href="#/getting-started/overview">Documentation</a></li>' +
          '<li class="nav-item"><a href="#/getting-started/quickstart">Quick Start</a></li>' +
          '<li class="nav-item"><a href="https://github.com/kagi-framework/kagi" target="_blank">GitHub</a></li>';
        
        // Create a basic docs nav for the top menu when in docs mode
        const docsTopNav = document.createElement('ul');
        docsTopNav.className = 'navbar-items docs-top-nav docs-only';
        docsTopNav.innerHTML = '<li class="nav-item"><a href="#">Home</a></li>' +
          '<li class="nav-item"><a href="#/getting-started/overview" class="active">Documentation</a></li>' +
          '<li class="nav-item"><a href="#/getting-started/quickstart">Quick Start</a></li>' +
          '<li class="nav-item"><a href="https://github.com/kagi-framework/kagi" target="_blank">GitHub</a></li>';
        
        // Create the sidebar navigation for docs
        const sidebar = document.getElementById('docs-sidebar');
        if (sidebar) {
          // Create a navigation for the docs sidebar
          const sidebarNav = document.createElement('ul');
          sidebarNav.className = 'navbar-items sidebar-nav';
          
          let currentCategory = '';
          
          // Add navigation items to the sidebar nav
          routes.forEach(route => {
            // Check if this is a category header
            if (route.category && route.id === '') {
              // Add a category divider if it's a new category
              if (currentCategory !== route.category) {
                currentCategory = route.category;
                
                const divider = document.createElement('li');
                divider.className = 'nav-divider';
                divider.innerHTML = '<span>' + route.title + '</span>';
                sidebarNav.appendChild(divider);
              }
              return; // Skip creating a link for category headers
            }
            
            const li = document.createElement('li');
            li.className = 'nav-item';
            
            // Add category as a data attribute for styling
            if (route.category) {
              li.dataset.category = route.category;
            }
            
            const a = document.createElement('a');
            a.href = route.id === 'home' ? '#' : '#/' + route.id;
            a.textContent = route.title;
            
            // Set active class for current route
            if (getCurrentRoute() === (route.id === 'home' ? '' : route.id)) {
              a.classList.add('active');
            }
            
            a.addEventListener('click', function(e) {
              e.preventDefault();
              
              // Update active class
              document.querySelectorAll('.sidebar-nav a').forEach(link => {
                link.classList.remove('active');
              });
              this.classList.add('active');
              
              // Update URL without page reload
              const hash = this.getAttribute('href');
              if (hash !== '#') {
                window.history.pushState(null, '', hash);
                // Switch to docs view
                toggleView('docs');
              } else {
                window.history.pushState(null, '', '/');
                // Switch to landing view
                toggleView('landing');
              }
              
              // Load content for the selected route
              const route = hash.replace('#/', '').replace('#', '') || 'home';
              if (route !== 'home') {
                loadContent(route);
              }
            });
            
            li.appendChild(a);
            sidebarNav.appendChild(li);
          });
          
          // Add the sidebar nav to the sidebar
          sidebar.appendChild(sidebarNav);
        }
        
        // Add click handler to the "Get Started" button
        const getStartedBtn = document.querySelector('.hero-cta a.btn-primary');
        if (getStartedBtn) {
          getStartedBtn.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Switch to documentation view with the getting-started page
            toggleView('docs');
            loadContent('getting-started/overview');
            window.history.pushState(null, '', '#/getting-started/overview');
            
            // Update active navigation
            document.querySelectorAll('.sidebar-nav a').forEach(link => {
              link.classList.remove('active');
              if (link.getAttribute('href') === '#/getting-started/overview') {
                link.classList.add('active');
              }
            });
          });
        }
        
        // Clear and add both navs to the navigation container
        navContainer.innerHTML = '';
        navContainer.appendChild(landingNav);
        navContainer.appendChild(docsTopNav);
        
        // Initially show the appropriate view
        const currentRoute = getCurrentRoute();
        if (currentRoute && currentRoute !== 'home') {
          toggleView('docs');
        } else {
          toggleView('landing');
        }
      }
      
      // Get the current route from the URL
      function getCurrentRoute() {
        const hash = window.location.hash;
        return hash.replace('#/', '').replace('#', '') || '';
      }
      
      // Load initial content based on the URL
      function loadInitialContent() {
        const route = getCurrentRoute();
        if (route && route !== 'home') {
          loadContent(route);
          toggleView('docs');
        } else {
          toggleView('landing');
        }
      }
      
      // Load content for a specific route
      function loadContent(route) {
        const contentArea = document.querySelector('.docs-content');
        if (!contentArea) return;
        
        // Show loading indicator
        contentArea.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i></div>';
        
        // Fetch the content
        fetch('/content/' + route + '.html')
          .catch(() => {
            // Try alternative path if the direct path fails
            return fetch('/content/' + route.replace('-', '/') + '.html');
          })
          .then(response => response.text())
          .then(html => {
            // Insert the content into the page
            if (contentArea) {
              contentArea.innerHTML = html;
              
              // Add title to top of content area
              const firstHeading = contentArea.querySelector('h1');
              if (firstHeading) {
                document.title = firstHeading.textContent + ' - Kagi Documentation';
              }
              
              // Convert mermaid code blocks to mermaid divs
              document.querySelectorAll('pre code.language-mermaid').forEach(codeBlock => {
                const content = codeBlock.textContent;
                const mermaidDiv = document.createElement('div');
                mermaidDiv.className = 'mermaid';
                mermaidDiv.textContent = content;
                
                // Replace the pre element with the mermaid div
                const preElement = codeBlock.parentElement;
                preElement.parentElement.replaceChild(mermaidDiv, preElement);
              });
              
              // Scroll to top
              window.scrollTo(0, 0);
              
              // Initialize Mermaid diagrams if present
              if (window.mermaid) {
                try {
                  window.mermaid.init(undefined, document.querySelectorAll('.mermaid'));
                } catch (e) {
                  console.error('Error initializing Mermaid diagrams:', e);
                }
              }
              
              // Handle internal links
              setupInternalLinks();
            }
          })
          .catch(error => {
            console.error('Error loading content:', error);
            if (contentArea) {
              contentArea.innerHTML = \`
                <div class="error-container">
                  <h2>Content Not Found</h2>
                  <p>Sorry, the requested content could not be loaded.</p>
                  <p><a href="#" class="btn btn-primary">Go to Home</a></p>
                </div>
              \`;
            }
          });
      }
      
      // Set up click handlers for internal links
      function setupInternalLinks() {
        const internalLinks = document.querySelectorAll('.docs-content a:not([href^="http"])');
        internalLinks.forEach(link => {
          const href = link.getAttribute('href');
          if (href && !href.startsWith('#')) {
            link.addEventListener('click', function(e) {
              e.preventDefault();
              
              // Load the linked content
              const route = href;
              window.history.pushState(null, '', '#/' + route);
              loadContent(route);
              
              // Update active navigation if possible
              document.querySelectorAll('.sidebar-nav a').forEach(navLink => {
                navLink.classList.remove('active');
                if (navLink.getAttribute('href') === '#/' + route) {
                  navLink.classList.add('active');
                }
              });
            });
          }
        });
      }
      
      // Handle back/forward browser navigation
      window.addEventListener('popstate', function() {
        const route = getCurrentRoute() || 'home';
        
        if (route === 'home') {
          toggleView('landing');
        } else {
          toggleView('docs');
          loadContent(route);
        }
        
        // Update active navigation
        document.querySelectorAll('.sidebar-nav a, .navbar-items a').forEach(link => {
          link.classList.remove('active');
          const linkRoute = link.getAttribute('href').replace('#/', '').replace('#', '') || 'home';
          if (linkRoute === route) {
            link.classList.add('active');
          }
        });
      });
    });
  `;
  
  // Create a simple main.js
  const mainJs = `
    document.addEventListener('DOMContentLoaded', function() {
      console.log('Main module loaded');
      
      // Basic app initialization
      const app = document.getElementById('app');
      if (app) {
        console.log('App container found');
      }
    });
  `;
  
  // Create src directory in public if it doesn't exist
  await ensureDirectory(join(WEBSITE_DIR, "src"));
  
  // Write bundle.js to public/src directory
  const bundlePath = join(WEBSITE_DIR, "src", "bundle.js");
  await Bun.write(bundlePath, bundleJs);
  console.log(`Created ${bundlePath}`);
  
  // Write main.js to public/src directory
  const mainPath = join(WEBSITE_DIR, "src", "main.js");
  await Bun.write(mainPath, mainJs);
  console.log(`Created ${mainPath}`);
}

async function ensureAssetDirectories() {
  console.log("Ensuring asset directories exist...");
  
  // Create assets/css directory if it doesn't exist
  const cssDir = join(WEBSITE_DIR, "assets", "css");
  await ensureDirectory(cssDir);
  
  // Check if prettydocs.css exists, if not create it
  const cssPath = join(cssDir, "prettydocs.css");
  if (!existsSync(cssPath)) {
    // Create a basic CSS file if it doesn't exist
    const basicCss = `
      /* PrettyDocs CSS */
      body {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen-Sans, Ubuntu, Cantarell, "Helvetica Neue", sans-serif;
        line-height: 1.6;
        color: #333;
        margin: 0;
        padding: 0;
        background-color: #f8f8f8;
      }
      
      .header {
        background-color: #40babd;
        color: white;
        padding: 20px 0;
      }
      
      .header-container {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      
      .branding {
        display: flex;
        align-items: center;
      }
      
      .logo {
        margin: 0;
        font-size: 24px;
      }
      
      .logo a {
        color: white;
        text-decoration: none;
        display: flex;
        flex-direction: column;
      }
      
      .logo-name {
        font-weight: bold;
      }
      
      .tagline {
        font-size: 16px;
        font-weight: normal;
      }
      
      .main-nav {
        display: flex;
      }
      
      .navbar-items {
        display: flex;
        list-style: none;
        margin: 0;
        padding: 0;
      }
      
      .nav-item {
        margin-left: 15px;
      }
      
      .nav-item a {
        color: white;
        text-decoration: none;
        padding: 5px 10px;
        border-radius: 4px;
        transition: background-color 0.3s;
      }
      
      .nav-item a:hover, .nav-item a.active {
        background-color: rgba(255, 255, 255, 0.2);
      }
      
      .content-wrapper {
        padding: 40px 0;
        min-height: 500px;
      }
      
      .footer {
        background-color: #26363c;
        color: rgba(255, 255, 255, 0.6);
        padding: 20px 0;
        text-align: center;
      }
      
      .footer a {
        color: #fff;
      }
      
      /* Content styles */
      #content-area {
        max-width: 800px;
        margin: 0 auto;
      }
      
      #content-area h1 {
        color: #40babd;
        margin-bottom: 20px;
      }
      
      #content-area h2 {
        color: #333;
        margin-top: 30px;
        margin-bottom: 15px;
        padding-bottom: 10px;
        border-bottom: 1px solid #eee;
      }
      
      #content-area h3 {
        color: #555;
        margin-top: 25px;
      }
      
      #content-area a {
        color: #40babd;
        text-decoration: none;
      }
      
      #content-area a:hover {
        text-decoration: underline;
      }
      
      #content-area pre {
        background-color: #f8f9fa;
        border-radius: 4px;
        padding: 15px;
        overflow-x: auto;
        margin-bottom: 20px;
      }
      
      #content-area code {
        font-family: Menlo, Monaco, Consolas, "Courier New", monospace;
        background-color: rgba(0, 0, 0, 0.05);
        padding: 2px 4px;
        border-radius: 3px;
      }
      
      #content-area .code-block {
        background-color: #f8f9fa;
        border-radius: 4px;
        padding: 15px;
        overflow-x: auto;
        margin-bottom: 20px;
        font-family: Menlo, Monaco, Consolas, "Courier New", monospace;
      }
      
      .loading {
        display: flex;
        justify-content: center;
        align-items: center;
        min-height: 300px;
      }
      
      .loading i {
        color: #40babd;
        font-size: 2rem;
      }
      
      .error-container {
        text-align: center;
        padding: 50px 0;
      }
      
      .btn {
        display: inline-block;
        padding: 8px 16px;
        border-radius: 4px;
        text-decoration: none;
        text-align: center;
        cursor: pointer;
        font-weight: 500;
      }
      
      .btn-primary {
        background-color: #40babd;
        color: white;
        border: none;
      }
      
      .btn-primary:hover {
        background-color: #38a7a9;
      }
    `;
    
    await Bun.write(cssPath, basicCss);
    console.log(`Created ${cssPath}`);
  }
}

async function updateHtmlReferences() {
  console.log("Checking HTML references...");
  
  const htmlPath = join(WEBSITE_DIR, "index.html");
  if (!existsSync(htmlPath)) {
    console.log(`HTML file not found: ${htmlPath}`);
    return;
  }
  
  // Read HTML file
  const html = await Bun.file(htmlPath).text();
  
  // Replace TypeScript reference with JavaScript
  const updatedHtml = html.replace(
    /<script type="module" src="\/src\/main.ts"><\/script>/,
    '<script src="/src/main.js"></script>'
  );
  
  // Add reference to bundle.js if not present
  const finalHtml = updatedHtml.includes("/src/bundle.js") 
    ? updatedHtml 
    : updatedHtml.replace(
        '</body>',
        '  <script src="/src/bundle.js"></script>\n</body>'
      );
      
  // Update the HTML to include a content area
  const contentAreaHtml = finalHtml.includes('id="content-area"')
    ? finalHtml
    : finalHtml.replace(
        '<div class="hero">',
        '<div id="content-area">\n        <div class="loading"><i class="fas fa-spinner fa-spin"></i></div>\n        <div class="hero">'
      ).replace(
        '</div>\n    </div>',
        '</div>\n      </div>\n    </div>'
      );
  
  // Write updated HTML
  if (html !== contentAreaHtml) {
    await Bun.write(htmlPath, contentAreaHtml);
    console.log(`Updated references in ${htmlPath}`);
  } else {
    console.log("HTML references are already correct");
  }
}

async function ensureContentDirectory() {
  console.log("Ensuring content directory exists...");
  
  // Create content directory if it doesn't exist
  const contentDir = join(WEBSITE_DIR, "content");
  await ensureDirectory(contentDir);
  
  return contentDir;
}

async function processMdFiles() {
  console.log("Processing markdown files...");
  
  // Ensure content directory exists first
  await ensureContentDirectory();
  
  // Run the markdown processor script
  const result = spawnSync('bun', ['md-processor.ts'], {
    stdio: 'inherit',
    cwd: process.cwd()
  });
  
  if (result.status !== 0) {
    console.error('Error processing markdown files');
    return false;
  }
  
  console.log("Markdown processing complete!");
  return true;
}

async function ensureIndexHtml() {
  console.log("Checking for index.html...");
  
  const publicIndexPath = join(WEBSITE_DIR, "index.html");
  const rootIndexPath = join(ROOT_DIR, "index.html");
  
  if (!existsSync(publicIndexPath) && existsSync(rootIndexPath)) {
    console.log("Copying index.html from project root to public folder...");
    await copyFile(rootIndexPath, publicIndexPath);
    console.log(`Created ${publicIndexPath}`);
  } else if (!existsSync(publicIndexPath) && !existsSync(rootIndexPath)) {
    console.error("Error: index.html not found in project root or public folder!");
    console.log("Creating a basic index.html file...");
    
    // Create a basic index.html file
    const basicHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Kagi Documentation</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
  <link rel="stylesheet" href="/assets/css/prettydocs.css">
  <link rel="icon" type="image/svg+xml" href="/favicon.svg">
  <!-- Mermaid JS for diagrams -->
  <script src="https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.min.js"></script>
  <script>
    document.addEventListener('DOMContentLoaded', function() {
      mermaid.initialize({
        startOnLoad: true,
        theme: 'default',
        securityLevel: 'loose',
        flowchart: { useMaxWidth: true }
      });
      
      // Re-initialize mermaid when content is dynamically loaded
      window.initMermaid = function() {
        // Wait a moment for DOM to be ready
        setTimeout(function() {
          // Check if mermaid is initialized
          if (typeof mermaid !== 'undefined') {
            mermaid.contentLoaded();
          }
        }, 250);
      };
    });
  </script>
  <style>
    /* Additional styles for markdown content */
    .content-wrapper {
      padding: 2rem 0;
    }
    
    .code-block {
      background-color: #f8f9fa;
      border-radius: 4px;
      padding: 1rem;
      margin-bottom: 1.5rem;
      overflow-x: auto;
      font-family: monospace;
    }
    
    #content-area h1 {
      margin-bottom: 1.5rem;
      color: #40babd;
    }
    
    #content-area h2 {
      margin-top: 2rem;
      margin-bottom: 1rem;
      padding-bottom: 0.5rem;
      border-bottom: 1px solid #eee;
    }
    
    #content-area h3 {
      margin-top: 1.5rem;
      margin-bottom: 0.75rem;
    }
    
    #content-area pre {
      background-color: #f8f9fa;
      border-radius: 4px;
      padding: 1rem;
      overflow-x: auto;
    }
    
    #content-area img {
      max-width: 100%;
      height: auto;
      border-radius: 4px;
      margin: 1rem 0;
    }
    
    #content-area ul, #content-area ol {
      margin-bottom: 1.5rem;
    }
    
    #content-area blockquote {
      background-color: #f8f9fa;
      border-left: 4px solid #40babd;
      padding: 1rem;
      margin: 1.5rem 0;
    }
    
    /* Mermaid diagram styling */
    .mermaid {
      margin: 2rem auto;
      text-align: center;
      overflow-x: auto;
      max-width: 100%;
    }
    
    .loading {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 300px;
    }
    
    .loading i {
      color: #40babd;
      font-size: 2rem;
    }
    
    /* Navigation */
    .header {
      background-color: #40babd;
      color: white;
      padding: 1.5rem 0;
    }
    
    .header-container {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .branding {
      display: flex;
      align-items: center;
    }
    
    .logo {
      margin: 0;
      font-size: 24px;
    }
    
    .logo a {
      color: white;
      text-decoration: none;
      display: flex;
      flex-direction: column;
    }
    
    .logo-name {
      font-weight: bold;
    }
    
    .tagline {
      font-size: 14px;
      opacity: 0.8;
    }
    
    .main-nav {
      display: flex;
    }
    
    .navbar-items {
      display: flex;
      list-style: none;
      margin: 0;
      padding: 0;
    }
    
    .nav-item {
      margin-left: 10px;
    }
    
    .nav-item a {
      color: white;
      text-decoration: none;
      padding: 5px 10px;
      border-radius: 4px;
      transition: background-color 0.3s;
      font-size: 14px;
    }
    
    .nav-item a:hover, .nav-item a.active {
      background-color: rgba(255, 255, 255, 0.2);
    }
    
    /* Category dividers in navigation */
    .nav-divider {
      width: 100%;
      padding: 8px 0 4px;
      margin-top: 10px;
      display: block;
      color: rgba(255, 255, 255, 0.9);
      font-weight: bold;
      font-size: 13px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.2);
    }
    
    .nav-divider:first-child {
      margin-top: 0;
    }
    
    /* Indent sub-category items */
    .nav-item[data-category] {
      margin-left: 15px;
    }
    
    /* Footer */
    .footer {
      background-color: #26363c;
      color: rgba(255, 255, 255, 0.6);
      padding: 20px 0;
      text-align: center;
      margin-top: 3rem;
    }
    
    .footer a {
      color: #fff;
    }
    
    /* Responsive */
    @media (max-width: 768px) {
      .header-container {
        flex-direction: column;
      }
      
      .main-nav {
        margin-top: 1rem;
      }
      
      .navbar-items {
        flex-wrap: wrap;
        justify-content: center;
      }
      
      .nav-item {
        margin: 5px;
      }
    }
  </style>
</head>
<body>
  <div id="app">
    <!-- Header with navigation -->
    <header class="header">
      <div class="container header-container">
        <div class="branding">
          <h1 class="logo">
            <a href="#">
              <span class="logo-name">Kagi</span>
              <span class="tagline">Documentation</span>
            </a>
          </h1>
        </div>
        <nav class="main-nav">
          <ul class="navbar-items">
            <!-- Navigation items will be dynamically populated -->
            <li class="nav-item"><a href="#" class="active">Loading...</a></li>
          </ul>
        </nav>
      </div>
    </header>
    
    <!-- Main content area -->
    <main class="content-wrapper">
      <div class="container">
        <div id="content-area">
          <!-- Content will be loaded dynamically -->
          <div class="loading">
            <i class="fas fa-spinner fa-spin"></i>
          </div>
        </div>
      </div>
    </main>
    
    <!-- Footer -->
    <footer class="footer">
      <div class="container">
        <div class="copyright">
          <p>&copy; 2023-2025 Kagi Inc. All rights reserved.</p>
        </div>
      </div>
    </footer>
  </div>
  
  <!-- Load scripts -->
  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>
  <script src="/src/bundle.js"></script>
  <script src="/src/main.js"></script>
</body>
</html>`;
    
    await Bun.write(publicIndexPath, basicHtml);
    console.log(`Created basic ${publicIndexPath}`);
  }
}

async function build() {
  console.log("Starting build process...");
  
  // Ensure public directory exists
  await ensureDirectory(WEBSITE_DIR);
  
  // Copy necessary files from root to public
  await copyRootFiles();
  
  // Ensure index.html exists
  await ensureIndexHtml();
  
  // Ensure all required directories exist
  await ensureAssetDirectories();
  
  // Create JS files
  await createJsFiles();
  
  // Update HTML if needed
  await updateHtmlReferences();
  
  // Process markdown files
  const mdSuccess = await processMdFiles();
  if (!mdSuccess) {
    console.warn("Warning: Markdown processing encountered errors");
  }
  
  console.log("Build completed successfully!");
}

build().catch(error => {
  console.error("Build failed:", error);
  process.exit(1);
}); 