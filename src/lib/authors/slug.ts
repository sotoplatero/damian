/**
 * The card URL's slug, in both directions.
 *
 * `/author/kloshletter` and `/author/honest-broker.com` both need to be able to turn
 * back into an origin that answers, because the page regenerates from the slug alone.
 *
 * WHY THERE ARE TWO ORIGINS AND NOT ONE
 *
 * Measured: `www.honest-broker.com` returns 200 and bare `honest-broker.com` returns
 * **404**. Conversely, `thefp.com` redirects to `www.thefp.com`. So neither stripping
 * the `www` nor always adding it works: both have to be tried, keeping whichever one
 * answers. That's why `originsForSlug` returns a list, and whoever uses it keeps the
 * first one that responds.
 */

const SUBSTACK_SUFFIX = '.substack.com';

/** What can appear in a route segment without surprises. */
const SLUG_RE = /^[a-z0-9]([a-z0-9.-]{0,98}[a-z0-9])?$/;

export function isValidSlug(slug: string): boolean {
	// No `..`: the slug ends up inside a URL and we don't want odd traversals.
	return SLUG_RE.test(slug) && !slug.includes('..');
}

/**
 * From whatever the visitor typed to the canonical slug. `null` if it is not an http URL.
 */
export function slugFromUrl(raw: string): string | null {
	const trimmed = raw.trim().toLowerCase();
	if (!trimmed) return null;

	let url: URL;
	try {
		url = new URL(/^[a-z][a-z0-9+.-]*:\/\//.test(trimmed) ? trimmed : `https://${trimmed}`);
	} catch {
		return null;
	}
	if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;

	const host = url.hostname.replace(/^www\./, '');
	if (!host.includes('.')) return null;

	const slug = host.endsWith(SUBSTACK_SUFFIX) ? host.slice(0, -SUBSTACK_SUFFIX.length) : host;
	return isValidSlug(slug) ? slug : null;
}

/** The origins to try, in order, for a slug. */
export function originsForSlug(slug: string): string[] {
	if (!isValidSlug(slug)) return [];
	if (!slug.includes('.')) return [`https://${slug}${SUBSTACK_SUFFIX}`];
	return [`https://${slug}`, `https://www.${slug}`];
}
