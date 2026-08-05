/**
 * A post as `/api/v1/archive` returns it, already reduced to what's used.
 *
 * The counted fields are MEASURED as present in 868/868, 128/128 and 167/167
 * posts of three real publications, so they are not optional. The ones that
 * can be missing (`subtitle`, `sectionName`, `coverImage`) carry their empty
 * value.
 */
export type ArchivePost = {
	title: string;
	subtitle: string;
	slug: string;
	/** Full ISO, with time. The time is used: it's a card datum. */
	date: string;
	/** 'everyone' is free; 'only_paid' and the rest are paid. */
	audience: string;
	/** 'newsletter' | 'podcast' | 'restack'. A restack is another person's post. */
	type: string;
	words: number;
	reactions: number;
	comments: number;
	/** Replies inside threads. Adds up separately from `comments`. */
	childComments: number;
	/**
	 * How many times the post was restacked.
	 *
	 * **This is a NUMBER, not an array.** An earlier pass read it with
	 * `Array.isArray(p.restacks) ? p.restacks.length : 0`, got 0 on every post,
	 * and concluded the field was dead. It isn't: measured 33 on a single Honest
	 * Broker post. The array-shaped siblings (`restacked_post_id`,
	 * `restacked_pub_name`) are what describe a post that IS a restack of someone
	 * else's — different thing entirely.
	 */
	restacks: number;
	/**
	 * The post's cover image URL, empty when it has none. Measured present in
	 * 1062 of 1330 posts, so a card built on it must tolerate the gap.
	 */
	coverImage: string;
	sectionName: string;
};

import { get, readBody, decode, preloads, UnreadableError } from './substack';
import { originsForSlug } from '$lib/authors/slug';

export { UnreadableError };

/**
 * A publication's whole archive, and the fallback for when it won't cooperate.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * WHAT WAS MEASURED BEFORE WRITING THIS (3 August 2026)
 *
 *  - The maximum `limit` is **50**. With 100 it answers 400 "Invalid value".
 *  - **`offset=0` returns at most 23 posts**, no matter what limit is asked
 *    for. With `offset=1` it returns 50. Happens identically on three
 *    different publications, so it's platform behaviour, not one site's.
 *    This is why the walk advances with `offset += received.length` and NOT
 *    `offset += PAGE_SIZE`: advancing by 50 skips 27 posts on the first lap,
 *    with no error and nothing to notice.
 *  - The archive really does reach the end: 1330 posts in 29 requests on
 *    www.honest-broker.com, with no duplicate.
 * ─────────────────────────────────────────────────────────────────────────
 */

/** The maximum the endpoint accepts. More than this returns 400. */
export const PAGE_SIZE = 50;
/**
 * Cap on requests per publication. The deepest archive measured spent 29, so
 * there's plenty of margin; this only exists to stop a huge archive from
 * hanging the function. If it's ever touched, the card MUST say so instead
 * of pretending that's the whole archive.
 */
export const MAX_PAGES = 50;
/**
 * Wait between pages. This is someone else's server and it didn't ask for
 * this: sequential and spaced out. In parallel it would be faster and it
 * would be hammering it.
 */
export const SPACING_MS = 300;

