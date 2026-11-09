import type {ReactNode} from 'react';

import {cn} from '@/lib/utils';

const DOT = 'size-2 rounded-full border border-foreground/20 bg-muted';

// Cult UI mock-browser-window, reduced to the minimal header. Spans throughout
// because markdown images render inside <p>, where a <div> is invalid HTML and
// breaks hydration.
export function BrowserWindow({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'block w-fit max-w-full overflow-hidden rounded-xl border border-border bg-background',
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="flex h-8 items-center gap-2 border-b border-foreground/5 bg-muted/20 px-3"
      >
        <span className={DOT} />
        <span className={DOT} />
        <span className={DOT} />
      </span>
      {children}
    </span>
  );
}
