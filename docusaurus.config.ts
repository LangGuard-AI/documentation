import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'LangGuard',
  tagline: 'AI Governance & Observability Platform',
  favicon: 'img/favicon.ico',

  future: {
    v4: true,
  },

  url: 'https://docs.langguard.ai',
  baseUrl: '/',

  organizationName: 'LangGuard-AI',
  projectName: 'langguard-docs',

  onBrokenLinks: 'throw',
  onBrokenAnchors: 'warn',

  markdown: {
    hooks: {
      onBrokenMarkdownLinks: 'warn',
    },
  },

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          routeBasePath: '/',
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    image: 'img/langguard-social-card.png',
    colorMode: {
      defaultMode: 'light',
      disableSwitch: false,
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: 'LangGuard',
      logo: {
        alt: 'LangGuard Logo',
        src: 'img/logo.svg',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'docsSidebar',
          position: 'left',
          label: 'Documentation',
        },
        {
          href: 'https://langguard.ai',
          label: 'Home',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Documentation',
          items: [
            {
              label: 'Getting Started',
              to: '/getting-started',
            },
            {
              label: 'Features',
              to: '/features',
            },
            {
              label: 'Integrations',
              to: '/integrations',
            },
          ],
        },
        {
          title: 'Product',
          items: [
            {
              label: 'Pricing',
              href: 'mailto:info@langguard.ai',
            },
            {
              label: 'Support',
              href: 'mailto:info@langguard.ai',
            },
          ],
        },
        {
          title: 'Company',
          items: [
            {
              label: 'About',
              href: 'https://langguard.ai',
            },
            {
              label: 'Blog',
              href: 'https://langguard.ai/blog',
            },
            {
              label: 'Contact',
              href: 'https://langguard.ai',
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} LangGuard Inc. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ['bash', 'typescript', 'json', 'yaml'],
    },
    algolia: undefined, // Add Algolia search config when ready
  } satisfies Preset.ThemeConfig,
};

export default config;
