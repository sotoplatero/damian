# Distribuye tu artículo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert `/tool/repurpose` from platform-specific posts into nine short, voice-matched notes that distribute an article, with three previews, six emailed notes, and a reusable prompt attached as a text file.

**Architecture:** Keep the existing two-request SvelteKit flow, but replace channel formats with a flat editorial repertoire. Put deterministic repertoire, validation, rendering, and manual-prompt concerns in pure modules; let the route coordinate scraping, model calls, quote checks, subscription, and delivery. Reject incomplete or oversized model output instead of silently shipping partial results.

**Tech Stack:** SvelteKit, Svelte 5, TypeScript, Vitest, OpenAI Responses API through `$lib/server/openai`, Resend, Markdown email templates.

## Global Constraints

- The product name is **Distribuye tu artículo**.
- Generate exactly nine notes: three visible and six delivered by email.
- Notes are platform-neutral and never mention adaptation for Substack, X, LinkedIn, or another network.
- Every note is at most 700 characters, including spaces, line breaks, and URL.
- Notes vary in length, structure, angle, and use of the source URL; the LLM decides when and how the URL belongs.
- Preserve the source author's language, register, rhythm, point of view, and vocabulary.
- Do not invent facts, figures, experiences, results, quotations, or positions.
- A response with missing, duplicate, unknown, empty, or oversized notes is invalid; do not truncate or send it.
- Literal quotations remain server-verified against the scraped source.
- Do not change the model from `gpt-5.4-mini`.
- The emailed attachment is named `prompt-distribuye-tu-articulo.txt`.
- Do not modify generated files under `src/lib/paraglide/`.
- `pnpm check` may retain the two documented pre-existing errors, but this work must add none.

---

## File Map

- Modify `src/lib/tools/repurpose/formats.ts`: define the flat nine-note repertoire and free/gated IDs.
- Create `src/lib/tools/repurpose/style.ts`: repurpose-specific voice preservation and AI-antipattern instructions.
- Modify `src/lib/tools/repurpose/prompt.ts`: analyze richer article data and generate notes from editorial functions.
- Modify `src/lib/tools/repurpose/format.ts`: validate exact note sets and render a flat email document.
- Create `src/lib/tools/repurpose/format.test.ts`: unit tests for strict note validation and email rendering.
- Create `src/lib/tools/repurpose/manual-prompt.ts`: produce the self-contained prompt attached to the email.
- Create `src/lib/tools/repurpose/manual-prompt.test.ts`: verify attachment content and placeholders.
- Modify `src/routes/tool/repurpose/+server.ts`: coordinate strict validation, richer analysis, quote verification, and attachment delivery.
- Modify `src/lib/server/resend.ts`: accept the text attachment for this tool only.
- Modify `src/lib/emails/tool-repurpose.md`: update subject and delivery guidance.
- Modify `src/lib/content/tool-repurpose.md`: update product copy and gate copy.
- Modify `src/routes/tool/repurpose/+page.svelte`: remove channel grouping and render the flat repertoire.
- Modify `src/lib/tools/list.ts`: rename the tool and its home-page description.

---

### Task 1: Replace platform formats with the editorial repertoire

**Files:**
- Modify: `src/lib/tools/repurpose/formats.ts`
- Test: `src/lib/tools/repurpose/format.test.ts`

**Interfaces:**
- Produces: `NoteFormat`, `formats`, `freeFormats`, `gatedFormats`, `findFormat(id)`, `FREE_IDS`, and `GATED_IDS`.
- Consumes: nothing outside the module.

- [ ] **Step 1: Write the failing repertoire test**

Create `src/lib/tools/repurpose/format.test.ts` with:

```ts
import { describe, expect, it } from 'vitest';
import { formats, freeFormats, gatedFormats } from './formats';

describe('repurpose repertoire', () => {
	it('defines nine unique platform-neutral notes split 3/6', () => {
		expect(formats).toHaveLength(9);
		expect(new Set(formats.map(({ id }) => id)).size).toBe(9);
		expect(freeFormats.map(({ id }) => id)).toEqual([
			'idea-central',
			'contradiccion',
			'leccion-practica'
		]);
		expect(gatedFormats).toHaveLength(6);
		expect(JSON.stringify(formats)).not.toMatch(/substack|linkedin|twitter|posts? de x/i);
	});
});
```

