<script lang="ts">
  import { onMount } from 'svelte';
</script>

<div class="license-wrapper">
  <div class="container">
    <div class="license-header">
      <h1 class="license-heading">License & Credits</h1>
      <div class="license-intro">
        <p>Information about the Kagi framework license and acknowledgments for the tools and libraries that make it possible.</p>
      </div>
    </div>
    
    <div class="license-content">
      <div class="license-section">
        <h2 id="license">License</h2>
        <div class="license-card">
          <h3>MIT License</h3>
          <p>Copyright (c) 2023-2025 Kagi Inc.</p>
          <p>
            Permission is hereby granted, free of charge, to any person obtaining a copy
            of this software and associated documentation files (the "Software"), to deal
            in the Software without restriction, including without limitation the rights
            to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
            copies of the Software, and to permit persons to whom the Software is
            furnished to do so, subject to the following conditions:
          </p>
          <p>
            The above copyright notice and this permission notice shall be included in all
            copies or substantial portions of the Software.
          </p>
          <p>
            THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
            IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
            FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
            AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
            LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
            OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
            SOFTWARE.
          </p>
        </div>
      </div>
      
      <div class="credits-section">
        <h2 id="credits">Credits</h2>
        <p>Kagi is built on the shoulders of giants. We would like to acknowledge the following open-source projects that have made Kagi possible:</p>
        
        <div class="row">
          <div class="col-md-6 col-lg-4 mb-4">
            <div class="credit-card">
              <h4>libp2p</h4>
              <p>A modular network stack for peer-to-peer applications.</p>
              <a href="https://libp2p.io/" target="_blank">https://libp2p.io/</a>
            </div>
          </div>
          
          <div class="col-md-6 col-lg-4 mb-4">
            <div class="credit-card">
              <h4>IPFS</h4>
              <p>A peer-to-peer hypermedia protocol for content addressing.</p>
              <a href="https://ipfs.io/" target="_blank">https://ipfs.io/</a>
            </div>
          </div>
          
          <div class="col-md-6 col-lg-4 mb-4">
            <div class="credit-card">
              <h4>TypeScript</h4>
              <p>A typed superset of JavaScript that compiles to plain JavaScript.</p>
              <a href="https://www.typescriptlang.org/" target="_blank">https://www.typescriptlang.org/</a>
            </div>
          </div>
          
          <div class="col-md-6 col-lg-4 mb-4">
            <div class="credit-card">
              <h4>Node.js</h4>
              <p>A JavaScript runtime built on Chrome's V8 JavaScript engine.</p>
              <a href="https://nodejs.org/" target="_blank">https://nodejs.org/</a>
            </div>
          </div>
          
          <div class="col-md-6 col-lg-4 mb-4">
            <div class="credit-card">
              <h4>Bun</h4>
              <p>A fast all-in-one JavaScript runtime.</p>
              <a href="https://bun.sh/" target="_blank">https://bun.sh/</a>
            </div>
          </div>
          
          <div class="col-md-6 col-lg-4 mb-4">
            <div class="credit-card">
              <h4>Svelte</h4>
              <p>A radical new approach to building user interfaces.</p>
              <a href="https://svelte.dev/" target="_blank">https://svelte.dev/</a>
            </div>
          </div>
        </div>
      </div>
      
      <div class="theme-credit mt-5">
        <h2 id="theme">Documentation Theme</h2>
        <p>The design of this documentation site is inspired by <a href="https://themes.3rdwavemedia.com/bootstrap-templates/product/prettydocs-free-bootstrap-theme-for-developers-and-startups/" target="_blank">PrettyDocs</a>, created by <a href="http://themes.3rdwavemedia.com/" target="_blank">Xiaoying Riley</a>.</p>
      </div>
    </div>
  </div>
</div>

<style>
  .license-wrapper {
    padding: 45px 0;
  }
  
  .license-header {
    margin-bottom: 40px;
    text-align: center;
  }
  
  .license-heading {
    font-size: 2rem;
    margin-bottom: 15px;
    font-weight: bold;
  }
  
  .license-intro {
    max-width: 800px;
    margin: 0 auto 40px;
  }
  
  .license-section, .credits-section, .theme-credit {
    margin-bottom: 50px;
  }
  
  .license-section h2, .credits-section h2, .theme-credit h2 {
    color: #40babd;
    margin-bottom: 30px;
    border-bottom: 1px solid #eee;
    padding-bottom: 10px;
  }
  
  .license-card {
    background: #f5f5f5;
    padding: 30px;
    border-radius: 4px;
    margin-bottom: 30px;
  }
  
  .license-card h3 {
    margin-top: 0;
    margin-bottom: 20px;
    color: #333;
  }
  
  .license-card p {
    margin-bottom: 15px;
  }
  
  .credit-card {
    background: #fff;
    border: 1px solid #e3e3e3;
    padding: 20px;
    height: 100%;
    border-radius: 4px;
    transition: transform 0.3s ease, box-shadow 0.3s ease;
  }
  
  .credit-card:hover {
    transform: translateY(-5px);
    box-shadow: 0 10px 20px rgba(0, 0, 0, 0.1);
  }
  
  .credit-card h4 {
    color: #40babd;
    margin-bottom: 15px;
  }
  
  .credit-card a {
    color: #40babd;
    word-break: break-all;
  }
  
  .theme-credit {
    padding: 30px;
    background: #f5f5f5;
    border-radius: 4px;
    text-align: center;
  }
</style> 