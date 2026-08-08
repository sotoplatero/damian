import { describe, expect, it } from 'vitest';
import { formats, freeFormats, gatedFormats, FREE_IDS, GATED_IDS, NOTE_MAX_CHARS } from './formats';
import {
	anchorIsKnown,
	anchorsAreDistinct,
	carriesAnchor,
	pieceContainsQuote,
	pieceLinksToSource,
	pieceUsesOnlySourceUrl,
	readExactPieces,
	toMarkdown
} from './format';

describe('repurpose repertoire', () => {
	it('defines nine unique platform-neutral notes split 5/4 by family', () => {
		expect(formats).toHaveLength(9);
		expect(new Set(formats.map(({ id }) => id)).size).toBe(9);
		expect(FREE_IDS).toEqual(['cifra', 'escena', 'caso', 'leccion', 'cita']);
		expect(GATED_IDS).toEqual(['consecuencia', 'objecion', 'limite', 'pregunta']);
		expect(freeFormats.every(({ family }) => family === 'articulo')).toBe(true);
		expect(gatedFormats.every(({ family }) => family === 'mas-alla')).toBe(true);
		expect(formats.every(({ example }) => example.length <= NOTE_MAX_CHARS)).toBe(true);
		expect(JSON.stringify(formats)).not.toMatch(/substack|linkedin|twitter|posts? de x/i);
	});

	it('has no door format left: the link is a per-note decision now', () => {
		expect(formats.some(({ id }) => id === 'puerta-articulo')).toBe(false);
		expect(JSON.stringify(formats)).not.toMatch(/https?:\/\//);
	});

	/* The examples are shown on the public page AND used as shape anchors in the
	   prompt. An example that doesn't carry its own anchor teaches the model the
	   exact habit this repertoire exists to break.
	   `cita` and `escena` are out: their anchor is the quote and the narrated
	   moment themselves, which `carriesAnchor` matches as a shared word span, not
	   as a figure or a name. */
	it('the proof-anchored examples carry a figure or a proper name', () => {
		for (const format of freeFormats) {
			if (format.id === 'cita' || format.id === 'escena') continue;
			expect(
				/\d/.test(format.example) || /\s\p{Lu}\p{L}{3,}/u.test(format.example),
				`«${format.name}» no lleva ni cifra ni nombre propio`
			).toBe(true);
		}
	});
});

describe('carriesAnchor', () => {
	const piece = (id: string, text: string, ancla: string) => ({ id, text, ancla });

	it('passes when a figure from the anchor survives into the text', () => {
		expect(carriesAnchor(piece('cifra', 'Salieron 65 negocios por 0,45 dólares.', 'Con Apify y 5 dólares salieron 65 negocios reales por 0.45'))).toBe(true);
	});

	it('passes when a proper name from the anchor survives into the text', () => {
		expect(carriesAnchor(piece('caso', 'En Madrid está el Mesón El Molinero, lleno y sin web.', 'En Madrid apareció Mesón El Molinero con 917 reseñas y cero página web'))).toBe(true);
	});

	it('passes on four shared consecutive words', () => {
		expect(carriesAnchor(piece('escena', 'Miré el reloj y supe que había salido al ritmo de otro.', 'En el kilómetro seis miró el reloj y supo que había salido al ritmo de otro'))).toBe(true);
	});

	it('fails the note that writes around its material', () => {
		expect(carriesAnchor(piece('cifra', 'Los leads que te venden caro salen de una lista que cuesta centavos.', 'Con Apify y 5 dólares salieron 65 negocios reales por 0.45'))).toBe(false);
	});

	it('does not hold the mas-alla family to it', () => {
		expect(carriesAnchor(piece('consecuencia', 'Cualquier plan que convierta un tropiezo en fracaso se abandona por vergüenza.', 'el artículo no dice qué pasa cuando alguien falla un día'))).toBe(true);
	});
});

describe('anchorsAreDistinct', () => {
	it('rejects two notes standing on the same material', () => {
		const same = 'el 36% de los plomeros de Miami no tenía web';
		expect(anchorsAreDistinct([
			{ id: 'cifra', text: 'a', ancla: same },
			{ id: 'caso', text: 'b', ancla: `El ${same}.` }
		])).toBe(false);
	});

	it('accepts different material in the same slot', () => {
		expect(anchorsAreDistinct([
			{ id: 'cifra', text: 'a', ancla: 'el 46% de las búsquedas son locales' },
			{ id: 'caso', text: 'b', ancla: 'Mesón El Molinero, 917 reseñas y cero web' }
		])).toBe(true);
	});

	/* This one is paid for. Comparing every anchor against every other failed a
	   perfectly good set: the quote note stood on «La lista cruda cuesta
	   centavos» and one of the tensions quoted that sentence back. Different
	   atoms, overlapping words — so the comparison is per slot. */
	it('does not collide a quote with a tension that echoes it', () => {
		const quote = 'La lista cruda cuesta centavos.';
		expect(anchorsAreDistinct([
			{ id: 'cita', text: 'a', ancla: quote },
			{ id: 'consecuencia', text: 'b', ancla: `${quote} Pero cualificarla sigue siendo el cuello de botella.` }
		])).toBe(true);
	});
});

describe('anchorIsKnown', () => {
	const material = ['En Miami, 25 plomeros dejaron ver que el 36% no tenía web.', 'El 46% de las búsquedas en Google son locales.'];

	it('accepts a clipped copy of the analysis material', () => {
		expect(anchorIsKnown({ id: 'cifra', text: '', ancla: 'el 36% no tenía web' }, material)).toBe(true);
	});

	it('rejects material the article never held', () => {
		expect(anchorIsKnown({ id: 'cifra', text: '', ancla: 'el 80% cerró al año siguiente' }, material)).toBe(false);
	});

	it('rejects an empty anchor', () => {
		expect(anchorIsKnown({ id: 'cifra', text: '', ancla: '' }, material)).toBe(false);
	});
});

describe('readExactPieces', () => {
	const ids = ['cifra', 'escena'];

	it('returns notes in expected order', () => {
		expect(readExactPieces({ pieces: [
			{ id: 'escena', text: 'Dos', ancla: 'b' },
			{ id: 'cifra', text: 'Uno', ancla: 'a' }
		] }, ids)).toEqual([
			{ id: 'cifra', text: 'Uno', ancla: 'a' },
			{ id: 'escena', text: 'Dos', ancla: 'b' }
		]);
	});

	it.each([
		{ pieces: [{ id: 'cifra', text: 'Uno', ancla: 'a' }] },
		{ pieces: [{ id: 'cifra', text: 'Uno', ancla: 'a' }, { id: 'cifra', text: 'Dos', ancla: 'b' }] },
		{ pieces: [{ id: 'cifra', text: 'Uno', ancla: 'a' }, { id: 'desconocido', text: 'Dos', ancla: 'b' }] },
		{ pieces: [{ id: 'cifra', text: 'Uno', ancla: 'a' }, { id: 'escena', text: 'x'.repeat(NOTE_MAX_CHARS + 1), ancla: 'b' }] },
		{ pieces: [{ id: 'cifra', text: 'Uno', ancla: 'a' }, { id: 'escena', text: 'Dos' }] },
		{ pieces: [{ id: 'cifra', text: 'Uno', ancla: 'a' }, { id: 'escena', text: 'Dos', ancla: '  ' }] }
	])('rejects invalid complete sets', (raw) => {
		expect(readExactPieces(raw, ids)).toBeNull();
	});
});

it('checks quotations and source URLs', () => {
	const quote = 'La paciencia también se entrena.';
	expect(pieceContainsQuote({ id: 'cita', text: `${quote}\n\nEso escribí.`, ancla: quote }, quote)).toBe(true);
	expect(pieceContainsQuote({ id: 'cita', text: 'Una síntesis.', ancla: quote }, quote)).toBe(false);
	const source = 'https://example.com/articulo';
	expect(pieceUsesOnlySourceUrl({ id: 'cifra', text: 'Sin enlace.', ancla: 'a' }, source)).toBe(true);
	expect(pieceUsesOnlySourceUrl({ id: 'cifra', text: `Léelo: ${source}`, ancla: 'a' }, source)).toBe(true);
	expect(pieceUsesOnlySourceUrl({ id: 'cifra', text: 'https://otro.example/', ancla: 'a' }, source)).toBe(false);
	expect(pieceLinksToSource({ id: 'cifra', text: 'Sin enlace.', ancla: 'a' }, source)).toBe(false);
	expect(pieceLinksToSource({ id: 'cifra', text: `Léelo: ${source}`, ancla: 'a' }, source)).toBe(true);
});

it('renders the email grouped by family, warning included', () => {
	const markdown = toMarkdown([
		{ id: 'cifra', text: 'Texto', ancla: 'a' },
		{ id: 'objecion', text: 'Otro', ancla: 'b' }
	], ['Empieza por la cifra.']);
	expect(markdown).toContain('## Lo que tu artículo ya dice');
	expect(markdown).toContain('## Lo que tu artículo abre y no cierra');
	expect(markdown).toContain('### La cifra');
	expect(markdown).toMatch(/publicarlas con tu nombre/);
	expect(markdown).toContain('## Cómo alternarlas');
	expect(markdown).not.toMatch(/Substack|LinkedIn|Posts de X/);
});
