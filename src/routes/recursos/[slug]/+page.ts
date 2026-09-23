import { error } from '@sveltejs/kit';
import { findResource } from '$lib/resources/list';
import type { PageLoad } from './$types';

/**
 * The resource a URL names, or a 404.
 *
 * A universal load and not a server one on purpose: everything a resource page
 * paints already ships to the browser in `$lib/resources/list.ts` — the home page
 * and the ⌘K palette import the same module — so asking the server for it would
 * buy a round trip and nothing else. The file itself and the email template are
 * the parts that stay on the server, and neither is needed to draw the page.
 */
export const load: PageLoad = ({ params }) => {
	const resource = findResource(params.slug);
	if (!resource) error(404, 'Esa descarga no existe');
	return { resource };
};
