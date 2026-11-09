import {useEffect, useState, type ComponentProps} from 'react';

import {cn} from '@/lib/utils';

function legacyCopyToClipboard(value: string): boolean {
  const textArea = document.createElement('textarea');
  textArea.value = value;
  textArea.setAttribute('readonly', '');
  textArea.style.position = 'fixed';
  textArea.style.opacity = '0';
  textArea.style.pointerEvents = 'none';

  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();
  textArea.setSelectionRange(0, value.length);

  let hasCopied = false;
  try {
    hasCopied = document.execCommand('copy');
  } catch {
    hasCopied = false;
  }

  document.body.removeChild(textArea);
  return hasCopied;
}

async function copyToClipboard(value: string): Promise<boolean> {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(value);
      return true;
    } catch {
      return legacyCopyToClipboard(value);
    }
  }
  return legacyCopyToClipboard(value);
}

const ICON =
  'absolute inset-0 flex items-center justify-center transition-[opacity,scale,filter] duration-300 ease-out motion-reduce:transition-none';
const ICON_SHOWN = 'scale-100 opacity-100 blur-none';
const ICON_HIDDEN = 'scale-25 opacity-0 blur-[4px]';

const SVG_PROPS: ComponentProps<'svg'> = {
  viewBox: '0 0 24 24',
  className: 'size-4',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
};

// Cult UI copy-button. Its AnimatePresence icon swap is the same scale, blur,
// and fade done in CSS, which keeps Motion's renderer off every doc route.
export function CopyButton({
  value,
  className,
  ...props
}: ComponentProps<'button'> & {value: string}) {
  const [hasCopied, setHasCopied] = useState(false);

  useEffect(() => {
    if (!hasCopied) return undefined;
    const timer = setTimeout(() => setHasCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [hasCopied]);

  return (
    <button
      type="button"
      title="Copy"
      aria-label={hasCopied ? 'Copied to clipboard' : 'Copy to clipboard'}
      data-copied={hasCopied}
      data-slot="copy-button"
      className={cn('clean-btn touch-manipulation', className)}
      onClick={async () => {
        if (await copyToClipboard(value)) setHasCopied(true);
      }}
      {...props}
    >
      <span aria-atomic="true" aria-live="polite" className="sr-only">
        {hasCopied ? 'Copied' : ''}
      </span>
      <span
        aria-hidden="true"
        className="relative inline-flex size-4 items-center justify-center"
      >
        <span className={cn(ICON, hasCopied ? ICON_HIDDEN : ICON_SHOWN)}>
          <svg {...SVG_PROPS}>
            <rect x="9" y="9" width="13" height="13" rx="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
        </span>
        <span className={cn(ICON, hasCopied ? ICON_SHOWN : ICON_HIDDEN)}>
          <svg {...SVG_PROPS}>
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </span>
      </span>
    </button>
  );
}
