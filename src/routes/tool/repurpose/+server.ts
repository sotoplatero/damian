import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { askJson } from '$lib/server/openai';
import { scrape, UnreadableError } from '$lib/server/scrape';
import { subscribe, sendToolPiecesEmail } from '$lib/server/resend';
import { isDisposable } from '$lib/server/email-validation';
import { overLimit } from '$lib/server/rate-limit';
import { normalizeQuoteText, unwrapQuotes, verifyQuote } from '$lib/tools/quotes';
import { articleMessage, extractPrompt, writePrompt, type ArticleAnalysis } from '$lib/tools/repurpose/prompt';
import { ensureSourceLinks, pieceContainsQuote, pieceLinksToSource, pieceUsesOnlySourceUrl, readExactPieces, readOrder, toMarkdown } from '$lib/tools/repurpose/format';
import { FREE_IDS, GATED_IDS } from '$lib/tools/repurpose/formats';
import { buildManualPrompt } from '$lib/tools/repurpose/manual-prompt';
import { cacheAudit, readAudit } from '$lib/server/audit-cache';
import type { Piece } from '$lib/tools/repurpose/format';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MODEL = 'gpt-5.4-mini';

type PreviewPayload = {
	article: ArticleAnalysis;
	pieces: Piece[];
	confidence: 'alta' | 'baja';
	site: string;
	url: string;
};
type DeliveryPayload = { pieces: Piece[]; order: string[]; quote: string };

function cacheKey(kind: 'preview' | 'delivery', input: unknown): string | null {
	const source = readSourceUrl(input);
	if (!source) return null;
	const url = new URL(source);
	url.hash = '';
	url.hostname = url.hostname.toLowerCase();
	return `repurpose:${kind}:${url.toString()}`;
}

async function ask(system: string, user: string, maxTokens: number): Promise<Record<string, unknown>> {
	const data = await askJson({ model: MODEL, instructions: system, input: user, maxOutputTokens: maxTokens, tag: 'tool/repurpose' });
	if (!data) throw new Error('openai_failed');
	return data;
}

