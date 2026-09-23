import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { isDisposable } from '$lib/server/email-validation';
import { overLimit } from '$lib/server/rate-limit';
import { findResource } from '$lib/resources/list';
import { hasResourceDelivery, sendResourceEmail, subscribe } from '$lib/server/resend';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * The delivery of every `/recursos/*` download: an address in, the download link
 * out by email.
 *
 * It is the gated half of a tool with the tool removed — nothing is scraped, no
 * model is called, nothing is shown on screen. So it reuses `toolDelivery` rather
 * than naming a limit of its own: three a day per address and ten per IP is
 * exactly what this asks for, and a second name holding the same numbers is one
 * more place to keep in sync.
 *
 * ONE ENDPOINT FOR ALL OF THEM. This was two files before, and the second one's
 * header comment already admitted the situation: «the only thing that differs
 * between two of them is which sender gets called». Which sender is now a lookup
 * by slug, so the checks in here — the address, the disposable-mailbox test, the
 * limit, and the order of subscribe-then-send — exist once. That order is the
 * part worth having once: get it wrong on one resource and that resource ships
 * files to people who never joined the list.
 *
 * The error codes are the ones the other tools speak, so the page maps them to
 * its copy through `$lib/tools/client.ts` without a special case.
 */
export const POST: RequestHandler = async ({ params, request, url, getClientAddress }) => {
	/*
	 * A slug that is not a resource is a 404, and a resource with no delivery
	 * wired up is a 500 that says so in the log. The second case cannot happen
	 * from the outside — it means somebody added an entry to the list and no
	 * template beside it — and it is checked here rather than trusted, because the
	 * failure is otherwise silent: the page would say «va para tu correo» and
	 * nothing would ever arrive.
	 */
	const resource = findResource(params.slug);
	if (!resource) return json({ error: 'not_found' }, { status: 404 });
	if (!hasResourceDelivery(resource.slug)) {
		console.error(`[recursos/${resource.slug}] no delivery configured for this slug`);
		return json({ error: 'server_error' }, { status: 500 });
	}

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
		console.error(`[recursos/${resource.slug}] subscribe failed:`, error);
		return json({ error: 'server_error' }, { status: 500 });
	}

	try {
		await sendResourceEmail(resource.slug, email, url.origin);
	} catch (error) {
		console.error(`[recursos/${resource.slug}] delivery failed:`, error);
		return json({ error: 'send_failed' }, { status: 502 });
	}

	return json({ ok: true });
};
