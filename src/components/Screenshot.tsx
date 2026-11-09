import type {ComponentProps, ReactNode} from 'react';
import {usePluginData} from '@docusaurus/useGlobalData';
import {ThemedComponent} from '@docusaurus/theme-common';
import type {Props as ThemedImageProps} from '@theme/ThemedImage';

import {BrowserWindow} from '@/components/ui/browser-window';
import {
  MorphingDialog,
  MorphingDialogClose,
  MorphingDialogContainer,
  MorphingDialogContent,
  MorphingDialogTrigger,
  MorphingDialogTriggerImage,
} from '@/components/ui/morphing-dialog';
import {cn} from '@/lib/utils';
import type {ImageDimensions} from '@/plugins/image-dimensions';

const IMAGE_CLASS = 'h-auto max-w-full';
const MORPH = {type: 'spring', visualDuration: 0.4, bounce: 0} as const;

export function ScreenshotFrame({
  alt,
  children,
}: {
  alt?: string;
  children: ReactNode;
}) {
  return (
    <BrowserWindow className="my-6">
      <MorphingDialog transition={MORPH}>
        <MorphingDialogTrigger
          label={alt ? `View larger: ${alt}` : 'View larger image'}
          className="hover-elevate flex w-full cursor-zoom-in border-0 bg-transparent p-0 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
        >
          {children}
        </MorphingDialogTrigger>
        <MorphingDialogContainer>
          <MorphingDialogContent
            label={alt || 'Screenshot'}
            className="relative w-fit border border-border bg-card shadow-lg"
          >
            <MorphingDialogTriggerImage className="block h-auto max-h-[calc(100dvh-2rem)] w-auto max-w-[min(calc(100vw-2rem),90rem)]" />
            <MorphingDialogClose className="absolute top-3 right-3 grid size-8 cursor-pointer place-items-center rounded-md border border-border bg-card text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring" />
          </MorphingDialogContent>
        </MorphingDialogContainer>
      </MorphingDialog>
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
    <ScreenshotFrame alt={alt}>
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