- [ ] **Step 2: Run the test and verify the current platform repertoire fails**

Run: `pnpm test -- src/lib/tools/repurpose/format.test.ts`

Expected: FAIL because the current IDs and serialized channel labels contain platform names.

- [ ] **Step 3: Replace the format model and definitions**

In `src/lib/tools/repurpose/formats.ts`, remove `Channel`, `CHANNELS`, `byChannel`, `maxChars`, and `linksToArticle`. Define:

```ts
export const NOTE_MAX_CHARS = 700;

export type NoteFormat = {
	id: string;
	name: string;
	bestFor: string;
	hint: string;
	example: string;
	needsQuote?: boolean;
};

export const FREE_IDS = ['idea-central', 'contradiccion', 'leccion-practica'] as const;

export const formats: NoteFormat[] = [
	{ id: 'idea-central', name: 'Idea central', bestFor: 'Hacer circular la tesis más fuerte', hint: 'Expresa la tesis más fuerte como una nota autónoma. Elige la extensión y la estructura que la idea pida.', example: 'El primer 10K no se prepara aprendiendo a sufrir más. Se prepara aprendiendo a salir más despacio.' },
	{ id: 'detalle-revelador', name: 'Detalle revelador', bestFor: 'Abrir el artículo desde un dato, ejemplo o escena pequeña', hint: 'Aísla un dato, gesto, ejemplo o escena pequeña que deje ver una idea mayor sin resumir el artículo.', example: 'En la cuarta semana dejé las zapatillas junto a la puerta. No para acordarme de correr. Para quitarme una excusa.' },
	{ id: 'contradiccion', name: 'Contradicción', bestFor: 'Mostrar lo que el artículo coloca al revés de lo esperado', hint: 'Encuentra una expectativa que el artículo contradiga y haz visible la tensión sin forzar una fórmula de gancho.', example: 'Pensaba que prepararme era correr cada vez más. Mejoré cuando empecé a terminar con ganas de seguir.' },
	{ id: 'historia', name: 'Historia', bestFor: 'Distribuir una escena o experiencia concreta', hint: 'Cuenta una escena o experiencia que ya esté en el artículo. Conserva sus hechos y no la conviertas en una moraleja completa.', example: 'En el kilómetro seis miré el reloj y supe que había salido al ritmo de otro. Los cuatro restantes los hice andando.' },
	{ id: 'consecuencia', name: 'Consecuencia', bestFor: 'Desarrollar una implicación sustentada por el texto', hint: 'Desarrolla una consecuencia razonable de una idea del artículo. Tiene que poder defenderse con el texto aunque no aparezca escrita literalmente.', example: 'Si cada entrenamiento termina al límite, faltar un día parece un fracaso. Y un plan que convierte cada tropiezo en fracaso dura poco.' },
	{ id: 'leccion-practica', name: 'Lección práctica', bestFor: 'Convertir una idea en algo que el lector pueda aplicar', hint: 'Extrae una acción concreta sustentada por el artículo. No inventes un método ni añadas pasos por completar una lista.', example: 'Haz la primera salida tan corta que te parezca ridícula. Lo difícil esta semana no es avanzar. Es volver a salir.' },
	{ id: 'pregunta', name: 'Pregunta', bestFor: 'Convertir una tensión real en conversación', hint: 'Convierte una tensión verdadera del artículo en una pregunta que admita respuestas distintas. No la uses como cierre automático.', example: '¿Qué te hace abandonar antes un plan: que sea difícil o que deje de ser nuevo?' },
	{ id: 'cita-comentada', name: 'Cita comentada', bestFor: 'Abrir una rendija al artículo con sus propias palabras', hint: 'Usa la cita literal verificada y añade solo el contexto que la haga circular. Si no hay cita verificada, parafrasea sin comillas.', example: '«El día de la carrera se cobra lo que hiciste en enero.»\n\nLa escribí después de gastar cuatro meses de trabajo en los tres primeros minutos.', needsQuote: true },
	{ id: 'puerta-articulo', name: 'Puerta al artículo', bestFor: 'Despertar curiosidad y llevar al texto completo', hint: 'Abre una curiosidad real y conduce al artículo. Decide cómo introducir la URL según el tono de la nota; no anuncies contenido nuevo de forma genérica.', example: 'La semana en que más gente abandona su primer 10K no es la más dura. Es la primera que resulta aburrida.\n\nHe escrito qué cambia ahí y cómo atravesarla:\nhttps://ejemplo.com/primer-10k' }
];

export const freeFormats = formats.filter(({ id }) => FREE_IDS.includes(id as (typeof FREE_IDS)[number]));
export const gatedFormats = formats.filter(({ id }) => !FREE_IDS.includes(id as (typeof FREE_IDS)[number]));
export const GATED_IDS = gatedFormats.map(({ id }) => id);
export function findFormat(id: string): NoteFormat | undefined {
	return formats.find((format) => format.id === id);
}
```