export type PubInfo = {
	/** The origin that actually answered. */
	origin: string;
	name: string;
	authorName: string;
	/**
	 * The trustworthy date. `first_post_date` LIES: measured `2000-01-01` on
	 * The Honest Broker and `2011-06-28` on liderar, both imported archives.
	 */
	createdAt: string;
	language: string;
	/**
	 * Subscribers, **only if the publication shows them on its homepage**.
	 *
	 * `freeSubscriberCount` arrives in the payload whether it is displayed or
	 * not, and the setting that decides that does NOT come through as a key (see
	 * the comment in `newsletter.ts`). So it isn't read from the payload alone:
	 * we check whether the number is rendered in the homepage's visible text,
	 * which is the only proof its author wants it seen.
	 *
	 * Measured: the three reference publications render it as "Over 7,000
	 * subscribers", "Over 297,000 subscribers" and "Over 2,000 subscribers", so
	 * the positive case is confirmed 3 out of 3. When it isn't found this is
	 * `null` and the card says **nothing** about subscribers — no number, no
	 * vague label, no "not available".
	 */
	subscriberCount: number | null;
	/**
	 * The subscriber magnitude Substack itself publishes («7.7K+», or a plain
	 * «81» for small lists), shown only when the author allows it.
	 * `hide_subscriber_count` is the explicit setting — it started coming
	 * through in 2026, after `subscriberCount`'s rendered-text heuristic was
	 * built, and it lives in `root.siteConfigs`, NOT in `root.pub` (measured on
	 * sotoplatero and kloshletter: absent from `pub` on both). When the key is
	 * present it is the author's word and it wins; when absent, the old
	 * heuristic decides.
	 */
	subscriberMagnitude: string | null;
	logoUrl: string | null;
	/** The author's own photo, distinct from the publication logo. */
	authorPhotoUrl: string | null;
	/** The author's profile handle, for `readFollowers`. */
	authorHandle: string | null;
	/** The publication's own one-line pitch. Substack calls it `hero_text`. */
	tagline: string;
	/**
	 * The publication's accent colour, used to tint the profile banner.
	 *
	 * This is here INSTEAD of `cover_photo_url`, which was tried and dropped:
	 * measured, that URL **403s** — it lives on Substack's private bucketeer
	 * bucket and cannot be linked from outside — and it is a 512x512 square, not
	 * a banner shape. A tinted wash never breaks and still makes each profile
	 * look like its own publication.
	 *
	 * `#FF6719` is Substack's factory orange, so it means "never chose one".
	 */
	brandColor: string | null;
	paymentsEnabled: boolean;
};

function text(value: unknown): string {
	return typeof value === 'string' ? value : '';
}

/** Substack gives subscriber counts already formatted ("297,000"). */
function count(value: unknown): number | null {
	if (typeof value === 'number') return Number.isFinite(value) ? value : null;
	if (typeof value !== 'string') return null;
	const digits = value.replace(/[^\d]/g, '');
	return digits ? Number(digits) : null;
}

/** The text actually visible on the homepage, without scripts or tags. */
function visibleText(html: string): string {
	return html
		.replace(/<script[\s\S]*?<\/script>/gi, ' ')
		.replace(/<style[\s\S]*?<\/style>/gi, ' ')
		.replace(/<[^>]+>/g, ' ')
		.replace(/&nbsp;/g, ' ')
		.replace(/\s+/g, ' ');
}

/**
 * The subscriber count, only if the publication displays it.
 *
 * The payload carries the number whether it is visible or not, so the only
 * proof its author wants it seen is that it is written on the homepage. We look
 * for the shapes Substack writes it in: as it arrives ("7,000"), without the
 * separator ("7000"), and abbreviated ("7K", "7.0K").
 *
 * Measured: the three reference publications render it as "Over N subscribers",
 * so the positive case is confirmed 3 out of 3. No publication that hides it was
 * found, so the negative branch is not verified against reality — this is a
 * direct check rather than an inference, but that gap is worth knowing.
 */
/** See `PubInfo.subscriberMagnitude`: the author's setting first, the heuristic as fallback. */
function subscriberMagnitude(
	root: Record<string, unknown>,
	pub: Record<string, unknown>,
	html: string
): string | null {
	const magnitude = text(pub.freeSubscriberCountOrderOfMagnitude) || null;
	if (!magnitude) return null;
	// The setting lives in siteConfigs; pub is checked second in case Substack
	// ever moves it there.
	const configs = root.siteConfigs as Record<string, unknown> | undefined;
	const hide = configs?.hide_subscriber_count ?? pub.hide_subscriber_count;
	if (hide === true) return null;
	if (hide === false) return magnitude;
	return shownSubscriberCount(html, pub.freeSubscriberCount) !== null ? magnitude : null;
}

function shownSubscriberCount(html: string, raw: unknown): number | null {
	const parsed = count(raw);
	if (parsed === null) return null;
	const text = visibleText(html);
	const forms = [
		typeof raw === 'string' ? raw : '',
		String(parsed),
		parsed.toLocaleString('en-US'),
		parsed >= 1000 ? `${Math.floor(parsed / 1000)}K` : '',
		parsed >= 1000 ? `${(parsed / 1000).toFixed(1)}K` : ''
	].filter(Boolean);
	return forms.some((form) => text.includes(form)) ? parsed : null;
}

