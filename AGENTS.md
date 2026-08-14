# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

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

`7-frameworks` and `10-post-types` follow the same shape: **something in → free preview on
screen → full result emailed in exchange for the address.** The expensive half never reaches
the browser. What goes in differs: `7-frameworks` and `newsletter` take a URL and fetch it;
`10-post-types` takes a written idea and fetches nothing.

**`/tool/7-frameworks`** scrapes a page and rewrites the offer with the seven
copywriting frameworks in `src/lib/tools/7-frameworks/frameworks.ts`. The first is free
on screen; the other six are emailed. Framework definitions were audited against the
cheatsheet **image** in Neal O'Grady's article (the text alone is not enough) — don't
change a `hint` without checking the source.

**`/tool/10-post-types`** takes **a written idea, not a URL** — nothing is fetched. It orders
the idea (topic, audience, angle, proof) and writes that one topic as ten social posts, one
per type in `src/lib/tools/10-post-types/types.ts`. The first (`practico`) is free on screen;
the other nine are emailed. Simpler underneath than `7-frameworks`: a post type has no steps,
so the model returns one `text` per type instead of keyed `blocks`.

The input used to be a scraped URL, which required having a site that said something usable.
Text works for someone who doesn't. The trade-off is that it can arrive in two words, so the
server enforces `IDEA_MIN`/`IDEA_MAX` (20–2000 chars, duplicated in the page and named in the
copy file) and the prompt is told to work with little and set `confidence: baja` when it does.
The field is a textarea, so `InlineForm` doesn't fit — `TextareaForm.svelte` is its stacked
sibling, and submits on Ctrl/Cmd+Enter because Enter has to insert a newline.

The ten types are translated and condensed from Neal O'Grady's "The 10 Types of Posts" — a
`hint` says how to write the type, not what it is; don't change one without checking the
source. **The article's example screenshots were read** (they can be: download the image and
open it) and six hints now carry the concrete mechanism from a real post — anaphora plus a
naming line for `observacion`, results-first for `caso`, mock-naive satire for
`contracorriente`. Which post each came from is listed in `types.ts`. The other four kept
their hints because their screenshots are a carousel cover and an infographic: no text
structure to take from a picture.

**The real posts are not copied into `example`.** That field is rendered on the public page,
so pasting them would republish Naval's and Lara Acosta's writing on Damian's site. Structure
goes in the `hint` (a shape belongs to nobody), the `example` stays ours: one per type, all
ten on the same off-topic subject (running a first 10K) so they read as "the same topic, ten
ways", and far enough from any real user's topic that the model copies the form and not the
subject. Each `example` is used twice — as a shape anchor in the prompt and on the locked
cards, so a visitor sees each type's flavour while their own nine stay in the email.

Shares `voice.ts` with the other tools. Lista and Práctico are the only types allowed
line-separated items, and `format.ts` escapes leading markdown so those lines survive the
email shell.

**`/tool/newsletter`** audits a Substack from what it shows publicly. **Unlisted while the
judgement half is reworked.**

There is a **reference audit** — a hand-written audit of one real publication against real
data — that the report is measured against. It is **deliberately not in this repo**: it names
a real publication and criticises it, and this repo is public. Ask Damian for it before
reworking the judgement half. Everything durable that came out of it is written down here and
in the comments of `src/lib/tools/newsletter/`, so you are not blocked without it:

- The measure of a finding is **"does this help the person who writes the newsletter — will
  they change something tomorrow?"**, judged by reading, not by counting.
- Using the reference as a checklist to hit is a **mistake that was already made**: the prompt
  got tuned until one specific known finding appeared, which is a hidden questionnaire
  overfitted to a single publication. Don't hint at findings you already know.
- A deliberate operational choice is not a defect. The prompt says so; that instruction came
  from grading someone's mid-migration setup as GRAVE and being wrong.
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

Four things that each cost a 400, documented in the file: the output cap is
`max_output_tokens`; only the default temperature is accepted; the answer is **not** in
`choices[0].message.content` — it's in `output[]`, where reasoning models put a `reasoning`
item first, so you walk the array looking for the `message`; and with `json_object` (no
schema) the word **"json" must appear in `input`**, not in `instructions` — the client appends
it when missing. That last one is a real difference from `chat/completions`, where system and
user shared one `messages` array, and it broke both non-schema tools until it was found by
actually running them.

