import { describe, expect, it } from 'vitest';
import { compact, spanishMagnitude, postcardData } from './postcard';
import type { Metrics } from './metrics';

/**
 * `postcardData` only reads a handful of fields, so the fixture is a minimal
 * object widened to Metrics. The four satori trees are not tested: their
 * output is checked by eye against the design handoff; the data rules here.
 */
function metricsWith(overrides: Partial<Metrics>): Metrics {
	return {
		firstPostDate: '2026-06-06T00:00:00.000Z',
		totalPosts: 9,
		pub: {
			name: 'Objeto Brillante',
			authorName: 'Damian Soto',
			origin: 'https://sotoplatero.substack.com',
			subscriberMagnitude: '81'
		},
		aggregates: { words: 0, reactions: 30, conversation: 24, restacks: 24, novels: null },
		engagement: [
			{ month: '2026-05', likes: 0, comments: 0, restacks: 0 },
			{ month: '2026-06', likes: 40, comments: 6, restacks: 5 },
			{ month: '2026-07', likes: 15, comments: 4, restacks: 3 }
		],
		...overrides
	} as unknown as Metrics;
}

describe('compact', () => {
	it('keeps small figures whole and abbreviates from five digits', () => {
		expect(compact(892)).toBe('892');
		expect(compact(54_906)).toBe('54,9 mil');
		expect(compact(1_250_000)).toBe('1,3 M');
	});
});

describe('spanishMagnitude', () => {
	it('says Substack magnitudes in Spanish and leaves the rest alone', () => {
		expect(spanishMagnitude('7.7K+')).toBe('7,7 mil+');
		expect(spanishMagnitude('12K')).toBe('12 mil');
		expect(spanishMagnitude('81')).toBe('81');
	});
});

describe('postcardData', () => {
	it('leads the stats with the subscribers and drops every zero', () => {
		const data = postcardData(metricsWith({}), 119);
		expect(data.stats.map((s) => s.label)).toEqual([
			'suscriptores',
			'likes',
			'comentarios',
			'restacks'
		]);
		expect(data.stats[0].value).toBe('81');
	});

	it('says nothing about subscribers when the author hides them', () => {
		const m = metricsWith({});
		(m.pub as { subscriberMagnitude: string | null }).subscriberMagnitude = null;
		const data = postcardData(m, null);
		expect(data.stats.map((s) => s.label)).toEqual(['likes', 'comentarios', 'restacks']);
		expect(data.followers).toBe(null);
	});

	it('takes the initials from the author name', () => {
		expect(postcardData(metricsWith({}), null).initials).toBe('DS');
	});

	it('marks solid only the bars above a fifth of the peak', () => {
		const data = postcardData(metricsWith({}), null);
		// Peak 51 (jun); may is 0 → dim; jul is 22 (43%) → solid.
		expect(data.bars.map((b) => b.solid)).toEqual([false, true, true]);
		expect(data.peak).toBe('jun · 51');
		expect(data.peakLong).toBe('pico en junio · 51');
	});

	it('has no peak when no month has interactions', () => {
		const m = metricsWith({
			aggregates: { words: 0, reactions: 0, conversation: 0, restacks: 0, novels: null },
			engagement: [{ month: '2026-07', likes: 0, comments: 0, restacks: 0 }]
		});
		const data = postcardData(m, null);
		expect(data.peak).toBe(null);
		// Only the subscribers survive: every reaction figure was a zero.
		expect(data.stats.map((s) => s.label)).toEqual(['suscriptores']);
	});
});
