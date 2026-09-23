---
name: Objeto Brillante
description: Free working tools for Substack writers, set as a Swiss typographic poster with one field of mango.
colors:
  signal: "#ffc21a"
  signal-deep: "#7a5800"
  brand: "#006ae6"
  brand-hover: "#005bc8"
  ink: "#161514"
  ink-hover: "#2b2926"
  soft: "#4d4b47"
  muted: "#6b6862"
  line: "#d8d5cc"
  paper: "#f4f2ec"
  sheet: "#fffdf8"
  on-ink-soft: "#d7d4cc"
  on-ink-muted: "#a29e94"
  foot-text: "#8d897f"
  error: "#c23a00"
  error-on-ink: "#ff8a5c"
typography:
  display:
    fontFamily: "Schibsted Grotesk, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(3rem, 9vw, 8.5rem)"
    fontWeight: 900
    lineHeight: 0.86
    letterSpacing: "-0.04em"
  display-close:
    fontFamily: "Schibsted Grotesk, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(2.6rem, 6.2vw, 6rem)"
    fontWeight: 900
    lineHeight: 0.88
    letterSpacing: "-0.04em"
  lead-hero:
    fontFamily: "Schibsted Grotesk, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(1.25rem, 1.9vw, 1.6rem)"
    fontWeight: 500
    lineHeight: 1.28
    letterSpacing: "-0.015em"
  cover-title:
    fontFamily: "Schibsted Grotesk, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(1.2rem, 1.7vw, 1.6rem)"
    fontWeight: 900
    lineHeight: 0.94
    letterSpacing: "-0.035em"
  cover-meta:
    fontFamily: "Schibsted Grotesk, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.62rem"
    fontWeight: 700
    letterSpacing: "0.1em"
  headline:
    fontFamily: "Schibsted Grotesk, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(2.5rem, 8.4vw, 4.6rem)"
    fontWeight: 900
    lineHeight: 0.9
    letterSpacing: "-0.04em"
  band-title:
    fontFamily: "Schibsted Grotesk, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(2.4rem, 5.2vw, 4.8rem)"
    fontWeight: 900
    lineHeight: 0.92
    letterSpacing: "-0.04em"
  title:
    fontFamily: "Schibsted Grotesk, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(1.5rem, 2.9vw, 2.6rem)"
    fontWeight: 900
    lineHeight: 1
    letterSpacing: "-0.035em"
  lead:
    fontFamily: "Schibsted Grotesk, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(1.15rem, 2.4vw, 1.4rem)"
    fontWeight: 500
    lineHeight: 1.32
    letterSpacing: "-0.015em"
  body:
    fontFamily: "Schibsted Grotesk, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 400
    lineHeight: 1.45
  body-prose:
    fontFamily: "Schibsted Grotesk, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 400
  note:
    fontFamily: "Schibsted Grotesk, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.45
  label:
    fontFamily: "Schibsted Grotesk, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.78rem"
    fontWeight: 700
    letterSpacing: "0.08em"
rounded:
  none: "0"
spacing:
  frame: "4px"
  field: "1rem"
  gutter: "clamp(1rem, 3.2vw, 3rem)"
  column-gap: "clamp(0.75rem, 1.8vw, 1.5rem)"
  band: "clamp(3.5rem, 7vw, 7rem)"
  section: "5rem"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    rounded: "{rounded.none}"
    padding: "0 1.6rem"
    height: "3.4rem"
  button-primary-hover:
    backgroundColor: "{colors.ink-hover}"
  button-subscribe:
    backgroundColor: "{colors.brand}"
    textColor: "#ffffff"
    rounded: "{rounded.none}"
    padding: "0 1.6rem"
    height: "3.4rem"
  button-subscribe-hover:
    backgroundColor: "{colors.brand-hover}"
  button-outline:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "0.6rem 0.9rem"
  frame:
    backgroundColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "{spacing.frame}"
  frame-field:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.none}"
    padding: "{spacing.field}"
  result-box:
    backgroundColor: "{colors.sheet}"
    rounded: "{rounded.none}"
    padding: "1.25rem"
  hero-band:
    backgroundColor: "{colors.signal}"
    textColor: "{colors.ink}"
  close-band:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
  download-cover:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    width: "clamp(118px, 12vw, 156px)"
    padding: "0.95rem"
