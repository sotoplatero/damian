import type { ArchivePost } from '$lib/server/substack-archive';

/**
 * Fixtures for the metrics tests.
 *
 * These are not real dumps: they are minimal archives that carry the
 * MEASURED TRAPS found in real publications, which is the only thing that
 * needs testing.
 *
 *   - posts dated before `created_at` (imported archive)
 *   - a post dated exactly 2000-01-01, like the 435 from The Honest Broker
 *   - a `restack`, which is another person's post
 *   - a `podcast`, which IS their own work
 *   - a mix of `everyone` and `only_paid`
 *   - a run of consecutive weeks and a gap in the middle
 */

function post(over: Partial<ArchivePost> & { date: string }): ArchivePost {
	return {
		title: 'Un título cualquiera',
		subtitle: '',
		slug: 'slug-' + over.date.slice(0, 10),
		audience: 'everyone',
		type: 'newsletter',
		words: 1000,
		reactions: 10,
		comments: 2,
		childComments: 1,
		restacks: 1,
		coverImage: '',
		sectionName: '',
		...over
	};
}

/** Mondays of consecutive ISO weeks starting from a date. */
function weekly(startISO: string, count: number, over: Partial<ArchivePost> = {}): ArchivePost[] {
	const start = new Date(startISO).getTime();
	return Array.from({ length: count }, (_, i) =>
		post({ ...over, date: new Date(start + i * 7 * 86400000).toISOString() })
	);
}

/** `created_at` of the deep archive. Everything before it is import. */
export const DEEP_CREATED_AT = '2024-01-01T00:00:00.000Z';

/**
 * Deep archive: 30 consecutive weeks from January 2024, a 3-week gap,
 * another 10 consecutive weeks, and imported junk up front.
 */
export function deepFixture(): ArchivePost[] {
	return [
		// Import: impossible date, like Gioia's 435 posts.
		post({ date: '2000-01-01T17:00:00.000Z', title: 'Reseña importada', reactions: 3, words: 500 }),
		// Import with a plausible date but before created_at.
		post({ date: '2011-06-28T23:11:55.000Z', title: 'Otro importado', reactions: 1, words: 400 }),
		// Another person's post. Doesn't count as theirs for anything.
		post({ date: '2024-03-04T10:00:00.000Z', type: 'restack', title: 'Post ajeno', reactions: 9999 }),
		// 30 consecutive weeks, all at 06:00 UTC on a Monday.
		...weekly('2024-01-01T06:00:00.000Z', 30, { words: 2000 }),
		// Gap: the next one falls 3 weeks after the last.
		...weekly('2024-08-19T06:00:00.000Z', 10, { words: 2000, audience: 'only_paid' }),
		// The ceiling for likes and comments, and the longest post.
		// Falls on a Wednesday and not a Monday so it doesn't clash on slug
		// with the weekly series, which starts on Mondays: it lands in the
		// same ISO week, so it doesn't break any streak.
		post({
			date: '2024-05-08T06:00:00.000Z',
			title: 'El techo de la casa',
			words: 9000,
			reactions: 8854,
			comments: 1246,
			childComments: 500
		}),
		// A podcast: it's their own work, it counts. Wednesday for the same reason.
		post({ date: '2024-06-05T06:00:00.000Z', type: 'podcast', title: 'Episodio uno', words: 300 })
	];
}

/** Young publication: 6 weeks, no traps. For the low thresholds. */
export function youngFixture(): ArchivePost[] {
	return weekly('2026-06-01T05:00:00.000Z', 6);
}

/** Below the minimum: there's no card to make. */
export function tinyFixture(): ArchivePost[] {
	return weekly('2026-07-06T05:00:00.000Z', 3);
}