Write each `hint` as a flexible editorial purpose, not a sentence template. Keep all nine examples on the same unrelated 10K topic, vary their lengths, keep each below 700 characters, and allow links in multiple examples where natural.

- [ ] **Step 4: Run the repertoire test**

Run: `pnpm test -- src/lib/tools/repurpose/format.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit the repertoire**

```bash
git add src/lib/tools/repurpose/formats.ts src/lib/tools/repurpose/format.test.ts
git commit -m "refactor: define article distribution notes"
```

---

### Task 2: Add strict note validation and flat email rendering

**Files:**
- Modify: `src/lib/tools/repurpose/format.ts`
- Modify: `src/lib/tools/repurpose/format.test.ts`

**Interfaces:**
- Consumes: `formats`, `findFormat`, and `NOTE_MAX_CHARS` from `formats.ts`.
- Produces: `Piece`, `readExactPieces(raw, expectedIds)`, `pieceContainsQuote(piece, quote)`, `pieceUsesOnlySourceUrl(piece, sourceUrl)`, `readOrder(raw)`, `toPlainText(piece)`, and `toMarkdown(pieces, order)`.

- [ ] **Step 1: Add failing strict-validation tests**

Append tests that assert exact order, unknown/duplicate/missing rejection, and the hard length limit:

```ts
import { NOTE_MAX_CHARS } from './formats';
import { pieceContainsQuote, pieceUsesOnlySourceUrl, readExactPieces, toMarkdown } from './format';

describe('readExactPieces', () => {
	const ids = ['idea-central', 'contradiccion'];

	it('returns notes in expected order', () => {
		const raw = { pieces: [{ id: 'contradiccion', text: 'Dos' }, { id: 'idea-central', text: 'Uno' }] };
		expect(readExactPieces(raw, ids)).toEqual([
			{ id: 'idea-central', text: 'Uno' },
			{ id: 'contradiccion', text: 'Dos' }
		]);
	});

	it.each([
		{ pieces: [{ id: 'idea-central', text: 'Uno' }] },
		{ pieces: [{ id: 'idea-central', text: 'Uno' }, { id: 'idea-central', text: 'Dos' }] },
		{ pieces: [{ id: 'idea-central', text: 'Uno' }, { id: 'desconocido', text: 'Dos' }] },
		{ pieces: [{ id: 'idea-central', text: 'Uno' }, { id: 'contradiccion', text: 'x'.repeat(NOTE_MAX_CHARS + 1) }] }
	])('rejects invalid complete sets', (raw) => {
		expect(readExactPieces(raw, ids)).toBeNull();
	});
});

it('checks the verified quotation appears in the quotation note', () => {
	expect(pieceContainsQuote({ id: 'cita-comentada', text: 'La paciencia también se entrena.\n\nEso escribí.' }, 'La paciencia también se entrena.')).toBe(true);
	expect(pieceContainsQuote({ id: 'cita-comentada', text: 'Una síntesis parecida.' }, 'La paciencia también se entrena.')).toBe(false);
});

