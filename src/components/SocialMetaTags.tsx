import React from 'react';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';

export default function SocialMetaTags(): JSX.Element {
  const { siteConfig } = useDocusaurusContext();
  
  return (
    <>
      {/* Open Graph / Facebook */}
      <meta property="og:type" content="website" />
      <meta property="og:url" content={siteConfig.url + siteConfig.baseUrl} />
      <meta property="og:title" content={siteConfig.title} />
      <meta property="og:description" content={siteConfig.tagline} />
      <meta property="og:image" content="https://pbs.twimg.com/profile_images/1939859796423057413/JjH9Jm5Q_400x400.jpg" />
      <meta property="og:image:width" content="400" />
      <meta property="og:image:height" content="400" />
      <meta property="og:site_name" content="Runar Labs" />
      
      {/* Twitter */}
      <meta property="twitter:card" content="summary_large_image" />
      <meta property="twitter:url" content={siteConfig.url + siteConfig.baseUrl} />
      <meta property="twitter:title" content={siteConfig.title} />
      <meta property="twitter:description" content={siteConfig.tagline} />
      <meta property="twitter:image" content="https://pbs.twimg.com/profile_images/1939859796423057413/JjH9Jm5Q_400x400.jpg" />
      <meta property="twitter:site" content="@runar_team" />
      <meta property="twitter:creator" content="@runar_team" />
      
      {/* Additional meta tags */}
      <meta name="description" content={siteConfig.tagline} />
      <meta name="keywords" content="Rust, privacy, encryption, distributed systems, microservices, peer-to-peer, end-to-end encryption" />
      <meta name="author" content="Runar Labs" />
    </>
  );
} 