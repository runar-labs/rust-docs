// Mermaid initialization script
import mermaid from 'mermaid';

// Initialize mermaid
mermaid.initialize({
  startOnLoad: true,
  theme: 'neutral',
  flowchart: {
    useMaxWidth: true,
    htmlLabels: true,
  },
  sequence: {
    useMaxWidth: true,
  },
});

// Re-initialize mermaid when the page loads
document.addEventListener('DOMContentLoaded', function() {
  mermaid.init();
}); 