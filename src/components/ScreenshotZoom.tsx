import type {ReactNode, RefObject} from 'react';

import {Dialog, DialogContent} from '@/components/arc/dialog/dialog';
import '@/components/arc/arc-tokens.css';

export type ZoomImage = {src: string; alt: string};

export default function ScreenshotZoom({
  image,
  open,
  onOpenChange,
  trigger,
}: {
  image: ZoomImage;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger: RefObject<HTMLButtonElement | null>;
}): ReactNode {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title={image.alt || 'Screenshot'}
        aria-describedby={undefined}
        className="lg-arc w-[min(calc(100vw-2rem),90rem)]"
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          trigger.current?.focus();
        }}
      >
        <img
          src={image.src}
          alt={image.alt}
          className="mx-auto block max-h-[calc(100dvh-10rem)] max-w-full object-contain"
        />
      </DialogContent>
    </Dialog>
  );
}
