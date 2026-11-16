import type {ReactNode} from 'react';
import {useColorMode, useThemeConfig} from '@docusaurus/theme-common';
import type {ColorMode} from '@docusaurus/theme-common';
import type {MultiColumnFooter} from '@docusaurus/theme-common';
import useBaseUrl from '@docusaurus/useBaseUrl';

import styles from './styles.module.css';

const SITE = 'https://langguard.ai';

type Social = {label: string; href: string; path: string};

const SOCIALS: Social[] = [
  {
    label: 'LinkedIn',
    href: 'https://linkedin.com/company/langguard-ai',
    path: 'M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z',
  },
  {
    label: 'X',
    href: 'https://x.com/LangGuardAI',
    path: 'M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932zM17.61 20.644h2.039L6.486 3.24H4.298z',
  },
  {
    label: 'YouTube',
    href: 'https://www.youtube.com/@LangGuardVideos/',
    path: 'M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z',
  },
  {
    label: 'GitHub',
    href: 'https://github.com/LangGuard-AI/',
    path: 'M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12',
  },
];

type ThemeOption = {choice: 'light' | 'system' | 'dark'; label: string; icon: ReactNode};

const THEME_OPTIONS: ThemeOption[] = [
  {
    choice: 'light',
    label: 'Light mode',
    icon: (
      <>
        <circle cx="12" cy="12" r="5" />
        <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
      </>
    ),
  },
  {
    choice: 'system',
    label: 'System theme',
    icon: (
      <>
        <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
        <path d="M8 21h8M12 17v4" />
      </>
    ),
  },
  {
    choice: 'dark',
    label: 'Dark mode',
    icon: <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />,
  },
];

function ThemeSwitcher(): ReactNode {
  const {setColorMode} = useColorMode();
  const select = (choice: ThemeOption['choice']) =>
    setColorMode(choice === 'system' ? null : (choice satisfies ColorMode));
  return (
    <div className={styles.switcher} role="group" aria-label="Theme switcher">
      {THEME_OPTIONS.map(({choice, label, icon}) => (
        <button
          key={choice}
          type="button"
          className={styles.switcherBtn}
          data-choice={choice}
          aria-label={label}
          title={label}
          onClick={() => select(choice)}>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true">
            {icon}
          </svg>
        </button>
      ))}
    </div>
  );
}

export default function Footer(): ReactNode {
  const {footer} = useThemeConfig();
  const icon = useBaseUrl('/img/brand/langguard-icon.png');
  const text = useBaseUrl('/img/brand/langguard-text.png');
  if (!footer) {
    return null;
  }
  const columns = footer.links as MultiColumnFooter['links'];

  return (
    <footer className={styles.footer}>
      <div className={styles.topAccent} />
      <div className={styles.inner}>
        <div className={styles.upper}>
          <div className={styles.brand}>
            <a href={SITE} className={styles.brandName}>
              <img src={icon} alt="" width={26} height={26} loading="lazy" />
              <img
                src={text}
                alt="LangGuard"
                className={styles.logoText}
                width={127}
                height={26}
                loading="lazy"
              />
            </a>
            <p className={styles.tagline}>
              Deterministic runtime AI governance for the agentic era.
            </p>
            <div className={styles.social}>
              {SOCIALS.map(({label, href, path}) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}>
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d={path} />
                  </svg>
                </a>
              ))}
            </div>
            <div className={styles.editorialMark} aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
          </div>

          <div className={styles.dividerV} />

          <nav className={styles.nav} aria-label="Footer">
            {columns.map((column) => (
              <div key={column.title} className={styles.col}>
                <h4 className={styles.colHeader}>{column.title}</h4>
                <div className={styles.colAccent} />
                <ul>
                  {column.items.map((item) => (
                    <li key={item.label}>
                      <a href={item.href}>{item.label}</a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        <div className={styles.bottom}>
          <div className={styles.dividerH} />
          <div className={styles.bottomBar}>
            <p className={styles.copyright}>{footer.copyright}</p>
            <ThemeSwitcher />
          </div>
        </div>
      </div>
    </footer>
  );
}
