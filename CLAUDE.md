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

### Home Sales Page

The home route (`/`) is a single-column sales page (Spanish, Alex Hormozi / Isra Bravo style) selling the newsletter **Objeto Brillante** (weekly): one direct sales letter, an email capture form, and — below the form — a short list of tools.

- **All copy lives in `src/lib/content/home.md`** — this is the single source of truth. Edit that file to change the page text; do not hardcode copy in `src/routes/+page.svelte`.
- The `.md` file has two parts:
  - **Frontmatter** (between `---`): UI strings as `key: value` (form `placeholder`, `button`, `sending`, `success`, `error`, `errorOffline`, `errorNotConfigured`, `signature`). Lines starting with `#` inside the frontmatter are comments.
  - **Body**: the sales letter in plain markdown. `# ...` renders as the headline, a line wrapped in `**...**` renders bold, blank-line-separated lines become paragraphs.
- `src/routes/+page.svelte` imports the file as raw text (`import homeRaw from '$lib/content/home.md?raw'`) and a small `parseCopy()` function turns the frontmatter into UI strings and the body into copy blocks. This avoids treating `.md` as a Svelte/mdsvex module (which breaks type resolution), so no `svelte.config.js` extension changes are needed.
- **Email form**: posts to `/api/subscribe` (Resend — see the Email section below). Formspree is no longer used.
- **Theme**: the whole site is forced to the light DaisyUI theme (`data-theme="light"` in `app.html` and `src/routes/+layout.svelte`).

### Tools

Every tool under `src/routes/tool/*` is reachable by URL, but only the ones listed in `src/lib/tools/list.ts` are shown on the home page. Add an entry there to surface one; today that's just `copy`. The rest (`uuid-generator`, `character-counter`, `places-evaluator`, `lyra`) stay unlisted on purpose.

`/tool/copy` takes a URL, scrapes the page (`src/lib/server/scrape.ts`, which has SSRF guards — read the comments before touching it), and writes the offer using the seven copywriting frameworks in `src/lib/tools/copy/frameworks.ts`. The first one is free on screen; the other six are emailed in exchange for the address. Its model is pinned in `src/routes/tool/copy/+server.ts` — see the comment there before changing it.

### Email

`/api/subscribe` stores the address in a Resend audience and sends `src/lib/emails/00.md` right away. **There is no cron**: `01-03.md` are drafts for the Substack posts, not scheduled sends. Damian exports the Resend contacts and imports them into Substack by hand. Only strictly numbered `NN.md` files join the sequence — `tool-copy.md` is a one-off sent by the copy tool.

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
