import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

/**
 * The postcard tool was removed in October 2026. Its addresses are printed on
 * every postcard already shared, so they land on the home page instead of a
 * 404. Same reasoning, and the same 307, as `src/routes/author/[...rest]`.
 */
export const GET: RequestHandler = () => {
	redirect(307, '/');
};