**Run the tools after touching this file.** Type-checking passes either way; the failures are
all 400s from the API.

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

**`src/app.css` is the only place with a number in it.** Colour, type sizes, line heights,
vertical rhythm and radii all live in its `@theme`; every class below is written from those
tokens and no class has a hand-written value. Three blocks:

1. `@theme` — the tokens.
   - Palette: `ink` (#171717), `read` (#404040), `soft` (#525252), `muted` (#737373),
     `line` (#e5e5e5), `brand` (#0076ff, Substack's blue so the embedded form doesn't look
     bolted on — DaisyUI's `--color-primary` is overridden to match). `read` and `soft` are
     two greys one step apart and yes, that's on purpose: `read` is what the letter is
     written in (it came from `prose-neutral`), `soft` is the interface's secondary. Merging
     them changes the tone of the whole letter, so it's a design decision, not a cleanup.
   - Type: **five sizes, and no more** — `display` (fluid clamp, the h1), `title`
     (1.875rem), `body` (1.25rem), `note` (0.875rem), `micro` (0.75rem), plus `ui` (1rem)
     for the `<main>` default that DaisyUI controls inherit. Each carries its own line
     height, so `text-body` needs no `leading-*`. Hierarchy comes from **colour and weight**,
     not from a ladder of sizes: a markdown `h2` is the same size as a section title, and an
     `h3` is the same size as bold body. Writing `text-lg` or `leading-7` in markup means a
     class is missing from `app.css`.
   - Width: `--container-column` (45rem) is the site's single column, used by the root
     layout as `max-w-column`. It was `max-w-2xl` (42rem). **The numbers in that comment are
     measured, not estimated** — the letter's longest line is 66 characters at 42rem, 70 at
     45rem, 78 at 48rem (`max-w-3xl`) and 86 at 56rem. Comfortable reading tops out around
     75, so 45rem is the last step that fits; going wider means dropping `--leading-read`
     too, or lines get lost on the way back.
   - Rhythm: `--spacing-block` (between paragraphs), `--spacing-box` (box padding),
     `--spacing-section`, `--spacing-page` (the root layout's `py-page`) and
     `--spacing-fold` = `100dvh` minus that page padding. `min-h-fold` is used by
     `.screen-center` and by the tools' shell; that `calc` used to be typed by hand in both
     places and could drift from the layout.
2. `@layer components` — the site vocabulary: `.section`, `.section-title`,
   `.section-intro`, `.body-text`, `.muted`, `.error-text`, `.eyebrow`, `.link-quiet`,
   `.box`, `.box-link`, `.box-locked`, `.box-title`, `.box-text`, `.figure`, `.figure-note`,
   `.screen-center`, `.meter`, `.chip`. `.meter` is a bar that knows nothing about what it
   measures — the fill is a child with its own width, so it serves both a dimension score
   and a locked finding. The measured numbers are `.figure`/`.figure-note` and **not
   `.stat`**: `.stat`, `.stat-value` and `.stat-title` belong to DaisyUI, whose rule prints
   after this layer and wins, turning the number into a grid with its own padding.
3. `.rich-text` — the markdown blocks (`{@html}`), outside any layer so its descendant
   selectors beat utilities on the same element.

**`@tailwindcss/typography` is gone. Don't bring it back.** `prose prose-xl prose-neutral`
was a second theme running in parallel to this file: its own size scale, its own vertical
rhythm (em-based margins, unrelated to the ones here) and its own palette, none of it
visible from `app.css`, and every value it got wrong had to be fought with a
`.prose h1 { }` override that had to beat the plugin's `:where()`. The markdown that the
four pages render (`src/lib/content/*.md` → `marked` → `{@html}`) is styled by `.rich-text`
instead, with the same numbers `prose-xl` produced — so the letter reads exactly as it did,
but the values now come from the `@theme` above.

Which classes are serif is declared per class (`font-serif` on `.body-text`,
`.section-intro`, `.box-text`, and on `.rich-text`). That used to be one list at the bottom
of the file, which is easy to forget when adding a class — and was forgotten once already
during this change.

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
