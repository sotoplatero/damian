import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { overLimit } from '$lib/server/rate-limit';
import { GAP_MIN, GAP_MAX, cleanGapRequest } from '$lib/gap';

/**
 * The gap on the board: which tool somebody is missing.
 *
 * WHAT IT DOES WITH THE ANSWER IS `console.log`, AND THAT IS THE DESIGN, not a
 * placeholder waiting for a database. It is the same shape `/tool/actionable`
 * uses for its rejection log — one JSON line per event — and the reasoning is
 * written down there: there is no store in this project, and an empty database
 * would have been worse than a grep. Vercel keeps the lines; Damian reads them
 * when he is choosing what to build on Thursday.
 *
 * IT ASKS FOR NO EMAIL, on purpose. The page already asks twice, at the top and
 * at the foot of the letter, and a third field attached to «¿cuál te falta?»
 * turns the one place a visitor gets to say something into another capture form.
 * The answer is worth more than the address here: it is the newsletter's next
 * subject, arriving from the person who needs it.
 *
 * So this endpoint costs nothing — no model call, no mail, no third party — and
 * its limit is about keeping the log readable rather than about money.
 */
export const POST: RequestHandler = async ({ request, getClientAddress }) => {
	let body: Record<string, unknown>;
	try {
		body = await request.json();
	} catch {
		return json({ error: 'bad_request' }, { status: 400 });
	}

	const request_text = cleanGapRequest(String(body.tool ?? ''));
	if (request_text.length < GAP_MIN || request_text.length > GAP_MAX) {
		return json({ error: 'gap_length' }, { status: 400 });
	}

	if (overLimit('gap', getClientAddress())) {
		return json({ error: 'rate_limit' }, { status: 429 });
	}

	/*
	 * One line, one JSON object, so it greps. The IP is deliberately NOT in it:
	 * what is worth keeping is the sentence, and an address turns a note somebody
	 * left into a record of who left it.
	 */
	console.log(JSON.stringify({ event: 'gap', at: new Date().toISOString(), request: request_text }));

	return json({ ok: true });
};
