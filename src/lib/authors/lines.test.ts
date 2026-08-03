import { describe, it, expect } from 'vitest';
import type { PubInfo } from '$lib/server/substack-archive';
import { linesFor } from './lines';
import { computeMetrics } from './metrics';
import { deepFixture, DEEP_CREATED_AT } from './fixtures';

const PUB: PubInfo = {
	origin: 'https://x.substack.com',
	name: 'The publication',
	authorName: 'Someone',
	createdAt: DEEP_CREATED_AT,
	language: 'es',
	subscriberCount: null,
	logoUrl: null,
	paymentsEnabled: true
};

const metrics = computeMetrics(deepFixture(), PUB, new Date('2024-12-31T00:00:00.000Z'))!;

describe('linesFor', () => {
	it('gives no consolation prize for a short streak: the number stands alone', () => {
		const lines = linesFor({ ...metrics, longestStreak: 12, streakIsRecord: false });
		expect(lines.streak).toBe(null);
	});

	it('flatters a long streak', () => {
		const lines = linesFor({ ...metrics, longestStreak: 276, streakIsRecord: false });
		expect(lines.streak).toContain('276');
		expect(lines.streak).toContain('oficio');
	});

	it('says the live streak is the record when it is', () => {
		const lines = linesFor({
			...metrics,
			longestStreak: 276,
			currentStreak: 276,
			streakIsRecord: true
		});
		expect(lines.streak).toContain('ahora mismo');
	});

	it('names the word they repeat, spelled the way they spell it', () => {
		const lines = linesFor({ ...metrics, words: [{ word: 'jazz', posts: 32 }] });
		expect(lines.words).toContain('jazz');
		expect(lines.words).toContain('32');
	});

	it('invents no word sentence when nothing repeats', () => {
		expect(linesFor({ ...metrics, words: [] }).words).toBe(null);
	});

	it('tells the likes ceiling with its title', () => {
		const lines = linesFor(metrics);
		// No thousands separator on four digits: that is the Spanish convention
		// and what `toLocaleString('es-ES')` does (8854, but 12.345 and 1.502.228).
		expect(lines.likes).toContain('8854');
		expect(lines.likes).toContain('El techo de la casa');
	});

	it('groups thousands the Spanish way from five digits up', () => {
		const lines = linesFor({
			...metrics,
			mostLiked: { ...metrics.mostLiked!, post: { ...metrics.mostLiked!.post, reactions: 348558 } }
		});
		expect(lines.likes).toContain('348.558');
	});

	it('says nothing about likes when there is no ceiling', () => {
		expect(linesFor({ ...metrics, mostLiked: null }).likes).toBe(null);
	});

	it('only speaks of the hour when the hour exists', () => {
		expect(linesFor({ ...metrics, hour: null }).hour).toBe(null);
		const lines = linesFor({ ...metrics, hour: { hour: 5, share: 0.93 } });
		expect(lines.hour).toContain('cinco');
		expect(lines.hour).toContain('madrugada');
		expect(lines.hour).toContain('93%');
	});

	it('needs two closed years before it situates cadence', () => {
		// One closed year plus the year in progress is not an evolution.
		expect(
			linesFor({
				...metrics,
				years: [
					{ year: 2023, posts: 50, monthsActive: 12, perMonth: 4.2, inProgress: false },
					{ year: 2024, posts: 20, monthsActive: 6, perMonth: 3.3, inProgress: true }
				]
			}).cadence
		).toBe(null);

		const lines = linesFor({
			...metrics,
			years: [
				{ year: 2023, posts: 50, monthsActive: 12, perMonth: 4.0, inProgress: false },
				{ year: 2024, posts: 60, monthsActive: 12, perMonth: 5.0, inProgress: false }
			]
		});
		expect(lines.cadence).toContain('4.5');
		expect(lines.cadence).toContain('2 años');
	});
});
