<script lang="ts">
  import { onMount } from 'svelte';
  
  // FAQ Categories
  const categories = [
    {
      title: 'General',
      faqs: [
        {
          question: 'What is Kagi?',
          answer: 'Kagi is a distributed application framework that enables developers to build secure, scalable, and reliable peer-to-peer applications with ease.'
        },
        {
          question: 'Is Kagi open source?',
          answer: 'Yes, Kagi is open source and available under the MIT license. You can view the source code on GitHub.'
        },
        {
          question: 'What platforms does Kagi support?',
          answer: 'Kagi is designed to be cross-platform and currently supports Windows, macOS, Linux, iOS, and Android.'
        }
      ]
    },
    {
      title: 'Installation & Setup',
      faqs: [
        {
          question: 'How do I install Kagi?',
          answer: 'You can install Kagi using npm: <code>npm install kagi</code>. Alternatively, you can clone the repository and build from source.'
        },
        {
          question: 'What are the system requirements?',
          answer: 'Kagi requires Node.js 14 or later. For mobile applications, it requires React Native 0.63 or later.'
        },
        {
          question: 'Can I use Kagi with my existing project?',
          answer: 'Yes, Kagi can be integrated into existing projects. It provides a modular architecture that allows you to use only the components you need.'
        }
      ]
    },
    {
      title: 'Features & Functionality',
      faqs: [
        {
          question: 'Does Kagi support encryption?',
          answer: 'Yes, Kagi includes built-in support for end-to-end encryption, ensuring that your data remains secure during transmission.'
        },
        {
          question: 'Can Kagi applications work offline?',
          answer: 'Yes, Kagi is designed to work offline. It synchronizes data when connectivity is available.'
        },
        {
          question: 'How does Kagi handle data persistence?',
          answer: 'Kagi provides a distributed key-value store that automatically replicates data across nodes. It also supports integration with various databases.'
        }
      ]
    },
    {
      title: 'Troubleshooting',
      faqs: [
        {
          question: 'I\'m getting a "Node connection failed" error. What should I do?',
          answer: 'This error typically occurs when a node cannot establish a connection to the network. Check your network configuration and firewall settings.'
        },
        {
          question: 'How can I debug Kagi applications?',
          answer: 'Kagi provides a comprehensive logging system that can be configured to output debug information. You can also use the Kagi Developer Tools to inspect network activity.'
        },
        {
          question: 'Where can I get help if I encounter issues?',
          answer: 'You can get help in several ways: check the documentation, open an issue on GitHub, or join our community forum.'
        }
      ]
    }
  ];
</script>

<div class="faq-wrapper">
  <div class="container">
    <div class="faq-header">
      <h1 class="faq-heading">Frequently Asked Questions</h1>
      <div class="faq-intro">
        <p>Answers to commonly asked questions about Kagi. If you can't find an answer to your question here, please contact our support team.</p>
      </div>
    </div>
    
    <div class="faq-content">
      <div class="categories-container">
        {#each categories as category, index}
          <div class="category-section">
            <h2 class="category-title">{category.title}</h2>
            <div class="faq-accordion accordion" id="accordion-{index}">
              {#each category.faqs as faq, faqIndex}
                <div class="accordion-item">
                  <h3 class="accordion-header" id="heading-{index}-{faqIndex}">
                    <button 
                      class="accordion-button collapsed" 
                      type="button" 
                      data-bs-toggle="collapse" 
                      data-bs-target="#collapse-{index}-{faqIndex}" 
                      aria-expanded="false" 
                      aria-controls="collapse-{index}-{faqIndex}"
                    >
                      {faq.question}
                    </button>
                  </h3>
                  <div 
                    id="collapse-{index}-{faqIndex}" 
                    class="accordion-collapse collapse" 
                    aria-labelledby="heading-{index}-{faqIndex}" 
                    data-bs-parent="#accordion-{index}"
                  >
                    <div class="accordion-body">
                      {@html faq.answer}
                    </div>
                  </div>
                </div>
              {/each}
            </div>
          </div>
        {/each}
      </div>
      
      <div class="faq-more text-center">
        <h3 class="more-title">Still have questions?</h3>
        <div class="contact-options">
          <div class="option">
            <i class="fa fa-envelope-o"></i>
            <h4>Email</h4>
            <p>Drop us an email at <a href="mailto:support@kagi.com">support@kagi.com</a></p>
          </div>
          <div class="option">
            <i class="fa fa-slack"></i>
            <h4>Slack</h4>
            <p>Join our community on <a href="#" target="_blank">Slack</a></p>
          </div>
          <div class="option">
            <i class="fa fa-github"></i>
            <h4>GitHub</h4>
            <p>Open an issue on our <a href="#" target="_blank">GitHub repository</a></p>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>

<style>
  .faq-wrapper {
    padding: 45px 0;
  }
  
  .faq-header {
    margin-bottom: 40px;
    text-align: center;
  }
  
  .faq-heading {
    font-size: 2rem;
    margin-bottom: 15px;
    font-weight: bold;
  }
  
  .faq-intro {
    max-width: 800px;
    margin: 0 auto 20px;
  }
  
  .category-section {
    margin-bottom: 40px;
  }
  
  .category-title {
    font-size: 1.5rem;
    color: #40babd;
    margin-bottom: 20px;
    padding-bottom: 10px;
    border-bottom: 1px solid #eee;
  }
  
  .accordion-item {
    margin-bottom: 10px;
    border: 1px solid #e0e0e0;
    border-radius: 4px;
    overflow: hidden;
  }
  
  .accordion-button {
    background-color: #f8f9fa;
    color: #333;
    font-weight: 600;
    font-size: 16px;
    padding: 15px;
    text-align: left;
    width: 100%;
    border: none;
    cursor: pointer;
    transition: all 0.3s ease;
  }
  
  .accordion-button:hover {
    background-color: #e9ecef;
  }
  
  .accordion-button:not(.collapsed) {
    background-color: #e9ecef;
    color: #40babd;
  }
  
  .accordion-body {
    padding: 15px;
    background-color: #fff;
    line-height: 1.6;
  }
  
  .faq-more {
    margin-top: 60px;
    padding-top: 40px;
    border-top: 1px solid #eee;
  }
  
  .more-title {
    margin-bottom: 30px;
    font-size: 1.5rem;
  }
  
  .contact-options {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 30px;
  }
  
  .option {
    flex: 0 0 300px;
    padding: 20px;
    background: #f5f5f5;
    border-radius: 4px;
    text-align: center;
  }
  
  .option i {
    font-size: 2rem;
    color: #40babd;
    margin-bottom: 15px;
  }
  
  .option h4 {
    font-size: 1.2rem;
    margin-bottom: 10px;
  }
  
  @media (max-width: 767px) {
    .contact-options {
      flex-direction: column;
      align-items: center;
    }
    
    .option {
      width: 100%;
      max-width: 350px;
    }
  }
</style> 