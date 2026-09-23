# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

**Solo operators — one-person businesses.** Newsletter writers are inside this audience, not
beside it: a newsletter IS one of these businesses (confirmed by Damian, 2 September 2026,
correcting an earlier framing that treated "newsletter writer" and "business owner" as two
audiences to choose between).

Their situation is the whole product thesis: **there is no team and nobody else is coming.**
One person does the writing, the selling, the admin and the tooling. So they buy per-seat
software for jobs a script would do, or they do the job by hand every week, or they don't do
it.

What they are doing when they arrive: looking for a way to take a recurring job off their own
plate. The time-aware greeting on the home page is written to that moment and is accurate about
it — they are reading this instead of working on the business.

Every tool shipped so far serves the newsletter case specifically (Substack archives, voice,
postcards, repurposing, the "About" page). That is the beachhead, not the boundary.

## Product Purpose

**Damian's personal site. Its main job is to support his personal brand and to work as the
funnel into his weekly Substack newsletter, Objeto Brillante** (Damian's words, 23 September
2026), whose subject is: every week Damian builds himself a tool for a real business and shows
how.

The funnel has three parts, and they are the whole of what the site is for:

1. **Tools, resources and lead magnets that capture the visitor's email.** Tools prove the
   newsletter's claim by handing over a working result, free; their expensive half is emailed
   and the address goes on the list. Lead-magnet pages (`/recursos/<slug>`) trade a download
   for the address explicitly. The tools ARE the proof that the letter is not tutorials.
2. **A welcome sequence for the people captured**, whose job is to turn an interested address
   into a Substack subscriber. **Confirmed as part of the site's scope; not built yet** — see
   Capabilities and Constraints.
3. **The Substack signup itself**, on the home page, for whoever arrives already convinced.

A captured address and a Substack subscriber are **two different things**: tools and resources
put the address into Resend, and Substack's API cannot be written to from the server. Closing
that gap is exactly what the welcome sequence is for.

Success is a subscriber who replies to the first email. That is the stated ask in the welcome
copy and in the console message, and it is the metric the site is written toward — not traffic.

## Site and Newsletter: The Criterion

**The newsletter tells the story; the site does the work.** (Damian, 23 September 2026.) The
newsletter explains how and why a thing was built. The site is where the visitor uses it, now,
on their own material. The site supports the newsletter; it never replicates its content.

Everything on the site is exactly one of three things:

1. **Tool.** Dynamic: the visitor puts something in (a URL, an idea, a publication) and gets a
   result that did not exist before. Independent: it works for someone who has never read an
   issue. Lives on the site (`/tool/*`, `/postcard`).
2. **Download.** A file traded for an address — the lead magnet. Lives on the site
   (`/recursos/<slug>`). Cervantes and the author-analysis pack stay here (confirmed).
3. **Reference.** A link to an issue: the story behind a tool, or something the site does not
   do. One line, never a summary. **Every tool page links to the issue where its making is
   told** (confirmed) — it sends the reader there at the moment the tool has just proved itself.

The test for anything new: does it run here on the visitor's material → tool. Is it a file
taken away for an address → download. Neither → it belongs to the newsletter, and the site at
most links to it.

What this rules out: mirroring or summarising issues on the site; using the newsletter's own
pitch («el sistema operativo de tu newsletter», the write → distribute → measure circuit) as
the site's pitch; listing newsletter-only pieces (PlotStack, Subnotes, Subatomizer, StackChat)
as if they were site tools — they appear, if at all, as references.

## Positioning

**THE THESIS: the times changed. You can now build the tool you need yourself — with AI, without
paying for it and without taking a course.** (Damian's own words, 2 September 2026, and the
governing statement of the whole site.) Everything else here is in service of it.

That fixes who the enemy is, and it is not a competitor: it is **per-seat software you rent
forever for a job a script would do, and the course you would have had to buy to escape it.**
The audience is one person paying for both.

It also fixes the burden of proof. A claim that the barrier fell is only worth anything if the
person making it keeps clearing the barrier in public, so:

**He builds the tool in public, weekly, for a real business, and gives it away working.** Not a
course, not prompts, not templates — the home page explicitly turns those visitors away («Si lo
que quieres es una master class, 10 prompts o una plantilla, cierra la pestaña»). The existing
headline pair already carries the thesis exactly («Nadie va a construir la herramienta que te
falta» / «Yo me construyo las mías. Tú puedes hacerte las tuyas»), which is why it survives.

**The demonstration is the argument, so the tools are not a portfolio.** Each one is evidence
that a job somebody would have rented software for was instead built by one person in a week.
Design that presents them as products for sale, or as a feature list, argues the opposite case.

The mechanism a neighbouring product could not truthfully copy is the **judgement**, not the
generation: `/tool/actionable` refuses articles that don't convert, `/tool/newsletter` drops any
finding whose quote fails server-side verification, `/tool/repurpose` treats a set of notes that
repeat themselves as a failed generation rather than a delivery. Refusal is the feature.

## Operating Context

- Readers arrive from a Substack post, a reply, or somebody else's shared link. **Mostly on a
  phone** — measured design consequences of this are recorded in CLAUDE.md.
- A tool is used once, in one tab, and the tab is where the state lives. There is no account
  and nothing to come back to.
