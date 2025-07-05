import React from 'react';
import DocItemLayout from '@theme-original/DocItem/Layout';
import type DocItemLayoutType from '@theme/DocItem/Layout';
import type { WrapperProps } from '@docusaurus/types';
import DevelopmentBanner from '../../components/DevelopmentBanner';

type Props = WrapperProps<typeof DocItemLayoutType>;

export default function DocItemLayoutWrapper(props: Props): JSX.Element {
  return (
    <>
      <DevelopmentBanner />
      <DocItemLayout {...props} />
    </>
  );
} 