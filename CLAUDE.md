# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- **Development server**: `pnpm dev` (or `npm run dev`)
- **Production build**: `pnpm build`
- **Preview production build**: `pnpm preview`
- **Type checking**: `pnpm check`
- **Type checking (watch mode)**: `pnpm check:watch`

This project uses **pnpm** as the package manager.

`pnpm check` currently reports 2 known errors (`src/routes/demo/paraglide` and
`src/routes/tool/places-evaluator`). Both predate the current work. A clean run
means "no *new* errors", not zero.

## Tech Stack

- **Framework**: SvelteKit (Svelte 5 with runes)
- **Styling**: Tailwind CSS 4 + DaisyUI, on top of a small custom theme (see Styling)
- **Markdown**: mdsvex (allows `.svx` files alongside `.svelte`)
- **Internationalization**: Paraglide JS (inlang) — only `places-evaluator` still uses it
- **TypeScript**: Strict mode enabled

## Architecture

### Home Sales Page

The home route (`/`) is a single-column sales page (Spanish, Isra Bravo style) selling
the newsletter **Objeto Brillante** (weekly): one direct sales letter, the Substack
signup form, and below it the list of tools.

- **All copy lives in `src/lib/content/home.md`** — single source of truth. Edit that
  file; never hardcode copy in `src/routes/+page.svelte`.
- Frontmatter holds UI strings as `key: value`; lines starting with `#` are comments and
  never reach the page. There is a long notes block in there addressed to Damian —
  **read it before editing the letter**, it records decisions that look like mistakes
  otherwise (for example: the story says "sin decírselo a mis amigos", never "a nadie",
  because "a nadie" reads as abandoning his wife).
- The body is plain markdown, rendered with `marked` from a `?raw` import. This avoids
  treating `.md` as a Svelte/mdsvex module, which breaks type resolution.
- **Signup**: the home embeds Substack's own iframe. Our own form
  (`src/lib/components/SubscribeForm.svelte`, posts to `/api/subscribe` → Resend) is kept
  but **unused** — it matches the site design, so it's there if the iframe ever goes.
- Substack's subscribe API cannot be called from the server: it sits behind Cloudflare
  and returns a challenge to anything that isn't a real browser. Don't try again.

### Tools

Every tool under `src/routes/tool/*` is reachable by URL; only the ones in
`src/lib/tools/list.ts` show on the home page. Add an object there and it appears.

| Tool | State |
|---|---|
| `newsletter` | Listed. Built on the site theme. |
| `7-frameworks` | Listed. Built on the site theme. |
| `places-evaluator` | Live by URL, unlisted. Predates the theme, still Paraglide + DaisyUI. |

`lyra`, `uuid-generator` and `character-counter` were removed.

Both listed tools follow the same shape: **URL in → free preview on screen → full
result emailed in exchange for the address.** The expensive half never reaches the
browser.

**`/tool/7-frameworks`** scrapes a page and rewrites the offer with the seven
copywriting frameworks in `src/lib/tools/7-frameworks/frameworks.ts`. The first is free
on screen; the other six are emailed. Framework definitions were audited against the
cheatsheet **image** in Neal O'Grady's article (the text alone is not enough) — don't
change a `hint` without checking the source.

**`/tool/newsletter`** evaluates what a Substack shows from the outside. Two halves,
deliberately:

- `src/lib/tools/newsletter/checks.ts` measures everything countable. Deterministic, can't
  hallucinate a number. **Its severities are calibrated against five real newsletters and
  the evidence is written in the file — do not raise them without new data.** Notably:
  empty SEO fields, titles over 60 characters and the default "Suscribirse" button are
  *not* defects, because the most-read Spanish newsletters do all three.
- The model only judges what no `if` can: niche, ideal reader, promise, CTA, titles.

Every `Finding` carries a **written fix** (`fix`), the Substack path plus the text to
paste — not "improve your subtitle". It lives in `checks.ts` and not in the prompt because
it isn't opinion: the settings path is what it is, and a model would invent it.

`score()` **sums the penalties out of 100; it does not average the five dimensions.** That
was tried and a publication abandoned 117 days scored 85, because one catastrophic
dimension diluted into four healthy ones. The calibration targets are in the file.

**Do not add a check for Substack's boilerplate meta description** ("Click to read…, a
Substack publication"). It was tried: all five publications have it, because Substack
appends it to everyone's tagline and it cannot be removed. Flagging it invents a defect
with no possible fix. Instead the report shows it verbatim in the Google preview and says
whose it is.

