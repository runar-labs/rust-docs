import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'Runar - Privacy for all',
  tagline: 'It is time we go beyond just chat apps. Build end-to-end encrypted, resilient, microservices or peer-to-peer distributed applications',
  favicon: 'img/favicon.ico',

  // Set the production url of your site here
  url: 'https://runar-labs.github.io',
  // Set the /<baseUrl>/ pathname under which your site is served
  // For GitHub pages deployment, it is often '/<projectName>/'
  baseUrl: '/rust-docs/',

  // GitHub pages deployment config.
  // If you aren't using GitHub pages, you don't need these.
  organizationName: 'runar-labs', // Usually your GitHub org/user name.
  projectName: 'runar-rust', // Usually your repo name.

  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',

  // Even if you don't use internationalization, you can use this field to set
  // useful metadata like html lang. For example, if your site is Chinese, you
  // may want to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          // Please change this to your repo.
          // Remove this to remove the "edit this page" links.
          editUrl:
            'https://github.com/runar-labs/runar-rust/tree/main/rust-docs/markdown/',

        },
        blog: {
          showReadingTime: true,
          // Please change this to your repo.
          // Remove this to remove the "edit this page" links.
          editUrl:
            'https://github.com/runar-labs/runar-rust/tree/main/rust-docs/markdown/',
        },
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themes: ['@docusaurus/theme-mermaid'],
  
  themeConfig: {
    // Replace with your project's social card
    image: 'img/runar-social-card.jpg',
    navbar: {
      title: 'Runar',
      logo: {
        alt: 'Runar Logo',
        src: 'https://pbs.twimg.com/profile_images/1939859796423057413/JjH9Jm5Q_400x400.jpg',
      },
              items: [
          {
            type: 'docSidebar',
            sidebarId: 'tutorialSidebar',
            position: 'left',
            label: 'Documentation',
          },
          {
            href: 'https://github.com/runar-labs/runar-rust',
            label: 'GitHub',
            position: 'right',
          },
          {
            href: 'https://x.com/runar_team',
            position: 'right',
            className: 'x-logo-link',
            'aria-label': 'Follow us on X.com',
          },
        ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Docs',
          items: [
            {
              label: 'Getting Started',
              to: '/docs/getting-started/quickstart',
            },
            {
              label: 'Core Concepts',
              to: '/docs/core/architecture',
            },
            {
              label: 'Features',
              to: '/docs/features/keys-management',
            },
          ],
        },
        {
          title: 'Community',
          items: [
            {
              label: 'GitHub',
              href: 'https://github.com/runar-labs/runar-rust',
            },
            {
              label: 'Discussions',
              href: 'https://github.com/runar-labs/runar-rust/discussions',
            },
            {
              label: 'Issues',
              href: 'https://github.com/runar-labs/runar-rust/issues',
            },
          ],
        },
        {
          title: 'More',
          items: [
            {
              label: 'GitHub',
              href: 'https://github.com/runar-labs/runar-rust',
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} Runar Labs. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ['rust', 'toml', 'bash'],
    },
    mermaid: {
      theme: {
        light: 'neutral',
        dark: 'forest',
      },
    },
  } satisfies Preset.ThemeConfig,
};

export default config; 