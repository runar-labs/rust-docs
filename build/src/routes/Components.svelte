<script lang="ts">
  import { onMount } from 'svelte';
  
  // Sample components
  const components = [
    {
      title: 'Buttons',
      id: 'buttons',
      content: `
        <p>Buttons are used to trigger actions in forms, dialogs, and more.</p>
        <div class="example">
          <button class="btn btn-primary">Primary</button>
          <button class="btn btn-secondary">Secondary</button>
          <button class="btn btn-success">Success</button>
          <button class="btn btn-danger">Danger</button>
          <button class="btn btn-warning">Warning</button>
          <button class="btn btn-info">Info</button>
        </div>
        <div class="code-block">
          <pre><code class="language-html">
&lt;button class="btn btn-primary"&gt;Primary&lt;/button&gt;
&lt;button class="btn btn-secondary"&gt;Secondary&lt;/button&gt;
&lt;button class="btn btn-success"&gt;Success&lt;/button&gt;
&lt;button class="btn btn-danger"&gt;Danger&lt;/button&gt;
&lt;button class="btn btn-warning"&gt;Warning&lt;/button&gt;
&lt;button class="btn btn-info"&gt;Info&lt;/button&gt;
          </code></pre>
        </div>
      `
    },
    {
      title: 'Alerts',
      id: 'alerts',
      content: `
        <p>Alerts provide contextual feedback messages for typical user actions.</p>
        <div class="example">
          <div class="alert alert-primary" role="alert">This is a primary alert</div>
          <div class="alert alert-secondary" role="alert">This is a secondary alert</div>
          <div class="alert alert-success" role="alert">This is a success alert</div>
          <div class="alert alert-danger" role="alert">This is a danger alert</div>
          <div class="alert alert-warning" role="alert">This is a warning alert</div>
          <div class="alert alert-info" role="alert">This is an info alert</div>
        </div>
        <div class="code-block">
          <pre><code class="language-html">
&lt;div class="alert alert-primary" role="alert"&gt;This is a primary alert&lt;/div&gt;
&lt;div class="alert alert-secondary" role="alert"&gt;This is a secondary alert&lt;/div&gt;
&lt;div class="alert alert-success" role="alert"&gt;This is a success alert&lt;/div&gt;
&lt;div class="alert alert-danger" role="alert"&gt;This is a danger alert&lt;/div&gt;
&lt;div class="alert alert-warning" role="alert"&gt;This is a warning alert&lt;/div&gt;
&lt;div class="alert alert-info" role="alert"&gt;This is an info alert&lt;/div&gt;
          </code></pre>
        </div>
      `
    },
    {
      title: 'Cards',
      id: 'cards',
      content: `
        <p>Cards provide a flexible and extensible content container with multiple variants and options.</p>
        <div class="example">
          <div class="card" style="width: 18rem;">
            <div class="card-body">
              <h5 class="card-title">Card title</h5>
              <h6 class="card-subtitle mb-2 text-muted">Card subtitle</h6>
              <p class="card-text">Some quick example text to build on the card title and make up the bulk of the card's content.</p>
              <a href="#" class="card-link">Card link</a>
              <a href="#" class="card-link">Another link</a>
            </div>
          </div>
        </div>
        <div class="code-block">
          <pre><code class="language-html">
&lt;div class="card" style="width: 18rem;"&gt;
  &lt;div class="card-body"&gt;
    &lt;h5 class="card-title"&gt;Card title&lt;/h5&gt;
    &lt;h6 class="card-subtitle mb-2 text-muted"&gt;Card subtitle&lt;/h6&gt;
    &lt;p class="card-text"&gt;Some quick example text to build on the card title and make up the bulk of the card's content.&lt;/p&gt;
    &lt;a href="#" class="card-link"&gt;Card link&lt;/a&gt;
    &lt;a href="#" class="card-link"&gt;Another link&lt;/a&gt;
  &lt;/div&gt;
&lt;/div&gt;
          </code></pre>
        </div>
      `
    }
  ];
  
  // Table of contents
  let toc = components.map(comp => ({ 
    title: comp.title, 
    id: comp.id 
  }));
  
  // Function to scroll to section
  function scrollToSection(id: string) {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  }
</script>

<div class="components-wrapper">
  <div class="container">
    <div class="components-header">
      <h1 class="components-heading">Components</h1>
      <div class="components-intro">
        <p>PrettyDocs includes various reusable components that you can use in your documentation. This page demonstrates some of the key components.</p>
      </div>
    </div>
    
    <div class="components-content">
      <div class="components-inner">
        <div class="row">
          <!-- Left sidebar for ToC -->
          <div class="col-lg-3 col-md-4">
            <div class="components-sidebar">
              <nav class="component-nav">
                <div id="component-nav-inner" class="component-nav-inner">
                  <h2 class="toc-heading">Components</h2>
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
              {#each components as component}
                <section id={component.id} class="component-section">
                  <h2 class="section-title">{component.title}</h2>
                  <div class="section-content">
                    <!-- Use @html to render HTML content from the section -->
                    {@html component.content}
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
  .components-wrapper {
    padding: 45px 0;
  }
  
  .components-header {
    margin-bottom: 30px;
  }
  
  .components-heading {
    font-size: 2rem;
    margin-bottom: 15px;
    font-weight: bold;
  }
  
  .components-intro {
    margin-bottom: 30px;
  }
  
  .components-sidebar {
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
  
  .component-section {
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
  
  .example {
    margin: 20px 0;
    padding: 20px;
    border: 1px solid #eee;
    border-radius: 4px;
  }
  
  .example .btn,
  .example .alert {
    margin-right: 10px;
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
    .components-sidebar {
      margin-bottom: 30px;
    }
  }
</style> 