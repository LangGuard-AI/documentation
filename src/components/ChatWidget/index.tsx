import {useEffect, useRef, useState, type KeyboardEvent} from 'react';
import clsx from 'clsx';
import {ChatLink, parseHttpUrl, renderMessage} from './renderMessage';
import styles from './styles.module.css';

type Turn =
  | {role: 'user'; text: string}
  | {role: 'assistant'; text: string; sources: string[]};

type Status =
  | {kind: 'idle'}
  | {kind: 'sending'}
  | {kind: 'failed'; message: string};

type ChatResult =
  | {kind: 'reply'; text: string; sources: string[]}
  | {kind: 'failed'; message: string};

const TITLE = 'LangGuard Docs Assistant';
const GREETING =
  'Hi, I answer questions from the LangGuard documentation. What are you trying to do?';
const CHIPS = [
  'How do I get started?',
  'Which integrations are supported?',
  'What are my private install options?',
  'How do policies work?',
];
const STORAGE_KEY = 'lg_docs_chat_turns';
const MAX_TURNS = 12;
const MAX_MESSAGE_CHARS = 2000;
const MAX_SOURCES = 3;
const GENERIC_FAILURE = 'Something went wrong on my end. Please try again.';
const NETWORK_FAILURE =
  "I couldn't reach the server. Check your connection and try again.";

function isTurn(value: unknown): value is Turn {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const {role, text, sources} = value as Record<string, unknown>;
  if (typeof text !== 'string') {
    return false;
  }
  return (
    role === 'user' ||
    (role === 'assistant' &&
      Array.isArray(sources) &&
      sources.every((source) => typeof source === 'string'))
  );
}

function readStoredTurns(): Turn[] {
  try {
    const stored: unknown = JSON.parse(
      sessionStorage.getItem(STORAGE_KEY) ?? '[]',
    );
    return Array.isArray(stored) ? stored.filter(isTurn).slice(-MAX_TURNS) : [];
  } catch {
    return [];
  }
}

function tryStoreTurns(turns: Turn[]): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(turns));
  } catch {
  }
}

function parseChatResponse(ok: boolean, body: unknown): ChatResult {
  const {reply, sources} = (typeof body === 'object' && body !== null
    ? body
    : {}) as Record<string, unknown>;
  const text = typeof reply === 'string' && reply.trim() !== '' ? reply : null;
  if (!ok || text === null) {
    return {kind: 'failed', message: text ?? GENERIC_FAILURE};
  }
  return {
    kind: 'reply',
    text,
    sources: Array.isArray(sources)
      ? sources.filter((source) => typeof source === 'string')
      : [],
  };
}

async function requestReply(
  apiUrl: string,
  message: string,
  history: Turn[],
  signal: AbortSignal,
): Promise<ChatResult> {
  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        message,
        history: history.map(({role, text}) => ({role, text})),
        assistant: 'docs',
      }),
      signal,
    });
    return parseChatResponse(
      response.ok,
      await response.json().catch(() => null),
    );
  } catch {
    return {kind: 'failed', message: NETWORK_FAILURE};
  }
}

function citedPages(sources: string[]): URL[] {
  const byPage = new Map<string, URL>();
  for (const url of sources.map(parseHttpUrl)) {
    if (url === null) {
      continue;
    }
    const page = url.origin + url.pathname.replace(/\/$/, '');
    if (!byPage.has(page)) {
      byPage.set(page, url);
    }
  }
  return [...byPage.values()].slice(0, MAX_SOURCES);
}

function pageLabel(url: URL): string {
  return url.pathname.replace(/^\/|\/$/g, '') || 'Home';
}

function TurnMessage({turn}: {turn: Turn}) {
  if (turn.role === 'user') {
    return <div className={clsx(styles.message, styles.user)}>{turn.text}</div>;
  }
  const pages = citedPages(turn.sources);
  return (
    <>
      <div className={clsx(styles.message, styles.assistant)}>
        {renderMessage(turn.text)}
      </div>
      {pages.length > 0 && (
        <div className={styles.sources}>
          Sources:{' '}
          {pages.map((url) => (
            <ChatLink key={url.href} url={url}>
              {pageLabel(url)}
            </ChatLink>
          ))}
        </div>
      )}
    </>
  );
}

