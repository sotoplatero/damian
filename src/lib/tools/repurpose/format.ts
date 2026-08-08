import { escapeMarkdown } from '$lib/tools/markdown';
import { normalizeQuoteText } from '$lib/tools/quotes';
import {
	FAMILY_LABEL,
	FAMILY_NOTE,
	findFormat,
	formats,
	NOTE_MAX_CHARS,
	type NoteFormat
} from './formats';

/**
 * A note now carries the material it was built on.
 *
 * `ancla` is copied by the model out of the analysis: the exact proof, scene,
 * quote or tension the note stands on. It exists so "nine different atoms" can
 * be CHECKED rather than merely asked for — the old prompt asked nicely and got
 * nine paraphrases of the thesis back.
 */
export type Piece = { id: string; text: string; ancla: string };

export function readExactPieces(raw: unknown, expectedIds: readonly string[]): Piece[] | null {
	const list = (raw as { pieces?: unknown })?.pieces;
	if (!Array.isArray(list) || list.length !== expectedIds.length) return null;
	const byId = new Map<string, Piece>();
	for (const entry of list) {
		if (!entry || typeof entry !== 'object') return null;
		const { id, text, ancla } = entry as { id?: unknown; text?: unknown; ancla?: unknown };
		if (typeof id !== 'string' || typeof text !== 'string' || typeof ancla !== 'string') return null;
		const clean = text.trim();
		const anchor = ancla.trim();
		if (
			!findFormat(id) ||
			!expectedIds.includes(id) ||
			!clean ||
			!anchor ||
			clean.length > NOTE_MAX_CHARS ||
			byId.has(id)
		) return null;
		byId.set(id, { id, text: clean, ancla: anchor });
	}
	const ordered = expectedIds.map((id) => byId.get(id));
	return ordered.every((piece): piece is Piece => Boolean(piece)) ? ordered : null;
}

/* ── The anchor checks ──────────────────────────────────────────────────────
 *
 * These three are the whole reason the output stopped being generic, so they
 * are pure and tested. The prompt can ask for concreteness all it likes; only
 * this can tell whether concreteness arrived.
 */

function words(text: string): string[] {
	return normalizeQuoteText(text).split(' ').filter(Boolean);
}

/**
 * Numbers as written, with trailing punctuation dropped and the decimal mark
 * normalised — "0,45." and "0.45" are the same figure and a note is free to
 * write it either way.
 */
function figures(text: string): string[] {
	return (text.match(/\d[\d.,]*/g) ?? [])
		.map((match) => match.replace(/[.,]+$/, '').replace(',', '.'))
		.filter(Boolean);
}

/**
 * Capitalised tokens that are NOT the first word of their sentence.
 *
 * The position rule is what makes this usable: any sentence starts with a
 * capital, so counting those would match "Pedirle" against "Pedirle" and call a
 * generality a proper name. Mid-sentence capitals are names — Apify, Claude,
 * Molinero — which is exactly the mark we want a note to carry.
 */
function names(text: string): string[] {
	const found: string[] = [];
	for (const sentence of text.split(/[.!?\n]+/)) {
		const tokens = sentence.trim().split(/\s+/).slice(1);
		for (const token of tokens) {
			const bare = token.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '');
			if (bare.length >= 4 && /^\p{Lu}/u.test(bare)) found.push(bare.toLowerCase());
		}
	}
	return found;
}

/** Every run of `size` consecutive words, normalised. */
function spans(text: string, size: number): string[] {
	const list = words(text);
	const output: string[] = [];
	for (let index = 0; index + size <= list.length; index += 1) {
		output.push(list.slice(index, index + size).join(' '));
	}
	return output;
}

const SPAN_WORDS = 4;

/**
 * Do these two pieces of text demonstrably talk about the same material?
 *
 * Three ways to say yes, any one enough: a shared figure, a shared proper name,
 * or four shared consecutive words. That covers the three shapes the analysis
 * actually produces — a number-shaped proof, a named example, a narrated scene.
 *
 * Exact containment was tried first and it was wrong. A model condenses: given
 * "Con Apify y 5 dólares se hicieron 6 búsquedas en dos países y salieron 65
 * negocios reales por 0.45" it hands back "65 negocios por 0,45 dólares", which
 * is the same fact and not a substring of anything. Demanding a literal copy
 * only teaches it to paste long strings it isn't using.
 */
function sharesMark(a: string, b: string): boolean {
	const figuresB = new Set(figures(b));
	if (figures(a).some((figure) => figuresB.has(figure))) return true;

	const namesB = new Set(names(b));
	if (names(a).some((name) => namesB.has(name))) return true;

	const spansB = new Set(spans(b, SPAN_WORDS));
	return spans(a, SPAN_WORDS).some((span) => spansB.has(span));
}

