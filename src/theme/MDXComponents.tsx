import type {ComponentProps} from 'react';
import MDXComponents from '@theme-original/MDXComponents';

function Table(props: ComponentProps<'table'>) {
  return (
    <div className="lg-table">
      <table {...props} />
    </div>
  );
}

export default {...MDXComponents, table: Table};
