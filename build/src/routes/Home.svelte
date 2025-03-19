<script lang="ts">
  import { onMount } from 'svelte';
  
  // Cards data for the homepage
  const cards = [
    {
      title: 'Quick Start',
      description: 'Demo example, consectetuer adipiscing elit',
      icon: 'fa-paper-plane',
      color: 'green',
      link: '/docs/start'
    },
    {
      title: 'Components',
      description: 'Lorem ipsum dolor sit amet, consectetuer adipiscing elit',
      icon: 'fa-cogs',
      color: 'blue',
      link: '/components'
    },
    {
      title: 'Charts',
      description: 'Lorem ipsum dolor sit amet, consectetuer adipiscing elit',
      icon: 'fa-bar-chart',
      color: 'orange',
      link: '/charts'
    },
    {
      title: 'FAQs',
      description: 'Layout for FAQ page. Lorem ipsum dolor sit amet, consectetuer adipiscing elit',
      icon: 'fa-question-circle',
      color: 'red',
      link: '/faqs'
    },
    {
      title: 'Showcase',
      description: 'Layout for showcase page. Lorem ipsum dolor sit amet, consectetuer adipiscing elit',
      icon: 'fa-laptop',
      color: 'purple',
      link: '/showcase'
    },
    {
      title: 'License & Credits',
      description: 'Layout for license & credits page. Consectetuer adipiscing elit.',
      icon: 'fa-file-text-o',
      color: 'primary',
      link: '/license'
    }
  ];
</script>

<section class="cards-section text-center">
  <div class="container">
    <h2 class="title">Getting started is easy!</h2>
    <div class="intro">
      <p>Welcome to PrettyDocs. This landing page is an example of how you can use a card view to present segments of your documentation. You can customize the icon fonts based on your needs.</p>
      <div class="cta-container">
        <a class="btn btn-primary btn-cta" href="/docs/start"><i class="fa fa-cloud-download"></i> Download Now</a>
      </div>
    </div>
    
    <div id="cards-wrapper" class="cards-wrapper row">
      {#each cards as card}
        <div class="item item-{card.color} col-lg-4 col-6">
          <div class="item-inner">
            <div class="icon-holder">
              <i class="fa {card.icon}"></i>
            </div>
            <h3 class="title">{card.title}</h3>
            <p class="intro">{card.description}</p>
            <a class="link" href={card.link}><span></span></a>
          </div>
        </div>
      {/each}
    </div>
  </div>
</section>

<style>
  .cards-section {
    padding: 60px 0;
  }
  
  .cards-section .title {
    margin-top: 0;
    margin-bottom: 15px;
    font-size: 24px;
    font-weight: 600;
  }
  
  .cards-section .intro {
    margin: 0 auto;
    max-width: 800px;
    margin-bottom: 60px;
  }
  
  .cards-section .cards-wrapper {
    max-width: 1200px;
    margin: 0 auto;
  }
  
  .cards-section .item {
    margin-bottom: 30px;
  }
  
  .cards-section .item-inner {
    background: #fff;
    padding: 30px 15px;
    min-height: 300px;
    border-radius: 4px;
    box-shadow: 0 3px 10px rgba(0, 0, 0, 0.1);
    position: relative;
    transition: all 0.3s ease-in-out;
  }
  
  .cards-section .item-inner:hover {
    transform: translateY(-5px);
  }
  
  .cards-section .icon-holder {
    position: absolute;
    top: -24px;
    left: 50%;
    margin-left: -24px;
    width: 48px;
    height: 48px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 20px;
    box-shadow: 0 3px 10px rgba(0, 0, 0, 0.2);
  }
  
  .cards-section .item-green .icon-holder {
    background: #57d9a3;
  }
  
  .cards-section .item-blue .icon-holder {
    background: #40babd;
  }
  
  .cards-section .item-orange .icon-holder {
    background: #F88C30;
  }
  
  .cards-section .item-red .icon-holder {
    background: #f77b6b;
  }
  
  .cards-section .item-purple .icon-holder {
    background: #8A40A7;
  }
  
  .cards-section .item-primary .icon-holder {
    background: #007bff;
  }
  
  .cards-section .icon-holder i {
    color: #fff;
  }
  
  .cards-section .title {
    font-size: 18px;
    margin-top: 15px;
    font-weight: 600;
  }
  
  .cards-section .intro {
    margin-bottom: 15px;
  }
  
  .cards-section .link {
    position: absolute;
    width: 100%;
    height: 100%;
    top: 0;
    left: 0;
    z-index: 1;
    background: transparent;
  }
  
  /* CTA Container */
  .cta-container {
    margin: 30px 0;
  }
  
  .btn-cta {
    font-size: 16px;
    padding: 10px 30px;
  }
</style> 