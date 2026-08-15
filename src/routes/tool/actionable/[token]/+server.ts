import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { decodeTool } from '$lib/server/actionable-link';
import { runTool } from '$lib/server/actionable';
import { readAnswers } from '$lib/tools/actionable/spec';
import { subscribe } from '$lib/server/resend';
import { isDisposable } from '$lib/server/email-validation';
import { overLimit } from '$lib/server/rate-limit';

export const config = { maxDuration: 60 };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Runs a generated tool.
 *
 * THE SPEC COMES FROM THE SIGNED TOKEN, NEVER FROM THE BODY. The browser could
 * post a spec of its own — that is exactly the request this endpoint has to
 * refuse, because a spec is a prompt and running an arbitrary one turns this
 * into somebody else's free model.
 *
 * The address is asked for once and it is the only gate here: this is the tool
 * an author shares with their readers, so the address is the point. It is
 * subscribed and nothing is emailed — the result appears on screen, because a
 * generated tool that made you check your inbox would be used exactly once.
 *
 * Keyed by IP on the free tier's counter, NOT by email on the delivery one:
 * three a day per address would make it impossible for anyone to use the same
 * generated tool twice, and whether they do is the one number the brief calls
 * the real signal.
 */
export const POST: RequestHandler = async ({ request, params, getClientAddress }) => {
	let body: Record<string, unknown>;
	try {
		body = await request.json();
	} catch {
		return json({ error: 'bad_request' }, { status: 400 });
	}

	const spec = decodeTool(params.token);
	if (!spec) return json({ error: 'bad_request' }, { status: 404 });

	const email = String(body.email ?? '').trim().toLowerCase();
	if (!EMAIL_RE.test(email)) return json({ error: 'invalid_email' }, { status: 400 });
	if (isDisposable(email)) return json({ error: 'disposable' }, { status: 400 });
	if (overLimit('toolPreview', getClientAddress())) return json({ error: 'rate_limit' }, { status: 429 });

	const answers = readAnswers(spec, body.valores);
	if (!answers) return json({ error: 'incomplete_form' }, { status: 400 });

	try {
		// Subscribing first, and a failure here stops the run: the address is what
		// this tool is for, and handing over the results after losing it would be
		// giving away the only thing being traded.
		await subscribe(email);
	} catch (caught) {
		console.error('[tool/actionable/run] subscribe failed:', caught);
		return json({ error: 'server_error' }, { status: 500 });
	}

	try {
		const results = await runTool(spec, answers);
		if (!results) return json({ error: 'server_error' }, { status: 502 });
		console.log(`[tool/actionable/run] ${JSON.stringify({ herramienta: spec.nombre, fuente: spec.fuente.url })}`);
		return json({ results });
	} catch (caught) {
		console.error('[tool/actionable/run] failed:', caught);
		return json({ error: 'server_error' }, { status: 500 });
	}
};
