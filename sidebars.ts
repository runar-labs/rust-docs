import type { SidebarsConfig } from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  tutorialSidebar: [
    {
      type: 'category',
      label: 'Getting Started',
      items: [
        'getting-started/quickstart',
        'getting-started/overview',
        'getting-started/installation',
      ],
    },
    {
      type: 'category',
      label: 'Services',
      items: [
        'services/macros',
        'services/example-service',
      ],
    },
    {
      type: 'category',
      label: 'Features',
      items: [
        'features/encryption-schema',
        'features/enhanced-serialization',
        'features/keys-management',
        'features/logging',
        'features/vmap',
      ],
    },
    {
      type: 'category',
      label: 'Core Concepts',
      items: [
        'core/architecture',
        'core/discovery',
        'core/logging',
        'core/p2p',
        'core/system-diagrams',
      ],
    },
  ],
};

export default sidebars;
