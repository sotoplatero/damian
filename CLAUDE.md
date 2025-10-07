# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- **Development server**: `pnpm dev` (or `npm run dev`)
- **Production build**: `pnpm build`
- **Preview production build**: `pnpm preview`
- **Type checking**: `pnpm check`
- **Type checking (watch mode)**: `pnpm check:watch`

This project uses **pnpm** as the package manager.

## Tech Stack

- **Framework**: SvelteKit (Svelte 5 with runes)
- **Styling**: Tailwind CSS 4 + DaisyUI
- **Markdown**: mdsvex (allows `.svx` files alongside `.svelte`)
- **Internationalization**: Paraglide JS (inlang)
- **TypeScript**: Strict mode enabled

## Architecture

### Internationalization Setup

The project uses Paraglide JS for i18n with the following integration:

1. **Vite plugin** (`vite.config.ts`): Generates runtime code in `src/lib/paraglide/` from message files in `messages/{locale}.json`
2. **Supported locales**: English (`en`, base locale) and Spanish (`es`)
3. **Server-side middleware** (`src/hooks.server.ts`): `paraglideMiddleware` handles locale detection and injects the `%paraglide.lang%` placeholder in `app.html`
4. **Client-side rerouting** (`src/hooks.ts`): `deLocalizeUrl` removes locale prefixes from URLs for proper routing
5. **Message files**: Located in `messages/en.json` and `messages/es.json`

The Paraglide runtime is auto-generated in `src/lib/paraglide/` - do not edit these files directly. Update message files instead and rebuild.

### Styling

- Uses Tailwind CSS 4 via the Vite plugin
- DaisyUI component library is installed for UI components
- Global styles in `src/app.css` import Tailwind and typography plugin
- Tailwind v4 uses CSS-based configuration (no `tailwind.config.js`)

### File Extensions

The project supports both `.svelte` and `.svx` (mdsvex) file extensions for components. The `.svx` extension allows writing Svelte components with markdown syntax.

### SvelteKit Configuration

- Uses `adapter-auto` for deployment (auto-detects environment)
- Preprocessors: vitePreprocess and mdsvex
- Path alias `$lib` maps to `src/lib/`
