import React from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import clsx from 'clsx';
import styles from './index.module.css';

export default function Home(): JSX.Element {
  return (
    <Layout
      title="Runar Framework"
      description="Build resilient, end-to-end-encrypted micro-services and peer-to-peer apps">
      <header className={clsx('hero', styles.heroBanner)}>
        <div className="container">
          <h1 className="hero__title">Runar Framework</h1>
          <p className="hero__subtitle">
            Build end-to-end-encrypted, resilient, micro-services or peer-to-peer distributed applications.
          </p>
          <div className={styles.buttons}>
            <Link className="button button--primary button--lg" to="/docs/getting-started/quickstart">
              Quickstart ⏱️
            </Link>
            <Link className="button button--secondary button--lg margin-left--sm" to="/docs/core/architecture">
              Architecture Overview 🏗️
            </Link>
          </div>
        </div>
      </header>
    </Layout>
  );
} 