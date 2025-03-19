<script lang="ts">
  import { onMount } from 'svelte';
  import Header from './components/Header.svelte';
  import Footer from './components/Footer.svelte';
  import Home from './routes/Home.svelte';
  import Docs from './routes/Docs.svelte';
  import Components from './routes/Components.svelte';
  import Charts from './routes/Charts.svelte';
  import Faqs from './routes/Faqs.svelte';
  import Showcase from './routes/Showcase.svelte';
  import License from './routes/License.svelte';
  
  // Simple routing
  let currentRoute = '';
  
  const routes = {
    '': Home,
    '/': Home,
    '/docs': Docs,
    '/components': Components,
    '/charts': Charts,
    '/faqs': Faqs,
    '/showcase': Showcase,
    '/license': License
  };
  
  function handleNavigation() {
    currentRoute = window.location.hash.slice(1) || '';
  }
  
  onMount(() => {
    handleNavigation();
    window.addEventListener('hashchange', handleNavigation);
    
    return () => {
      window.removeEventListener('hashchange', handleNavigation);
    };
  });
  
  $: RouteComponent = routes[currentRoute] || Home;
</script>

<div class="app">
  <Header />
  
  <main class="main-content">
    <svelte:component this={RouteComponent} />
  </main>
  
  <Footer />
</div>

<style>
  :global(body) {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen-Sans, Ubuntu, Cantarell, "Helvetica Neue", sans-serif;
    line-height: 1.6;
    color: #333;
    margin: 0;
    padding: 0;
    background-color: #f8f8f8;
  }
  
  :global(a) {
    color: #40babd;
    text-decoration: none;
  }
  
  :global(a:hover) {
    text-decoration: underline;
  }
  
  :global(h1, h2, h3, h4, h5, h6) {
    font-weight: 600;
    line-height: 1.4;
  }
  
  :global(.container) {
    max-width: 1170px;
    margin: 0 auto;
    padding: 0 15px;
  }
  
  :global(.row) {
    display: flex;
    flex-wrap: wrap;
    margin: 0 -15px;
  }
  
  :global(.col-md-6) {
    flex: 0 0 50%;
    max-width: 50%;
    padding: 0 15px;
    box-sizing: border-box;
  }
  
  :global(.col-lg-4) {
    flex: 0 0 33.333333%;
    max-width: 33.333333%;
    padding: 0 15px;
    box-sizing: border-box;
  }
  
  :global(.mb-4) {
    margin-bottom: 1.5rem;
  }
  
  :global(.mt-5) {
    margin-top: 3rem;
  }
  
  :global(.btn) {
    display: inline-block;
    font-weight: 400;
    text-align: center;
    white-space: nowrap;
    vertical-align: middle;
    user-select: none;
    border: 1px solid transparent;
    padding: 0.375rem 0.75rem;
    font-size: 1rem;
    line-height: 1.5;
    border-radius: 0.25rem;
    transition: all 0.2s ease-in-out;
    cursor: pointer;
  }
  
  :global(.btn-primary) {
    color: #fff;
    background-color: #40babd;
    border-color: #40babd;
  }
  
  :global(.btn-primary:hover) {
    background-color: #34a7aa;
    border-color: #309ca0;
  }
  
  :global(.btn-lg) {
    padding: 0.5rem 1rem;
    font-size: 1.25rem;
    line-height: 1.5;
    border-radius: 0.3rem;
  }
  
  :global(.text-center) {
    text-align: center;
  }
  
  .app {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
  }
  
  .main-content {
    flex: 1;
  }
</style> 