import {Fragment, type ReactNode} from 'react';
import Link from '@docusaurus/Link';

const DOCS_HOST = 'docs.langguard.ai';

const FENCE_TO_CLOSE_OR_END = /^[ \t]*```[^\n]*\n([\s\S]*?)(?:^[ \t]*```[ \t]*$|(?![\s\S]))/gm;

const INLINE =
  /`(?<code>[^`\n]+)`|\*\*(?<bold>.+?)\*\*|\[(?<label>[^\]\n]+)\]\((?<target>https?:\/\/[^\s)]+)\)|(?<bare>https?:\/\/[^\s<>)\]"'`*]*[^\s<>)\]"'`*.,:;!?])/g;

export function parseHttpUrl(raw: string): URL | null {
  try {
    const url = new URL(raw);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url : null;
  } catch {
    return null;
  }
}

export function ChatLink({url, children}: {url: URL; children: string}) {
  if (url.hostname === DOCS_HOST) {
    return <Link to={url.pathname + url.hash}>{children}</Link>;
  }
  return (
    <a href={url.href} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  );
}

function splitBy(
  text: string,
  pattern: RegExp,
  renderMatch: (match: RegExpExecArray) => ReactNode,
  renderGap: (gap: string) => ReactNode,
): ReactNode[] {
  const nodes: ReactNode[] = [];
  let cursor = 0;
  for (const match of text.matchAll(pattern)) {
    nodes.push(
      renderGap(text.slice(cursor, match.index)),
      <Fragment key={match.index}>{renderMatch(match)}</Fragment>,
    );
    cursor = match.index + match[0].length;
  }
  nodes.push(renderGap(text.slice(cursor)));
  return nodes;
}

function renderInlineToken(match: RegExpExecArray): ReactNode {
  const {code, bold, label, target, bare} = match.groups ?? {};
  if (code !== undefined) {
    return <code>{code}</code>;
  }
  if (bold !== undefined) {
    return <strong>{renderInline(bold)}</strong>;
  }
  const url = parseHttpUrl(target ?? bare);
  if (url === null) {
    return match[0];
  }
  return <ChatLink url={url}>{label ?? bare}</ChatLink>;
}

function renderInline(text: string): ReactNode[] {
  return splitBy(text, INLINE, renderInlineToken, (gap) => gap);
}

export function renderMessage(text: string): ReactNode[] {
  return splitBy(
    text,
    FENCE_TO_CLOSE_OR_END,
    ([, code]) => (
      <pre>
        <code>{code.replace(/\n$/, '')}</code>
      </pre>
    ),
    (gap) => renderInline(gap.replace(/^\n+|\n+$/g, '')),
  );
}
