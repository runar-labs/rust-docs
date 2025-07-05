import React, { useState } from 'react';

export default function DevelopmentBanner(): JSX.Element {
  console.log('DevelopmentBanner component rendered');
  const [isExpanded, setIsExpanded] = useState(false);
  const [isVisible, setIsVisible] = useState(true);

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  const closeBanner = () => {
    setIsVisible(false);
  };

  const bannerStyle = {
    position: 'relative' as const,
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
    minHeight: '60px',
    width: '100%',
    marginBottom: '0'
  };

  const contentStyle = {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '0 1rem'
  };

  const headerStyle = {
    display: 'flex',
    alignItems: 'center',
    padding: '0.75rem 0',
    cursor: 'pointer'
  };

  const titleStyle = {
    flex: 1,
    fontSize: '0.95rem',
    fontWeight: 500
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div style={bannerStyle}>
      <div style={contentStyle}>
        <div style={headerStyle} onClick={toggleExpanded}>
          <div style={{...titleStyle, userSelect: 'none', pointerEvents: 'none', marginRight: '20px'}}>
            <strong> 🚧 We are in Active Development! Join to help us build the future of secure and decentralized applications. 🚧 </strong>
          </div>
          <div style={{
            fontSize: '1.2rem',
            fontWeight: 'bold',
            width: '24px',
            height: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '50%',
            backgroundColor: 'rgba(255, 255, 255, 0.2)',
            userSelect: 'none',
            pointerEvents: 'none',
            marginRight: '16px'
          }}>
            {isExpanded ? '−' : '+'}
          </div>
          <div 
            style={{
              fontSize: '1.2rem',
              fontWeight: 'bold',
              width: '24px',
              height: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '50%',
              backgroundColor: 'rgba(220, 53, 69, 0.8)',
              color: 'white',
              userSelect: 'none',
              cursor: 'pointer',
              transition: 'background-color 0.2s ease'
            }}
            onClick={(e) => {
              e.stopPropagation();
              closeBanner();
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(220, 53, 69, 1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(220, 53, 69, 0.8)';
            }}
          >
            ×
          </div>
        </div>
        
        {isExpanded && (
          <div style={{
            padding: '1rem 0',
            borderTop: '1px solid rgba(255, 255, 255, 0.2)',
            marginTop: '0.5rem'
          }}>
            <p>
              Runar is currently in full development. Not all features are complete, 
              and the documentation is still being written. We're building a comprehensive 
              privacy-first framework for distributed applications.
            </p>
            <p>
              <strong>What you can expect:</strong>
            </p>
            <ul>
              <li>Core functionality is working and tested</li>
              <li>Documentation is being actively updated</li>
              <li>API may change as we refine the design</li>
              <li>Some advanced features are still in development</li>
            </ul>
            <p>
              <strong>We welcome feedback and contributions!</strong> If you find issues, 
              have suggestions, or want to contribute, please visit our{' '}
              <a href="https://github.com/runar-labs/runar-rust/issues" target="_blank" rel="noopener noreferrer" style={{color: '#ffd700'}}>
                GitHub Issues
              </a>{' '}
              or{' '}
              <a href="https://github.com/runar-labs/runar-rust/discussions" target="_blank" rel="noopener noreferrer" style={{color: '#ffd700'}}>
                Discussions
              </a>.
            </p>
          </div>
        )}
      </div>
    </div>
  );
} 