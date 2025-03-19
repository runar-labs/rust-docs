<script lang="ts">
  import { onMount } from 'svelte';
  
  let currentPath = '';
  
  function updateCurrentPath() {
    currentPath = window.location.hash.slice(1) || '';
  }
  
  onMount(() => {
    updateCurrentPath();
    window.addEventListener('hashchange', updateCurrentPath);
    
    return () => {
      window.removeEventListener('hashchange', updateCurrentPath);
    };
  });
</script>

<header class="header">
  <div class="container">
    <div class="branding">
      <h1 class="logo">
        <a href="#/">
          <span class="logo-name">Kagi</span>
          <span class="tagline">Documentation</span>
        </a>
      </h1>
    </div>
    
    <div class="search-box">
      <form class="search-form">
        <input type="text" placeholder="Search the docs..." class="search-input">
        <button type="submit" class="search-btn"><i class="fa fa-search"></i></button>
      </form>
    </div>
    
    <nav class="main-nav">
      <ul class="navbar-items">
        <li class="nav-item">
          <a href="#/" class:active={currentPath === '' || currentPath === '/'}>Home</a>
        </li>
        <li class="nav-item">
          <a href="#/docs" class:active={currentPath === '/docs'}>Docs</a>
        </li>
        <li class="nav-item">
          <a href="#/components" class:active={currentPath === '/components'}>Components</a>
        </li>
        <li class="nav-item">
          <a href="#/charts" class:active={currentPath === '/charts'}>Charts</a>
        </li>
        <li class="nav-item">
          <a href="#/faqs" class:active={currentPath === '/faqs'}>FAQs</a>
        </li>
        <li class="nav-item">
          <a href="#/showcase" class:active={currentPath === '/showcase'}>Showcase</a>
        </li>
        <li class="nav-item">
          <a href="#/license" class:active={currentPath === '/license'}>License</a>
        </li>
      </ul>
    </nav>
  </div>
</header>

<style>
  .header {
    background-color: #40babd;
    color: #fff;
    padding: 15px 0;
    position: sticky;
    top: 0;
    z-index: 1000;
  }
  
  .container {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
  }
  
  .branding {
    margin-right: 20px;
  }
  
  .logo {
    margin: 0;
    font-size: 1.5rem;
    line-height: 1.2;
  }
  
  .logo a {
    color: #fff;
    text-decoration: none;
    display: flex;
    flex-direction: column;
  }
  
  .logo-name {
    font-weight: bold;
  }
  
  .tagline {
    font-size: 0.875rem;
    font-weight: normal;
    opacity: 0.8;
  }
  
  .search-box {
    flex: 0 0 250px;
    margin-right: auto;
  }
  
  .search-form {
    position: relative;
  }
  
  .search-input {
    width: 100%;
    height: 36px;
    padding: 0 10px;
    border: none;
    border-radius: 3px;
    background-color: rgba(255, 255, 255, 0.2);
    color: #fff;
  }
  
  .search-input::placeholder {
    color: rgba(255, 255, 255, 0.7);
  }
  
  .search-btn {
    position: absolute;
    right: 0;
    top: 0;
    height: 36px;
    width: 36px;
    background: none;
    border: none;
    color: #fff;
    cursor: pointer;
  }
  
  .main-nav {
    margin-left: auto;
  }
  
  .navbar-items {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
  }
  
  .nav-item {
    margin-left: 15px;
  }
  
  .nav-item a {
    color: #fff;
    text-decoration: none;
    padding: 5px;
    opacity: 0.8;
    transition: opacity 0.2s;
  }
  
  .nav-item a:hover, .nav-item a.active {
    opacity: 1;
    border-bottom: 2px solid #fff;
  }
  
  @media (max-width: 992px) {
    .container {
      flex-direction: column;
    }
    
    .branding, .search-box {
      margin-bottom: 15px;
      margin-right: 0;
      width: 100%;
    }
    
    .main-nav {
      width: 100%;
      margin-left: 0;
      margin-top: 10px;
    }
    
    .navbar-items {
      flex-wrap: wrap;
      justify-content: center;
    }
    
    .nav-item {
      margin: 5px 10px;
    }
  }
</style> 