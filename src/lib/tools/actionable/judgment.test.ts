import { describe, it, expect } from 'vitest';
import { normalizeQuoteText } from '$lib/tools/quotes';
import { enforceSteps, readAxes, readJudgment, verdictFor, verifyAxes, type Axis, type Judgment, type Shape } from './judgment';

const PAGE = normalizeQuoteText(
	`Las seis fórmulas de gancho que uso cada semana.
	 Empieza por la promesa concreta y ponle el plazo detrás.
	 Cambia el sujeto por tu público y repite el ejercicio con cada tema.`
);

function axis(id: Axis['id'], pasa: boolean, cita = ''): Axis {
	return { id, pasa, motivo: `motivo de ${id}`, cita };
}

function judgment(axes: Axis[], forma: Shape = 'generador', extra: Partial<Judgment> = {}): Judgment {
	return {
		tarea: 'escribir el titular de un post',
		tareaDeTrabajo: true,
		pasos: ['empieza por la promesa', 'ponle el plazo detrás'],
		axes,
		queHace: 'Te pide un tema y devuelve ganchos.',
		forma,
		masCercano: '',
		...extra
	};
}

const ALL_FOUR = [axis('procedimental', true), axis('parametrizable', true), axis('repetido', true), axis('tedioso', true)];

const REAL_QUOTE = 'Empieza por la promesa concreta y ponle el plazo detrás';

describe('verdictFor', () => {
	it('a page that defends all four axes as a generator is built', () => {
		expect(verdictFor(judgment(ALL_FOUR))).toBe('sirve');
	});

	// The essay case: four honest axes about criteria for how to live your life.
	// Nothing in the axes can see it; the missing material is what sees it.
	it('refuses a task that is not work on a material, however well it scores', () => {
		expect(verdictFor(judgment(ALL_FOUR, 'generador', { tareaDeTrabajo: false }))).toBe('no');
	});

	// Not a vote: there is nothing to turn into anything without a procedure.
	it('refuses when the procedure is missing, whatever else passes', () => {
		const noProcedure = judgment([axis('procedimental', false), axis('parametrizable', true), axis('repetido', true), axis('tedioso', true)]);
		expect(verdictFor(noProcedure)).toBe('no');
	});

	it('two or three axes is offered as the weaker version', () => {
		const three = judgment([axis('procedimental', true), axis('parametrizable', true), axis('repetido', true), axis('tedioso', false)]);
		const two = judgment([axis('procedimental', true), axis('parametrizable', true), axis('repetido', false), axis('tedioso', false)]);
		expect(verdictFor(three)).toBe('flojo');
		expect(verdictFor(two)).toBe('flojo');
	});

	it('fewer than two axes is refused', () => {
		const one = judgment([axis('procedimental', true), axis('parametrizable', false), axis('repetido', false), axis('tedioso', false)]);
		expect(verdictFor(one)).toBe('no');
	});

	// The outcome the brief doesn't name. It is a refusal on screen and the line
	// in the rejection log that says which shape to build second.
	it('a convertible page of a shape v1 does not build is its own outcome', () => {
		expect(verdictFor(judgment(ALL_FOUR, 'corrector'))).toBe('otra-forma');
	});

	// A shape we don't build doesn't rescue a page that failed the judgment.
	it('the wrong shape does not outrank a refusal', () => {
		const weak = judgment([axis('procedimental', true), axis('parametrizable', false), axis('repetido', false), axis('tedioso', false)], 'calculadora');
		expect(verdictFor(weak)).toBe('no');
	});
});

