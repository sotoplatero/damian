import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { askJson, type JsonSchema } from '$lib/server/openai';
import { scrape, UnreadableError } from '$lib/server/scrape';
import { subscribe, sendToolPiecesEmail } from '$lib/server/resend';
import { isDisposable } from '$lib/server/email-validation';
import { overLimit } from '$lib/server/rate-limit';
import { normalizeQuoteText, unwrapQuotes, verifyQuote } from '$lib/tools/quotes';
import { articleMessage, extractPrompt, extractSchema, writePrompt, writeSchema, type ArticleAnalysis } from '$lib/tools/repurpose/prompt';
import { addsBeyondAnchor, anchorIsKnown, collidingAnchors, duplicateNotes, hasRequiredMark, pieceContainsQuote, pieceUsesOnlySourceUrl, readExactPieces, readOrder, toMarkdown } from '$lib/tools/repurpose/format';
import { FREE_IDS, GATED_IDS } from '$lib/tools/repurpose/formats';
import { buildManualPrompt } from '$lib/tools/repurpose/manual-prompt';
import { cacheAudit, readAudit } from '$lib/server/audit-cache';
import type { Piece } from '$lib/tools/repurpose/format';

/**
 * WITHOUT THIS, THIS ENDPOINT 504s IN PRODUCTION AND THE PAGE SAYS "algo ha
 * fallado por mi parte".
 *
 * Nothing in this repo ever set `maxDuration`, so every function ran on the
 * platform default — measured at **10 seconds** on 8 August 2026, from the
 * Vercel runtime log: `Task timed out after 10 seconds`. One call to a model
 * does not fit in ten seconds, and this endpoint can make two.
 *
 * It fails invisibly: a 504 has no JSON body, so `postTool` falls through to the
 * copy's `errorGeneric` and the visitor is told something vague. Nothing in the
 * app logs, because the app never finished. Only Vercel knows.
 *
 * The local dev server has no such limit, which is why this passed every test
 * here and broke there.
 */
export const config = { maxDuration: 60 };

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

async function ask(system: string, user: string, maxTokens: number, schema: JsonSchema): Promise<Record<string, unknown>> {
	const data = await askJson({ model: MODEL, instructions: system, input: user, schema, maxOutputTokens: maxTokens, tag: 'tool/repurpose' });
	if (!data) throw new Error('openai_failed');
	return data;
}

function readArticle(input: unknown): ArticleAnalysis | null {
	if (!input || typeof input !== 'object') return null;
	const { tema, tesis, publico, ideas, pruebas, escenas, tensiones, frase, voz } = input as Record<string, unknown>;
	const text = (value: unknown, max: number) => typeof value === 'string' ? value.trim().slice(0, max) : '';
	const texts = (value: unknown, count: number, max: number) => Array.isArray(value)
		? value.filter((item): item is string => typeof item === 'string').map((item) => item.trim().slice(0, max)).filter(Boolean).slice(0, count)
		: [];
	const article = {
		tema: text(tema, 300), tesis: text(tesis, 500), publico: text(publico, 300),
		ideas: texts(ideas, 12, 400), pruebas: texts(pruebas, 12, 400), escenas: texts(escenas, 8, 500),
		tensiones: texts(tensiones, 8, 400),
		frase: text(frase, 400), voz: text(voz, 600)
	};
	return article.tema && article.tesis && article.voz ? article : null;
}

/**
 * Everything a note's `ancla` is allowed to be.
 *
 * `ideas` is in here as well as the four slots the repertoire names, because the
 * boundary between an idea and a proof is the model's call and holding it to our
 * filing system would only make it lie about which drawer it opened. What the
 * list does enforce is the thing that matters: the anchor came from the article,
 * not from the model.
 */
function anchorMaterial(article: ArticleAnalysis): string[] {
	return [...article.pruebas, ...article.escenas, ...article.tensiones, ...article.ideas, article.frase]
		.filter(Boolean);
}

/**
 * The gate. A set that fails any of these is a failed generation, not a
 * delivery — the same call the newsletter tool makes on an unverifiable quote.
 *
 * TWO SCOPES, and mixing them was a bug worth remembering. `fresh` are the notes
 * this call just wrote and is allowed to judge; `all` is the whole set of nine,
 * used only for the rules that are about the set — no two on the same material,
 * no two saying the same thing.
 *
 * The delivery step writes four notes but holds all nine, and it no longer has
 * the article text. Re-judging the five free ones there marked them invalid
 * against a narrower source of truth than the one that approved them: their
 * anchors were verified against the scraped article in the free step, and by
 * delivery only the analysis list survives.
 *
 * Returns the reason so the retry's log says which rule broke.
 */
