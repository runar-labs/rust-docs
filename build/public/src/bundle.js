
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
              contentArea.innerHTML = `
                <div class="error-container">
                  <h2>Content Not Found</h2>
                  <p>Sorry, the requested content could not be loaded.</p>
                  <p><a href="#" class="btn btn-primary">Go to Home</a></p>
                </div>
              `;
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
  