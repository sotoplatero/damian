/**
 * Objeto Brillante's own addresses on Substack.
 *
 * It is a module and not three literals because three is what it had become: the
 * footer's link in `+layout.svelte`, the embed's `src` on the home page, and now
 * the hero's form. A publication that moves — a custom domain, a rename — has to
 * move in one place.
 *
 * NOT to be confused with `$lib/server/newsletter.ts` or `$lib/server/substack.ts`.
 * Those two read OTHER people's publications for `/tool/newsletter` and
 * `/postcard`. This one is ours, and it holds no logic beyond a URL.
 */
export const PUBLICATION_URL = 'https://sotoplatero.substack.com';

/** The embedded signup form at the foot of the letter. */
export const PUBLICATION_EMBED_URL = `${PUBLICATION_URL}/embed`;

/**
 * Substack's own subscribe page, with the address already filled in.
 *
 * THIS IS NAVIGATION, NOT AN API CALL, and the distinction is the whole reason it
 * is allowed to exist: Substack's subscribe endpoint sits behind Cloudflare and
 * answers anything that isn't a real browser with a challenge, so the server can
 * never sign anybody up (that is written down in CLAUDE.md, and it was tried).
 * Sending the visitor's own browser to Substack's page has none of that problem —
 * it is a link.
 *
 * MEASURED on the live publication, 2 September 2026: `?email=` arrives prefilled
 * in the `email` field of that page, so somebody who types their address in the
 * hero types it once and confirms on Substack. If Substack ever stops honouring
 * the parameter the page still works and still subscribes — they just retype.
 * That is the reason this is a plain query string and not a POST: the worst
 * failure is one retype, not a dead form.
 */
export function subscribeUrl(email: string): string {
	const address = email.trim();
	if (!address) return `${PUBLICATION_URL}/subscribe`;
	return `${PUBLICATION_URL}/subscribe?email=${encodeURIComponent(address)}`;
}
