# Substack About Rewriter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a lead-capture tool that audits and rewrites the public About page of a Substack publication.

**Architecture:** A SvelteKit page posts a Substack URL to a server endpoint. The endpoint normalizes it to `/about`, safely scrapes the public page, requests a schema-constrained audit and rewrite from the shared OpenAI client, caches the result, shows a useful preview, and emails the complete rewrite after signup.

**Tech Stack:** SvelteKit 2, Svelte 5 runes, TypeScript, Tailwind CSS 4, OpenAI Responses API, Resend.

## Global Constraints

- Code and comments are English; visitor-facing copy is Spanish.
- Use `gpt-5.4-mini` through `$lib/server/openai.ts`.
- Accept only public `*.substack.com` publication URLs.
- Never expose the complete rewrite in the preview response.
- Credit the public Substack sources visibly.

---

### Task 1: Analysis engine and delivery

**Files:**
- Create: `src/lib/tools/substack-about/prompt.ts`
- Create: `src/lib/tools/substack-about/format.ts`
- Create: `src/routes/tool/substack-about/+server.ts`
- Create: `src/lib/emails/tool-substack-about.md`
- Modify: `src/lib/server/resend.ts`

**Interfaces:**
- Consumes: `scrape(rawUrl)`, `askJson()`, `cacheAudit()`, `subscribe()`.
- Produces: `AboutAudit`, `toMarkdown(audit)`, POST steps `analyze` and `unlock`.

- [ ] Define a strict audit schema containing reader, promise, five findings, and a complete rewrite.
- [ ] Normalize publication URLs to their public `/about` page and reject non-Substack hosts.
- [ ] Return only the diagnosis, first finding, and rewritten promise during preview.
- [ ] Cache the complete audit and deliver it through Resend after validating the email.
- [ ] Run `pnpm check` and confirm no new server errors.

### Task 2: Tool interface and discovery

**Files:**
- Create: `src/lib/content/tool-substack-about.md`
- Create: `src/routes/tool/substack-about/+page.svelte`
- Modify: `src/lib/tools/list.ts`

**Interfaces:**
- Consumes: POST response `{ site, diagnosis, first, promise, lockedCount }`.
- Produces: public route `/tool/substack-about` and a home-page tool card.

- [ ] Build the URL form, analysis state, preview cards, email gate, source credit, and restart action.
- [ ] Keep the existing editorial visual language and accessible form behavior.
- [ ] Add the tool to the home list.
- [ ] Run `pnpm check` and `pnpm build`; confirm no new errors.
