import type {ReactNode} from 'react';
import Link from '@docusaurus/Link';
import useBaseUrl from '@docusaurus/useBaseUrl';
import ThemedImage from '@theme/ThemedImage';
import Heading from '@theme/Heading';

import {
  MinimalCard,
  MinimalCardDescription,
  MinimalCardTitle,
} from '@/components/ui/minimal-card';

const ROLES = [
  {who: 'Platform teams', does: 'Centralize AI observability and governance', go: 'Integrations', to: '/integrations'},
  {who: 'Security teams', does: 'Monitor for policy violations and security issues', go: 'Policies', to: '/policies'},
  {who: 'ML engineers', does: 'Debug agent behavior and optimize performance', go: 'Trace Explorer', to: '/features/trace-explorer'},
  {who: 'Compliance officers', does: 'Ensure regulatory compliance for AI systems', go: 'Audit log', to: '/settings/audit-log'},
  {who: 'DevOps and SRE', does: 'Monitor AI infrastructure health and costs', go: 'Monitoring', to: '/features/monitoring'},
];

const FEATURES = [
  {title: 'Discovery and inventory', body: 'Discover and catalog the AI agents, models, and tools across your organization.', to: '/features/discovery'},
  {title: 'Real-time monitoring', body: 'Track agent performance, success rates, latency, and costs in real time.', to: '/features/monitoring'},
  {title: 'Trace Explorer', body: 'Inspect individual traces with advanced filtering, search, and visualization.', to: '/features/trace-explorer'},
  {title: 'Policy engine', body: 'Define governance policies in Rego (OPA) to detect PII, flag exposed credentials, and enforce access controls.', to: '/policies'},
  {title: 'AI-assisted policy authoring', body: 'Describe a rule in plain language. The Policy Authoring Agent generates, red-teams, and explains the Rego.', to: '/policies/ai-authoring'},
  {title: 'Workflow governance', body: 'Manage the lifecycle of AI assets on a Kanban board with policy-gated stage promotion.', to: '/features/workflow-governance'},
  {title: 'Deploy on Databricks', body: 'Run LangGuard inside your own Databricks workspace as a Databricks App.', to: '/private-install/databricks-app'},
  {title: 'Deploy on Google Cloud', body: 'Install LangGuard into your own Google Cloud project, on a new private GKE cluster or the one you already run.', to: '/private-install/google-cloud'},
];

export default function DocsHome(): ReactNode {
  return (
    <div className="lg-home">
      <ThemedImage
        className="lg-home-shot"
        alt="The LangGuard Discovery page, listing agents grouped by team with their risk level and downstream systems"
        sources={{
          light: useBaseUrl('/img/discovery-dashboard-light.png'),
          dark: useBaseUrl('/img/discovery-dashboard.png'),
        }}
      />

      <Heading as="h2" id="start-with-your-job">Start with your job</Heading>
      <div className="lg-home-list">
        {ROLES.map(({who, does, go, to}) => (
          <Link key={who} to={to} className="lg-home-row">
            <span className="lg-home-who">{who}</span>
            <span className="lg-home-does">{does}</span>
            <span className="lg-home-go">{go}</span>
          </Link>
        ))}
      </div>

      <Heading as="h2" id="what-the-platform-does">What the platform does</Heading>
      <div className="lg-home-grid">
        {FEATURES.map(({title, body, to}) => (
          <Link key={title} to={to} className="lg-home-feature">
            <MinimalCard className="hover-elevate h-full">
              <MinimalCardTitle>{title}</MinimalCardTitle>
              <MinimalCardDescription>{body}</MinimalCardDescription>
            </MinimalCard>
          </Link>
        ))}
      </div>
    </div>
  );
}