it('accepts no URL or the final source URL, and rejects another URL', () => {
	const source = 'https://example.com/articulo';
	expect(pieceUsesOnlySourceUrl({ id: 'idea-central', text: 'Una idea sin enlace.' }, source)).toBe(true);
	expect(pieceUsesOnlySourceUrl({ id: 'puerta-articulo', text: `Léelo aquí: ${source}` }, source)).toBe(true);
	expect(pieceUsesOnlySourceUrl({ id: 'puerta-articulo', text: 'Léelo aquí: https://otro.example/' }, source)).toBe(false);
});

it('renders notes without platform groups', () => {
	const markdown = toMarkdown([{ id: 'idea-central', text: 'Texto' }], ['Empieza por la tesis.']);
	expect(markdown).toContain('## Idea central');
	expect(markdown).toContain('## Cómo alternarlas');
	expect(markdown).not.toMatch(/Substack|LinkedIn|Posts de X/);
});
```

- [ ] **Step 2: Run tests and verify failure**

Run: `pnpm test -- src/lib/tools/repurpose/format.test.ts`

Expected: FAIL because `readExactPieces` and `pieceContainsQuote` do not exist and rendering still groups by channel.

- [ ] **Step 3: Implement exact validation**

Replace permissive `sanitizePieces` with:

```ts
export type Piece = { id: string; text: string };

export function readExactPieces(raw: unknown, expectedIds: readonly string[]): Piece[] | null {
	const list = (raw as { pieces?: unknown })?.pieces;
	if (!Array.isArray(list) || list.length !== expectedIds.length) return null;
	const byId = new Map<string, Piece>();
	for (const entry of list) {
		if (!entry || typeof entry !== 'object') return null;
		const { id, text } = entry as { id?: unknown; text?: unknown };
		if (typeof id !== 'string' || typeof text !== 'string') return null;
		const clean = text.trim();
		if (!findFormat(id) || !expectedIds.includes(id) || !clean || clean.length > NOTE_MAX_CHARS || byId.has(id)) return null;
		byId.set(id, { id, text: clean });
	}
	return expectedIds.map((id) => byId.get(id)).filter((piece): piece is Piece => Boolean(piece));
}
```

Use `normalizeQuoteText` in `pieceContainsQuote` and change `toMarkdown` to iterate `formats` directly. Rename the final section from `En qué orden publicarlas` to `Cómo alternarlas`.

Implement URL validation without rewriting note text:

```ts
export function pieceUsesOnlySourceUrl(piece: Piece, sourceUrl: string): boolean {
	const matches = piece.text.match(/https?:\/\/[^\s<>()]+/g) ?? [];
	if (!matches.length) return true;
	try {
		const expected = new URL(sourceUrl).toString();
		return matches.every((match) => new URL(match).toString() === expected);
	} catch {
		return false;
	}
}
```

- [ ] **Step 4: Run the focused tests**

Run: `pnpm test -- src/lib/tools/repurpose/format.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit validation and rendering**

```bash
git add src/lib/tools/repurpose/format.ts src/lib/tools/repurpose/format.test.ts
git commit -m "test: enforce complete distribution note sets"
```

---

### Task 3: Rewrite model instructions around author voice and AI antipatterns

**Files:**
- Create: `src/lib/tools/repurpose/style.ts`
- Modify: `src/lib/tools/repurpose/prompt.ts`
- Create: `src/lib/tools/repurpose/manual-prompt.ts`
- Create: `src/lib/tools/repurpose/manual-prompt.test.ts`

**Interfaces:**
- Produces: `REPURPOSE_STYLE`, `ArticleAnalysis`, `extractPrompt()`, `writePrompt(ids)`, `articleMessage(article, sourceUrl)`, and `buildManualPrompt()`.
- Consumes: repertoire metadata from `formats.ts`.

- [ ] **Step 1: Write failing manual-prompt tests**

