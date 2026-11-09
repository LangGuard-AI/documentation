import type {ReactNode} from 'react';
import Link from '@docusaurus/Link';

import {
  MinimalCard,
  MinimalCardDescription,
  MinimalCardTitle,
} from '@/components/ui/minimal-card';

const SECTIONS = [
  {
    title: 'Getting Started',
    to: '/getting-started/',
    description: 'Get up and running with LangGuard.',
  },
  {
    title: 'Features',
    to: '/features/',
    description: "Explore LangGuard's AI governance and observability features.",
  },
  {
    title: 'Integrations',
    to: '/integrations/',
    description: 'Connect LangGuard to your AI platforms and tools.',
  },
  {
    title: 'Policies',
    to: '/policies/',
    description: 'AI governance and policy enforcement in LangGuard.',
  },
  {
    title: 'Settings',
    to: '/settings/',
    description: 'Configure your LangGuard workspace, security, and integrations.',
  },
  {
    title: 'Private Install',
    to: '/private-install/',
    description: 'Install LangGuard into infrastructure that you own and operate.',
  },
  {
    title: 'API Reference',
    to: '/api-reference/',
    description: 'Machine-facing APIs for policy decisions and data ingestion.',
  },
  {
    title: 'Troubleshooting',
    to: '/troubleshooting/',
    description: 'Get help with common LangGuard issues.',
  },
] as const;

export function SectionCards(): ReactNode {
  return (
    <ul className="mt-0 mb-8 grid list-none grid-cols-1 gap-3 p-0 sm:grid-cols-2">
      {SECTIONS.map(({title, to, description}) => (
        <li key={to} className="m-0">
          <Link
            to={to}
            className="block h-full rounded-xl no-underline hover:no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <MinimalCard className="hover-elevate h-full">
              <MinimalCardTitle>{title}</MinimalCardTitle>
              <MinimalCardDescription>{description}</MinimalCardDescription>
            </MinimalCard>
          </Link>
        </li>
      ))}
    </ul>
  );
}
