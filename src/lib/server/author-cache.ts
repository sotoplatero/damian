import type { Metrics } from '$lib/authors/metrics';

/**
 * An author's already-computed card, held in memory.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * WHY THIS IS A MODULE AND NOT A `Map` INSIDE A ROUTE
 *
 * Several routes use it: the postcard page and its four images
 * (`/postcard/<slug>/<variant>.png`).
 * Both run in the same process, so a module-level `Map` is shared between them.
 *
 * With a `Map` inside each route, viewing a card and then downloading it would
 * mean **two full walks of the archive**: 58 requests to someone else's server
 * instead of 29, for a single card. That is exactly what we don't want to do to
 * anybody.
 *
 * This is process memory, so it is PER INSTANCE and lost on deploy, same as the
 * counter in `rate-limit.ts`. What holds up a shared link is the CDN's
 * `s-maxage`; this only avoids repeated work inside a warm instance.
 * ─────────────────────────────────────────────────────────────────────────
 */

export type AuthorCard = {
	metrics: Metrics;
	/** Where the numbers came from. `feed` means the reduced set. */
	source: 'archive' | 'feed';
	/** True when the walk hit its page cap, so this isn't the whole archive. */
	truncated: boolean;
	/** Their own posts with an unusable date. It gets said, not hidden. */
	importedCount: number;
	/** The author's follower count from their public profile; null when unreadable. */
	followers: number | null;
};

const CACHE_MS = 12 * 60 * 60 * 1000;
const cards = new Map<string, { at: number; card: AuthorCard }>();

export function readCard(slug: string): AuthorCard | null {
	const hit = cards.get(slug);
	if (!hit) return null;
	if (Date.now() - hit.at > CACHE_MS) {
		cards.delete(slug);
		return null;
	}
	return hit.card;
}

export function writeCard(slug: string, card: AuthorCard): void {
	// Lazy pruning: without this the Map grows for as long as the instance lives.
	if (cards.size > 500) {
		const now = Date.now();
		for (const [key, hit] of cards) {
			if (now - hit.at > CACHE_MS) cards.delete(key);
		}
	}
	cards.set(slug, { at: Date.now(), card });
}
