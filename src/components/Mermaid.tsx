import React, { useEffect, useRef } from 'react';
import mermaid from 'mermaid';

interface MermaidProps {
  chart: string;
}

export default function Mermaid({ chart }: MermaidProps) {
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (elementRef.current) {
      mermaid.initialize({
        startOnLoad: true,
        theme: 'neutral',
      });
      
      // Generate a valid CSS ID
      const id = 'mermaid-' + Math.random().toString(36).substr(2, 9);
      
      mermaid.render(id, chart).then(({ svg }) => {
        if (elementRef.current) {
          elementRef.current.innerHTML = svg;
        }
      });
    }
  }, [chart]);

  return <div ref={elementRef} className="mermaid" />;
} 