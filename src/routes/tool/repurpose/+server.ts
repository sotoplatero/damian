import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { askJson } from '$lib/server/openai';
import { scrape, UnreadableError } from '$lib/server/scrape';
import { subscribe, sendToolPiecesEmail } from '$lib/server/resend';
import { isDisposable } from '$lib/server/email-validation';
import { overLimit } from '$lib/server/rate-limit';
import { normalizeQuoteText, unwrapQuotes, verifyQuote } from '$lib/tools/quotes';
import { articleMessage, extractPrompt, writePrompt, type Article } from '$lib/tools/repurpose/prompt';
import { readOrder, sanitizePieces, toMarkdown, type Piece } from '$lib/tools/repurpose/format';
import { gatedFormats } from '$lib/tools/repurpose/formats';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MODEL = 'gpt-5.4-mini';

async function ask(system: string, user: string, maxTokens: number): Promise<Record<string, unknown>> {
	const data = await askJson({ model: MODEL, instructions: system, input: user, maxOutputTokens: maxTokens, tag: 'tool/repurpose' });
	if (!data) throw new Error('openai_failed');
	return data;
}

function readArticle(input: unknown): Article | null {
	if (!input || typeof input !== 'object') return null;
	const { tema, tesis, publico, frase, prueba } = input as Record<string, unknown>;
	const text = (value: unknown, max: number) => typeof value === 'string' ? value.trim().slice(0, max) : '';
	const article = { tema: text(tema, 300), tesis: text(tesis, 500), publico: text(publico, 300), frase: text(frase, 400), prueba: text(prueba, 600) };
	return article.tema && article.tesis ? article : null;
}

function readSourceUrl(input: unknown): string {
	if (typeof input !== 'string' || !input.trim()) return '';
	try { const url = new URL(input.trim()); return ['http:', 'https:'].includes(url.protocol) ? url.toString() : ''; } catch { return ''; }
}

export const POST: RequestHandler = async ({ request, getClientAddress }) => {
	let body: Record<string, unknown>;
	try { body = await request.json(); } catch { return json({ error: 'bad_request' }, { status: 400 }); }
	const step = body.step;
	const ip = getClientAddress();
	if (step === 'extract' && overLimit('toolPreview', ip)) return json({ error: 'rate_limit' }, { status: 429 });

	try {
		if (step === 'extract') {
			let page;
			try { page = await scrape(typeof body.url === 'string' ? body.url : ''); }
			catch (error) {
				if (error instanceof UnreadableError) return json({ error: 'unreadable', reason: error.reason }, { status: 422 });
				throw error;
			}
			const raw = await ask(extractPrompt(), `URL: ${page.finalUrl}\nTítulo: ${page.title}\nMeta descripción: ${page.description}\n\nTexto del artículo:\n${page.text}`, 3500);
			const article = readArticle(raw.article);
			const pieces = sanitizePieces(raw);
			if (!article || !pieces.length) return json({ error: 'unreadable', reason: 'empty' }, { status: 422 });
			const haystack = normalizeQuoteText(`${page.title}\n${page.description}\n${page.text}`);
			const candidate = unwrapQuotes(article.frase);
			article.frase = candidate && verifyQuote(candidate, haystack) ? candidate : '';
			if (candidate && !article.frase) console.warn('[tool/repurpose] cita descartada:', candidate);
			return json({ article, pieces, confidence: raw.confidence === 'baja' ? 'baja' : 'alta', site: new URL(page.finalUrl).hostname.replace(/^www\./, ''), url: page.finalUrl });
		}

		if (step === 'unlock') {
			const article = readArticle(body.article);
			if (!article) return json({ error: 'incomplete_article' }, { status: 400 });
			const email = String(body.email ?? '').trim().toLowerCase();
			if (!EMAIL_RE.test(email)) return json({ error: 'invalid_email' }, { status: 400 });
			if (isDisposable(email)) return json({ error: 'disposable' }, { status: 400 });
			if (overLimit('toolDelivery', email) || overLimit('toolDeliveryPerIp', ip)) return json({ error: 'rate_limit' }, { status: 429 });
			const free: Piece[] = Array.isArray(body.free) ? sanitizePieces({ pieces: body.free }) : [];
			try { await subscribe(email); } catch (error) { console.error('[tool/repurpose] subscribe failed:', error); return json({ error: 'server_error' }, { status: 500 }); }
			const raw = await ask(writePrompt(gatedFormats.map((f) => f.id)), articleMessage(article, readSourceUrl(body.url)), 5000);
			const pieces = sanitizePieces(raw);
			if (!pieces.length) return json({ error: 'server_error' }, { status: 502 });
			const order = readOrder(raw);
			if (!order.length) console.warn('[tool/repurpose] el modelo no devolvió el orden');
			try { await sendToolPiecesEmail(email, toMarkdown([...free, ...pieces], order)); }
			catch (error) { console.error('[tool/repurpose] delivery failed:', error); return json({ error: 'send_failed' }, { status: 502 }); }
			return json({ ok: true });
		}
		return json({ error: 'bad_request' }, { status: 400 });
	} catch (error) {
		console.error('[tool/repurpose] failed:', error);
		return json({ error: 'server_error' }, { status: 500 });
	}
};
