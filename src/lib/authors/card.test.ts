import { describe, expect, it } from 'vitest';
import { heroFor, statsFor, chartCaption, compact, spanishMagnitude, safeAccent } from './card';
import type { Metrics } from './metrics';

/**
 * `heroFor`, `statsFor` and `chipsFor` only read a handful of fields, so the
 * fixtures are minimal objects widened to Metrics. The rendering tree itself is
 * not tested: satori's output is checked by eye, the selection rules here.
 */
function metricsWith(overrides: Partial<Metrics>): Metrics {
	return {
		firstPostDate: '2019-03-01T00:00:00.000Z',
		totalPosts: 120,
		longestStreak: 8,
		streakIsRecord: false,
		day: null,
		hour: null,
		aggregates: { words: 0, reactions: 0, conversation: 0, restacks: 0, novels: null },
		...overrides
	} as Metrics;
}

describe('heroFor', () => {
	it('gives a live record streak the poster spot', () => {
		const hero = heroFor(metricsWith({ longestStreak: 120, streakIsRecord: true }));
		expect(hero.live).toBe(true);
		expect(hero.value).toBe('120');
		expect(hero.label).toContain('semanas');
	});

	it('does not let a short streak be the hero even if it is the record', () => {
		const hero = heroFor(metricsWith({ longestStreak: 12, streakIsRecord: true }));
		expect(hero.live).toBe(false);
		expect(hero.value).toBe('120');
		expect(hero.label).toBe('artículos');
	});

	it('defaults to the article count', () => {
		const hero = heroFor(metricsWith({ totalPosts: 1 }));
		expect(hero.value).toBe('1');
		expect(hero.label).toBe('artículo');
	});
});

describe('statsFor', () => {
	it('shows likes, comments and restacks, dropping every zero', () => {
		const m = metricsWith({
			aggregates: { words: 0, reactions: 900, conversation: 0, restacks: 33, novels: null }
		});
		expect(statsFor(m).map((s) => s.label)).toEqual(['likes', 'restacks']);
	});

	it('is empty when nothing was earned (RSS source)', () => {
		expect(statsFor(metricsWith({}))).toEqual([]);
	});
});

describe('chartCaption', () => {
	it('adds the earned publishing day to the caption', () => {
		const m = metricsWith({ day: { weekday: 2, posts: 40, share: 0.5 } });
		expect(chartCaption(m)).toContain('publica los martes');
	});

	it('says nothing about the day when no day earned it', () => {
		expect(chartCaption(metricsWith({}))).toBe('likes + comentarios + restacks');
	});
});

describe('compact', () => {
	it('keeps small figures whole and abbreviates from five digits', () => {
		expect(compact(892)).toBe('892');
		expect(compact(9999)).toBe('9999');
		expect(compact(54_906)).toBe('54,9 mil');
		expect(compact(348_637)).toBe('348,6 mil');
		expect(compact(1_250_000)).toBe('1,3 M');
	});
});

describe('spanishMagnitude', () => {
	it('says Substack magnitudes in Spanish and leaves the rest alone', () => {
		expect(spanishMagnitude('7.7K+')).toBe('7,7 mil+');
		expect(spanishMagnitude('12K')).toBe('12 mil');
		expect(spanishMagnitude('850')).toBe('850');
	});
});

describe('safeAccent', () => {
	it('keeps a dark accent and rejects a pale or missing one', () => {
		expect(safeAccent('#0076ff', '#ff4d00')).toBe('#0076ff');
		expect(safeAccent('#ffee88', '#ff4d00')).toBe('#ff4d00');
		expect(safeAccent(null, '#ff4d00')).toBe('#ff4d00');
		expect(safeAccent('tomato', '#ff4d00')).toBe('#ff4d00');
	});
});
