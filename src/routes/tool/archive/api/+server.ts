import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { slugFromUrl } from '$lib/authors/slug';
import { cacheAudit, readAudit } from '$lib/server/audit-cache';
import { isDisposable } from '$lib/server/email-validation';
import { overLimit, remaining } from '$lib/server/rate-limit';
import { subscribe } from '$lib/server/resend';
import { signPass, verifyPass } from '$lib/server/tokens';
import {
	readFeed,
	readPostBodies,
	readPubInfo,
	walkArchive,
	UnreadableError,
	type ArchivePost,
	type PubInfo
} from '$lib/server/substack-archive';
import { htmlToMarkdown } from '$lib/tools/archive/html';

/**
 * ─────────────────────────────────────────────────────────────────────────
 * THE BROWSER DRIVES THIS, AND THAT IS THE WHOLE DESIGN
 *
 * A body is one request to `/p/{slug}`, so a 1333-post archive is 1333 requests.
 * No serverless function can do that: Vercel's ceiling here is 60 s (its default
 * is **10 s** — measured 8 August 2026, `Task timed out after 10 seconds`).
 *
 * So the work is cut into batches and **the tab is what survives between them**.
 * `start` reads the index once; `batch` returns a slice of post bodies and says
 * how far it got; the page keeps asking until the archive runs out, then builds
 * the zip itself. There is no store in this project and no cron to drive one, and
 * this design needs neither: the thing that accumulates state is the browser.
 *
 * Two earlier shapes, and why they went:
 *
 *   - **One request that did everything.** It fit the clock and not the archive:
 *     the bodies had to be capped, and the cap was guessed off a throttled
 *     Substack (see `readPostBodies`). A complete archive was impossible by
 *     construction.
 *   - **A free step that showed the index first.** There was nothing to show: the
 *     numbers of somebody else's publication are a receipt, not a sample. The
 *     address is asked for in the first form because that is where the price is.
 *
 * MEASURED, 12 August 2026: the walk is 21.5 s for The Honest Broker's 1333 posts
 * (2.4-5.0 s for Kloshletter's 167); post pages come back at **2.9/s sustained,
 * 200 in a row with no 429**, and a 429 clears in about 31 s. So a batch of ~40 s
 * carries roughly a hundred bodies, and the whole Honest Broker takes about a
 * dozen batches — ten minutes with the tab open.
 * ─────────────────────────────────────────────────────────────────────────
 */
export const config = { maxDuration: 60 };

/**
 * When a batch stops fetching, counted from the start of the request.
 *
 * The gap to 60 s is committed, not spare: a request already in flight can still
 * run for 10 s (`get`'s timeout) after the deadline passes, and the response has
 * to be built and sent. `start` gets its own, longer allowance because the walk is
 * one long sequence it cannot interrupt.
 */
const BATCH_DEADLINE_MS = 40_000;

/** Most slugs one batch will take, however many the page offers. */
const BATCH_MAX_SLUGS = 150;

/**
 * How long the pass from `start` is good for.
 *
 * Long enough to read a whole archive without interruption, short enough that a
 * pass found in a log is worthless tomorrow. A visitor who takes longer starts
 * again — and pays the limit again, which is the honest consequence.
 */
const PASS_MAX_AGE_MS = 60 * 60 * 1000;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Snapshot = {
	pub: PubInfo;
	posts: ArchivePost[];
	truncated: boolean;
	fromFeed: boolean;
};

/**
 * The index of a publication, cached.
 *
 * The cache is not an optimisation here, it is what makes the batches cheap: every
 * `batch` call needs the publication's origin, and re-walking 1333 posts for each
 * one would cost more than the bodies. A miss (another instance, or past the TTL)
 * costs one walk and still works, which is why `batch` can rebuild it.
 */
async function snapshotFor(slug: string): Promise<Snapshot> {
	const key = `archive:${slug}`;
	const cached = readAudit<Snapshot>(key);
	if (cached) return cached;

	const pub = await readPubInfo(slug);
	let snapshot: Snapshot;
	try {
		const { posts, truncated } = await walkArchive(pub.origin);
		if (!posts.length) throw new UnreadableError('empty');
		snapshot = { pub, posts, truncated, fromFeed: false };
	} catch (cause) {
		console.error('[tool/archive] archive walk failed, falling back to RSS:', cause);
		// The feed is 20 posts with no figures. Worse than the archive, better than
		// telling somebody the newsletter can't be read.
		snapshot = { pub, posts: await readFeed(pub.origin), truncated: false, fromFeed: true };
	}

	cacheAudit(key, snapshot);
	return snapshot;
}