Create `src/lib/tools/repurpose/manual-prompt.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { buildManualPrompt } from './manual-prompt';

describe('buildManualPrompt', () => {
	it('is self-contained and asks for source content', () => {
		const prompt = buildManualPrompt();
		expect(prompt).toContain('[PEGA AQUÍ LA URL]');
		expect(prompt).toContain('[PEGA AQUÍ EL TEXTO COMPLETO DEL ARTÍCULO]');
		expect(prompt).toContain('Idea central');
		expect(prompt).toContain('Puerta al artículo');
		expect(prompt).toContain('ANTIPATRONES DE TEXTO GENERADO POR IA');
		expect(prompt).toContain('700 caracteres');
		expect(prompt).not.toMatch(/español de España|Substack|LinkedIn|Twitter/);
	});
});
```

- [ ] **Step 2: Run the manual-prompt test and verify failure**

Run: `pnpm test -- src/lib/tools/repurpose/manual-prompt.test.ts`

Expected: FAIL because `manual-prompt.ts` does not exist.

- [ ] **Step 3: Create the repurpose-specific style contract**

Create `style.ts` exporting `REPURPOSE_STYLE`. Its headings must include `CONSERVA LA VOZ` and `ANTIPATRONES DE TEXTO GENERADO POR IA`. State explicitly that the source controls language, register, point of view, rhythm, and vocabulary. Include every antipattern approved in the design: monotonous sentence length, repeated openings/closings, decorative synonyms, inflated verbs, automatic triads, perfect parallelism, excessive fragments, false oppositions, obligatory morals/questions, generic context, clichés, emojis, hashtags, template hooks, and uniformly aggressive copy.

- [ ] **Step 4: Rewrite the internal prompt contracts**

Change the analysis type to:

```ts
export type ArticleAnalysis = {
	tema: string;
	tesis: string;
	publico: string;
	ideas: string[];
	pruebas: string[];
	escenas: string[];
	frase: string;
	voz: string;
};
```

Make `extractPrompt()` request the full analysis and the three free IDs. Make `writePrompt(ids)` request the six gated IDs plus `orden`. Both prompts must include `REPURPOSE_STYLE`, the 700-character limit, distinct-angle requirement, no-platform rule, and flexible URL behavior. `articleMessage` must serialize every analysis field and label the verified quotation clearly.

- [ ] **Step 5: Build the attachment prompt from shared repertoire and style**

Create `buildManualPrompt()` by composing `formats`, `REPURPOSE_STYLE`, output instructions, and the two input placeholders. Ask for plain-text notes under their nine names rather than JSON, because the manual artifact is for people rather than the server.

- [ ] **Step 6: Run prompt tests**

Run: `pnpm test -- src/lib/tools/repurpose/manual-prompt.test.ts src/lib/tools/repurpose/format.test.ts`

Expected: PASS.

- [ ] **Step 7: Commit prompts and attachment content**

```bash
git add src/lib/tools/repurpose/style.ts src/lib/tools/repurpose/prompt.ts src/lib/tools/repurpose/manual-prompt.ts src/lib/tools/repurpose/manual-prompt.test.ts
git commit -m "feat: preserve author voice in distribution notes"
```

---

### Task 4: Enforce the new contract in the server and attach the prompt

**Files:**
- Modify: `src/routes/tool/repurpose/+server.ts`
- Modify: `src/lib/server/resend.ts`

**Interfaces:**
- Consumes: `ArticleAnalysis`, `FREE_IDS`, `GATED_IDS`, `readExactPieces`, `pieceContainsQuote`, `pieceUsesOnlySourceUrl`, and `buildManualPrompt()`.
- Produces: `sendToolPiecesEmail(to, piecesMarkdown, manualPrompt)` and unchanged POST response shapes for the Svelte page.

- [ ] **Step 1: Replace permissive analysis parsing**

Rename `readArticle` to `readArticleAnalysis`. Validate and cap scalar fields and arrays without inventing defaults:

```ts
function readStrings(value: unknown, count: number, chars: number): string[] {
	return Array.isArray(value)
		? value.filter((item): item is string => typeof item === 'string').map((item) => item.trim().slice(0, chars)).filter(Boolean).slice(0, count)
		: [];
}
```

Require non-empty `tema`, `tesis`, and `voz`; accept empty evidence arrays and an empty quotation. Preserve the existing `readSourceUrl` protocol guard.

- [ ] **Step 2: Enforce exact free and gated sets**

