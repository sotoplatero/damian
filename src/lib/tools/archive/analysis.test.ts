import { describe, it, expect } from 'vitest';
import type { ArchivePost } from '$lib/server/substack-archive';
import {
	analyze,
	cadencePhrase,
	formatLift,
	median,
	MIN_POSTS,
	perMonth,
	sectionStats,
	standouts
} from './analysis';

const NOW = new Date('2026-10-21T12:00:00Z');
const CREATED = '2024-01-01T00:00:00Z';
const DAY = 24 * 60 * 60 * 1000;

function post(daysAgo: number, reactions: number, extra: Partial<ArchivePost> = {}): ArchivePost {
	return {
		title: `Post ${daysAgo}`,
		subtitle: '',
		slug: `post-${daysAgo}`,
		date: new Date(NOW.getTime() - daysAgo * DAY).toISOString(),
		audience: 'everyone',
		type: 'newsletter',
		words: 1000,
		reactions,
		comments: 0,
		childComments: 0,
		restacks: 0,
		coverImage: '',
		sectionName: '',
		...extra
	};
}

/** One post a week, `count` of them, ending two weeks ago, all at `likes`. */
function weekly(count: number, likes: (i: number) => number): ArchivePost[] {
	return Array.from({ length: count }, (_, i) => post(14 + i * 7, likes(i)));
}

describe('median', () => {
	it('takes the middle value, or the mean of the two middle ones', () => {
		expect(median([3, 1, 2])).toBe(2);
		expect(median([4, 1, 2, 3])).toBe(2.5);
		expect(median([])).toBe(0);
	});
});

describe('standouts', () => {
	it('finds the post that beat its own neighbours', () => {
		const posts = weekly(20, (i) => (i === 10 ? 200 : 40));
		const { standouts: found } = standouts(posts, CREATED, NOW);
		expect(found).toHaveLength(1);
		expect(found[0].post.slug).toBe(posts[10].slug);
		expect(found[0].lift).toBe(5);
	});

	/**
	 * The reason the ranking is local. An audience that grew tenfold makes every
	 * recent post "the most liked" on raw counts; against its neighbours, only the
	 * post that really stood out in its own year does.
	 */
	it('is not fooled by an audience that grew', () => {
		// Index 0 is the newest. Old posts sit around 10 likes, new ones around 100,
		// and one old post reached 50: five times its moment, half a recent average.
		const posts = weekly(30, (i) => (i < 15 ? 100 : i === 22 ? 50 : 10));
		const { standouts: found } = standouts(posts, CREATED, NOW);
		expect(found.map((s) => s.post.slug)).toContain(posts[22].slug);
		expect(found[0].post.slug).toBe(posts[22].slug);
	});

	it('leaves out posts still collecting likes, and paid ones', () => {
		const posts = [
			post(2, 500),
			post(30, 500, { audience: 'only_paid' }),
			...weekly(20, () => 40)
		];
		const slugs = standouts(posts, CREATED, NOW).standouts.map((s) => s.post.slug);
		expect(slugs).not.toContain('post-2');
		expect(slugs).not.toContain('post-30');
	});

	it('ignores imported posts, whose dates are filler', () => {
		const imported = post(0, 900, { date: '2000-01-01T00:00:00Z', slug: 'imported' });
		const posts = [imported, ...weekly(20, () => 40)];
		expect(standouts(posts, CREATED, NOW).standouts.map((s) => s.post.slug)).not.toContain('imported');
	});

	it('does not call tiny counts a standout', () => {
		const posts = weekly(20, (i) => (i === 5 ? 6 : 1));
		expect(standouts(posts, CREATED, NOW).standouts).toEqual([]);
	});

	it('counts comments and restacks, not only likes', () => {
		const posts = weekly(20, () => 20);
		posts[8] = { ...posts[8], comments: 30, restacks: 20 };
		expect(standouts(posts, CREATED, NOW).standouts[0].interactions).toBe(70);
	});
});

describe('perMonth', () => {
	it('counts the last year', () => {
		// Weekly for two years: about 4.3 a month.
		const posts = Array.from({ length: 104 }, (_, i) => post(i * 7, 10));
		expect(perMonth(posts, CREATED, NOW)).toBeCloseTo(52 / 12, 0);
	});

	it('uses the publication life when it is younger than a year', () => {
		const posts = Array.from({ length: 12 }, (_, i) => post(i * 7, 10));
		const young = new Date(NOW.getTime() - 90 * DAY).toISOString();
		expect(perMonth(posts, young, NOW)!).toBeGreaterThan(3.5);
	});
});

describe('sectionStats', () => {
	it('needs two real sections', () => {
		const one = weekly(6, () => 10).map((p) => ({ ...p, sectionName: 'Ensayos' }));
		expect(sectionStats(one)).toEqual([]);

		const two = [
			...weekly(3, () => 50).map((p) => ({ ...p, sectionName: 'Ensayos' })),
			...weekly(3, () => 10).map((p) => ({ ...p, sectionName: 'Enlaces', slug: `${p.slug}-e` }))
		];
		expect(sectionStats(two).map((s) => s.name)).toEqual(['Ensayos', 'Enlaces']);
	});
});

describe('analyze', () => {
	it('says nothing from the RSS fallback, which carries no figures', () => {
		expect(analyze(weekly(20, () => 40), CREATED, NOW, true)).toBeNull();
	});

	it('says nothing when every figure is zero', () => {
		expect(analyze(weekly(20, () => 0), CREATED, NOW)).toBeNull();
	});

	it('says nothing with too few posts', () => {
		expect(analyze(weekly(MIN_POSTS - 1, () => 40), CREATED, NOW)).toBeNull();
	});

	it('returns an empty ranking, not null, when nothing stands out', () => {
		const result = analyze(weekly(20, () => 40), CREATED, NOW);
		expect(result?.standouts).toEqual([]);
		expect(result?.medianWords).toBe(1000);
	});
});

describe('phrases', () => {
	it('writes Spanish numbers', () => {
		expect(formatLift(3.14)).toBe('×3,1');
		expect(cadencePhrase(4.3)).toBe('unos 4 al mes');
		expect(cadencePhrase(2.4)).toBe('unos 2,5 al mes');
		expect(cadencePhrase(0.6)).toBe('uno al mes o menos');
	});
});