/**
 * Does the note meet its format's mechanical requirement?
 *
 * Only two formats have one, and both are single tokens the model can see it is
 * providing: `cifra` must write a figure, `caso` must write a proper name. Both
 * are checked against the ARTICLE, so an invented number or an invented company
 * fails — which is the point of the rule, not mere presence of a digit.
 *
 * THIS REPLACED A GENERAL "the note must carry its anchor" RULE. That one was in
 * direct tension with `addsBeyondAnchor` — copy the material and you add nothing
 * of your own, rewrite it and the carrying disappears — and since the model
 * cannot see the rule, runs oscillated between the two failures on the same
 * article. Everything unmeasurable now lives in the `hint`.
 */
export function hasRequiredMark(piece: Piece, articleText: string): boolean {
	const required = findFormat(piece.id)?.requires;
	if (!required) return true;

	const from = required === 'figure' ? figures : names;

	// The rule is KEEP THE MARK YOUR MATERIAL HAS, not "find one somewhere". An
	// anchor with no proper name in it — and some articles have no named example
	// at all — cannot yield a named note without inventing the name, which is the
	// one thing this tool must never do. Measured: an article about a method,
	// with no named case in it, failed every attempt until this waiver existed.
	const inAnchor = from(piece.ancla);
	if (!inAnchor.length) return true;

	const inArticle = new Set(from(articleText));
	const kept = new Set(from(piece.text));
	return inAnchor.some((mark) => kept.has(mark) && inArticle.has(mark));
}

/**
 * No two notes may stand on the same material. This is "nine atoms" enforced.
 *
 * Comparing normalised strings for equality is not enough, and that is the whole
 * difficulty: a model that wants to write about the best proof twice does not
 * paste it twice, it trims three words off the second copy. So two anchors
 * collide when either contains the other — which is the same test
 * `anchorIsKnown` uses, for the same reason.
 *
 * Containment only counts once the shorter anchor is a real phrase
 * (`SPAN_WORDS` words or more). Below that a bare "Miami" would swallow every
 * anchor mentioning Miami and collapse a perfectly good set.
 */
/**
 * Two notes standing on the same material, or null.
 *
 * COMPARED WITHIN AN ANCHOR SLOT, NOT ACROSS ALL NINE, and that distinction was
 * paid for: comparing everything against everything failed a perfectly good set
 * because the quote note stood on «La lista cruda cuesta centavos» and a tension
 * happened to quote that same sentence back. Different atoms, overlapping words.
 *
 * The repeat that actually matters is inside a slot — three notes fighting over
 * the same proof, or two of the four tensions being one tension. Across slots,
 * shared wording is just the article being about one thing.
 */
export function collidingAnchors(pieces: Piece[]): [string, string] | null {
	const bySlot = new Map<string, Piece[]>();
	for (const piece of pieces) {
		const slot = findFormat(piece.id)?.anchor;
		if (!slot) continue;
		bySlot.set(slot, [...(bySlot.get(slot) ?? []), piece]);
	}

	for (const group of bySlot.values()) {
		for (let i = 0; i < group.length; i += 1) {
			for (let j = i + 1; j < group.length; j += 1) {
				const a = normalizeQuoteText(group[i].ancla);
				const b = normalizeQuoteText(group[j].ancla);
				const [short, long] = a.length <= b.length ? [a, b] : [b, a];
				const collides = short === long
					|| (short.split(' ').filter(Boolean).length >= SPAN_WORDS && long.includes(short));
				if (collides) return [group[i].id, group[j].id];
			}
		}
	}
	return null;
}

export function anchorsAreDistinct(pieces: Piece[]): boolean {
	return collidingAnchors(pieces) === null;
}

/**
 * The anchor has to come from the article, not from the model's imagination.
 *
 * Two ways to be real, deliberately different in strictness:
 *
 * 1. **A literal fragment of the article** — containment against the scraped
 *    text. Exact, so it cannot be gamed.
 * 2. **A condensation of something the analysis listed** — `sharesMark` against
 *    that list, which tolerates the model trimming.
 *
 * Checking ONLY the analysis list was the first version and it rejected good
 * sets in production: the model writes from the whole article, not from the
 * handful of proofs it happened to enumerate, so a named example that lived in
 * the text but not in `pruebas` got called invented. Running `sharesMark`
 * against the whole article would be the opposite mistake — in a long piece any
 * invented figure shares a digit with something, somewhere.
 */
export function anchorIsKnown(piece: Piece, material: string[], articleText = ''): boolean {
	const anchor = normalizeQuoteText(piece.ancla);
	if (!anchor) return false;

	// A literal fragment of the article, checked exactly.
	const source = normalizeQuoteText(articleText);
	if (source && source.includes(anchor)) return true;

	// Or a condensation of something the analysis listed, checked loosely.
	return material.filter(Boolean).some((entry) => {
		const normalized = normalizeQuoteText(entry);
		if (!normalized) return false;
		if (normalized.includes(anchor) || anchor.includes(normalized)) return true;
		return sharesMark(piece.ancla, entry);
	});
}

