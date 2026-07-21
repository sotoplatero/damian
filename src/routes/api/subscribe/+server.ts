import { json, type RequestHandler } from '@sveltejs/kit';
import { subscribe, sendSequenceEmail } from '$lib/server/resend';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const POST: RequestHandler = async ({ request }) => {
	let email = '';
	try {
		const body = await request.json();
		email = String(body?.email ?? '')
			.trim()
			.toLowerCase();
	} catch {
		return json({ error: 'bad_request' }, { status: 400 });
	}

	if (!EMAIL_RE.test(email)) {
		return json({ error: 'invalid_email' }, { status: 400 });
	}

	try {
		const result = await subscribe(email);
		// Only send the welcome email (index 0) on a fresh signup; the daily
		// cron handles the rest. Re-subscribers don't get spammed with the list again.
		if (result === 'created') {
			await sendSequenceEmail(email, 0);
		}
		return json({ ok: true });
	} catch (error) {
		console.error('[subscribe] failed:', error);
		return json({ error: 'server_error' }, { status: 500 });
	}
};
