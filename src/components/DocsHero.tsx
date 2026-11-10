import type {ReactNode} from 'react';
import Link from '@docusaurus/Link';

import {GradientHeading} from '@/components/ui/gradient-heading';

export function DocsHero(): ReactNode {
  return (
    <>
      <GradientHeading>Welcome to LangGuard</GradientHeading>
      <p>
        LangGuard is an AI governance and observability platform. It connects to
        your AI platforms, frameworks, coding agents, and identity providers so
        you can monitor, manage, and secure AI agent operations in one place.
      </p>
      <div className="lg-home-actions">
        <Link className="button button--primary" to="/getting-started/quick-start">
          Open the Quick Start
        </Link>
        <Link
          className="button button--outline button--secondary"
          to="/getting-started/connecting-integrations">
          Connect an integration
        </Link>
      </div>
    </>
  );
}
