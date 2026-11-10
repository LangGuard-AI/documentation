import type {ReactNode} from 'react';
import {useMDXComponents} from '@mdx-js/react';
import OriginalThemedImage from '@theme-original/ThemedImage';
import type {Props} from '@theme/ThemedImage';

import {ThemedScreenshot} from '@/components/Screenshot';

// The navbar and footer logos also render through ThemedImage. Only images in
// doc content sit under the MDX provider, whose component map is non-empty.
export default function ThemedImage(props: Props): ReactNode {
  const inDocContent = Object.keys(useMDXComponents()).length > 0;
  return inDocContent ? (
    <ThemedScreenshot {...props} />
  ) : (
    <OriginalThemedImage {...props} />
  );
}
