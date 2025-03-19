<script lang="ts">
  import { onMount } from 'svelte';
  
  // Docs sections
  const sections = [
    {
      title: 'Introduction',
      id: 'introduction',
      content: `
        <p>Welcome to the documentation for Kagi. This section provides an overview of the Kagi framework and its features.</p>
        <p>Kagi is a comprehensive framework that enables developers to build secure, distributed applications with ease. It provides a set of tools and libraries for building scalable and reliable systems.</p>
      `
    },
    {
      title: 'Installation',
      id: 'installation',
      content: `
        <div class="code-block">
          <pre><code class="language-bash">npm install kagi</code></pre>
        </div>
        <p>After installation, you can import the library in your project:</p>
        <div class="code-block">
          <pre><code class="language-javascript">import kagi from 'kagi';</code></pre>
        </div>
      `
    },
    {
      title: 'Basic Usage',
      id: 'basic-usage',
      content: `
        <p>Here's a simple example of how to use Kagi:</p>
        <div class="code-block">
          <pre><code class="language-javascript">
import { Node } from 'kagi';

// Create a new Kagi node
const node = new Node({
  id: 'my-node',
  config: {
    // Node configuration
  }
});

// Start the node
await node.start();

// Subscribe to a topic
node.subscribe('example-topic', (message) => {
  console.log('Received message:', message);
});

// Publish to a topic
node.publish('example-topic', { 
  hello: 'world' 
});
          </code></pre>
        </div>
      `
    },
    {
      title: 'Advanced Features',
      id: 'advanced-features',
      content: `
        <p>Kagi offers several advanced features:</p>
        <ul>
          <li><strong>End-to-end encryption</strong> - Secure communication between nodes</li>
          <li><strong>Distributed key-value storage</strong> - Store and retrieve data across the network</li>
          <li><strong>Service discovery</strong> - Automatically find and connect to other nodes</li>
          <li><strong>Fault tolerance</strong> - Built-in mechanisms for handling node failures</li>
        </ul>
      `
    }
  ];
  
  // Table of contents
  let toc = sections.map(section => ({ 
    title: section.title, 
    id: section.id 
  }));
  
  // Function to scroll to section
  function scrollToSection(id: string) {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  }
</script>

<div class="docs-wrapper">
  <div class="container">
    <div class="docs-header">
      <h1 class="docs-heading">Documentation <span class="docs-time">Last updated: March 16, 2025</span></h1>
      <div class="docs-intro">
        <p>This documentation provides everything you need to get started with Kagi.</p>
      </div>
    </div>
    
    <div class="docs-content">
      <div class="docs-inner">
        <div class="row">
          <!-- Left sidebar for ToC -->
          <div class="col-lg-3 col-md-4">
            <div class="docs-sidebar">
              <nav class="doc-nav">
                <div id="doc-nav-inner" class="doc-nav-inner">
                  <h2 class="toc-heading">Table of Contents</h2>
                  <ul class="toc-list list-unstyled">
                    {#each toc as item}
                      <li>
                        <a href="#{item.id}" on:click|preventDefault={() => scrollToSection(item.id)}>
                          {item.title}
                        </a>
                      </li>
                    {/each}
                  </ul>
                </div>
              </nav>
            </div>
          </div>
          
          <!-- Main content -->
          <div class="col-lg-9 col-md-8">
            <div class="content-area">
              {#each sections as section}
                <section id={section.id} class="doc-section">
                  <h2 class="section-title">{section.title}</h2>
                  <div class="section-content">
                    <!-- Use @html to render HTML content from the section -->
                    {@html section.content}
                  </div>
                </section>
              {/each}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>

<style>
  .docs-wrapper {
    padding: 45px 0;
  }
  
  .docs-header {
    margin-bottom: 30px;
  }
  
  .docs-heading {
    font-size: 2rem;
    margin-bottom: 15px;
    font-weight: bold;
  }
  
  .docs-time {
    color: #999;
    font-size: 14px;
    font-weight: normal;
  }
  
  .docs-intro {
    margin-bottom: 30px;
  }
  
  .docs-sidebar {
    background: #f5f5f5;
    padding: 15px;
    border-radius: 4px;
    margin-bottom: 30px;
  }
  
  .toc-heading {
    font-size: 18px;
    font-weight: bold;
    margin-bottom: 15px;
  }
  
  .toc-list li {
    margin-bottom: 10px;
  }
  
  .toc-list a {
    color: #666;
    text-decoration: none;
  }
  
  .toc-list a:hover {
    color: #40babd;
  }
  
  .doc-section {
    margin-bottom: 45px;
    padding-bottom: 30px;
    border-bottom: 1px solid #eee;
  }
  
  .section-title {
    font-size: 1.8rem;
    margin-bottom: 20px;
    color: #40babd;
  }
  
  .section-content {
    font-size: 16px;
    line-height: 1.6;
  }
  
  .section-content p {
    margin-bottom: 15px;
  }
  
  .section-content ul {
    margin-bottom: 15px;
  }
  
  .section-content li {
    margin-bottom: 10px;
  }
  
  .code-block {
    margin: 20px 0;
    background: #f5f5f5;
    border-radius: 4px;
    overflow: hidden;
  }
  
  .code-block pre {
    margin: 0;
    padding: 15px;
    overflow-x: auto;
  }
  
  .code-block code {
    font-family: Monaco, Consolas, "Andale Mono", "DejaVu Sans Mono", monospace;
    font-size: 14px;
  }
  
  @media (max-width: 767px) {
    .docs-sidebar {
      margin-bottom: 30px;
    }
  }
</style> 