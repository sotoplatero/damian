import { describe, it, expect } from 'vitest';
import { copiesSource, readAnswers, readSpec, toFieldId, type Spec } from './spec';

const RAW = {
	nombre: 'Titulares para tu próximo post',
	queHace: 'Le dices de qué escribes y a quién, y te devuelve titulares.',
	campos: [
		{ etiqueta: 'Sobre qué escribes', ayuda: 'cómo dejé de perseguir clientes', tipo: 'texto', opciones: [], cambia: 'Es el asunto del titular.' },
		{ etiqueta: 'A quién le hablas', ayuda: 'autónomos que empiezan', tipo: 'texto', opciones: [], cambia: 'Cambia el tono y las palabras.' }
	],
	reglas: ['Empieza por la promesa concreta.', 'Ponle el plazo detrás.'],
	cuantos: 5,
	variedad: 'Por ángulo: uno de miedo, uno de deseo, uno de curiosidad.',
	fuente: { url: 'https://ejemplo.com/titulares', titulo: 'Titulares' }
};

function spec(): Spec {
	return readSpec(RAW)!;
}

describe('readSpec', () => {
	it('reads a well formed plan', () => {
		expect(spec().campos.map((field) => field.id)).toEqual(['sobre-que-escribes', 'a-quien-le-hablas']);
	});

	it('refuses a form too short to be a tool or too long to be finished', () => {
		expect(readSpec({ ...RAW, campos: RAW.campos.slice(0, 1) })).toBeNull();
		const many = readSpec({ ...RAW, campos: [...RAW.campos, ...RAW.campos.map((f) => ({ ...f, etiqueta: `${f.etiqueta} 2` })), { ...RAW.campos[0], etiqueta: 'Quinto' }] });
		expect(many?.campos).toHaveLength(4);
	});

	// Two labels that slug to the same id would silently overwrite each other in
	// the answers object, and the visitor would fill a field nobody reads.
	it('refuses two fields that collapse to the same id', () => {
		expect(readSpec({ ...RAW, campos: [RAW.campos[0], { ...RAW.campos[1], etiqueta: '¡Sobre qué escribes!' }] })).toBeNull();
	});

	it('drops a field that cannot say what it changes', () => {
		expect(readSpec({ ...RAW, campos: [RAW.campos[0], { ...RAW.campos[1], cambia: '  ' }] })).toBeNull();
	});

	// A select with one option is a decoration that also lies about being a choice.
	it('demotes a one-option dropdown to a text field', () => {
		const demoted = readSpec({ ...RAW, campos: [RAW.campos[0], { ...RAW.campos[1], tipo: 'opcion', opciones: ['solo una'] }] });
		expect(demoted?.campos[1].tipo).toBe('texto');
		expect(demoted?.campos[1].opciones).toEqual([]);
	});

	it('keeps a real dropdown', () => {
		const kept = readSpec({ ...RAW, campos: [RAW.campos[0], { ...RAW.campos[1], tipo: 'opcion', opciones: ['corto', 'largo'] }] });
		expect(kept?.campos[1].tipo).toBe('opcion');
	});

	it('clamps how many results it promises', () => {
		expect(readSpec({ ...RAW, cuantos: 40 })?.cuantos).toBe(10);
		expect(readSpec({ ...RAW, cuantos: 0 })?.cuantos).toBe(3);
		expect(readSpec({ ...RAW, cuantos: 'muchos' })?.cuantos).toBe(5);
	});

	it('refuses a plan with no procedure and one with no source', () => {
		expect(readSpec({ ...RAW, reglas: ['una sola'] })).toBeNull();
		expect(readSpec({ ...RAW, fuente: {} })).toBeNull();
	});
});

describe('toFieldId', () => {
	it('strips accents and punctuation', () => {
		expect(toFieldId('¿Cuál es tu público?', 0)).toBe('cual-es-tu-publico');
	});

	it('falls back to a position when nothing survives', () => {
		expect(toFieldId('«»—', 2)).toBe('campo-3');
	});
});

describe('copiesSource', () => {
	const ARTICLE =
		'Start with the concrete promise and put the deadline right behind it. ' +
		'Empieza por la promesa concreta y ponle el plazo detrás, siempre, en cada titular que escribas.';

	it('lets through a procedure written again in our own words', () => {
		expect(copiesSource(spec(), ARTICLE)).toBeNull();
	});

	it('catches a rule pasted from the article', () => {
		const lifted = readSpec({
			...RAW,
			reglas: [...RAW.reglas, 'Empieza por la promesa concreta y ponle el plazo detrás, siempre, en cada titular.']
		})!;
		expect(copiesSource(lifted, ARTICLE)).toContain('empieza por la promesa concreta');
	});

	// Punctuation and capitals are not authorship: changing them isn't rewriting.
	it('is not fooled by retyped punctuation or capitals', () => {
		const lifted = readSpec({
			...RAW,
			reglas: [...RAW.reglas, '¡EMPIEZA por la promesa, concreta; y ponle el plazo detrás! Siempre, en cada titular.']
		})!;
		expect(copiesSource(lifted, ARTICLE)).not.toBeNull();
	});

	it('does not fire on a short phrase anybody would write', () => {
		const short = readSpec({ ...RAW, reglas: [...RAW.reglas, 'Ponle el plazo detrás.'] })!;
		expect(copiesSource(short, ARTICLE)).toBeNull();
	});
});

describe('readAnswers', () => {
	it('reads the form and ignores anything the spec did not ask for', () => {
		const answers = readAnswers(spec(), { 'sobre-que-escribes': 'precios', 'a-quien-le-hablas': 'autónomos', 'colado': 'x' });
		expect(answers).toEqual({ 'sobre-que-escribes': 'precios', 'a-quien-le-hablas': 'autónomos' });
	});

	// A tool that runs with half its form blank had decorative fields after all.
	it('refuses a half-filled form', () => {
		expect(readAnswers(spec(), { 'sobre-que-escribes': 'precios' })).toBeNull();
		expect(readAnswers(spec(), { 'sobre-que-escribes': 'precios', 'a-quien-le-hablas': '   ' })).toBeNull();
	});

	// The dropdown's options are the contract; anything else is a hand-posted body.
	it('refuses a value a dropdown never offered', () => {
		const withSelect = readSpec({ ...RAW, campos: [RAW.campos[0], { ...RAW.campos[1], tipo: 'opcion', opciones: ['corto', 'largo'] }] })!;
		expect(readAnswers(withSelect, { 'sobre-que-escribes': 'precios', 'a-quien-le-hablas': 'gigante' })).toBeNull();
		expect(readAnswers(withSelect, { 'sobre-que-escribes': 'precios', 'a-quien-le-hablas': 'corto' })).not.toBeNull();
	});
});