describe('verifyAxes', () => {
	it('keeps an axis whose quote is really on the page', () => {
		const { judgment: checked, unverified } = verifyAxes(judgment([axis('procedimental', true, REAL_QUOTE), axis('parametrizable', false), axis('repetido', false), axis('tedioso', false)]), PAGE);
		expect(unverified).toEqual([]);
		expect(checked.axes[0].pasa).toBe(true);
	});

	it('fails an axis whose quote is not there, and names it', () => {
		const invented = judgment([axis('procedimental', true, 'Escribe cada lunes a las nueve en punto'), axis('parametrizable', false), axis('repetido', false), axis('tedioso', false)]);
		const { judgment: checked, unverified } = verifyAxes(invented, PAGE);
		expect(unverified).toEqual(['procedimental']);
		expect(checked.axes[0].pasa).toBe(false);
		// The reason survives: it is still shown, now under a failed axis.
		expect(checked.axes[0].motivo).toBe('motivo de procedimental');
	});

	// The one that matters: an agreeable model can turn a refusal into a build.
	it('an unverifiable set drops from built to refused', () => {
		const flattering = judgment([
			axis('procedimental', true, 'Empieza por la promesa concreta y ponle el plazo detrás'),
			axis('parametrizable', true, 'esto no está en la página en absoluto, ni parecido'),
			axis('repetido', true, 'tampoco está esto otro que me acabo de inventar'),
			axis('tedioso', true, 'ni esto, por mucho que suene verosímil del todo')
		]);
		expect(verdictFor(flattering)).toBe('sirve');
		const { judgment: checked, unverified } = verifyAxes(flattering, PAGE);
		expect(unverified).toHaveLength(3);
		expect(verdictFor(checked)).toBe('no');
	});

	// The demotion has to be legible. Both guards leave the model's reason in
	// place, and a reason arguing yes under a ✕ is the tool contradicting itself.
	it('says who took the axis down, so the page never argues against its own mark', () => {
		const { judgment: checked } = verifyAxes(judgment([axis('procedimental', true, 'esto no está en la página'), axis('parametrizable', false), axis('repetido', false), axis('tedioso', false)]), PAGE);
		expect(checked.axes[0].descartado).toBe('sin-cita');
		expect(checked.axes[1].descartado).toBeUndefined();
	});

	it('a quote too short to prove anything does not pass', () => {
		const { unverified } = verifyAxes(judgment([axis('procedimental', true, 'gancho'), axis('parametrizable', false), axis('repetido', false), axis('tedioso', false)]), PAGE);
		expect(unverified).toEqual(['procedimental']);
	});

	// Quotes are pasted from HTML, so the typography drifts. Normalizing both
	// sides is what stops a correct quote from being thrown out over a dash.
	it('survives quotes and dashes changing shape', () => {
		const typographic = `«${REAL_QUOTE}»`.replace('promesa', 'promesa');
		const { unverified } = verifyAxes(judgment([axis('procedimental', true, typographic.slice(1, -1)), axis('parametrizable', false), axis('repetido', false), axis('tedioso', false)]), PAGE);
		expect(unverified).toEqual([]);
	});
});

describe('readAxes', () => {
	const four = [
		{ id: 'tedioso', pasa: false, motivo: 'a', cita: '' },
		{ id: 'procedimental', pasa: true, motivo: 'b', cita: 'c' },
		{ id: 'repetido', pasa: false, motivo: 'd', cita: '' },
		{ id: 'parametrizable', pasa: true, motivo: 'e', cita: 'f' }
	];

	it('returns the four axes in display order, whatever order they arrive in', () => {
		expect(readAxes(four)?.map((entry) => entry.id)).toEqual(['procedimental', 'parametrizable', 'repetido', 'tedioso']);
	});

	it('rejects a set that is missing an axis, repeats one, or invents one', () => {
		expect(readAxes(four.slice(1))).toBeNull();
		expect(readAxes([...four.slice(1), { id: 'repetido', pasa: true, motivo: 'x', cita: 'y' }])).toBeNull();
		expect(readAxes([...four.slice(1), { id: 'bonito', pasa: true, motivo: 'x', cita: 'y' }])).toBeNull();
	});

	it('rejects an axis with no reason', () => {
		expect(readAxes([{ ...four[0], motivo: '  ' }, ...four.slice(1)])).toBeNull();
	});
});

describe('readJudgment', () => {
	const raw = {
		axes: [
			{ id: 'procedimental', pasa: true, motivo: 'a', cita: 'b' },
			{ id: 'parametrizable', pasa: true, motivo: 'c', cita: 'd' },
			{ id: 'repetido', pasa: true, motivo: 'e', cita: 'f' },
			{ id: 'tedioso', pasa: true, motivo: 'g', cita: 'h' }
		],
		forma: 'generador',
		queHace: 'Te pide un tema y devuelve ganchos.',
		masCercano: ''
	};

	it('reads a well formed answer', () => {
		expect(readJudgment(raw)?.forma).toBe('generador');
	});

	it('rejects a shape that is not one of the six', () => {
		expect(readJudgment({ ...raw, forma: 'juego' })).toBeNull();
	});

	it('rejects an answer with nothing to show the visitor', () => {
		expect(readJudgment({ ...raw, queHace: '' })).toBeNull();
	});
});
