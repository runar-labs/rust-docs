// Basic JavaScript for Runar documentation
document.addEventListener('DOMContentLoaded', () => {
    // Add smooth scrolling to anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth'
                });
            }
        });
    });

    // Add mobile menu toggle
    const menuButton = document.querySelector('.menu-toggle');
    const nav = document.querySelector('nav');
    
    if (menuButton && nav) {
        menuButton.addEventListener('click', () => {
            nav.classList.toggle('active');
        });
    }
}); 