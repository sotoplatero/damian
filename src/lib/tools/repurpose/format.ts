import { escapeMarkdown } from '$lib/tools/markdown';
import { normalizeQuoteText } from '$lib/tools/quotes';
import { findFormat, formats, NOTE_MAX_CHARS } from './formats';

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
		if (
			!findFormat(id) ||
			!expectedIds.includes(id) ||
			!clean ||
			clean.length > NOTE_MAX_CHARS ||
			byId.has(id)
		) return null;
		byId.set(id, { id, text: clean });
	}
	const ordered = expectedIds.map((id) => byId.get(id));
	return ordered.every((piece): piece is Piece => Boolean(piece)) ? ordered : null;
}

export function pieceContainsQuote(piece: Piece, quote: string): boolean {
	return Boolean(quote.trim()) && normalizeQuoteText(piece.text).includes(normalizeQuoteText(quote));
}

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

export function toMarkdown(pieces: Piece[], order: string[]): string {
	const byId = new Map(pieces.map((piece) => [piece.id, piece]));
	const blocks: string[] = [];
	for (const format of formats) {
		const piece = byId.get(format.id);
		if (!piece) continue;
		blocks.push(`## ${format.name}\n\n*${format.bestFor}*\n\n${escapeMarkdown(piece.text)}`);
	}
	if (order.length) {
		blocks.push('## Cómo alternarlas');
		blocks.push(order.map((line) => `- ${escapeMarkdown(line).replace(/^\-\s*/, '')}`).join('\n'));
	}
	return blocks.join('\n\n');
}
