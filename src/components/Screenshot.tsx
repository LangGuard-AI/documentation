import type {ComponentProps, ReactNode} from 'react';
import {usePluginData} from '@docusaurus/useGlobalData';
import {ThemedComponent} from '@docusaurus/theme-common';
import type {Props as ThemedImageProps} from '@theme/ThemedImage';

import {BrowserWindow} from '@/components/ui/browser-window';
import {cn} from '@/lib/utils';
import type {ImageDimensions} from '@/plugins/image-dimensions';

const IMAGE_CLASS = 'h-auto max-w-full';

export function ScreenshotFrame({children}: {children: ReactNode}) {
  return (
    <BrowserWindow className="my-6">
      <span className="flex">{children}</span>
    </BrowserWindow>
  );
}

// ThemedComponent rather than the original ThemedImage because a light and dark
// pair can differ in shape (1256x696 against 2184x2860), so each needs its own
// width and height. Never put a display utility on these images: utilities are
// important and would beat the rule that hides the inactive theme before
// hydration.
export function ThemedScreenshot({
  sources,
  alt,
  className,
  ...rest
}: ThemedImageProps & ComponentProps<'img'>) {
  const dimensions = usePluginData(
    'langguard-image-dimensions',
  ) as ImageDimensions;
  return (
    <ScreenshotFrame>
      <ThemedComponent className={className}>
        {({theme, className: themeClassName}) => {
          const [width, height] = dimensions[sources[theme]] ?? [];
          return (
            <img
              loading="lazy"
              decoding="async"
              {...rest}
              src={sources[theme]}
              alt={alt}
              width={width}
              height={height}
              className={cn(themeClassName, IMAGE_CLASS)}
            />
          );
        }}
      </ThemedComponent>
    </ScreenshotFrame>
  );
}
