import { describe, it, expect } from 'vitest';
import type { PubInfo } from '$lib/server/substack-archive';
import { deepFixture, youngFixture, tinyFixture, DEEP_CREATED_AT } from './fixtures';
import {
	ownPosts,
	datedPosts,
	longestStreak,
	currentStreak,
	postsByYear,
	topDay,
	freePaid,
	topPost,
	topWords,
	headlineStats,
	topHour,
	aggregates,
	heatmapRows,
	computeMetrics,
	WORDS_PER_NOVEL
} from './metrics';

const deep = deepFixture();

const PUB: PubInfo = {
	origin: 'https://x.substack.com',
	name: 'The publication',
	authorName: 'Someone',
	createdAt: DEEP_CREATED_AT,
	language: 'es',
	subscriberCount: 7000,
	logoUrl: null,
	authorPhotoUrl: null,
	subscriberMagnitude: null,
	authorHandle: null,
	tagline: 'Una publicación de prueba',
	brandColor: null,
	paymentsEnabled: true
};

describe('post sets', () => {
	it('own posts exclude the restack and keep the podcast', () => {
		const own = ownPosts(deep);
		expect(own.some((p) => p.type === 'restack')).toBe(false);
		// A podcast is their own work: it counts.
		expect(own.some((p) => p.type === 'podcast')).toBe(true);
	});

	it('dated posts drop everything before created_at', () => {
		const dated = datedPosts(deep, DEEP_CREATED_AT);
		expect(dated.some((p) => p.date.startsWith('2000-01-01'))).toBe(false);
		expect(dated.some((p) => p.date.startsWith('2011'))).toBe(false);
		expect(dated.every((p) => p.date >= DEEP_CREATED_AT)).toBe(true);
	});
});

describe('rankings', () => {
	it('looks for the ceiling across the WHOLE archive, unfiltered by date', () => {
		// Likes accrue on Substack whatever date a post claims, so an imported
		// post can legitimately be the most liked one.
		const top = topPost(deep, 'reactions');
		expect(top?.post.reactions).toBe(8854);
		expect(top?.post.title).toBe('El techo de la casa');
	});

	it('does not show the date of a post older than created_at', () => {
		const posts = [
			{ ...deep[0], date: '2000-01-01T17:00:00.000Z', reactions: 500, title: 'Imported' }
		];
		const top = topPost(posts, 'reactions', DEEP_CREATED_AT);
		// We are not going to sign off on "18 February 2000".
		expect(top?.showDate).toBe(false);
	});

	it('has no ceiling when nobody reacted', () => {
		const posts = deep.map((p) => ({ ...p, reactions: 0 }));
		expect(topPost(posts, 'reactions')).toBe(null);
	});
});

describe('streaks', () => {
	it('counts consecutive ISO weeks', () => {
		const dated = datedPosts(deep, DEEP_CREATED_AT);
		// The fixture has 30 consecutive weeks, a 3-week gap, then 10 more.
		expect(longestStreak(dated)).toBe(30);
	});

	it('measures the live streak back from the last week with a post', () => {
		const posts = youngFixture();
		expect(currentStreak(posts, new Date(posts[posts.length - 1].date))).toBe(6);
	});

	it('reports no live streak once the last week is well behind', () => {
		const posts = youngFixture();
		const longAfter = new Date(new Date(posts[posts.length - 1].date).getTime() + 60 * 86400000);
		expect(currentStreak(posts, longAfter)).toBe(0);
	});
});

describe('cadence', () => {
	it('divides by active months and labels the year in progress', () => {
		const dated = datedPosts(deep, DEEP_CREATED_AT);
		const years = postsByYear(dated, new Date('2024-12-31T00:00:00.000Z'));
		const y2024 = years.find((y) => y.year === 2024);
		expect(y2024?.posts).toBe(42);
		// 2024 is "today" in this call, so it is labelled.
		expect(y2024?.inProgress).toBe(true);
	});
});

describe('conditional thresholds', () => {
	it('shows the weekday only when it genuinely dominates', () => {
		// The whole deep fixture publishes on Mondays: 100%.
		expect(topDay(datedPosts(deep, DEEP_CREATED_AT))?.weekday).toBe(1);

		// An even split across seven days is noise, so nothing is shown.
		const flat = Array.from({ length: 70 }, (_, i) => ({
			...deep[3],
			slug: `p-${i}`,
			date: new Date(Date.UTC(2025, 0, 6) + i * 86400000).toISOString()
		}));
		expect(topDay(flat)).toBe(null);
	});

	it('shows the free/paid split only when there is a real mix', () => {
		const dated = datedPosts(deep, DEEP_CREATED_AT);
		expect(freePaid(dated)).not.toBe(null);

		// 281 of 281 free, like liderar: "100% free" is not a metric.
		const allFree = dated.map((p) => ({ ...p, audience: 'everyone' }));
		expect(freePaid(allFree)).toBe(null);
	});
});

