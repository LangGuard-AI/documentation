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
      label: 'Databricks App',
      link: {
        type: 'doc',
        id: 'databricks-app/index',
      },
      items: [
        'databricks-app/installation',
        'databricks-app/ai-gateway',
        'databricks-app/data-capture',
        'databricks-app/unity-catalog',
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
        'settings/webhooks',
        'settings/custom-checks',
        'settings/tags',
        'settings/audit-log',
        'settings/sso',
        'settings/session',
        'settings/user-management',
        'settings/cost-estimates',
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
