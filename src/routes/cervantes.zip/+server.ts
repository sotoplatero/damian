import { redirect } from '@sveltejs/kit';
import { CERVANTES_RELEASE_URL } from '$lib/resources/cervantes';

/*
 * Cervantes used to be `static/cervantes.zip`, and delivery emails already sent
 * link to this address. It now lives in the GitHub release, so this redirects
 * there. 302, not 308: the target is "whatever is latest", never a fixed file.
 */
export const GET = () => redirect(302, CERVANTES_RELEASE_URL);
