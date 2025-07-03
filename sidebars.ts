import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  tutorialSidebar: [
    'intro',
    {
      type: 'category',
      label: 'Getting Started',
      link: {
        type: 'generated-index',
      },
      items: [
        'getting-started/quickstart',
        'getting-started/overview',
        'getting-started/installation',
      ],
    },
    {
      type: 'category',
      label: 'Core Concepts',
      link: {
        type: 'generated-index',
      },
      items: [
        'core/architecture',
        'core/p2p',
        'core/discovery',
        'core/lifecycle',
        'core/context',
        'core/logging',
        'core/vmap',
        'core/request_handling',
        'core/system-diagrams',
      ],
    },
    {
      type: 'category',
      label: 'Features',
      link: {
        type: 'generated-index',
      },
      items: [
        'features/keys-management',
        'features/encryption-schema',
        'features/enhanced-serialization',
        'features/macros',
        'features/logging',
        'features/metrics',
        'features/caching',
      ],
    },
    {
      type: 'category',
      label: 'Services',
      link: {
        type: 'generated-index',
      },
      items: [
        'services/api',
        'services/gateway',
        'services/example-service',
        'services/macro_usage_guide',
        'services/macros',
      ],
    },
    {
      type: 'category',
      label: 'Development',
      link: {
        type: 'generated-index',
      },
      items: [
        'development/macros',
        'development/mobile',
      ],
    },
  ],
};

export default sidebars; 