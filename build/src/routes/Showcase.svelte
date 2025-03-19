<script lang="ts">
  import { onMount } from 'svelte';
  
  // Showcase items
  const showcaseItems = [
    {
      title: 'Decentralized Chat',
      description: 'A secure, end-to-end encrypted chat application built with Kagi.',
      image: 'https://via.placeholder.com/300x200?text=Decentralized+Chat',
      link: '#'
    },
    {
      title: 'Distributed File Storage',
      description: 'A peer-to-peer file storage system that ensures data availability and integrity.',
      image: 'https://via.placeholder.com/300x200?text=File+Storage',
      link: '#'
    },
    {
      title: 'Secure Collaboration Tool',
      description: 'A collaborative document editing platform with real-time synchronization.',
      image: 'https://via.placeholder.com/300x200?text=Collaboration+Tool',
      link: '#'
    },
    {
      title: 'Decentralized Social Network',
      description: 'A social platform that puts users in control of their data and connections.',
      image: 'https://via.placeholder.com/300x200?text=Social+Network',
      link: '#'
    },
    {
      title: 'IoT Device Management',
      description: 'A system for securely managing and coordinating IoT devices without a central server.',
      image: 'https://via.placeholder.com/300x200?text=IoT+Management',
      link: '#'
    },
    {
      title: 'Privacy-focused Analytics',
      description: 'Analytics platform that respects user privacy while providing valuable insights.',
      image: 'https://via.placeholder.com/300x200?text=Privacy+Analytics',
      link: '#'
    }
  ];
</script>

<div class="showcase-wrapper">
  <div class="container">
    <div class="showcase-header">
      <h1 class="showcase-heading">Showcase</h1>
      <div class="showcase-intro">
        <p>Take a look at some of the projects built with Kagi. These examples showcase the power and flexibility of the framework.</p>
      </div>
    </div>
    
    <div class="showcase-content">
      <div class="row showcase-grid">
        {#each showcaseItems as item}
          <div class="col-md-6 col-lg-4 mb-4">
            <div class="card showcase-card">
              <img src={item.image} class="card-img-top" alt={item.title}>
              <div class="card-body">
                <h5 class="card-title">{item.title}</h5>
                <p class="card-text">{item.description}</p>
                <a href={item.link} class="btn btn-primary">Learn More</a>
              </div>
            </div>
          </div>
        {/each}
      </div>
      
      <div class="showcase-cta text-center mt-5">
        <h3>Have you built something with Kagi?</h3>
        <p>We'd love to feature your project in our showcase!</p>
        <a href="#" class="btn btn-primary btn-lg mt-3">Submit Your Project</a>
      </div>
    </div>
  </div>
</div>

<style>
  .showcase-wrapper {
    padding: 45px 0;
  }
  
  .showcase-header {
    margin-bottom: 40px;
    text-align: center;
  }
  
  .showcase-heading {
    font-size: 2rem;
    margin-bottom: 15px;
    font-weight: bold;
  }
  
  .showcase-intro {
    max-width: 800px;
    margin: 0 auto 40px;
  }
  
  .showcase-card {
    height: 100%;
    transition: transform 0.3s ease, box-shadow 0.3s ease;
  }
  
  .showcase-card:hover {
    transform: translateY(-5px);
    box-shadow: 0 10px 20px rgba(0, 0, 0, 0.1);
  }
  
  .card-img-top {
    height: 200px;
    object-fit: cover;
  }
  
  .card-title {
    color: #40babd;
    font-weight: 600;
  }
  
  .showcase-cta {
    margin-top: 60px;
    padding: 40px;
    background: #f5f5f5;
    border-radius: 4px;
  }
  
  .showcase-cta h3 {
    font-size: 1.5rem;
    margin-bottom: 15px;
  }
</style> 