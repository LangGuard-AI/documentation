import fs from 'fs/promises';
import path from 'path';
import type {LoadContext, Plugin} from '@docusaurus/types';

export type ImageDimensions = Record<string, [width: number, height: number]>;

function readPngSize(png: Buffer): [number, number] {
  return [png.readUInt32BE(16), png.readUInt32BE(20)];
}

// Screenshots load lazily, so without real dimensions every image reflows the
// article as it arrives and anchor links land in the wrong place. ThemedImage
// sources are plain static URLs that the MDX loader never measures.
export default function imageDimensionsPlugin({
  siteDir,
}: LoadContext): Plugin<ImageDimensions> {
  return {
    name: 'langguard-image-dimensions',
    async loadContent() {
      const dir = path.join(siteDir, 'static/img');
      const pngs = (await fs.readdir(dir)).filter((f) => f.endsWith('.png'));
      return Object.fromEntries(
        await Promise.all(
          pngs.map(async (f) => [
            `/img/${f}`,
            readPngSize(await fs.readFile(path.join(dir, f))),
          ]),
        ),
      );
    },
    async contentLoaded({content, actions}) {
      actions.setGlobalData(content);
    },
  };
}