In `extract`, call `readExactPieces(raw, FREE_IDS)`. In `unlock`, parse the submitted free notes with `readExactPieces({ pieces: body.free }, FREE_IDS)` and the new response with `readExactPieces(raw, GATED_IDS)`. Return an error rather than sending if either set is invalid.

After each exact-set check, require every note to pass `pieceUsesOnlySourceUrl(piece, finalUrl)`. This permits notes with no URL and rejects malformed or foreign URLs without mutating the generated text.

- [ ] **Step 3: Keep literal quotation verification end to end**

After verifying `analysis.frase` against the scraped article, require the `cita-comentada` note to contain that exact normalized phrase whenever a verified phrase exists. If it does not, reject the gated response. If no verified phrase exists, the prompt must instruct that note to paraphrase without quotation marks.

- [ ] **Step 4: Add the text attachment to Resend**

Extend only the private helper and repurpose wrapper:

```ts
type TextAttachment = { filename: string; content: string };

async function sendToolEmail(
	template: string,
	marker: string,
	to: string,
	markdown: string,
	attachment?: TextAttachment
): Promise<void> {
	const from = env.RESEND_FROM;
	if (!from) throw new Error('RESEND_FROM no configurada');
	const url = unsubscribeUrl(to);
	const rendered = renderStandalone(template, url, { [marker]: markdown });
	const { error } = await client().emails.send({
		from,
		to,
		subject: rendered.subject,
		html: rendered.html,
		headers: {
			'List-Unsubscribe': `<${url}>`,
			'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click'
		},
		...(attachment ? { attachments: [{ filename: attachment.filename, content: Buffer.from(attachment.content, 'utf8') }] } : {})
	});
	if (error) throw new Error(error.message);
}

export async function sendToolPiecesEmail(to: string, piecesMarkdown: string, manualPrompt: string): Promise<void> {
	await sendToolEmail(toolRepurposeTemplate, 'PIECES', to, piecesMarkdown, {
		filename: 'prompt-distribuye-tu-articulo.txt',
		content: manualPrompt
	});
}
```

Call it from the route with `buildManualPrompt()`.

- [ ] **Step 5: Run unit tests and type checking**

Run: `pnpm test`

Expected: all Vitest tests PASS.

Run: `pnpm check`

Expected: no new errors beyond the two documented errors in `src/routes/demo/paraglide` and `src/routes/tool/places-evaluator`.

- [ ] **Step 6: Commit server enforcement and delivery**

```bash
git add src/routes/tool/repurpose/+server.ts src/lib/server/resend.ts
git commit -m "feat: deliver distribution prompt attachment"
```

---

### Task 5: Update page, email, and home-page copy

**Files:**
- Modify: `src/lib/content/tool-repurpose.md`
- Modify: `src/routes/tool/repurpose/+page.svelte`
- Modify: `src/lib/emails/tool-repurpose.md`
- Modify: `src/lib/tools/list.ts`

**Interfaces:**
- Consumes: flat `formats`, `freeFormats`, and generated `Piece[]`.
- Produces: the final public UI and email language.

- [ ] **Step 1: Replace the single source of page copy**

Set the Markdown heading and introduction to:

```md
# Distribuye tu artículo.

**Pega el enlace.** Lo convierto en nueve notas breves, con distintas ideas, ángulos y extensiones, para seguir llevándole lectores.
```

Set these frontmatter values and retain the existing validation/error strings:

```yaml
urlButton: Distribuir mi artículo
urlWorking: Leyendo tu artículo...
gateTitle: Las otras seis van por correo
gateBody: Dime a dónde te las mando. Te llegan las nueve y un archivo con el prompt para repetirlo por tu cuenta.
gateButton: Mándamelas
gateUnlocking: Escribiendo y enviando...
sentTitle: Van para tu correo
sentBody: Las nueve notas y el prompt manual van adjuntos. Si en un par de minutos no los ves, mira en spam.
```

Remove references to networks and fixed publication order from the remaining frontmatter.

- [ ] **Step 2: Flatten the Svelte result view**

