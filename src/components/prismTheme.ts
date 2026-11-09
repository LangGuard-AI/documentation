import type {PrismTheme} from 'prism-react-renderer';

const keyword = 'var(--lg-k-tool)';
const string = 'var(--lg-k-model)';
const name = 'var(--lg-k-data)';
const value = 'var(--lg-k-table)';
const quiet = 'var(--lg-muted-foreground)';

// One theme for both modes: the tokens swap with data-theme. The --lg-k-* hues
// are the app's entity colors, already AA on card. Warning-Light keeps their
// orange and red members out of syntax.
const prismTheme: PrismTheme = {
  plain: {color: 'var(--lg-foreground)', backgroundColor: 'var(--lg-card)'},
  styles: [
    {types: ['comment', 'prolog', 'doctype', 'cdata'], style: {color: quiet}},
    {types: ['punctuation', 'operator'], style: {color: quiet}},
    {types: ['keyword', 'atrule', 'important', 'selector', 'tag'], style: {color: keyword}},
    {types: ['string', 'char', 'attr-value', 'inserted', 'regex', 'url'], style: {color: string}},
    {types: ['function', 'property', 'attr-name', 'class-name', 'builtin', 'key'], style: {color: name}},
    {types: ['number', 'boolean', 'constant', 'symbol', 'variable', 'entity'], style: {color: value}},
    {types: ['deleted'], style: {color: quiet, textDecorationLine: 'line-through'}},
  ],
};

export default prismTheme;
