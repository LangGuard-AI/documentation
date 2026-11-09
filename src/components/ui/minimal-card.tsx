import type {ComponentProps} from 'react';

import {cn} from '@/lib/utils';

// Cult UI minimal-card, without its next/image slot. Its stacked shadows and
// 24px radius become the app's hairline border and 12px card radius.
export function MinimalCard({className, ...props}: ComponentProps<'div'>) {
  return (
    <div
      className={cn('rounded-xl border border-border bg-card p-4', className)}
      {...props}
    />
  );
}

export function MinimalCardTitle({className, ...props}: ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        'text-base leading-tight font-semibold text-foreground',
        className,
      )}
      {...props}
    />
  );
}

export function MinimalCardDescription({
  className,
  ...props
}: ComponentProps<'div'>) {
  return (
    <div
      className={cn('mt-1 text-sm text-muted-foreground', className)}
      {...props}
    />
  );
}
