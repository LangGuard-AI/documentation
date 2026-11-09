import {useEffect, useRef} from 'react';
import {scroll} from 'motion';

import {cn} from '@/lib/utils';

// Motion Primitives scroll-progress on Motion's scroll() alone. The original's
// motion.div and useSpring cost 44 KB gzip on every route for a 2px line.
export function ScrollProgress({className}: {className?: string}) {
  const bar = useRef<HTMLDivElement>(null);
  useEffect(
    () =>
      scroll((progress: number) => {
        if (bar.current) bar.current.style.transform = `scaleX(${progress})`;
      }),
    [],
  );
  return (
    <div
      ref={bar}
      aria-hidden="true"
      className={cn('origin-left', className)}
      style={{transform: 'scaleX(0)'}}
    />
  );
}