function readArticle(input: unknown): ArticleAnalysis | null {
	if (!input || typeof input !== 'object') return null;
	const { tema, tesis, publico, ideas, pruebas, escenas, frase, voz } = input as Record<string, unknown>;
	const text = (value: unknown, max: number) => typeof value === 'string' ? value.trim().slice(0, max) : '';
	const texts = (value: unknown, count: number, max: number) => Array.isArray(value)
		? value.filter((item): item is string => typeof item === 'string').map((item) => item.trim().slice(0, max)).filter(Boolean).slice(0, count)
		: [];
	const article = {
		tema: text(tema, 300), tesis: text(tesis, 500), publico: text(publico, 300),
		ideas: texts(ideas, 12, 400), pruebas: texts(pruebas, 12, 400), escenas: texts(escenas, 8, 500),
		frase: text(frase, 400), voz: text(voz, 600)
	};
	return article.tema && article.tesis && article.voz ? article : null;
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
			const requestedKey = cacheKey('preview', body.url);
			const cached = requestedKey ? readAudit<PreviewPayload>(requestedKey) : null;
			if (cached) return json(cached);
			let page;
			try { page = await scrape(typeof body.url === 'string' ? body.url : ''); }
			catch (error) {
				if (error instanceof UnreadableError) return json({ error: 'unreadable', reason: error.reason }, { status: 422 });
				throw error;
			}
			const raw = await ask(extractPrompt(), `URL: ${page.finalUrl}\nTítulo: ${page.title}\nMeta descripción: ${page.description}\n\nTexto del artículo:\n${page.text}`, 3500);
			const article = readArticle(raw.article);
			const pieces = readExactPieces(raw, FREE_IDS);
			if (!article || !pieces) return json({ error: 'unreadable', reason: 'empty' }, { status: 422 });
			const haystack = normalizeQuoteText(`${page.title}\n${page.description}\n${page.text}`);
			const candidate = unwrapQuotes(article.frase);
			article.frase = candidate && verifyQuote(candidate, haystack) ? candidate : '';
			if (candidate && !article.frase) console.warn('[tool/repurpose] cita descartada:', candidate);
			if (!pieces.every((piece) => pieceUsesOnlySourceUrl(piece, page.finalUrl))) return json({ error: 'server_error' }, { status: 502 });
			if (!pieces.some((piece) => pieceLinksToSource(piece, page.finalUrl))) return json({ error: 'server_error' }, { status: 502 });
			const payload: PreviewPayload = { article, pieces, confidence: raw.confidence === 'baja' ? 'baja' : 'alta', site: new URL(page.finalUrl).hostname.replace(/^www\./, ''), url: page.finalUrl };
			if (requestedKey) cacheAudit(requestedKey, payload);
			const finalKey = cacheKey('preview', page.finalUrl);
			if (finalKey && finalKey !== requestedKey) cacheAudit(finalKey, payload);
			return json(payload);
		}

		if (step === 'unlock') {
			const article = readArticle(body.article);
			if (!article) return json({ error: 'incomplete_article' }, { status: 400 });
			const email = String(body.email ?? '').trim().toLowerCase();
			if (!EMAIL_RE.test(email)) return json({ error: 'invalid_email' }, { status: 400 });
			if (isDisposable(email)) return json({ error: 'disposable' }, { status: 400 });
			if (overLimit('toolDelivery', email) || overLimit('toolDeliveryPerIp', ip)) return json({ error: 'rate_limit' }, { status: 429 });
			const sourceUrl = readSourceUrl(body.url);
			const free = readExactPieces({ pieces: body.free }, FREE_IDS);
			if (!sourceUrl || !free || !free.every((piece) => pieceUsesOnlySourceUrl(piece, sourceUrl))) return json({ error: 'incomplete_article' }, { status: 400 });
			try { await subscribe(email); } catch (error) { console.error('[tool/repurpose] subscribe failed:', error); return json({ error: 'server_error' }, { status: 500 }); }
			const deliveryKey = cacheKey('delivery', sourceUrl);
			const cached = deliveryKey ? readAudit<DeliveryPayload>(deliveryKey) : null;
			let raw: Record<string, unknown> | null = null;
			let pieces: Piece[] | null = cached?.quote === article.frase ? cached.pieces : null;
			let order = cached?.quote === article.frase ? cached.order : [];
			for (let attempt = 1; !pieces && attempt <= 2; attempt += 1) {
				const correction = attempt === 2
					? '\n\nCORRECCIÓN OBLIGATORIA: devuelve exactamente los seis ids pedidos, todos por debajo de 700 caracteres. "puerta-articulo" y al menos otra nota deben contener la URL final exacta.'
					: '';
				raw = await ask(writePrompt(GATED_IDS) + correction, articleMessage(article, sourceUrl), 5000);
				pieces = readExactPieces(raw, GATED_IDS);
				if (!pieces) {
					console.warn(`[tool/repurpose] entrega inválida en intento ${attempt}: conjunto incompleto o longitud`);
					continue;
				}
				if (!pieces.every((piece) => pieceUsesOnlySourceUrl(piece, sourceUrl))) {
					console.warn(`[tool/repurpose] entrega inválida en intento ${attempt}: URL ajena o mal formada`);
					pieces = null;
					continue;
				}
				const door = pieces.find((piece) => piece.id === 'puerta-articulo');
				if (!door || !pieceLinksToSource(door, sourceUrl) || pieces.filter((piece) => pieceLinksToSource(piece, sourceUrl)).length < 2) {
					console.warn(`[tool/repurpose] entrega inválida en intento ${attempt}: faltan enlaces`);
					if (attempt === 2) pieces = ensureSourceLinks(pieces, sourceUrl, 'puerta-articulo', 2);
					else pieces = null;
					if (!pieces) continue;
				}
				break;
			}
			if (!pieces) return json({ error: 'server_error' }, { status: 502 });
			const quoteNote = pieces.find((piece) => piece.id === 'cita-comentada');
			if (article.frase && (!quoteNote || !pieceContainsQuote(quoteNote, article.frase))) return json({ error: 'server_error' }, { status: 502 });
			if (raw) order = readOrder(raw);
			if (!order.length) console.warn('[tool/repurpose] el modelo no devolvió el orden');
			if (deliveryKey && !cached) cacheAudit<DeliveryPayload>(deliveryKey, { pieces, order, quote: article.frase });
			try { await sendToolPiecesEmail(email, toMarkdown([...free, ...pieces], order), buildManualPrompt()); }
			catch (error) { console.error('[tool/repurpose] delivery failed:', error); return json({ error: 'send_failed' }, { status: 502 }); }
			return json({ ok: true });
		}
		return json({ error: 'bad_request' }, { status: 400 });
	} catch (error) {
		console.error('[tool/repurpose] failed:', error);
		return json({ error: 'server_error' }, { status: 500 });
	}
};
