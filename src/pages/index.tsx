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
      <header className={clsx('hero', 'hero--primary', styles.heroBanner)}>
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

      {/* ----------------------------- FEATURE GRID ----------------------------- */}
      <main>
        <section className={styles.featuresSection}>
          <div className="container">
            <div className="row">
              {FeatureList.map((props, idx) => (
                <Feature key={idx} {...props} />
              ))}
            </div>
          </div>
        </section>
      </main>
    </Layout>
  );
}

/** -------------------------------------------------------------------------
 * Internal components & data
 * ---------------------------------------------------------------------- */

type FeatureItem = {
  title: string;
  emoji: string;
  description: JSX.Element;
};

const FeatureList: FeatureItem[] = [
  {
    title: 'End-to-End Encryption',
    emoji: '🔐',
    description: (
      <>
        Envelope encryption, PKI, and per-recipient keys keep your data private
        – from edge to cloud.
      </>
    ),
  },
  {
    title: 'Developer Productivity',
    emoji: '⚡',
    description: (
      <>
        Declarative service macros, automatic serialization, and zero-boilerplate
        code so you can ship features, not plumbing.
      </>
    ),
  },
  {
    title: 'Peer-to-Peer Networking',
    emoji: '🌐',
    description: (
      <>
        QUIC transport with NAT traversal & multicast discovery – resilient by
        design.
      </>
    ),
  },
  {
    title: 'Micro-services Made Simple',
    emoji: '🧩',
    description: (
      <>
        Built-in service registry, load-balancing, and dynamic routing turn your
        monolith into composable services.
      </>
    ),
  },
  {
    title: 'Rust Performance & Safety',
    emoji: '🦀',
    description: (
      <>Memory-safe, blazing-fast ⚙️ powered by Rust and Tokio.</>
    ),
  },
  {
    title: 'Batteries-Included Tooling',
    emoji: '🛠️',
    description: (
      <>
        CLI, Docusaurus docs, and example apps give you everything to start in
        minutes.
      </>
    ),
  },
];

function Feature({ title, emoji, description }: FeatureItem) {
  return (
    <div className={clsx('col col--4', styles.feature)}>
      <div className="text--center">
        <span role="img" aria-label={title} className={styles.featureEmoji}>
          {emoji}
        </span>
      </div>
      <div className="text--center padding-horiz--md">
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
    </div>
  );
} 