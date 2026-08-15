import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { isDisposable } from '$lib/server/email-validation';
import { overLimit } from '$lib/server/rate-limit';
import { sendAuthorAnalysisEmail, subscribe } from '$lib/server/resend';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * The delivery of `/recursos/analisis-de-autor`: an address in, the download
 * link out by email. Same shape as `/recursos/cervantes/api` — a resource is a
 * file, so the only thing that differs between two of them is which sender gets
 * called.
 *
 * It is the gated half of a tool with the tool removed — nothing is scraped, no
 * model is called, nothing is shown on screen. So it reuses `toolDelivery`
 * rather than naming a limit of its own: three a day per address and ten per IP
 * is exactly what this asks for, and a second name holding the same numbers is
 * one more place to keep in sync.
 *
 * The error codes are the ones the other tools speak, so the page maps them to
 * its copy through `$lib/tools/client.ts` without a special case.
 */
export const POST: RequestHandler = async ({ request, url, getClientAddress }) => {
	let body: Record<string, unknown>;
	try {
		body = await request.json();
	} catch {
		return json({ error: 'bad_request' }, { status: 400 });
	}

	const email = String(body.email ?? '').trim().toLowerCase();
	if (!EMAIL_RE.test(email)) return json({ error: 'invalid_email' }, { status: 400 });
	if (isDisposable(email)) return json({ error: 'disposable' }, { status: 400 });

	const ip = getClientAddress();
	if (overLimit('toolDelivery', email) || overLimit('toolDeliveryPerIp', ip)) {
		return json({ error: 'rate_limit' }, { status: 429 });
	}

	// The subscription is the price of the download and the page says so, so it
	// happens first: if it fails, nobody gets the file. `subscribe` already
	// returns 'exists' for an address that was in the audience — asking twice is
	// not an error.
	try {
		await subscribe(email);
	} catch (error) {
		console.error('[recursos/analisis-de-autor] subscribe failed:', error);
		return json({ error: 'server_error' }, { status: 500 });
	}

	try {
		await sendAuthorAnalysisEmail(email, url.origin);
	} catch (error) {
		console.error('[recursos/analisis-de-autor] delivery failed:', error);
		return json({ error: 'send_failed' }, { status: 502 });
	}

	return json({ ok: true });
};
