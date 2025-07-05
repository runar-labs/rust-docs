import React, { useState } from 'react';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import { useColorMode } from '@docusaurus/theme-common';
import clsx from 'clsx';

import styles from './SidebarBanner.module.css';

export default function SidebarBanner(): JSX.Element {
  const [isExpanded, setIsExpanded] = useState(false);
  const { colorMode } = useColorMode();

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div className={clsx(styles.sidebarBanner, styles[colorMode])}>
      <div className={styles.sidebarBannerContent}>
        <div className={styles.sidebarBannerHeader} onClick={toggleExpanded}>
          <div className={styles.sidebarBannerIcon}>🚧</div>
          <div className={styles.sidebarBannerTitle}>
            <strong>In Development</strong>
          </div>
          <div className={styles.sidebarBannerToggle}>
            {isExpanded ? '−' : '+'}
          </div>
        </div>
        
        {isExpanded && (
          <div className={styles.sidebarBannerDetails}>
            <p>
              Runar is actively being developed. Features and docs are being updated regularly.
            </p>
            <p>
              <strong>We welcome contributions!</strong>
            </p>
            <div className={styles.sidebarBannerLinks}>
              <a 
                href="https://github.com/runar-labs/runar-rust/issues" 
                target="_blank" 
                rel="noopener noreferrer"
                className={styles.sidebarBannerLink}
              >
                Report Issues
              </a>
              <a 
                href="https://github.com/runar-labs/runar-rust/discussions" 
                target="_blank" 
                rel="noopener noreferrer"
                className={styles.sidebarBannerLink}
              >
                Join Discussions
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 