function readArchivePost(raw: unknown): ArchivePost | null {
	if (!raw || typeof raw !== 'object') return null;
	const p = raw as Record<string, unknown>;
	const title = text(p.title);
	if (!title) return null;
	const n = (value: unknown) => (typeof value === 'number' && Number.isFinite(value) ? value : 0);
	return {
		title,
		subtitle: text(p.subtitle),
		slug: text(p.slug),
		date: text(p.post_date),
		audience: text(p.audience) || 'everyone',
		type: text(p.type) || 'newsletter',
		words: n(p.wordcount),
		reactions: n(p.reaction_count),
		comments: n(p.comment_count),
		childComments: n(p.child_comment_count),
		restacks: n(p.restacks),
		coverImage: text(p.cover_image),
		sectionName: text(p.section_name)
	};
}

/**
 * The publication's metadata: a single, cheap request.
 *
 * Kept apart from the walk on purpose. The page needs the name and author to
 * paint the header and the `og:` tags RIGHT AWAY, without waiting the 20 s a
 * deep archive can take. A social-media crawler never sticks around to pay
 * for the walk.
 *
 * Tries the origins `originsForSlug` gives and keeps the first that answers:
 * measured, bare `honest-broker.com` returns 404 and only
 * `www.honest-broker.com` answers.
 */
/**
 * The author's follower count, from their public profile
 * (substack.com/@handle). Person-level and always public — there is no hide
 * setting to respect, unlike subscribers. Any failure returns null: a card
 * must never fail over a nicety.
 */
export async function readFollowers(handle: string): Promise<number | null> {
	try {
		const url = new URL(
			`https://substack.com/api/v1/user/${encodeURIComponent(handle)}/public_profile`
		);
		const response = await get(url, 'application/json');
		const profile = JSON.parse(await readBody(response)) as { followerCount?: unknown };
		return typeof profile.followerCount === 'number' && Number.isFinite(profile.followerCount)
			? profile.followerCount
			: null;
	} catch {
		return null;
	}
}