export default function ChatWidget({apiUrl}: {apiUrl: string}) {
  const [open, setOpen] = useState(false);
  const [turns, setTurns] = useState<Turn[]>(readStoredTurns);
  const [status, setStatus] = useState<Status>({kind: 'idle'});
  const [draft, setDraft] = useState('');
  const bubbleRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const inFlightRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [open, turns, status]);

  // On document rather than the panel: following a citation hands focus to
  // Docusaurus's skip-to-content target, outside the panel.
  useEffect(() => {
    if (!open) {
      return undefined;
    }
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') {
        close();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open]);

  function commitTurns(next: Turn[]): Turn[] {
    const kept = next.slice(-MAX_TURNS);
    setTurns(kept);
    tryStoreTurns(kept);
    return kept;
  }

  function close() {
    setOpen(false);
    bubbleRef.current?.focus();
  }

  function startOver() {
    inFlightRef.current?.abort();
    commitTurns([]);
    setStatus({kind: 'idle'});
    setDraft('');
  }

  async function send(text: string) {
    const message = text.trim();
    if (message === '' || status.kind === 'sending') {
      return;
    }
    const controller = new AbortController();
    inFlightRef.current = controller;
    const withQuestion = commitTurns([...turns, {role: 'user', text: message}]);
    setDraft('');
    setStatus({kind: 'sending'});

    const result = await requestReply(
      apiUrl,
      message,
      turns,
      controller.signal,
    );
    if (controller.signal.aborted) {
      return;
    }
    if (result.kind === 'failed') {
      setStatus({kind: 'failed', message: result.message});
      return;
    }
    commitTurns([
      ...withQuestion,
      {role: 'assistant', text: result.text, sources: result.sources},
    ]);
    setStatus({kind: 'idle'});
  }

  function onInputKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (
      event.key === 'Enter' &&
      !event.shiftKey &&
      !event.nativeEvent.isComposing
    ) {
      event.preventDefault();
      void send(draft);
    }
  }

  return (
    <div className={styles.root}>
      {open && (
        <div className={styles.panel} role="dialog" aria-label={TITLE}>
          <div className={styles.head}>
            <span className={styles.dot} aria-hidden="true" />
            <span className={styles.title}>{TITLE}</span>
            <button type="button" onClick={startOver}>
              Start over
            </button>
            <button type="button" aria-label="Close chat" onClick={close}>
              ✕
            </button>
          </div>
          <div
            ref={logRef}
            className={styles.log}
            role="log"
            aria-live="polite">
            {turns.length === 0 && (
              <div className={clsx(styles.message, styles.assistant)}>
                {GREETING}
              </div>
            )}
            {turns.map((turn, index) => (
              <TurnMessage key={index} turn={turn} />
            ))}
            {status.kind === 'sending' && (
              <div
                className={clsx(
                  styles.message,
                  styles.assistant,
                  styles.typing,
                )}
                aria-hidden="true">
                <span />
                <span />
                <span />
              </div>
            )}
            {status.kind === 'failed' && (
              <div className={clsx(styles.message, styles.failure)}>
                {status.message}
              </div>
            )}
          </div>
          {turns.length === 0 && (
            <div className={styles.chips}>
              {CHIPS.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => {
                    void send(chip);
                    inputRef.current?.focus();
                  }}>
                  {chip}
                </button>
              ))}
            </div>
          )}
          <div className={styles.inputRow}>
            <textarea
              ref={inputRef}
              className={styles.input}
              rows={1}
              maxLength={MAX_MESSAGE_CHARS}
              placeholder="Ask about the docs..."
              aria-label="Message"
              autoFocus
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={onInputKeyDown}
            />
            <button
              type="button"
              className={styles.send}
              aria-label="Send"
              disabled={status.kind === 'sending'}
              onClick={() => void send(draft)}>
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </div>
          <div className={styles.footer}>
            AI-generated answers can be wrong. Messages may be reviewed to
            improve the assistant.
          </div>
        </div>
      )}
      <button
        ref={bubbleRef}
        type="button"
        className={styles.bubble}
        aria-label="Chat with the LangGuard docs assistant"
        aria-expanded={open}
        onClick={() => (open ? close() : setOpen(true))}>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true">
          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
        </svg>
      </button>
    </div>
  );
}
