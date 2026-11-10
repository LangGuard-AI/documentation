import type {ReactNode} from 'react';
import Layout from '@theme-original/DocItem/Layout';
import type {Props} from '@theme/DocItem/Layout';

import {ScrollProgress} from '@/components/ui/scroll-progress';

export default function DocItemLayout(props: Props): ReactNode {
  return (
    <>
      <ScrollProgress className="pointer-events-none fixed inset-x-0 top-(--ifm-navbar-height) z-199 h-0.5 bg-primary" />
      <Layout {...props} />
    </>
  );
}
