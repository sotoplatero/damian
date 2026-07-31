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
| `7-frameworks` | Listed. Built on the site theme. |
| `10-post-types` | Listed. Built on the site theme. |
| `newsletter` | **Live by URL, unlisted.** Built on the site theme; pulled from the home page while the judgement half is reworked. See below. |
| `places-evaluator` | Live by URL, unlisted. Predates the theme, still Paraglide + DaisyUI. |

`lyra`, `uuid-generator` and `character-counter` were removed.

`7-frameworks` and `10-post-types` follow the same shape: **URL in → free preview on
screen → full result emailed in exchange for the address.** The expensive half never
reaches the browser. (`newsletter` shares the URL-in / email-gate shape but reports rather
than generates.)

**`/tool/7-frameworks`** scrapes a page and rewrites the offer with the seven
copywriting frameworks in `src/lib/tools/7-frameworks/frameworks.ts`. The first is free
on screen; the other six are emailed. Framework definitions were audited against the
cheatsheet **image** in Neal O'Grady's article (the text alone is not enough) — don't
change a `hint` without checking the source.

**`/tool/10-post-types`** scrapes a page, deduces the topic behind it (topic, audience,
angle, proof), and writes that one topic as ten social posts — one per type in
`src/lib/tools/10-post-types/types.ts`. The first (`practico`) is free on screen; the
other nine are emailed. Same URL-in → free-preview → gated-by-email shape as
`7-frameworks`, but simpler underneath: a post type has no steps, so the model returns one
`text` per type instead of keyed `blocks`. The ten types are translated and condensed from
Neal O'Grady's "The 10 Types of Posts" — a `hint` says how to write the type, not what it
is; don't change one without checking the source. Shares `voice.ts` with the other tools;
the Lista and Práctico types are the only ones allowed line-separated items, and
`format.ts` escapes leading markdown so those lines survive the email shell. Each type also
carries an `example` — a full sample post of that type, all ten on one shared off-topic
subject (running a first 10K) so they read as "the same topic, ten ways." The article pairs
every type with an example screenshot (real posts by Justin Welsh, Jon Brosio, etc.); those
can't be pulled in, so the examples are rewritten in the site voice. They're used twice: fed
to the model as a shape anchor (with a caveat not to copy the running topic) and shown on the
locked cards, so a visitor sees each type's flavour while their own nine stay in the email.

**`/tool/newsletter`** audits a Substack from what it shows publicly. **Unlisted while the
judgement half is reworked — read `docs/auditoria-de-referencia.md` before touching it.**
That file is a hand-written audit of Kloshletter against real data, and it is the target the
report is measured against. It is *not* a checklist to hit: measuring coverage against it
led to overfitting the prompt to one publication, and that mistake is recorded there.

Two halves, deliberately:

- `src/lib/tools/newsletter/rules.ts` holds the **measured** rules — everything countable.
  Deterministic, can't hallucinate a number, and each carries a **written fix** (`propuesta`)
  with the literal Substack settings path. That lives in code and not in the prompt because
  it isn't opinion: a model invents the path.
- The model gets an **open channel**: the full text of the five sampled issues, and no list
  of questions. Unbounded findings, and an empty array is explicitly a valid answer.

**Severities are calibrated against four real publications and the evidence is written in
`rules.ts` — do not raise them without new data.** Notably *not* defects, because everyone
does them: empty SEO fields, titles over 60 characters, the default "Suscribirse" button,
and `showIntroModule: false`.

**Every open finding must carry a verbatim quote, verified server-side** against the same
material the model was given (`verifyQuote`). A finding whose quote isn't found is dropped
whole. This is the only thing keeping the open channel honest — it has already caught a
model synthesis presented as evidence.

**There is no score.** `score()`, `PENALTY` and `impact` were deleted. Two formulas were
tried and both failed for one structural reason: any aggregate over findings gets worse as
discovery improves. Summing gave a 39k-subscriber bestseller **2 out of 100**; averaging
five dimensions passed a publication abandoned 101 days. The report now shows a state
(`roto` / `fugas` / `sano`, from a one-line rule) plus counts. The long version is in
`tally` in `rules.ts`. **Don't reintroduce a number without solving that problem first.**

**Do not add a check for Substack's boilerplate meta description** ("Click to read…, a
Substack publication"). It was tried: all five publications have it, because Substack
appends it to everyone's tagline and it cannot be removed. Flagging it invents a defect
with no possible fix. Instead the report shows it verbatim and says whose it is.

`src/lib/tools/newsletter/report.ts` builds the emailed report as **one loop** over the
findings — it used to be eleven conditional sections, and each could vanish silently. It is
the same document as the screen with the locked half opened, and it deliberately repeats
what was shown free: the email is the only artifact left after the tab closes. Section
labels are read from the same `src/lib/content/tool-newsletter.md` the page uses, so they
cannot drift. **No markdown tables** — the email shell doesn't style them and they overflow
at 320px.

`src/lib/server/newsletter.ts` collects the homepage (meta tags, `window._preloads` — **142
keys, of which we read a couple of dozen; the header comment says which and why**) and
Substack's undocumented `/api/v1/archive`. Post bodies need one extra request each:
`body_html` comes back empty from the archive and `/api/v1/posts/by-slug/` 302s to the page.
Bodies are fetched in **both** steps — if only the paid step had them, screen and email would
disagree.

### OpenAI

**All model calls go through `src/lib/server/openai.ts`.** All three tools use it; none has its
own `fetch`. When an external API needs wiring, the client goes in a reusable `$lib/server`
module — not duplicated per endpoint.

It uses **`POST /v1/responses`**, not `chat/completions`. The reason isn't novelty: `text.format`
accepts a **strict JSON schema**, so the model cannot return a shape we didn't expect. With
`json_object` the JSON was valid but the shape wasn't guaranteed, and sections vanished from
reports in silence.

Three things about the gpt-5 family that each cost a 400, documented in the file: the output
cap is `max_output_tokens`; only the default temperature is accepted; and the answer is **not**
in `choices[0].message.content` — it's in `output[]`, where reasoning models put a `reasoning`
item first, so you walk the array looking for the `message`.

**Never change the model.** It's `gpt-5.4-mini`, chosen by Damian after benchmarking eight.

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
