import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import type { RequestHandler } from './$types';
import { scrape, UnreadableError } from '$lib/server/scrape';
import { subscribe, sendToolCopyEmail } from '$lib/server/resend';
import { isDisposable } from '$lib/server/email-validation';
import { analyzePrompt, copyPrompt, offerMessage, type Offer } from '$lib/tools/copy/prompt';
import { sanitizeCopies, toMarkdown, type GeneratedCopy } from '$lib/tools/copy/format';
import { gatedFrameworks } from '$lib/tools/copy/frameworks';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Elegido por Damian tras comparar 8 modelos con el mismo prompt: es el más
 * rápido de todos (3 s, por debajo de gpt-4.1-mini) y el que más varía el ritmo
 * de las frases, que es lo que hace que el copy no suene a IA.
 * No cambiar sin decírselo.
 */
const MODEL = 'gpt-5.4-mini';

/**
 * Tope por IP para que un bot no dispare la factura de OpenAI.
 * Es en memoria y cada instancia serverless tiene la suya, así que el límite
 * real es más flojo que este número. Sirve para frenar el abuso tonto, no a un
 * atacante con ganas.
 */
const RATE_LIMIT = 10;
const RATE_WINDOW_MS = 60 * 60 * 1000;
const hits = new Map<string, number[]>();

function overRateLimit(ip: string): boolean {
	const now = Date.now();
	const recent = (hits.get(ip) ?? []).filter((at) => now - at < RATE_WINDOW_MS);
	recent.push(now);
	hits.set(ip, recent);

	// Poda perezosa: sin esto el Map crece sin fin mientras viva la instancia.
	if (hits.size > 5_000) {
		for (const [key, times] of hits) {
			if (times.every((at) => now - at >= RATE_WINDOW_MS)) hits.delete(key);
		}
	}
	return recent.length > RATE_LIMIT;
}

/** Una llamada a OpenAI que devuelve JSON ya parseado. */
async function askJson(
	system: string,
	user: string,
	maxTokens: number
): Promise<Record<string, unknown>> {
	const key = env.OPENAI_API_KEY;
	if (!key) throw new Error('OPENAI_API_KEY no configurada');

	const response = await fetch('https://api.openai.com/v1/chat/completions', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
		body: JSON.stringify({
			model: MODEL,
			messages: [
				{ role: 'system', content: system },
				{ role: 'user', content: user }
			],
			response_format: { type: 'json_object' },
			// La familia gpt-5 usa max_completion_tokens (no max_tokens) y solo
			// acepta la temperatura por defecto: mandar `temperature` da un 400.
			max_completion_tokens: maxTokens
		})
	});

	if (!response.ok) {
		const detail = await response.text();
		console.error('[tool/copy] OpenAI error:', response.status, detail);
		throw new Error('openai_failed');
	}

	const data = await response.json();
	return JSON.parse(data.choices?.[0]?.message?.content ?? '{}');
}

function readOffer(input: unknown): Offer | null {
	if (!input || typeof input !== 'object') return null;
	const { what, who, action, proof } = input as Record<string, unknown>;
	const text = (value: unknown, max: number) =>
		typeof value === 'string' ? value.trim().slice(0, max) : '';

	const offer: Offer = {
		what: text(what, 300),
		who: text(who, 300),
		action: text(action, 300),
		proof: text(proof, 600)
	};
	if (!offer.what || !offer.who || !offer.action) return null;
	return offer;
}

async function write(offer: Offer, ids: string[], maxTokens: number): Promise<GeneratedCopy[]> {
	const raw = await askJson(copyPrompt(ids), offerMessage(offer), maxTokens);
	return sanitizeCopies(raw);
}

export const POST: RequestHandler = async ({ request, getClientAddress }) => {
	let body: Record<string, unknown>;
	try {
		body = await request.json();
	} catch {
		return json({ error: 'bad_request' }, { status: 400 });
	}

	const step = body.step;

	if (overRateLimit(getClientAddress())) {
		return json({ error: 'rate_limit' }, { status: 429 });
	}

	try {
		// --- Paso 1: leer la página y escribir el framework gratis, de una pasada ---
		if (step === 'analyze') {
			const url = typeof body.url === 'string' ? body.url : '';

			let page;
			try {
				page = await scrape(url);
			} catch (error) {
				if (error instanceof UnreadableError) {
					return json({ error: 'unreadable', reason: error.reason }, { status: 422 });
				}
				throw error;
			}

			const raw = await askJson(
				analyzePrompt(),
				`URL: ${page.finalUrl}
Título: ${page.title}
Meta descripción: ${page.description}

Texto de la página:
${page.text}`,
				2500
			);

			const offer = readOffer(raw.offer);
			const copies = sanitizeCopies(raw);
			if (!offer || !copies.length) return json({ error: 'unreadable', reason: 'empty' }, { status: 422 });

			return json({
				offer,
				copies,
				confidence: raw.confidence === 'baja' ? 'baja' : 'alta',
				site: new URL(page.finalUrl).hostname.replace(/^www\./, '')
			});
		}

		// --- Paso 2: el email. Los seis restantes se mandan al correo y no se
		//     enseñan nunca en pantalla: el correo es el único sitio donde están. ---
		if (step === 'unlock') {
			const offer = readOffer(body.offer);
			if (!offer) return json({ error: 'incomplete_offer' }, { status: 400 });

			const email = String(body.email ?? '')
				.trim()
				.toLowerCase();
			if (!EMAIL_RE.test(email)) return json({ error: 'invalid_email' }, { status: 400 });
			if (isDisposable(email)) return json({ error: 'disposable' }, { status: 400 });

			const free = Array.isArray(body.free) ? sanitizeCopies({ copies: body.free }) : [];

			// El alta va primero: si el modelo falla después, el lead ya está dentro.
			try {
				await subscribe(email);
			} catch (error) {
				console.error('[tool/copy] subscribe failed:', error);
				return json({ error: 'server_error' }, { status: 500 });
			}

			const copies = await write(
				offer,
				gatedFrameworks.map((f) => f.id),
				6000
			);
			if (!copies.length) return json({ error: 'server_error' }, { status: 502 });

			try {
				await sendToolCopyEmail(email, toMarkdown([...free, ...copies]));
			} catch (error) {
				console.error('[tool/copy] delivery email failed:', error);
				return json({ error: 'send_failed' }, { status: 502 });
			}

			return json({ ok: true });
		}

		return json({ error: 'bad_request' }, { status: 400 });
	} catch (error) {
		console.error('[tool/copy] failed:', error);
		return json({ error: 'server_error' }, { status: 500 });
	}
};
