import type {ReactNode} from 'react';
import OriginalImg from '@theme-original/MDXComponents/Img';
import type {Props} from '@theme/MDXComponents/Img';

import {ScreenshotFrame} from '@/components/Screenshot';
import {cn} from '@/lib/utils';

const MIN_FRAMED_WIDTH = 320;

export default function MDXImg(props: Props): ReactNode {
  if (Number(props.width) < MIN_FRAMED_WIDTH) {
    return <OriginalImg {...props} />;
  }
  return (
    <ScreenshotFrame alt={props.alt}>
      <OriginalImg
        {...props}
        className={cn(props.className, 'h-auto max-w-full')}
      />
    </ScreenshotFrame>
  );
}
