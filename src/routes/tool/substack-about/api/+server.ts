import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { askJson } from '$lib/server/openai';
import { scrape, UnreadableError } from '$lib/server/scrape';
import { cacheAudit, readAudit } from '$lib/server/audit-cache';
import { isDisposable } from '$lib/server/email-validation';
import { overLimit } from '$lib/server/rate-limit';
import { sendSubstackAboutEmail, subscribe } from '$lib/server/resend';
import { aboutInput, aboutPrompt, aboutSchema, type AboutAudit } from '$lib/tools/substack-about/prompt';
import { toMarkdown } from '$lib/tools/substack-about/format';

const MODEL = 'gpt-5.4-mini';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function aboutUrl(raw: string): URL {
	const value = /^[a-z][a-z0-9+.-]*:\/\//i.test(raw.trim()) ? raw.trim() : `https://${raw.trim()}`;
	let url: URL;
	try { url = new URL(value); } catch { throw new UnreadableError('invalid_url'); }
	const host = url.hostname.toLowerCase();
	if (host === 'substack.com' || !host.endsWith('.substack.com')) throw new UnreadableError('invalid_url');
	url.protocol = 'https:';
	url.pathname = '/about';
	url.search = '';
	url.hash = '';
	return url;
}

async function auditFor(raw: string): Promise<{ site: string; url: string; audit: AboutAudit }> {
	const target = aboutUrl(raw);
	const page = await scrape(target.toString());
	const audit = await askJson<AboutAudit>({
		model: MODEL,
		instructions: aboutPrompt(),
		input: aboutInput(page),
		schema: aboutSchema(),
		maxOutputTokens: 5000,
		tag: 'tool/substack-about'
	});
	if (!audit || audit.findings.length !== 5) throw new Error('openai_failed');
	return { site: target.hostname.replace('.substack.com', ''), url: target.toString(), audit };
}

export const POST: RequestHandler = async ({ request, getClientAddress }) => {
	let body: Record<string, unknown>;
	try { body = await request.json(); } catch { return json({ error: 'bad_request' }, { status: 400 }); }
	const step = body.step;
	const rawUrl = typeof body.url === 'string' ? body.url : '';
	const ip = getClientAddress();

	if (step === 'analyze' && overLimit('toolPreview', ip)) return json({ error: 'rate_limit' }, { status: 429 });

	try {
		if (step === 'analyze') {
			const result = await auditFor(rawUrl);
			cacheAudit(result.url, result);
			return json({
				site: result.site,
				diagnosis: result.audit.diagnosis,
				first: result.audit.findings[0],
				promise: result.audit.rewrite.promise,
				lockedCount: result.audit.findings.length - 1
			});
		}

		if (step === 'unlock') {
			const email = String(body.email ?? '').trim().toLowerCase();
			if (!EMAIL_RE.test(email)) return json({ error: 'invalid_email' }, { status: 400 });
			if (isDisposable(email)) return json({ error: 'disposable' }, { status: 400 });
			if (overLimit('toolDelivery', email) || overLimit('toolDeliveryPerIp', ip)) return json({ error: 'rate_limit' }, { status: 429 });
			const target = aboutUrl(rawUrl);
			try { await subscribe(email); } catch (error) {
				console.error('[tool/substack-about] subscribe failed:', error);
				return json({ error: 'server_error' }, { status: 500 });
			}
			const result = readAudit<{ site: string; url: string; audit: AboutAudit }>(target.toString()) ?? await auditFor(rawUrl);
			try { await sendSubstackAboutEmail(email, toMarkdown(result.site, result.audit)); } catch (error) {
				console.error('[tool/substack-about] delivery failed:', error);
				return json({ error: 'send_failed' }, { status: 502 });
			}
			return json({ ok: true });
		}

		return json({ error: 'bad_request' }, { status: 400 });
	} catch (error) {
		if (error instanceof UnreadableError) return json({ error: 'unreadable', reason: error.reason }, { status: 422 });
		console.error('[tool/substack-about] failed:', error);
		return json({ error: 'server_error' }, { status: 500 });
	}
};
