import React from 'react';
import Navbar from '@theme-original/Navbar';
import type NavbarType from '@theme/Navbar';
import type { WrapperProps } from '@docusaurus/types';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';

type Props = WrapperProps<typeof NavbarType>;

export default function NavbarWrapper(props: Props): JSX.Element {
  const { siteConfig } = useDocusaurusContext();
  const { baseUrl } = siteConfig;

  return (
    <>
      <Navbar {...props} />
      <div style={{
        position: 'fixed',
        top: '12px',
        right: '20px',
        zIndex: 1001,
        display: 'flex',
        alignItems: 'center'
      }}>
        <img
          src={`${baseUrl}img/runar-logo.jpg`}
          alt="Runar Logo"
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            objectFit: 'cover',
            border: '2px solid rgba(255, 255, 255, 0.2)',
            transition: 'border-color 0.2s ease',
            backgroundColor: 'white'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.4)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
          }}
        />
      </div>
    </>
  );
} 