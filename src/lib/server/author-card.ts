import {
	readPubInfo,
	readFollowers,
	walkArchive,
	readFeed,
	UnreadableError,
	type ArchivePost,
	type PubInfo
} from './substack-archive';
import { computeMetrics, ownPosts } from '$lib/authors/metrics';
import { linesFor } from '$lib/authors/lines';
import { readCard, writeCard, type AuthorCard } from './author-cache';

/**
 * Builds an author's card, or explains why it can't.
 *
 * Lives here and not inside a route because two routes need exactly this: the
 * page and the PNG. Keeping it in one place is also what keeps the two from
 * disagreeing — a card and its image built by different code would eventually
 * show different numbers.
 */

/** Why a card could not be built. Each maps to a line of copy in `author.md`. */
export type CardFailure =
	| { error: 'not_substack' }
	| { error: 'not_found' }
	| { error: 'blocked' }
	| { error: 'rate_limit' }
	/** The publication exists but has too little archive to say anything. */
	| { error: 'too_new'; posts: number };

export type CardResult = { card: AuthorCard } | CardFailure;

export function isFailure(result: CardResult): result is CardFailure {
	return 'error' in result;
}

/** Walks the archive and, if it won't allow that, falls back to RSS. */
async function collect(
	pub: PubInfo
): Promise<{ posts: ArchivePost[]; source: 'archive' | 'feed'; truncated: boolean }> {
	try {
		const { posts, truncated } = await walkArchive(pub.origin);
		if (posts.length) return { posts, source: 'archive', truncated };
	} catch (cause) {
		console.error('[author] archive walk failed, falling back to RSS:', cause);
	}
	// RSS brings 20 posts and no likes, no comments and no audience. It is worse,
	// but it beats failing outright.
	const posts = await readFeed(pub.origin);
	return { posts, source: 'feed', truncated: false };
}

/** Maps an `UnreadableError` reason onto the failure the page knows how to say. */
function failureFor(cause: unknown): CardFailure {
	const reason = cause instanceof UnreadableError ? cause.reason : 'blocked';
	if (reason === 'not_found') return { error: 'not_found' };
	if (reason === 'timeout' || reason === 'blocked') return { error: 'blocked' };
	// `invalid_url` and `empty` both mean the same thing to a visitor: whatever
	// they pasted is not a live Substack.
	return { error: 'not_substack' };
}

/**
 * The card for a slug, from cache when possible.
 *
 * `now` is a parameter so the streak's "is it still alive?" question has one
 * answer per request rather than one per call site.
 */
export async function buildCard(slug: string, now = new Date()): Promise<CardResult> {
	const cached = readCard(slug);
	if (cached) return { card: cached };

	let pub: PubInfo;
	try {
		pub = await readPubInfo(slug);
	} catch (cause) {
		return failureFor(cause);
	}

	let collected;
	let followers: number | null = null;
	try {
		// The profile ride-along costs one request against the walk's ~29 and
		// never rejects: a card is never lost over a nicety.
		[collected, followers] = await Promise.all([
			collect(pub),
			pub.authorHandle ? readFollowers(pub.authorHandle) : Promise.resolve(null)
		]);
	} catch (cause) {
		return failureFor(cause);
	}

	const metrics = computeMetrics(collected.posts, pub, now);
	if (!metrics) return { error: 'too_new', posts: ownPosts(collected.posts).length };

	const card: AuthorCard = {
		metrics,
		lines: linesFor(metrics),
		source: collected.source,
		truncated: collected.truncated,
		importedCount: metrics.totalOwnPosts - metrics.totalPosts,
		followers
	};
	writeCard(slug, card);
	return { card };
}
