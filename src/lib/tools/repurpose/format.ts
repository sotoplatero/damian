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
 * Does the note actually carry its anchor, or did it write around it?
 *
 * Only the `articulo` family is held to this. A `mas-alla` note reasons past the
 * article, so demanding it quote its own tension back would push it into
 * restating — the exact failure this whole change exists to end.
 */
export function carriesAnchor(piece: Piece): boolean {
	const format = findFormat(piece.id);
	if (!format || format.family !== 'articulo') return true;
	return sharesMark(piece.ancla, piece.text);
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
 * The anchor has to come from the analysis, not from the model's imagination.
 *
 * Containment either way OR a shared mark: the model may hand back a clipped
 * scene, a scene plus three words of its own, or a condensed figure. What it may
 * not do is hand back material that was never in the article.
 */
export function anchorIsKnown(piece: Piece, material: string[]): boolean {
	const anchor = normalizeQuoteText(piece.ancla);
	if (!anchor) return false;
	return material.filter(Boolean).some((entry) => {
		const normalized = normalizeQuoteText(entry);
		if (!normalized) return false;
		if (normalized.includes(anchor) || anchor.includes(normalized)) return true;
		return sharesMark(piece.ancla, entry);
	});
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
