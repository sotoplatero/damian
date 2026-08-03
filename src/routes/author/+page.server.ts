import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { slugFromUrl } from '$lib/authors/slug';

/**
 * The form posts here with `?url=`, and here it becomes the canonical URL.
 *
 * Done on the server so `/author/<slug>` is the only address a card ever has:
 * it is the one that gets shared and the one the CDN caches. Without this there
 * would be two URLs for the same card and only one of them would cache.
 */
export const load: PageServerLoad = async ({ url }) => {
	const raw = url.searchParams.get('url');
	if (!raw) return { invalid: false };

	const slug = slugFromUrl(raw);
	if (!slug) return { invalid: true };
	redirect(303, `/author/${slug}`);
};