Remove the `byChannel` import and `freeGroups`/`lockedGroups` derived state. Render `formats.filter((format) => byId.has(format.id))` directly for written cards and `formats.filter((format) => !byId.has(format.id))` for locked cards. Keep the existing copy, loading, error, restart, and email-gate interactions.

Set metadata to:

```svelte
<PageMeta
	title="Distribuye tu artículo — Damian Soto"
	description="Convierte un artículo en nueve notas breves, con distintas ideas, ángulos y extensiones, para seguir llevándole lectores."
/>
```

Remove the platform-oriented credit block unless its sources directly support the new repertoire; do not claim the repertoire comes from them.

- [ ] **Step 3: Rewrite the email template**

Use subject `Nueve notas para distribuir tu artículo`. Explain that lengths and angles vary, links appear where useful, and the attached `.txt` reproduces the process manually. Remove the three-week prescription, the single-link claim, and platform-algorithm advice. Keep the existing Objeto Brillante footer and unsubscribe behavior.

- [ ] **Step 4: Rename the home-page tool card**

Set:

```ts
{
	name: 'Distribuye tu artículo',
	href: '/tool/repurpose',
	blurb: 'Convierte un artículo en nueve notas breves para seguir llevándole lectores.',
	capturesEmail: true
}
```

- [ ] **Step 5: Run formatting-independent verification**

Run: `rg -n "Substack|LinkedIn|Posts de X|solo una.*enlace|tres semanas" src/lib/content/tool-repurpose.md src/routes/tool/repurpose src/lib/tools/repurpose src/lib/emails/tool-repurpose.md src/lib/tools/list.ts`

Expected: no platform-specific or obsolete product-copy matches. A match inside an explicitly negative prompt rule is acceptable only if it is required to forbid platform adaptation; prefer generic wording there.

Run: `pnpm test`

Expected: all tests PASS.

Run: `pnpm check`

Expected: no new errors beyond the two documented pre-existing errors.

- [ ] **Step 6: Commit the product UI and copy**

```bash
git add src/lib/content/tool-repurpose.md src/routes/tool/repurpose/+page.svelte src/lib/emails/tool-repurpose.md src/lib/tools/list.ts
git commit -m "feat: present article distribution workflow"
```

---

### Task 6: Verify the real model and email flows

**Files:**
- Modify only if verification reveals an in-scope defect in the files listed above.

**Interfaces:**
- Consumes: configured `OPENAI_API_KEY`, `RESEND_API_KEY`, `RESEND_AUDIENCE_ID`, `RESEND_FROM`, and `PUBLIC_SITE_URL`.
- Produces: evidence that both paid API paths work with real providers.

- [ ] **Step 1: Start the development server**

Run: `pnpm dev`

Expected: Vite reports a local URL and no startup exception.

- [ ] **Step 2: Exercise the free flow with a complete public article**

Submit a public article owned or authorized by the user through `/tool/repurpose`.

Expected: three notes appear in the order Idea central, Contradicción, Lección práctica; all are at most 700 characters; they differ in angle and length; their voice resembles the source; no platform is named.

- [ ] **Step 3: Exercise the email flow**

Submit a deliverable email address through the gate.

Expected: one email arrives with all nine unique notes, flexible alternation guidance, and `prompt-distribuye-tu-articulo.txt`; every URL points to the source article and the citation note uses a literal verified quotation when available.

- [ ] **Step 4: Inspect the attachment manually**

Open the `.txt` file and verify it contains both paste placeholders, all nine note functions, the 700-character constraint, voice-preservation rules, flexible link instructions, and the complete AI-antipattern section.

- [ ] **Step 5: Run the final automated suite**

Run: `pnpm test`

Expected: all tests PASS.

Run: `pnpm check`

Expected: only the two documented pre-existing errors, with no new error in a repurpose or Resend file.

- [ ] **Step 6: Commit any verification fix**

If no fix was needed, do not create an empty commit. If a fix was needed:

```bash
git add src/lib/tools/repurpose src/routes/tool/repurpose src/lib/server/resend.ts src/lib/content/tool-repurpose.md src/lib/emails/tool-repurpose.md src/lib/tools/list.ts
git commit -m "fix: correct article distribution delivery"
```
