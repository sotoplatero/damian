import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

/**
 * /author moved to /postcard in August 2026, when the handoff postcards
 * replaced the old square card. The footer of every card shared before then
 * prints a damiansoto.me/author/... address, so those links must keep landing.
 */
export const GET: RequestHandler = ({ params }) => {
	redirect(308, params.rest ? `/postcard/${params.rest}` : '/postcard');
};
