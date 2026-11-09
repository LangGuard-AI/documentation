import type {ReactNode} from 'react';
import Link from '@docusaurus/Link';

import {GradientHeading} from '@/components/ui/gradient-heading';

export function DocsHero(): ReactNode {
  return (
    <div className="mt-2 mb-8">
      <GradientHeading className="m-0 font-sans text-3xl sm:text-4xl lg:text-5xl">
        Welcome to LangGuard
      </GradientHeading>
      <p className="mt-3 mb-5 max-w-[60ch] text-lg text-muted-foreground">
        The AI governance and observability platform. Monitor, manage, and
        secure your AI agent operations.
      </p>
      <Link
        to="/getting-started/quick-start/"
        className="hover-elevate inline-flex h-9 items-center rounded-md bg-secondary px-4 text-sm font-semibold text-secondary-foreground no-underline hover:text-secondary-foreground hover:no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        Quick Start Guide
      </Link>
    </div>
  );
}