function anchorFailure(fresh: Piece[], all: Piece[], material: string[], articleText = ''): string | null {
	const collision = collidingAnchors(all);
	if (collision) return `dos notas sobre el mismo material (${collision.join(' y ')})`;
	const unknown = fresh.find((piece) => !anchorIsKnown(piece, material, articleText));
	if (unknown) return `ancla que no está en el análisis (${unknown.id})`;
	const vague = fresh.find((piece) => !hasRequiredMark(piece, articleText));
	if (vague) return `la nota no trae la cifra o el nombre que pide su formato (${vague.id})`;

	// The output-side rules. They come last because they only make sense once the
	// set is otherwise well formed, and they are the ones that catch a model
	// satisfying everything above by handing the material straight back.
	const twin = duplicateNotes(all);
	if (twin) return `dos notas que dicen lo mismo (${twin.join(' y ')})`;
	const lazy = fresh.find((piece) => !addsBeyondAnchor(piece));
	if (lazy) return `la nota es su propio material copiado, sin nada tuyo encima (${lazy.id})`;
	return null;
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
			const input = `URL: ${page.finalUrl}\nTítulo: ${page.title}\nMeta descripción: ${page.description}\n\nTexto del artículo:\n${page.text}`;
			const haystack = normalizeQuoteText(`${page.title}\n${page.description}\n${page.text}`);

			// Two attempts, because the anchor rules are strict on purpose and a
			// first pass that writes around its material is exactly the failure
			// this tool exists to stop. The correction names the broken rule.
			let article: ArticleAnalysis | null = null;
			let pieces: Piece[] | null = null;
			let lastFailure = '';
			let confidence: 'alta' | 'baja' = 'alta';
			for (let attempt = 1; attempt <= 2; attempt += 1) {
				// 7000, not the 3500 this used to run on: the analysis grew a
				// `tensiones` list and the free half went from three notes to five,
				// each now carrying its `ancla` as well as its text. At 3500 the
				// answer was simply cut off mid-JSON and read as an invalid set.
				const raw = await ask(extractPrompt() + (attempt === 2 ? `\n\nCORRECCIÓN OBLIGATORIA, el intento anterior falló por esto: ${lastFailure}. Corrige exactamente eso y respeta todo lo demás.` : ''), input, 7000, extractSchema());
				article = readArticle(raw.article);
				pieces = readExactPieces(raw, FREE_IDS);
				confidence = raw.confidence === 'baja' ? 'baja' : 'alta';
				if (!article || !pieces) {
					lastFailure = 'el conjunto de notas venía incompleto o pasado de longitud';
					// One line per note: which id, how long, whether it brought an
					// anchor. `readExactPieces` returns a bare null and its three
					// failure modes — wrong set, missing `ancla`, over the character
					// cap — are indistinguishable from outside. Logging the head of the
					// raw answer was tried and was useless: the article analysis fills
					// it and the pieces never appear.
					console.warn('[tool/repurpose] piezas recibidas:', JSON.stringify(
						(Array.isArray(raw.pieces) ? raw.pieces : []).map((piece) => {
							const note = piece as { id?: unknown; text?: unknown; ancla?: unknown };
							return {
								id: note?.id,
								largo: typeof note?.text === 'string' ? note.text.length : null,
								ancla: typeof note?.ancla === 'string' ? note.ancla.length : null
							};
						})
					));
					pieces = null;
					continue;
				}

				const candidate = unwrapQuotes(article.frase);
				article.frase = candidate && verifyQuote(candidate, haystack) ? candidate : '';
				if (candidate && !article.frase) console.warn('[tool/repurpose] cita descartada:', candidate);

				if (!pieces.every((piece) => pieceUsesOnlySourceUrl(piece, page.finalUrl))) { lastFailure = 'una nota traía una URL que no es la del artículo'; pieces = null; continue; }

				const failure = anchorFailure(pieces, pieces, anchorMaterial(article), page.text);
				if (failure) { lastFailure = failure; pieces = null; continue; }
				break;
			}
			if (!article || !pieces) {
				console.warn('[tool/repurpose] vista previa inválida:', lastFailure);
				return json({ error: 'unreadable', reason: 'empty' }, { status: 422 });
			}
			const payload: PreviewPayload = { article, pieces, confidence, site: new URL(page.finalUrl).hostname.replace(/^www\./, ''), url: page.finalUrl };
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
			// The distinctness rule spans all NINE notes, not the four written here:
			// the point is that no two of the nine stand on the same material, and
			// the five free ones already claimed theirs.
			const material = anchorMaterial(article);
			let lastFailure = '';
			for (let attempt = 1; !pieces && attempt <= 2; attempt += 1) {
				const correction = attempt === 2
					? `\n\nCORRECCIÓN OBLIGATORIA: ${lastFailure}. Devuelve exactamente los ${GATED_IDS.length} ids pedidos, cada uno anclado a una tensión distinta que ninguna otra nota use, todos por debajo de 700 caracteres.`
					: '';
				raw = await ask(writePrompt(GATED_IDS) + correction, articleMessage(article, sourceUrl), 5000, writeSchema(GATED_IDS));
				pieces = readExactPieces(raw, GATED_IDS);
				if (!pieces) {
					lastFailure = 'el conjunto venía incompleto o pasado de longitud';
					console.warn(`[tool/repurpose] entrega inválida en intento ${attempt}: ${lastFailure}`);
					continue;
				}
				if (!pieces.every((piece) => pieceUsesOnlySourceUrl(piece, sourceUrl))) {
					lastFailure = 'una nota traía una URL que no es la del artículo';
					console.warn(`[tool/repurpose] entrega inválida en intento ${attempt}: ${lastFailure}`);
					pieces = null;
					continue;
				}
				const failure = anchorFailure(pieces, [...free, ...pieces], material);
				if (failure) {
					lastFailure = failure;
					console.warn(`[tool/repurpose] entrega inválida en intento ${attempt}: ${lastFailure}`);
					pieces = null;
					continue;
				}
				break;
			}
			if (!pieces) return json({ error: 'server_error' }, { status: 502 });
			const quoteNote = free.find((piece) => piece.id === 'cita');
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
