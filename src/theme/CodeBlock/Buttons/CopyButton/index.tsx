import type {ReactNode} from 'react';
import {useCodeBlockContext} from '@docusaurus/theme-common/internal';
import type {Props} from '@theme/CodeBlock/Buttons/CopyButton';

import {CopyButton} from '@/components/ui/copy-button';

export default function CodeBlockCopyButton({className}: Props): ReactNode {
  const {
    metadata: {code},
  } = useCodeBlockContext();
  return <CopyButton value={code} className={className} />;
}
