import { describe, expect, it } from 'vitest';
import { formats, freeFormats, gatedFormats, NOTE_MAX_CHARS } from './formats';
import { ensureSourceLinks, pieceContainsQuote, pieceLinksToSource, pieceUsesOnlySourceUrl, readExactPieces, toMarkdown } from './format';

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
		expect(formats.every(({ example }) => example.length <= NOTE_MAX_CHARS)).toBe(true);
		expect(JSON.stringify(formats)).not.toMatch(/substack|linkedin|twitter|posts? de x/i);
	});
});

it('adds source links as a bounded fallback without mutating the input', () => {
	const source = 'https://example.com/articulo';
	const input = [
		{ id: 'detalle-revelador', text: 'La más corta.' },
		{ id: 'puerta-articulo', text: 'La puerta.' },
		{ id: 'historia', text: 'Una historia algo más larga.' }
	];
	const linked = ensureSourceLinks(input, source, 'puerta-articulo', 2);
	expect(linked?.filter((piece) => pieceLinksToSource(piece, source))).toHaveLength(2);
	expect(linked?.find(({ id }) => id === 'puerta-articulo')?.text).toContain(source);
	expect(input.every(({ text }) => !text.includes(source))).toBe(true);
});

describe('readExactPieces', () => {
	const ids = ['idea-central', 'contradiccion'];

	it('returns notes in expected order', () => {
		expect(readExactPieces({ pieces: [
			{ id: 'contradiccion', text: 'Dos' },
			{ id: 'idea-central', text: 'Uno' }
		] }, ids)).toEqual([
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

it('checks quotations and source URLs', () => {
	const quote = 'La paciencia también se entrena.';
	expect(pieceContainsQuote({ id: 'cita-comentada', text: `${quote}\n\nEso escribí.` }, quote)).toBe(true);
	expect(pieceContainsQuote({ id: 'cita-comentada', text: 'Una síntesis.' }, quote)).toBe(false);
	const source = 'https://example.com/articulo';
	expect(pieceUsesOnlySourceUrl({ id: 'idea-central', text: 'Sin enlace.' }, source)).toBe(true);
	expect(pieceUsesOnlySourceUrl({ id: 'puerta-articulo', text: `Léelo: ${source}` }, source)).toBe(true);
	expect(pieceUsesOnlySourceUrl({ id: 'puerta-articulo', text: 'https://otro.example/' }, source)).toBe(false);
	expect(pieceLinksToSource({ id: 'idea-central', text: 'Sin enlace.' }, source)).toBe(false);
	expect(pieceLinksToSource({ id: 'puerta-articulo', text: `Léelo: ${source}` }, source)).toBe(true);
});

it('renders a flat email document', () => {
	const markdown = toMarkdown([{ id: 'idea-central', text: 'Texto' }], ['Empieza por la tesis.']);
	expect(markdown).toContain('## Idea central');
	expect(markdown).toContain('## Cómo alternarlas');
	expect(markdown).not.toMatch(/Substack|LinkedIn|Posts de X/);
});
