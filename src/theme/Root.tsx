import React from 'react';
import type { Props } from '@theme/Root';
import DevelopmentBanner from '../components/DevelopmentBanner';
import SocialMetaTags from '../components/SocialMetaTags';

export default function Root({ children }: Props): JSX.Element {
  console.log('Root component rendered, banner should be visible');
  
  return (
    <>
      <SocialMetaTags />
      <DevelopmentBanner />
      {children}
    </>
  );
} 