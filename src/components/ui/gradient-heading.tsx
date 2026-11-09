import type {ElementType, ReactNode} from 'react';

import {cn} from '@/lib/utils';

// Cult UI gradient-heading, in the webapp's neutral default variant.
export function GradientHeading({
  as: Tag = 'h1',
  className,
  children,
}: {
  as?: ElementType;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Tag className={className}>
      <span className="bg-linear-to-t from-foreground/80 to-foreground bg-clip-text pb-1 font-semibold tracking-tight text-transparent forced-colors:bg-none forced-colors:text-[CanvasText]">
        {children}
      </span>
    </Tag>
  );
}
