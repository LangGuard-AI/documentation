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
        'features/workflow-governance',
        'features/ai-registry',
        'features/identity',
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
        'integrations/openrouter',
        'integrations/litellm',
        'integrations/cloudflare',
        'integrations/azure-ai-foundry',
        'integrations/databricks',
        'integrations/aws-bedrock',
        'integrations/mlflow',
        'integrations/langchain',
        'integrations/crewai',
        'integrations/aws-agentcore',
        'integrations/cursor',
        'integrations/claude-code',
        'integrations/opencode',
        'integrations/entra-id',
        'integrations/google-workspace',
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
        'policies/ai-authoring',
        'policies/creating-policies',
        'policies/budgets',
        'policies/policy-violations',
      ],
    },
    {
      type: 'category',
      label: 'Settings',
      link: {
        type: 'doc',
        id: 'settings/index',
      },
      items: [
        'settings/general',
        'settings/api-keys',
        'settings/mcp-server',
        'settings/arbiter-management',
        'settings/arbiter-deployment',
        'settings/webhooks',
        'settings/custom-checks',
        'settings/tags',
        'settings/audit-log',
        'settings/sso',
        'settings/session',
        'settings/user-management',
        'settings/cost-estimates',
        'settings/enforcement-mode',
        'settings/ai-gateway/entra-cowork-plugin',
      ],
    },
    {
      type: 'category',
      label: 'Private Install',
      link: {
        type: 'doc',
        id: 'private-install/index',
      },
      items: [
        {
          type: 'category',
          label: 'Databricks App',
          link: {
            type: 'doc',
            id: 'private-install/databricks-app/index',
          },
          items: [
            'private-install/databricks-app/installation',
            'private-install/databricks-app/ai-gateway',
            'private-install/databricks-app/data-capture',
            'private-install/databricks-app/unity-catalog',
          ],
        },
        {
          type: 'category',
          label: 'Google Cloud',
          link: {
            type: 'doc',
            id: 'private-install/google-cloud/index',
          },
          items: [
            'private-install/google-cloud/installation',
            'private-install/google-cloud/existing-infrastructure',
            'private-install/google-cloud/service-mesh',
            'private-install/google-cloud/sign-in-and-email',
          ],
        },
        {
          type: 'category',
          label: 'Azure',
          link: {
            type: 'doc',
            id: 'private-install/azure/index',
          },
          items: [
            'private-install/azure/requirements',
            'private-install/azure/installation',
            'private-install/azure/sign-in-and-email',
          ],
        },
      ],
    },
    {
      type: 'category',
      label: 'API Reference',
      link: {
        type: 'doc',
        id: 'api-reference/index',
      },
      items: [
        'api-reference/interceptor',
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
