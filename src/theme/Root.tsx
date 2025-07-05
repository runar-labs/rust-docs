import React from 'react';
import type { Props } from '@theme/Root';
import DevelopmentBanner from '../components/DevelopmentBanner';

export default function Root({ children }: Props): JSX.Element {
  console.log('Root component rendered, banner should be visible');
  
  return (
    <>
      <DevelopmentBanner />
      {children}
    </>
  );
} 