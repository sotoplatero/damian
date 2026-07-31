import { escapeMarkdown } from '$lib/tools/markdown';
import { byChannel, findFormat, formats } from './formats';

/** Una pieza ya escrita: el id de su formato y el texto entero. */
export type Piece = { id: string; text: string };

/** Se queda solo con piezas de formatos conocidos, con texto, y sin ids repetidos. */
export function sanitizePieces(raw: unknown): Piece[] {
	const list = Array.isArray((raw as { pieces?: unknown })?.pieces)
		? ((raw as { pieces: unknown[] }).pieces as unknown[])
		: [];
	const pieces: Piece[] = [];
	const seen = new Set<string>();
	for (const entry of list) {
		if (!entry || typeof entry !== 'object') continue;
		const { id, text } = entry as { id?: unknown; text?: unknown };
		if (typeof id !== 'string' || typeof text !== 'string') continue;
		if (!findFormat(id) || !text.trim() || seen.has(id)) continue;
		seen.add(id);
		pieces.push({ id, text: text.trim() });
	}
	return pieces;
}

/** Lee el bloque de orden, limitado para que no se convierta en otro artículo. */
export function readOrder(raw: unknown): string[] {
	const list = Array.isArray((raw as { orden?: unknown })?.orden)
		? ((raw as { orden: unknown[] }).orden as unknown[])
		: [];
	return list
		.filter((line): line is string => typeof line === 'string')
		.map((line) => line.trim())
		.filter(Boolean)
		.slice(0, 8);
}

export function toPlainText(piece: Piece): string {
	return piece.text;
}

/** Monta el correo desde las piezas que existen, agrupadas por canal y sin tablas. */
export function toMarkdown(pieces: Piece[], order: string[]): string {
	const byId = new Map(pieces.map((piece) => [piece.id, piece]));
	const written = formats.filter((format) => byId.has(format.id));
	const blocks: string[] = [];
	for (const group of byChannel(written)) {
		blocks.push(`## ${group.name}`);
		for (const format of group.items) {
			const piece = byId.get(format.id);
			if (!piece) continue;
			blocks.push(`### ${format.name}\n\n*${format.bestFor}*\n\n${escapeMarkdown(piece.text)}`);
		}
	}
	if (order.length) {
		blocks.push(`## En qué orden publicarlas`);
		blocks.push(order.map((line) => `- ${escapeMarkdown(line).replace(/^\\-\s*/, '')}`).join('\n'));
	}
	return blocks.join('\n\n');
}
