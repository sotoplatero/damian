import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { decodeTool } from '$lib/server/actionable-link';

/**
 * A generated tool, rendered from its link.
 *
 * The whole tool arrives in the URL, signed. Nothing is looked up, which is what
 * makes a shared link work months later on an instance that has never seen it.
 *
 * A bad signature is a 404 and not a 403: a forged link doesn't get told it was
 * close.
 */
export const load: PageServerLoad = ({ params }) => {
	const spec = decodeTool(params.token);
	if (!spec) error(404, 'Esa herramienta no existe');
	return { spec };
};