- Downloads are opened elsewhere: Cervantes in Claude Code, the analysis pack in any model that
  takes a long document.
- Damian works alone on this too, in this repo, and ships by pushing to Vercel.

## Capabilities and Constraints

- **No database anywhere.** `/tool/actionable` stores a generated tool's spec inside a signed
  URL; the archive tool signs a pass instead of holding a session; rate limits are in memory
  and therefore per warm instance.
- **Substack's subscribe API cannot be called server-side** (Cloudflare challenge). Signup is
  navigation to their subscribe page with the address prefilled (both asks on the home; the
  iframe was retired in the September 2026 redesign).
- The model is `gpt-5.4-mini` and is **not** a variable — chosen after benchmarking eight.
- Vercel cuts a request body at 4.5 MB, which is why an emailed archive ships as a deflated zip.
- Email is Resend, on demand only. **There is no cron and nothing scheduled.**
- Spanish only, by decision. i18n was removed in August 2026 and does not come back without a
  second language to justify it.
- **Welcome sequence: decided, not built** (23 September 2026). Today nothing sends it: there is
  no cron, `src/lib/emails/00-03.md` are drafts sent by nothing, and the machinery that once
  sent a sequence (`/api/subscribe`, `sendSequenceEmail`) was removed in August 2026 and lives
  in git history. **Undecided:** how it will be scheduled and sent (Resend-side automation,
  a cron, or something else), and what it contains beyond the existing drafts.
- **Decided: the site does not mirror newsletter issues** (23 September 2026) — see Site and
  Newsletter: The Criterion. It links to them.

## Brand Commitments

Confirmed by Damian:

- The name **Objeto Brillante**, and the publication living on Substack.
- **Minimal, but designed to impress** (23 September 2026, replacing the earlier «sober and,
  at first glance, unfinished or plain»). Few elements and a lot of air; the impression comes
  from scale and one committed colour, not from ornament. An agency-looking result built on
  borrowed authority is still the failure mode.
- **Mango `#ffc21a` is the brand colour** (chosen by Damian, 23 September 2026, over the signal
  orange, a Cuban-car turquoise and an Amazon green): the mango and the Havana façades, and the
  colour that shines. It is a field and a highlighter, never text on the paper (1.44:1).
- **Hidden gems are part of the identity, not decoration.** ⌘K, the console message, the
  `/colofon` page nobody links to, the words the palette answers instead of navigating, the
  greeting that knows the hour. Damian asked for this layer to be *expanded*, naming the
  keyboard shortcut as the example.
- **The four postcard designs** (`biolink`, `editorial`, `gema`, `cartel`) come from a Claude
  Design handoff and are implemented pixel-faithful. They have their own type and colour world
  on purpose and do not follow the site's.
- Voice: first person, direct, short sentences, no ornament. «No escribo bonito. Escribo lo que
  sé.» Copy is Spanish; code and comments are English.

Present in code and load-bearing, but **never explicitly confirmed as untouchable** — a
question about exactly this went unanswered, so treat them as strong incumbents rather than
locked: the ✦ star mark and Substack's blue on buttons that subscribe (darkened to `#006ae6`
for contrast). The narrow column and the rule that hierarchy never comes from type size were
retired by the September 2026 redesign.

## Evidence on Hand

Real, and usable:

- **The story**: leaving Cuba in 2022 alone, 27+ hours hidden in a boat with 24 others, a year
  before seeing his children again, now in Canada. Facts confirmed and recorded in the home
  page's own editorial notes. The photo is `static/los-sotos.webp`.
- **The tools themselves**, all live and all free.
- **Measured engineering figures** that are true and specific: 1333 posts walked in an index
  pass, bodies at 2.9/s sustained, 167 posts zipped in 137 ms, 20/20 on the actionable eval by
  majority of three passes with six pages that wobble between passes.

**Absences future work must not fabricate:** there is not one client name, one testimonial, one
revenue figure or one subscriber count anywhere. The home page's editorial notes flag this as
the letter's biggest weakness («FALTAN PRUEBAS. Ni un cliente, ni una cifra»). Nothing may
invent one, and no design may reserve a slot that only a fake number could fill.

## Product Principles

1. **The judgement is the product; the generation is the easy half.** What a tool refuses is
   worth more than what it produces.
2. **Nobody is coming to help.** The audience is alone, so a tool has to work the first time,
   unattended, with no account and nothing to learn.
3. **The expensive half is emailed, and that trade is stated before the field, not after.**
4. **Give the working thing away.** The first useful result is free and ungated; charging in
   attention for the part that has to earn trust is backwards.
5. **Reward the second look.** Depth is placed for whoever pokes at it, never advertised.
6. **Say the real number or say nothing.** Every figure on this site is measured, and an
   absence is left visible rather than filled.

## Accessibility & Inclusion

Target is **WCAG AA**, adopted 2 September 2026 after an audit found the site missing it on
contrast and target size. Established requirements: body and note text at 4.5:1 or better
against the paper, interactive targets at 24px minimum, one designed focus ring from the
palette, an accessible name on every field, and `prefers-reduced-motion` honoured including for
smooth scrolling. Spanish is the only language and the document declares it.