---

# Design System: Objeto Brillante

## Overview

**Creative North Star: "The Swiss poster"**

A typographic poster: one grotesque set very large on a strict grid, one colour owning whole
fields, and plain rows on hairlines under it. The one luxury is the headline, and the design
comes from the gap in scale between that headline and the rows under it. The home page is the
poster, with edge-to-edge bands. Every other page is a column you work in: a tool, a
download, the 404.

The thesis, from the contract at the top of `src/routes/+layout.svelte`: *the site does the
work, the newsletter tells the story.* The site hands over working tools and points to the
letter for how they were made. It never copies the newsletter. The latest issues show up as a
reference (title, date, link out) and never as an excerpt. Brand commitment (PRODUCT.md):
**minimal, but designed to impress.** Few elements, a lot of air, and an impression built
from scale and one committed colour, not from ornament.

Confirmed rejections: the creator landing built on borrowed authority (reader counts,
testimonial rows, press logos); cards as containers; rounded corners; shadow as interface
decoration; kickers/eyebrows above headings; numbered sections; anything that loops.

**Key Characteristics:**
- One family, Schibsted Grotesk, at 900 for display and 400 for reading.
- Mango is used as a field and as a highlighter. It is never text on paper.
- Rows on hairlines under a 3px ink rule. No cards and no radius.
- The ink frame wraps every form on the site.
- Blue appears only on a button that puts you on the list.
- One authored motion (the mark's quarter turn), one entrance (the hero), and nothing loops.

## Colors

One ink, two greys, a line, two papers, the mango and the blue that belongs to Substack.
All ratios below were measured and are recorded in the `app.css` comments.

### Primary
- **Mango** (`signal`): the brand colour, chosen by Damian on 23 September 2026. It is the
  hero's whole ground, the highlighter behind the marked phrase of a headline, the accent
  inside the ink close (11.28:1 on ink), every other download cover, and the mark on the ink
  covers. On paper it measures **1.44:1**, so it never carries a letter there.
- **Mango deep** (`signal-deep`): mango's readable form on light grounds, 5.82:1 on paper and
  6.41:1 on sheet. Used for hover states on doors, files, issues and links, the mark on
  hover, and link underlines on hover.

### Secondary
- **Subscribe blue** (`brand`): Substack's `#0076ff` one step darker, because white on theirs
  is 4.17:1 and this is 4.99:1. It appears on a button only, and only when pressing that
  button subscribes somebody. Hover is `brand-hover`.

### Neutral
- **Ink** (`ink`): headlines, the frame, primary buttons, the 3px rules, the wanted block, the
  close band, the footer, selection and the focus ring.
- **Soft** (`soft`): text read at length, such as leads, intros, blurbs and the letter. 7.77:1
  on paper.
- **Muted** (`muted`): notes, dates, placeholders, and the line under every form that says the
  address subscribes you. 4.96:1 on paper, 5.46:1 on sheet. Don't lighten it.
- **Line** (`line`): hairlines between rows and around result boxes. Always a stroke, never a
  fill.
- **Paper** (`paper`): the page ground.
- **Sheet** (`sheet`): lighter than paper. Used for the downloads band, fields, results and
  slider arrows. A focused field goes to pure white.
- **On-ink greys**: `on-ink-soft` for body on ink (12.3:1), `on-ink-muted` for placeholders
  and notes on ink (6.9:1), `foot-text` for the footer (5.2:1 on ink). Paper is the focus
  ring inside `.on-ink`.

### Named Rules
**The Highlighter Rule.** Mango sits behind ink text or fills a whole field. Any accent that
has to be read on paper or sheet uses mango deep.

**The Blue Means Subscribe Rule.** An `InlineForm` with `type="email"` defaults to blue
(`subscribes`). Every other primary button is ink, including DaisyUI's `.btn-primary`, which
is overridden unlayered because DaisyUI writes it into the utilities layer. A subscribing
DaisyUI button opts back in with `.is-subscribe`. The header's «Apúntame» is an outlined ink
box and not blue, because it only scrolls to the field that subscribes.

**The Measured-Ground Rule.** A text colour is safe only on the ground it was measured on.
Any new ground is measured again before anything ships on it.

## Typography

**Display, body and label font:** Schibsted Grotesk, self-hosted as a Latin subset at 400,
500, 700 and 900, falling back to `ui-sans-serif, system-ui`. 400 and 900 are preloaded in
`app.html`, and those preloads must name files `app.css` declares. The subset has no arrows,
so the arrow is drawn as SVG (`Arrow.svelte`), like the mark (`Mark.svelte`). Never type one.

**Character:** a single grotesque does every job. The drama is 900 at poster size with tight
tracking. Reading text is plain 400/500.

### Hierarchy
- **Display** (`display`): the home hero only, `max-width: 12ch`, capped at 8.5rem so the four
  lines and the field fit on one laptop screen.
- **Display close** (`display-close`): the ink close's h2. The letter's quote uses the
  band-title size: at this one «herramientas,» overflows six columns.
- **Cover** (`cover-title`, `cover-meta`): the type printed ON a download's cover. It is an
  object's lettering, not interface text, which is why it is the only step under the label.
- **Headline** (`headline`): every `.prose h1` on tool, download and error pages. At 320px the
  longest word has to fit. `text-wrap: balance`, `overflow-wrap: anywhere`.
- **Band title** (`band-title`): the home section heads, cols 1–7, with an intro paragraph in
  cols 8–12.
- **Title** (`title`): door names, file names and the wanted title, 900 at -0.035em.
- **Lead** (`lead`): the first paragraph under an h1, `max-width: 32rem`, balanced, in soft.
  Its opening words are often `<strong>` in ink. The hero lead is slightly larger at
  `clamp(1.25rem, 1.9vw, 1.6rem)`.
- **Body** (`body`, 1.125rem): everything outside `.prose`. Inside `.prose` it is 1.25rem.
- **Note** (`note`, 0.875rem, muted, `text-wrap: pretty`): whatever doesn't ask for attention.
- **Label** (`label`, uppercase): the header nav, the footer, "Metes …" under a door.

### Named Rules
**The Marked Phrase Rule.** A headline marks at most one phrase with `<strong>` or `<mark>`:
a mango bar `0.42em` tall at 72% height, cloned per line so each wrapped line gets its own
bar. That is how the headline carries the colour. There is no underline rule and no coloured
text.

**The Prose Specificity Rule.** Typography wraps selectors in `:where()` and writes into the
utilities layer. A class meant to beat `.prose` is declared compounded
(`.letter-heading, .prose .letter-heading`). `--tw-prose-*` is mapped to the site tokens in an
unlayered block.

**The No-Kicker Rule.** Nothing small sits above a heading. The headline starts the page.

## Layout

- **Home: full-bleed bands.** It has no wrapper. The mango hero, the doors band (paper), the
  downloads band (sheet, with line top and bottom), the letter band (paper) and the ink
  close. Content sits in `.wide`: max 1320px, with gutters from `spacing.gutter`, on a
  12-column grid with gaps from `spacing.column-gap`. Band padding comes from `spacing.band`.
  The hero and the close are centred. Everything else is aligned left on the grid.
- **Every other page: `.page-column`**, max 46rem, padding
  `clamp(2.5rem,7vw,5rem) 1.25rem clamp(3rem,8vw,5rem)`. The tool is centred vertically in the
  height left over (`margin-block: auto`).
- **The home carries only three fields:** the hero signup, the wanted block and the close
  signup. Each tool's field lives on its own page, so a home row is a door.
- **Breakpoints:** 900px folds the poster grid to one column and hides every nav link except
  «Apúntame». 640px stacks frames and makes frame buttons full width. 460px stacks the footer
  and drops the cover beside a file name. `(pointer: coarse)` hides the ⌘K hint.
- Targets reach about 38px through padding cancelled by negative margin, so the rhythm
  doesn't move. `main` is `overflow-x: clip`, not `hidden`, because `hidden` breaks sticky.

## Elevation & Depth

Flat. Depth comes from tone (paper, sheet, ink) and from the border. Hover changes colour
and sometimes nudges an arrow sideways. It never lifts an interface surface.

### Shadow Vocabulary
- **Printed card** (`0 24px 70px rgba(22,21,20,0.16)`): `.poster`, the postcard PNGs on
  `/postcard`.
- **Download cover** (`0 18px 36px -12px rgba(22,21,20,0.45)`, and on hover
  `0 26px 44px -14px rgba(22,21,20,0.5)` with `translateY(-4px) rotate(-1.5deg)`): the 3:4
  covers in the downloads band.

### Named Rules
**The Objects-Only Rule.** A shadow means a physical object lying on the page: a postcard or
a file cover. Interface surfaces never get one, and that includes boxes, fields, buttons and
bands.

## Shapes

Square everywhere. DaisyUI's `--radius-field`, `--radius-selector` and `--radius-box` are 0,
and `.btn`, `.input` and `.textarea` are forced to 0. Edges are 1px `line` hairlines between
rows, 3px `ink` rules opening a list (doors, files, issues), 2px ink on outlined controls, and
the 4px ink frame. The only curves are the slider dots and the loading spinner. The mark itself is square:
«el hueco», a square with its lower-right quarter missing (`M0 0H100V58H58V100H0Z`).

## The Mark

**«El hueco»**: a square with its lower-right quarter missing — the headline as a shape,
«la herramienta que te falta». Chosen by Damian on 23 September 2026 over a hand-cut key and
an «ob» monogram; it replaced the four-pointed ✦, which had become the sparkle on every AI
button. One path (`Mark.svelte`, `currentColor`): ink in the header, mango on the ink covers.
`static/favicon.svg` is the same path in mango with an ink outline (a bare mango square
disappears on a light tab bar); `static/apple-touch-icon.png` is mango on ink.
`static/favicon.png` is Damian's face and stays: the share cards (`/og/*.png`) draw it.

## Components

### The Frame (every form)
- **Style:** an ink bar with 4px padding and 4px gaps holding a sheet field and its button.
  Side by side from 640px and stacked below that. A textarea or a multi-field form is always
  stacked (`.frame-stack`).
- **Field:** 500 at 1.125rem, padding 1rem, placeholder in muted. **Focus** turns the field
  white with a 3px inset ink underline, which replaces the outline.
- **Button:** min-height 3.4rem, 700 at 1.125rem. Ink by default, blue when it subscribes.
  **Press** moves it down 1px. **It is disabled for being busy, never for being empty.**
  Fields are `required` and the browser names what's missing.
- **On ink** (the wanted block and the close): the frame inverts to paper. In the wanted block
  the field is ink and the button is paper, because it subscribes nobody. The close keeps blue.
- **Accessible name:** email fields default to «Tu correo electrónico». Text fields pass
  `fieldLabel`. A placeholder is never the name.

### Buttons
- **Primary** is ink with paper text (hover `ink-hover`). **Subscribe** is blue.
  **Outline** (header «Apúntame», slider arrows) is a 2px ink border that fills with ink on
  hover. No glow, no shadow.

### Door (the tool row)
- A 12-column grid row on a hairline and the whole click target. Name in cols 1–6 (title
  style), what it gives in cols 7–11 with a "Metes …" label under it, and the drawn arrow in
  col 12. **Hover/focus** turns the name and arrow mango deep and moves the arrow 6px right.
  The compact version (`.is-compact`, on the 404) shows the name alone at the column's size.

### Wanted block
- The one tool that doesn't exist yet («¿Qué haces a mano cada semana?»). An ink block closing
  the doors, title in cols 1–6 and body plus frame in cols 7–12. It asks for no address.

### File (download)
- A 3px ink rule, then a 3:4 cover (ink, or mango on every other one) with meta in 0.62rem
  uppercase, the mark and a 900 title, and next to it the name, blurb and «Llévatelo» with a 2px
  underline.

### Result box
- `.box` is sheet with a 1px line border and 1.25rem padding. Used for results only: a
  generated text, a sent confirmation, a course step. Never on the home.

### Navigation
- The header is `.wide`, set in label type. The mark and «Damian Soto» on the left, soft
  links turning ink on hover, and the outlined «Apúntame». The footer is an ink band, also in
  label type, carrying «Hecho a mano» (the door to `/colofon`), «Objeto Brillante», and the
  ⌘K hint.

### Motion
- **The mark's hover turn** is the one authored moment: a quarter turn (90°) over 700ms on
  `cubic-bezier(0.22,1,0.36,1)`, painting mango-deep, so the missing piece moves toward the
  cursor. Quintic ease-out, no overshoot: a shape that settles back reads as a wobble.
- **The hero entrance:** title, lead and frame rise from 8px over 0.6s, staggered 0/60/120ms.
  They start visible (`opacity: 0.001`). This runs on the hero only.
- 160–220ms colour transitions and 350ms arrow and cover moves on the same curve. View
  transitions between pages. **Nothing loops.** All of it sits under
  `prefers-reduced-motion: no-preference`, including smooth scroll.

### Hidden Depth
A requirement, not a garnish (PRODUCT.md, Brand Commitments). ⌘K and `?` open the launcher,
which answers some words instead of navigating. `/colofon` is linked only from «Hecho a mano».
The greeting that knows the hour lives in the ink close, with its height reserved so filling
it on mount moves nothing. The console has a working `damian.*` API: `damian.hueco()` posts to
the same endpoint as the wanted block. **A gem must work, not wink.**

### Postcards (a separate world)
The four `/postcard` designs (`biolink`, `editorial`, `gema`, `cartel`) come from a Claude
Design handoff and have their own type (Space Grotesk / Instrument Serif / JetBrains Mono)
and a fixed orange `#f05a1e`. They don't follow this system and this system doesn't follow
them. The site only frames them (`.poster`, `.slider`).

## Do's and Don'ts

### Do:
- **Do** start every non-home page with `.screen-center` → `.prose` h1 (one marked phrase) →
  one lead → the frame → a muted note.
- **Do** separate items with hairlines and open a list with a 3px ink rule.
- **Do** use mango deep for any mango-coloured thing that has to be read on a light ground.
- **Do** measure a text colour against its real ground, and record the ratio in `app.css`.
- **Do** draw icons as SVG at the text's stroke, never as glyphs.

### Don't:
- **Don't** set mango text on paper or sheet (1.44:1).
- **Don't** paint a button blue unless pressing it subscribes somebody.
- **Don't** add cards, radius, or shadows on interface surfaces.
- **Don't** put a kicker, eyebrow, or section number above a heading.
- **Don't** add reader counts, testimonials, or logos. The page was built without borrowed
  authority on purpose.
- **Don't** copy or summarise newsletter issues onto the site. Link them by title and date.
- **Don't** add an animation that loops, or an entrance below the fold.
- **Don't** raise the hero past 8.5rem.

## Deviation on record

The direction contract (THESIS / OWN-WORLD / STORY / FIRST VIEWPORT / FORM / FINISH) is a
comment at the top of `src/routes/+layout.svelte`, **not in the built HTML.** Svelte strips
comments on compile. The only ways around that (`preserveComments`, or a comment in
`app.html`) would ship a comment to every visitor on every request, and this project forbids
that by name (CLAUDE.md). The contract is read where it lives, and this file carries its
audit.