export const POST: RequestHandler = async ({ request, getClientAddress }) => {
	const started = Date.now();

	let body: Record<string, unknown>;
	try {
		body = await request.json();
	} catch {
		return json({ error: 'bad_request' }, { status: 400 });
	}

	const ip = getClientAddress();

	try {
		if (body.step === 'start') {
			const email = String(body.email ?? '')
				.trim()
				.toLowerCase();
			if (!EMAIL_RE.test(email)) return json({ error: 'invalid_email' }, { status: 400 });
			if (isDisposable(email)) return json({ error: 'disposable' }, { status: 400 });

			/**
			 * PEEKED, NOT COUNTED YET. `overLimit` counts every attempt, which is
			 * right for a limit of fifteen and wrong for a limit of one: a mistyped
			 * address or a Substack timeout would spend somebody's only download and
			 * leave them with nothing. It is committed below, once the archive has
			 * been read and there is something to hand over.
			 */
			if (remaining('archiveExport', email) <= 0) {
				return json({ error: 'already_used' }, { status: 429 });
			}
			if (remaining('archiveExportPerIp', ip) <= 0) {
				return json({ error: 'rate_limit' }, { status: 429 });
			}

			const slug = slugFromUrl(String(body.url ?? ''));
			if (!slug) throw new UnreadableError('invalid_url');

			// Before the subscription, so a newsletter that can't be read doesn't
			// subscribe anybody to anything.
			const snapshot = await snapshotFor(slug);

			// The subscription is the price of the file and the page says so before
			// the field. `subscribe` returns 'exists' for an address already in the
			// audience: asking twice is not an error.
			try {
				await subscribe(email);
			} catch (cause) {
				console.error('[tool/archive] subscribe failed:', cause);
				return json({ error: 'server_error' }, { status: 500 });
			}

			overLimit('archiveExport', email);
			overLimit('archiveExportPerIp', ip);

			return json({
				// The pass is bound to the publication AND the address, so it can't be
				// reused for a different archive.
				pass: signPass(`${slug}|${email}`, Date.now()),
				slug,
				pub: {
					name: snapshot.pub.name,
					authorName: snapshot.pub.authorName,
					origin: snapshot.pub.origin,
					createdAt: snapshot.pub.createdAt
				},
				// The whole index, because the browser writes the CSV and decides which
				// posts are worth a body. ~1300 posts is ~300 KB of JSON, once.
				posts: snapshot.posts,
				truncated: snapshot.truncated,
				fromFeed: snapshot.fromFeed
			});
		}

		if (body.step === 'batch') {
			const slug = String(body.slug ?? '');
			const email = String(body.email ?? '')
				.trim()
				.toLowerCase();
			const pass = String(body.pass ?? '');
			// No pass, no batch: otherwise the expensive half is reachable without
			// ever handing over an address.
			if (!verifyPass(`${slug}|${email}`, pass, PASS_MAX_AGE_MS)) {
				return json({ error: 'pass_expired' }, { status: 401 });
			}

			const wanted = Array.isArray(body.slugs) ? body.slugs : [];
			const slugs = wanted
				.filter((value): value is string => typeof value === 'string' && value.length > 0)
				.slice(0, BATCH_MAX_SLUGS);
			if (!slugs.length) return json({ error: 'bad_request' }, { status: 400 });

			// Only for the origin: the pass says which publication, and the origin has
			// to come from Substack rather than from the request.
			const snapshot = await snapshotFor(slug);

			// The page slows itself down after a refusal and says so here. Bounded
			// inside `readPostBodies`, which is where the floor and the ceiling live.
			const spacing = Number(body.spacing);

			const { bodies, stoppedBy, consumed } = await readPostBodies(
				snapshot.pub.origin,
				slugs,
				started + BATCH_DEADLINE_MS,
				Number.isFinite(spacing) ? spacing : undefined
			);

			const markdown: Record<string, string> = {};
			for (const [postSlug, html] of bodies) {
				const converted = htmlToMarkdown(html);
				if (converted) markdown[postSlug] = converted;
			}

			return json({ markdown, consumed, stoppedBy });
		}

		return json({ error: 'bad_request' }, { status: 400 });
	} catch (cause) {
		if (cause instanceof UnreadableError) {
			return json({ error: 'unreadable', reason: cause.reason }, { status: 422 });
		}
		console.error('[tool/archive] failed:', cause);
		return json({ error: 'server_error' }, { status: 500 });
	}
};
