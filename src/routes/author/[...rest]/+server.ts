import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

/**
 * /author became /postcard in August 2026, and the postcard tool was removed in
 * October 2026. Every card shared before then prints one of those addresses, so
 * they land on the home page instead of a 404. 307, not 308: a permanent
 * redirect is cached by browsers, and the address may get a tool again.
 */
export const GET: RequestHandler = () => {
	redirect(307, '/');
};
