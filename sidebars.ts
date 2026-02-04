import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  docsSidebar: [
    'intro',
    {
      type: 'category',
      label: 'Getting Started',
      link: {
        type: 'doc',
        id: 'getting-started/index',
      },
      items: [
        'getting-started/quick-start',
        'getting-started/connecting-integrations',
      ],
    },
    {
      type: 'category',
      label: 'Use Cases',
      link: {
        type: 'doc',
        id: 'use-cases/index',
      },
      items: [
        'use-cases/prompt-injection',
        'use-cases/data-exfiltration',
        'use-cases/coding-assistants',
        'use-cases/shadow-ai',
      ],
    },
    {
      type: 'category',
      label: 'Features',
      link: {
        type: 'doc',
        id: 'features/index',
      },
      items: [
        'features/discovery',
        'features/monitoring',
        'features/trace-explorer',
        'features/data-catalog',
      ],
    },
    {
      type: 'category',
      label: 'Integrations',
      link: {
        type: 'doc',
        id: 'integrations/index',
      },
      items: [
        'integrations/langfuse',
        'integrations/databricks',
        'integrations/cursor',
        'integrations/claude-code',
      ],
    },
    {
      type: 'category',
      label: 'Policies',
      link: {
        type: 'doc',
        id: 'policies/index',
      },
      items: [
        'policies/built-in-policies',
        'policies/creating-policies',
        'policies/policy-violations',
      ],
    },
    {
      type: 'category',
      label: 'Troubleshooting',
      link: {
        type: 'doc',
        id: 'troubleshooting/index',
      },
      items: [
        'troubleshooting/common-issues',
        'troubleshooting/integration-issues',
        'troubleshooting/faq',
      ],
    },
  ],
};

export default sidebars;
