import { describe, expect, it } from 'vitest';
import { formats, freeFormats, gatedFormats, FREE_IDS, GATED_IDS, NOTE_MAX_CHARS } from './formats';
import {
	addsBeyondAnchor,
	anchorIsKnown,
	anchorsAreDistinct,
	duplicateNotes,
	hasRequiredMark,
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

describe('hasRequiredMark', () => {
	const piece = (id: string, text: string) => ({ id, text, ancla: 'x' });
	const article = 'Con Apify y 5 dólares salieron 65 negocios reales por 0.45. En Madrid apareció Mesón El Molinero con 917 reseñas.';

	it('accepts a cifra carrying a figure that is in the article', () => {
		expect(hasRequiredMark(piece('cifra', 'Salieron 65 negocios por 0,45 dólares.'), article)).toBe(true);
	});

	it('rejects a cifra that writes around the number', () => {
		expect(hasRequiredMark(piece('cifra', 'Una lista cruda cuesta centavos y casi nadie la cualifica.'), article)).toBe(false);
	});

	/* Presence of a digit is not the rule: the figure has to be the article's. */
	it('rejects a cifra whose number the article never had', () => {
		expect(hasRequiredMark(piece('cifra', 'Salieron 900 negocios en una tarde.'), article)).toBe(false);
	});

	it('accepts a caso carrying a name that is in the article', () => {
		expect(hasRequiredMark(piece('caso', 'El Mesón El Molinero llena cada noche y no tiene web.'), article)).toBe(true);
	});

	it('rejects a caso with no name', () => {
		expect(hasRequiredMark(piece('caso', 'Hay un restaurante de barrio que llena cada noche sin página.'), article)).toBe(false);
	});

	it('asks nothing of the formats that have no requirement', () => {
		expect(hasRequiredMark(piece('escena', 'Miré el reloj y supe que había salido al ritmo de otro.'), article)).toBe(true);
		expect(hasRequiredMark(piece('consecuencia', 'El negocio pasa a estar en saber decir que no.'), article)).toBe(true);
	});
});

/* Both of these guard the OUTPUT. The anchor rules guard the input, and a model
   can satisfy those and still hand the material straight back — measured on
   8 August 2026, when `leccion` and `cita` came back byte-identical. */
describe('duplicateNotes', () => {
	it('catches two notes that say the same thing, whatever slot they came from', () => {
		const text = 'Si hay gente buscando algo en Google, la demanda ya existe.';
		expect(duplicateNotes([
			{ id: 'leccion', text, ancla: 'a' },
			{ id: 'cita', text, ancla: 'b' }
		])).toEqual(['leccion', 'cita']);
	});

	it('catches one note swallowed whole by another', () => {
		expect(duplicateNotes([
			{ id: 'cifra', text: 'La demanda ya existe.', ancla: 'a' },
			{ id: 'leccion', text: 'La demanda ya existe. Solo tienes que aparecer.', ancla: 'b' }
		])).not.toBeNull();
	});

	it('leaves two different notes alone', () => {
		expect(duplicateNotes([
			{ id: 'cifra', text: '1.512 clics en 16 meses.', ancla: 'a' },
			{ id: 'leccion', text: 'Mira las reseñas antes de vender la web.', ancla: 'b' }
		])).toBeNull();
	});
});

describe('addsBeyondAnchor', () => {
	it('rejects the note that is its own anchor copied', () => {
		const same = 'Si hay gente buscando algo en Google, la demanda ya existe.';
		expect(addsBeyondAnchor({ id: 'cita', text: same, ancla: same })).toBe(false);
	});

	it('accepts the note that says something of its own', () => {
		expect(addsBeyondAnchor({
			id: 'cita',
			text: '«La demanda ya existe.» Lo escribí después de cuatro meses aplicando a todo sin respuesta.',
			ancla: 'La demanda ya existe.'
		})).toBe(true);
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
