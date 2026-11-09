type ArcLightbox = HTMLElement & {
  images: {src: string; alt: string; origin: Element}[];
  show(index?: number): void;
  close(): void;
};

// Arc's zoom button asks for these by name and ships no glyphs of its own.
const ZOOM_ICONS = {
  plus: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5v14"/></svg>',
  minus:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/></svg>',
};

let lightbox: Promise<ArcLightbox> | undefined;

// Web components do not exist on the server, and Lit is too heavy for the
// initial route. Screenshots stay visible and readable until this resolves.
function getLightbox(): Promise<ArcLightbox> {
  lightbox ??= Promise.all([
    import('@arclux/arc-ui/lightbox'),
    import('@arclux/arc-ui/icon-registry'),
  ]).then(([, {iconRegistry}]) => {
    iconRegistry.register('langguard', {icons: ZOOM_ICONS});
    const element = document.createElement('arc-lightbox') as ArcLightbox;
    document.body.append(element);
    window.addEventListener('popstate', () => element.close());
    return element;
  });
  return lightbox;
}

export function preloadLightbox(): void {
  void getLightbox();
}

export async function openLightbox(image: HTMLImageElement): Promise<void> {
  const element = await getLightbox();
  element.images = [
    {src: image.currentSrc || image.src, alt: image.alt, origin: image},
  ];
  element.show(0);
}
