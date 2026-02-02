# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is the public documentation site for LangGuard, an AI Governance & Observability Platform. Built with Docusaurus 3.9 and hosted at https://docs.langguard.ai.

## Commands

```bash
npm run start      # Start dev server with hot reload
npm run build      # Build static site to build/
npm run serve      # Serve built site locally
npm run typecheck  # Run TypeScript type checking
npm run clear      # Clear Docusaurus cache
```

Requires Node.js 20+.

## Architecture

- **Docusaurus 3** static site generator with TypeScript
- **docs/** - Markdown documentation content organized by section
- **sidebars.ts** - Defines navigation structure (maps to docs/ hierarchy)
- **docusaurus.config.ts** - Site configuration (title, URLs, navbar, footer, theme)
- **src/css/custom.css** - Theme customizations

## Documentation Structure

Docs are served at the root URL (`routeBasePath: '/'`). The sidebar is defined in `sidebars.ts` and references doc IDs that map to files in `docs/`:
- `intro` → `docs/intro.md`
- `getting-started/quick-start` → `docs/getting-started/quick-start.md`

Each category has an `index.md` that serves as the category landing page.

## Configuration Notes

- Blog is disabled
- Broken links throw errors (`onBrokenLinks: 'throw'`)
- Prism syntax highlighting includes: bash, typescript, json, yaml
