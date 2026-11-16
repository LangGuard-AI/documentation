import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';
import prismTheme from './src/components/prismTheme';

const config: Config = {
  title: 'LangGuard',
  tagline: 'Runtime AI Controls & Governance Platform',
  favicon: 'img/favicon.ico',

  future: {
    v4: true,
  },

  url: 'https://docs.langguard.ai',
  baseUrl: '/',
  // GitHub Pages 301-redirects /page to /page/, so canonical and sitemap URLs
  // must carry the trailing slash or Google sees them as redirects.
  trailingSlash: true,

  organizationName: 'LangGuard-AI',
  projectName: 'langguard-docs',

  onBrokenLinks: 'throw',
  onBrokenAnchors: 'warn',

  customFields: {
    chatApiUrl: process.env.CHAT_API_URL ?? '',
  },

  markdown: {
    // future.v4 disables MDX 1 compat in Docusaurus 3.10+; the docs rely on
    // explicit `## Heading {#id}` anchors and `:::tip Title` admonitions.
    mdx1Compat: {
      headingIds: true,
      admonitions: true,
    },
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
          customCss: ['./src/css/tokens.css', './src/css/custom.css'],
        },
      } satisfies Preset.Options,
    ],
  ],

  headTags: [
    {tagName: 'link', attributes: {rel: 'preconnect', href: 'https://fonts.googleapis.com'}},
    {tagName: 'link', attributes: {rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: 'anonymous'}},
  ],

  stylesheets: [
    'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400..700&family=Plus+Jakarta+Sans:ital,wght@0,400..700;1,400..700&display=swap',
  ],

  themes: [
    [
      '@easyops-cn/docusaurus-search-local',
      {
        // Search index is built at `npm run build`; search doesn't work in
        // `npm run start`.
        hashed: true,
        docsRouteBasePath: '/',
        indexBlog: false,
        highlightSearchTermsOnTargetPage: true,
        searchBarPosition: 'left',
      },
    ],
  ],

  plugins: [
    './src/plugins/tailwind.ts',
    './src/plugins/image-dimensions.ts',
    [
      '@docusaurus/plugin-client-redirects',
      {
        // Databricks App and Google Cloud moved under Private Install. Keep the
        // old URLs working for existing links.
        createRedirects(existingPath: string) {
          for (const section of ['databricks-app', 'google-cloud']) {
            const prefix = `/private-install/${section}`;
            if (existingPath.startsWith(prefix)) {
              return `/${section}${existingPath.slice(prefix.length)}`;
            }
          }
          // Sign-in and Email moved from Azure to Generic Cluster (Helm).
          const helmSignIn = '/private-install/helm/sign-in-and-email';
          if (existingPath.startsWith(helmSignIn)) {
            return `/private-install/azure/sign-in-and-email${existingPath.slice(helmSignIn.length)}`;
          }
          return undefined;
        },
      },
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
      title: 'Docs',
      logo: {
        alt: 'LangGuard',
        src: 'img/brand/langguard-wordmark.png',
        width: 117,
        height: 24,
      },
      items: [
        {type: 'search', position: 'right'},
        {
          href: 'https://langguard.ai',
          label: 'langguard.ai',
          position: 'right',
        },
      ],
    },
    // Rendered by src/theme/Footer, which mirrors the langguard.ai footer.
    footer: {
      links: [
        {
          title: 'Product',
          items: [
            {label: 'Home', href: 'https://langguard.ai/'},
            {label: 'Features', href: 'https://langguard.ai/#solutions'},
            {label: 'Platform', href: 'https://langguard.ai/platform/'},
            {label: 'AI Action Security Assessment', href: 'https://langguard.ai/ai-security-assessment/'},
            {label: 'Alternatives', href: 'https://langguard.ai/alternatives/'},
          ],
        },
        {
          title: 'Solutions',
          items: [
            {label: 'MCP Context Authorization', href: 'https://langguard.ai/solutions/mcp-context-authorization/'},
            {label: 'AWS', href: 'https://langguard.ai/solutions/aws/'},
            {label: 'Databricks', href: 'https://langguard.ai/solutions/databricks/'},
            {label: 'Claude Code', href: 'https://langguard.ai/solutions/claude-code/'},
            {label: 'Forward-Deployed Engineering', href: 'https://langguard.ai/solutions/forward-deployed-engineering/'},
          ],
        },
        {
          title: 'Assets',
          items: [
            {label: 'Solution Brief', href: 'https://langguard.ai/assets/LangGuard%20Company%201_pager%202026.pdf'},
            {label: 'Whitepaper', href: 'https://langguard.ai/whitepaper/'},
          ],
        },
        {
          title: 'Company',
          items: [
            {label: 'About', href: 'https://langguard.ai/about/'},
            {label: 'News & Press', href: 'https://langguard.ai/news/'},
            {label: 'Events', href: 'https://langguard.ai/events/'},
            {label: 'Blog', href: 'https://langguard.ai/blog/'},
          ],
        },
        {
          title: 'Legal',
          items: [
            {label: 'Privacy', href: 'https://langguard.ai/privacy/'},
            {label: 'Terms', href: 'https://langguard.ai/tos/'},
            {label: 'SLA', href: 'https://langguard.ai/sla/'},
            {label: 'Responsible Disclosure', href: 'https://langguard.ai/security-policy/'},
          ],
        },
      ],
      copyright: `© ${new Date().getFullYear()} LangGuard Inc. All rights reserved.`,
    },
    prism: {
      theme: prismTheme,
      additionalLanguages: ['bash', 'typescript', 'json', 'yaml', 'powershell', 'rego'],
    },
    algolia: undefined, // Add Algolia search config when ready
  } satisfies Preset.ThemeConfig,
};

export default config;