`src/lib/tools/newsletter/report.ts` builds the emailed report. Two rules hold there:
every section carries a datum or an action or it doesn't exist, and the fix is written, not
described. **No markdown tables** — the email shell doesn't style them and they overflow at
320px; a numbered index scans the same and survives.

`src/lib/server/newsletter.ts` collects the data in two requests: the homepage (meta tags,
`window._preloads` with the full publication object) and Substack's undocumented
`/api/v1/archive`. Public GETs pass fine from the server.

### Rate limits

**All limits live in `src/lib/server/rate-limit.ts`.** Every endpoint that costs money or
sends mail goes through `overLimit()`. Read the header comment before changing a number:
it explains why the expensive path is keyed by **email** and the free path by IP (an IP is
not a person — offices and mobile networks share them).

The counter is **in memory, so it's per instance**: the real limit is the configured one
times however many instances are warm. It stops real abuse but it is not exact. Making it
exact needs a shared store (Redis/KV) and only the inside of `overLimit` would change.

### Email

Resend sends everything. **There is no cron.**

- `/api/subscribe` stores the address in a Resend audience and sends `src/lib/emails/00.md`
  immediately. `01-03.md` are drafts for Substack posts, not scheduled sends. Damian exports
  the Resend contacts and imports them into Substack by hand.
- Only strictly numbered `NN.md` files join that sequence. One-off emails
  (`tool-7-frameworks.md`, `tool-newsletter.md`) live in the same folder under non-numeric
  names and are rendered on demand with `renderStandalone`.
- **`renderStandalone` substitutes variables only in the body, after parsing the
  frontmatter.** Doing it before once injected content into the frontmatter and shipped
  emails with no subject. Don't undo that.
- Model output is escaped before going into email markdown, or a line starting with `#` or
  `-` renders as a heading or a list in the mail client.
- The shell carries a small `<style>` block for what can't be inlined, because `marked`
  generates the HTML from markdown and never passes through it. Gmail honours it; clients
  that don't fall back to default indentation and still read fine.

### Styling

The theme is in `src/app.css`, in two blocks:

1. `@theme` — the whole palette: `ink`, `soft`, `muted`, `line`, plus `#0076ff` (Substack's
   blue, so the embedded form doesn't look bolted on). DaisyUI's `--color-primary` is
   overridden to match.
2. `@layer components` — the site vocabulary: `.section`, `.box`, `.box-link`,
   `.box-locked`, `.box-title`, `.box-text`, `.body-text`, `.muted`, `.link-quiet`,
   `.eyebrow`, `.screen-center`, `.meter`, `.chip`. `.meter` is a bar that knows nothing
   about what it measures — the fill is a child with its own width, so it serves both a
   dimension score and a locked finding.

**There are only two font sizes on the site**: body `1.25rem` and note `0.875rem`.
Hierarchy comes from colour, not size. Writing `text-base` or `text-lg` in markup means a
class is missing from `app.css`.

`src/lib/tools/voice.ts` holds the shared writing rules for everything a model writes:
Spanish voice plus the anti-AI rules (vary sentence rhythm, repeat words instead of hunting
synonyms, no triplets, blacklist of ~30 words and ~20 stock phrases). Both tools import it
so their output doesn't sound like two different people.

### Internationalization Setup

Paraglide JS is still wired up, but only `places-evaluator` uses it. Everything newer is
Spanish-only with copy in `src/lib/content/*.md`.

1. **Vite plugin** (`vite.config.ts`): generates runtime code in `src/lib/paraglide/` from
   `messages/{locale}.json`
2. **Locales**: English (`en`, base) and Spanish (`es`)
3. **Server middleware** (`src/hooks.server.ts`): `paraglideMiddleware` handles locale
   detection and the `%paraglide.lang%` placeholder in `app.html`
4. **Client rerouting** (`src/hooks.ts`): `deLocalizeUrl` strips locale prefixes

Never edit `src/lib/paraglide/` — it's generated. Edit the message files and rebuild.

### SvelteKit Configuration

- `adapter-auto` (auto-detects the platform)
- Preprocessors: vitePreprocess and mdsvex
- `$lib` maps to `src/lib/`
- `tsconfig.json` sets `types: ["node"]` because `src/lib/server/scrape.ts` uses `node:dns`
  and `node:net` for its SSRF guards

### Security

`src/lib/server/scrape.ts` downloads URLs typed by anyone who visits a tool, so it validates
the target first: only http/https, and it blocks loopback, private ranges, link-local
(`169.254.x`, where cloud metadata lives) and IPv4-mapped IPv6 — revalidating on every
redirect. **Read the comments before touching that file.** `src/lib/server/newsletter.ts`
reuses the same guard.
