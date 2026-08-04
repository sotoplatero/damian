import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { isValidSlug } from '$lib/authors/slug';
import { overLimit } from '$lib/server/rate-limit';
import { buildCard, isFailure } from '$lib/server/author-card';

/**
 * The card, built on the server in one go.
 *
 * The whole walk happens here rather than being streamed to the browser. A deep
 * archive takes about 20 s the first time (measured: 1330 posts in 29 requests),
 * and what makes that acceptable is `s-maxage` below: afterwards the CDN serves
 * the page without waking the function, so the link Damian shares opens
 * instantly for whoever receives it.
 *
 * Everything is flattened into plain fields here. The page must not import from
 * `$lib/server` — SvelteKit rejects that, and rightly so — so the failure
 * arrives as a string it can switch on rather than as a typed union it would
 * have to import a helper to narrow.
 */

export const load: PageServerLoad = async ({ params, setHeaders, getClientAddress }) => {
	// Slugs are always lowercase (see `slugFromUrl`), so a hand-typed
	// /author/Kloshletter would fail on a publication that exists. Redirect to the
	// canonical form instead of erroring on a URL that is merely capitalised.
	const slug = params.author.toLowerCase();
	if (slug !== params.author) redirect(308, `/author/${slug}`);

	if (!isValidSlug(slug)) {
		return { slug, card: null, failure: 'not_substack', tooNewPosts: 0 };
	}

	// Keyed by IP, because this tool asks for no email. It protects Substack's
	// servers, not our bill: there is no model call and no mail here.
	if (overLimit('authorCard', getClientAddress())) {
		return { slug, card: null, failure: 'rate_limit', tooNewPosts: 0 };
	}

	const result = await buildCard(slug);

	if (isFailure(result)) {
		return {
			slug,
			card: null,
			failure: result.error,
			tooNewPosts: result.error === 'too_new' ? result.posts : 0
		};
	}

	// Only cache what worked. Caching a failure would pin a transient block for a
	// whole day onto a publication that is fine.
	setHeaders({ 'cache-control': 'public, max-age=0, s-maxage=86400' });

	return { slug, card: result.card, failure: null, tooNewPosts: 0 };
};