export async function readPubInfo(slug: string): Promise<PubInfo> {
	const candidates = originsForSlug(slug);
	if (!candidates.length) throw new UnreadableError('invalid_url');

	let lastError: unknown = null;
	for (const origin of candidates) {
		let html: string;
		try {
			const response = await get(new URL(origin), 'text/html');
			if (response.status === 404) {
				lastError = new UnreadableError('not_found');
				continue;
			}
			if (!response.ok) {
				lastError = new UnreadableError('blocked');
				continue;
			}
			html = await readBody(response);
		} catch (error) {
			lastError = error;
			continue;
		}

		const root = preloads(html);
		const pub = (root.pub ?? {}) as Record<string, unknown>;
		// No publication object means it's not a Substack. Measured:
		// platformer.news answers 200 and carries no `pub`.
		if (!pub.name) {
			lastError = new UnreadableError('empty');
			continue;
		}

		return {
			// The effective origin, which may not be the one requested because of a 301.
			origin: origin.replace(/\/$/, ''),
			name: decode(text(pub.name)).trim(),
			authorName: decode(text(pub.author_name)).trim(),
			createdAt: text(pub.created_at),
			language: text(pub.language) || 'es',
			// Only if it's rendered on the homepage. See `shownSubscriberCount`.
			subscriberCount: shownSubscriberCount(html, pub.freeSubscriberCount),
			subscriberMagnitude: subscriberMagnitude(root, pub, html),
			logoUrl: text(pub.logo_url) || null,
			authorPhotoUrl: text(pub.author_photo_url) || null,
			authorHandle: text(pub.author_handle) || null,
			tagline: decode(text(pub.hero_text)).trim(),
			brandColor: text(pub.theme_var_background_pop) || null,
			paymentsEnabled: text(pub.payments_state) === 'enabled'
		};
	}
	throw lastError instanceof UnreadableError ? lastError : new UnreadableError('blocked');
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Walks the archive until it runs dry. */
export async function walkArchive(
	origin: string,
	/**
	 * Wait between pages. This is a parameter and not a fixed constant ONLY so
	 * tests can pass 0: the test that checks the 50-page cap would otherwise
	 * sleep 49 × 300 ms = almost 15 s and blow past vitest's timeout. In
	 * production it's never passed: the default above is used.
	 */
	spacingMs = SPACING_MS
): Promise<{ posts: ArchivePost[]; truncated: boolean }> {
	const posts: ArchivePost[] = [];
	const seen = new Set<string>();
	let offset = 0;

	for (let page = 0; page < MAX_PAGES; page++) {
		if (page > 0) await sleep(spacingMs);

		const url = new URL('/api/v1/archive', origin);
		url.searchParams.set('sort', 'new');
		url.searchParams.set('limit', String(PAGE_SIZE));
		url.searchParams.set('offset', String(offset));

		const response = await get(url, 'application/json');
		if (!response.ok) throw new UnreadableError('blocked');

		let batch: unknown;
		try {
			batch = JSON.parse(await readBody(response));
		} catch {
			throw new UnreadableError('blocked');
		}
		// When an invalid `limit` is passed it answers an object with `errors`.
		if (!Array.isArray(batch)) throw new UnreadableError('blocked');
		if (batch.length === 0) return { posts, truncated: false };

		for (const raw of batch) {
			const post = readArchivePost(raw);
			if (!post) continue;
			// A post with no slug can't be linked to, but it would still be
			// deduped on `''` like any other slug. Two distinct slug-less posts
			// would then look identical to `seen` and the second would be
			// dropped as a silent "duplicate" — the same silent-skip failure
			// mode this whole module exists to avoid for pagination. Drop a
			// slug-less post outright instead of letting it collide with another.
			if (!post.slug || seen.has(post.slug)) continue;
			seen.add(post.slug);
			posts.push(post);
		}

		// By what was received, not by PAGE_SIZE. See the header comment.
		offset += batch.length;
	}

	return { posts, truncated: true };
}

/**
 * The fallback: RSS.
 *
 * Brings 20 items and only `title`, `description`, `link`, `pubDate` and
 * `dc:creator`. **No likes, no comments, no free/paid, no word count.**
 * Checked by looking for those fields across the whole feed. What it
 * doesn't carry stays at zero and the metrics that depend on it don't show;
 * nothing is estimated.
 */
export async function readFeed(origin: string): Promise<ArchivePost[]> {
	const response = await get(new URL('/feed', origin), 'application/rss+xml');
	if (!response.ok) throw new UnreadableError('blocked');
	const xml = await readBody(response);

	const cdata = (value: string) =>
		decode(value.replace(/^<!\[CDATA\[/, '').replace(/\]\]>$/, '')).trim();
	const tag = (chunk: string, name: string) => {
		const match = chunk.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`));
		return match ? cdata(match[1]) : '';
	};

	const posts: ArchivePost[] = [];
	for (const chunk of xml.split('<item>').slice(1)) {
		// `content:encoded` carries the whole body and swallows any regex.
		const head = chunk.split('<content:encoded>')[0];
		const title = tag(head, 'title');
		const pubDate = tag(head, 'pubDate');
		const parsed = pubDate ? new Date(pubDate) : null;
		if (!title || !parsed || Number.isNaN(parsed.getTime())) continue;

		posts.push({
			title,
			subtitle: tag(head, 'description'),
			slug: tag(head, 'link').split('/p/')[1]?.split(/[?#]/)[0] ?? '',
			date: parsed.toISOString(),
			audience: 'everyone',
			type: 'newsletter',
			words: 0,
			reactions: 0,
			comments: 0,
			childComments: 0,
			restacks: 0,
			// The feed does carry an <enclosure> image, but it is the publication's
			// logo on every item, not the post's own cover. Using it would put the
			// same picture on every card and look like a bug.
			coverImage: '',
			sectionName: ''
		});
	}
	if (!posts.length) throw new UnreadableError('empty');
	return posts;
}
