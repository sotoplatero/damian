import { describe, expect, it } from 'vitest';
import { GAP_MIN, GAP_MAX, cleanGapRequest, isGapRequestValid } from './gap';

/*
 * The page and the endpoint both call these, which is the point of the module:
 * a field that lets something through and a server that rejects it is a form
 * that fails after the button. These pin the two edges and the whitespace rule.
 */

describe('cleanGapRequest', () => {
	it('trims and collapses runs of whitespace', () => {
		expect(cleanGapRequest('  facturas    a   mano  ')).toBe('facturas a mano');
	});

	/*
	 * Newlines matter more than they look: the answer is written to the log as one
	 * JSON line, and one event per line is the only reason that log greps.
	 */
	it('flattens newlines, because the log is one line per answer', () => {
		expect(cleanGapRequest('cuadrar facturas\n\ny mandar recordatorios')).toBe(
			'cuadrar facturas y mandar recordatorios'
		);
	});

	it('leaves an already clean sentence alone', () => {
		expect(cleanGapRequest('cuadrar las facturas del mes')).toBe('cuadrar las facturas del mes');
	});
});

describe('isGapRequestValid', () => {
	it('accepts a real answer', () => {
		expect(isGapRequestValid('Cuadrar las facturas del mes a mano')).toBe(true);
	});

	it('rejects the shrugs, which is what the floor is for', () => {
		expect(isGapRequestValid('no sé')).toBe(false);
		expect(isGapRequestValid('ninguna')).toBe(false);
		expect(isGapRequestValid('')).toBe(false);
	});

	it('rejects whitespace pretending to be length', () => {
		expect(isGapRequestValid(' '.repeat(GAP_MIN + 5))).toBe(false);
	});

	it('measures the cleaned text, not what was typed', () => {
		const padded = `   ${'a'.repeat(GAP_MIN)}   `;
		expect(padded.length).toBeGreaterThan(GAP_MIN);
		expect(isGapRequestValid(padded)).toBe(true);
	});

	it('holds both edges exactly', () => {
		expect(isGapRequestValid('a'.repeat(GAP_MIN - 1))).toBe(false);
		expect(isGapRequestValid('a'.repeat(GAP_MIN))).toBe(true);
		expect(isGapRequestValid('a'.repeat(GAP_MAX))).toBe(true);
		expect(isGapRequestValid('a'.repeat(GAP_MAX + 1))).toBe(false);
	});
});