/**
 * Two notes that say the same thing, or null. COMPARED ON THE TEXT, ACROSS ALL
 * NINE.
 *
 * The anchor checks guard the INPUT and a model can satisfy them and still
 * repeat itself. Measured on 8 August 2026: `leccion` and `cita` came back with
 * byte-identical text, and `collidingAnchors` could not see it because those two
 * draw from different slots and are never compared. Guarding the output needs no
 * slot logic — two notes that read the same are two notes that read the same,
 * whatever they were built from.
 */
export function duplicateNotes(pieces: Piece[]): [string, string] | null {
	for (let i = 0; i < pieces.length; i += 1) {
		for (let j = i + 1; j < pieces.length; j += 1) {
			const a = normalizeQuoteText(pieces[i].text);
			const b = normalizeQuoteText(pieces[j].text);
			const [short, long] = a.length <= b.length ? [a, b] : [b, a];
			if (short && (short === long || long.includes(short))) return [pieces[i].id, pieces[j].id];
		}
	}
	return null;
}

/** Words in `text` that the anchor does not already contain. */
function wordsBeyond(text: string, anchor: string): number {
	const known = new Set(words(anchor));
	return new Set(words(text).filter((word) => !known.has(word))).size;
}

const MIN_OWN_WORDS = 6;

/**
 * Did the note DO something with its material, or just hand it back?
 *
 * `carriesAnchor` asks that the material survive into the note, and the cheapest
 * way to pass that is to copy the material and call it a note. That is exactly
 * what happened: three of five notes came back byte-identical to their own
 * `ancla`. A quote with no comment, a figure with nothing said about it.
 *
 * So the note has to contribute `MIN_OWN_WORDS` words the anchor did not have.
 * Six is low on purpose — it is the floor for "there is a sentence of yours in
 * here", not a measure of quality, and the hints do the rest.
 */
export function addsBeyondAnchor(piece: Piece): boolean {
	return wordsBeyond(piece.text, piece.ancla) >= MIN_OWN_WORDS;
}

export function pieceContainsQuote(piece: Piece, quote: string): boolean {
	return Boolean(quote.trim()) && normalizeQuoteText(piece.text).includes(normalizeQuoteText(quote));
}

/**
 * An alien URL is still a bug and this still runs on every note.
 *
 * What is GONE is the other half: the old design demanded the source URL in at
 * least two notes and force-appended it (`ensureSourceLinks`) when the model
 * declined. That optimised against both the reader and the algorithm — a
 * distributed note has to stand on its own and the click is additive, not
 * required. The model now decides, per note, whether a link helps at all.
 */
export function pieceUsesOnlySourceUrl(piece: Piece, sourceUrl: string): boolean {
	const matches = piece.text.match(/https?:\/\/[^\s<>()]+/g) ?? [];
	if (!matches.length) return true;
	try {
		const expected = new URL(sourceUrl).toString();
		return matches.every((match) => new URL(match.replace(/[.,;:!?]+$/, '')).toString() === expected);
	} catch {
		return false;
	}
}

export function pieceLinksToSource(piece: Piece, sourceUrl: string): boolean {
	if (!pieceUsesOnlySourceUrl(piece, sourceUrl)) return false;
	try {
		const expected = new URL(sourceUrl).toString();
		return (piece.text.match(/https?:\/\/[^\s<>()]+/g) ?? []).some(
			(match) => new URL(match.replace(/[.,;:!?]+$/, '')).toString() === expected
		);
	} catch {
		return false;
	}
}

export function readOrder(raw: unknown): string[] {
	const list = (raw as { orden?: unknown })?.orden;
	if (!Array.isArray(list)) return [];
	return list
		.filter((line): line is string => typeof line === 'string')
		.map((line) => line.trim())
		.filter(Boolean)
		.slice(0, 6);
}

export function toPlainText(piece: Piece): string {
	return piece.text;
}

/**
 * The emailed document: one loop over the repertoire, grouped by family.
 *
 * The families get a heading and their note, and the `mas-alla` warning travels
 * with them — the reader has to know which four are the model's reading before
 * they publish them, and the email is the only artifact left once the tab
 * closes.
 */
export function toMarkdown(pieces: Piece[], order: string[]): string {
	const byId = new Map(pieces.map((piece) => [piece.id, piece]));
	const blocks: string[] = [];
	let family: NoteFormat['family'] | null = null;

	for (const format of formats) {
		const piece = byId.get(format.id);
		if (!piece) continue;
		if (format.family !== family) {
			family = format.family;
			blocks.push(`## ${FAMILY_LABEL[family]}`);
			blocks.push(`*${FAMILY_NOTE[family]}*`);
		}
		blocks.push(`### ${format.name}\n\n*${format.bestFor}*\n\n${escapeMarkdown(piece.text)}`);
	}

	if (order.length) {
		blocks.push('## Cómo alternarlas');
		blocks.push(order.map((line) => `- ${escapeMarkdown(line).replace(/^\-\s*/, '')}`).join('\n'));
	}
	return blocks.join('\n\n');
}