describe('headlines', () => {
	it('counts the words they repeat and skips filler', () => {
		const posts = [
			{ ...deep[3], slug: 'a', title: 'El liderazgo y la negociación' },
			{ ...deep[3], slug: 'b', title: 'Liderazgo para todos' },
			{ ...deep[3], slug: 'c', title: 'Más liderazgo, por favor' },
			{ ...deep[3], slug: 'd', title: 'Otra cosa distinta' }
		];
		const words = topWords(posts);
		expect(words[0]).toEqual({ word: 'liderazgo', posts: 3 });
		expect(words.some((w) => ['el', 'la', 'para', 'por'].includes(w.word))).toBe(false);
	});

	it('groups accented and unaccented variants but shows the most used form', () => {
		const posts = [
			{ ...deep[3], slug: 'a', title: 'Negociación dura' },
			{ ...deep[3], slug: 'b', title: 'Negociación blanda' },
			{ ...deep[3], slug: 'c', title: 'Negociacion sin tilde' }
		];
		expect(topWords(posts)[0]).toEqual({ word: 'negociación', posts: 3 });
	});

	it('counts posts rather than occurrences, so one headline cannot carry a word', () => {
		const posts = [{ ...deep[3], slug: 'a', title: 'Liderazgo liderazgo liderazgo liderazgo' }];
		expect(topWords(posts)).toEqual([]);
	});

	it('does not return a word that only appears in two posts', () => {
		const posts = [
			{ ...deep[3], slug: 'a', title: 'Liderazgo uno' },
			{ ...deep[3], slug: 'b', title: 'Liderazgo dos' }
		];
		expect(topWords(posts)).toEqual([]);
	});

	it('shows the headline tic only above the threshold', () => {
		const withColons = Array.from({ length: 10 }, (_, i) => ({
			...deep[3],
			slug: `p-${i}`,
			title: i < 3 ? `Tema ${i}: lo que sea` : `Titular normal ${i}`
		}));
		// 3 of 10 carry a colon: 30%, above the 20% threshold. But every one of
		// these titles also carries a digit, so `number` wins at 100%.
		expect(withColons.length).toBe(10);
		expect(headlineStats(withColons).signature?.kind).toBe('number');

		const plain = Array.from({ length: 10 }, (_, i) => ({
			...deep[3],
			slug: `q-${i}`,
			title: `Titular ${'x'.repeat(i)}`
		}));
		expect(headlineStats(plain).signature).toBe(null);
	});

	it('reports the mean headline length', () => {
		const posts = [
			{ ...deep[3], slug: 'a', title: 'abcd' },
			{ ...deep[3], slug: 'b', title: 'abcdef' }
		];
		expect(headlineStats(posts).averageLength).toBe(5);
	});
});

describe('hour of day', () => {
	it('appears when it concentrates in one window', () => {
		// Measured on Kloshletter: 49% at 05h and 44% at 06h.
		const posts = Array.from({ length: 100 }, (_, i) => ({
			...deep[3],
			slug: `p-${i}`,
			date: `2026-0${(i % 9) + 1}-01T0${i < 50 ? 5 : 6}:00:00.000Z`
		}));
		expect(topHour(posts)?.hour).toBe(5);
	});

	it('stays away when it is spread out', () => {
		const posts = Array.from({ length: 48 }, (_, i) => ({
			...deep[3],
			slug: `p-${i}`,
			date: `2026-01-01T${String(i % 24).padStart(2, '0')}:00:00.000Z`
		}));
		expect(topHour(posts)).toBe(null);
	});
});

describe('aggregates', () => {
	it('sums what Substack only shows post by post', () => {
		const posts = [
			{ ...deep[3], slug: 'a', words: 1000, reactions: 10, comments: 2, childComments: 1 },
			{ ...deep[3], slug: 'b', words: 500, reactions: 5, comments: 3, childComments: 4 }
		];
		const agg = aggregates(posts);
		expect(agg.words).toBe(1500);
		expect(agg.reactions).toBe(15);
		// Comments and replies together: the whole conversation.
		expect(agg.conversation).toBe(10);
		expect(agg.novels).toBe(Math.round((1500 / WORDS_PER_NOVEL) * 10) / 10);
	});

	it('gives no book equivalence without words (the RSS case)', () => {
		const posts = [{ ...deep[3], slug: 'a', words: 0 }];
		expect(aggregates(posts).novels).toBe(null);
	});
});

describe('heatmap', () => {
	it('gives one row per year with a cell per week', () => {
		const rows = heatmapRows(datedPosts(deep, DEEP_CREATED_AT));
		expect(rows[0].year).toBe(2024);
		expect(rows[0].weeks).toHaveLength(53);
		expect(rows[0].weeks.filter(Boolean).length).toBeGreaterThan(30);
	});
});

describe('computeMetrics', () => {
	it('returns null below the minimum', () => {
		expect(computeMetrics(tinyFixture(), PUB, new Date('2026-08-03T00:00:00.000Z'))).toBe(null);
	});

	it('assembles the whole summary of the deep archive', () => {
		const m = computeMetrics(deep, PUB, new Date('2024-12-31T00:00:00.000Z'));
		expect(m).not.toBe(null);
		expect(m!.totalPosts).toBe(42);
		expect(m!.longestStreak).toBe(30);
		expect(m!.mostLiked?.post.reactions).toBe(8854);
		expect(m!.aggregates.words).toBeGreaterThan(0);
		expect(m!.years.length).toBe(1);
	});
});
