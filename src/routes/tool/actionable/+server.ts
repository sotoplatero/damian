import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { UnreadableError } from '$lib/server/scrape';
import { judgeSnapshot, planFor, readPage, type Judged } from '$lib/server/actionable';
import { encodeTool } from '$lib/server/actionable-link';
import { overLimit } from '$lib/server/rate-limit';
import { cacheAudit, readAudit } from '$lib/server/audit-cache';
import { readJudgment, verdictFor } from '$lib/tools/actionable/judgment';
import { readSpec } from '$lib/tools/actionable/spec';

/** One model call, but the download in front of it can be slow. See repurpose for the 10s story. */
export const config = { maxDuration: 60 };

type Payload = Judged & { site: string; url: string };

function cacheKey(input: unknown): string | null {
	if (typeof input !== 'string' || !input.trim()) return null;
	try {
		const url = new URL(input.trim());
		if (!['http:', 'https:'].includes(url.protocol)) return null;
		url.hash = '';
		url.hostname = url.hostname.toLowerCase();
		return `actionable:judge:${url.toString()}`;
	} catch {
		return null;
	}
}

/**
 * THE REJECTION LOG, day one.
 *
 * Every judgment is logged with its URL, its outcome and which axes fell. It is
 * the most valuable thing this tool collects: it says which shape to build
 * second, and whether the judgment is too strict or too soft. It goes to the
 * platform log rather than to a store because there is no store here yet, and an
 * empty database would have been a worse answer than a grep.
 *
 * One line, machine-readable-ish, so it can be pulled out of Vercel in bulk.
 */
function logJudgment(url: string, judged: Judged): void {
	const failed = judged.judgment.axes.filter((axis) => !axis.pasa).map((axis) => axis.id);
	console.log(
		`[tool/actionable] juicio ${JSON.stringify({
			url,
			veredicto: judged.verdict,
			forma: judged.judgment.forma,
			caen: failed,
			sinCita: judged.unverified
		})}`
	);
}

export const POST: RequestHandler = async ({ request, getClientAddress }) => {
	let body: Record<string, unknown>;
	try {
		body = await request.json();
	} catch {
		return json({ error: 'bad_request' }, { status: 400 });
	}

	const ip = getClientAddress();

	try {
		/*
		 * The plan step. It is a second model call on the same page, so it costs
		 * money and shares the free tier's counter with the judgment.
		 *
		 * The judgment comes back from the browser rather than being kept
		 * server-side, and it is re-read and re-judged here: whatever the visitor
		 * posts is untrusted, and a page that didn't earn a build isn't going to
		 * get one by editing a JSON field. The verdict is recomputed from the
		 * axes, so tampering with the axes only changes the verdict the same way
		 * an honest judgment would have.
		 */
		if (body.step === 'plan') {
			if (overLimit('toolPreview', ip)) return json({ error: 'rate_limit' }, { status: 429 });
			const judgment = readJudgment(body.judgment);
			if (!judgment) return json({ error: 'bad_request' }, { status: 400 });
			const verdict = verdictFor(judgment);
			if (verdict !== 'sirve' && verdict !== 'flojo') return json({ error: 'not_convertible' }, { status: 422 });

			let page;
			try {
				page = await readPage(typeof body.url === 'string' ? body.url : '');
			} catch (error) {
				if (error instanceof UnreadableError) return json({ error: 'unreadable', reason: error.reason }, { status: 422 });
				throw error;
			}

			const spec = await planFor(page, judgment);
			if (!spec) return json({ error: 'server_error' }, { status: 502 });
			return json({ spec });
		}

		/*
		 * Build. No model call at all: the spec IS the tool, so building it is
		 * validating what came back from the editor and signing it. That is why
		 * regenerating from an edited plan is instant and free, and why editing
		 * the built tool never had to exist in v1.
		 */
		if (body.step === 'build') {
			const spec = readSpec(body.spec);
			if (!spec) return json({ error: 'bad_spec' }, { status: 400 });
			const token = encodeTool(spec);
			if (!token) return json({ error: 'server_error' }, { status: 500 });
			return json({ token, path: `/tool/actionable/${token}` });
		}

		if (body.step !== 'judge') return json({ error: 'bad_request' }, { status: 400 });
		if (overLimit('toolPreview', ip)) return json({ error: 'rate_limit' }, { status: 429 });

		const requestedKey = cacheKey(body.url);
		const cached = requestedKey ? readAudit<Payload>(requestedKey) : null;
		if (cached) return json(cached);

		let page;
		try {
			page = await readPage(typeof body.url === 'string' ? body.url : '');
		} catch (error) {
			if (error instanceof UnreadableError) return json({ error: 'unreadable', reason: error.reason }, { status: 422 });
			throw error;
		}

		const judged = await judgeSnapshot(page);
		if (!judged) return json({ error: 'server_error' }, { status: 502 });
		logJudgment(page.finalUrl, judged);

		const payload: Payload = { ...judged, site: new URL(page.finalUrl).hostname.replace(/^www\./, ''), url: page.finalUrl };
		if (requestedKey) cacheAudit(requestedKey, payload);
		const finalKey = cacheKey(page.finalUrl);
		if (finalKey && finalKey !== requestedKey) cacheAudit(finalKey, payload);
		return json(payload);
	} catch (error) {
		console.error('[tool/actionable] failed:', error);
		return json({ error: 'server_error' }, { status: 500 });
	}
};
