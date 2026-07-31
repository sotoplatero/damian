import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { askJson } from '$lib/server/openai';
import { scrape, UnreadableError } from '$lib/server/scrape';
import { subscribe, sendToolCopyEmail } from '$lib/server/resend';
import { isDisposable } from '$lib/server/email-validation';
import { overLimit } from '$lib/server/rate-limit';
import { analyzePrompt, copyPrompt, offerMessage, type Offer } from '$lib/tools/7-frameworks/prompt';
import { sanitizeCopies, toMarkdown, type GeneratedCopy } from '$lib/tools/7-frameworks/format';
import { gatedFrameworks } from '$lib/tools/7-frameworks/frameworks';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Elegido por Damian tras comparar 8 modelos con el mismo prompt: es el más
 * rápido de todos (3 s, por debajo de gpt-4.1-mini) y el que más varía el ritmo
 * de las frases, que es lo que hace que el copy no suene a IA.
 * No cambiar sin decírselo.
 */
const MODEL = 'gpt-5.4-mini';

/**
 * Una llamada a OpenAI que devuelve JSON ya parseado.
 *
 * Aquí un fallo sí es fatal —sin copy no hay nada que enseñar—, así que se
 * convierte el `null` del cliente en una excepción. El cliente y sus trampas
 * están en `$lib/server/openai.ts`.
 */
async function ask(system: string, user: string, maxTokens: number): Promise<Record<string, unknown>> {
	const data = await askJson({
		model: MODEL,
		instructions: system,
		input: user,
		maxOutputTokens: maxTokens,
		tag: 'tool/7-frameworks'
	});
	if (!data) throw new Error('openai_failed');
	return data;
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
	const raw = await ask(copyPrompt(ids), offerMessage(offer), maxTokens);
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
	const ip = getClientAddress();

	// El paso gratis se limita por IP; el caro, por correo (ver rate-limit.ts).
	if (step === 'analyze' && overLimit('toolPreview', ip)) {
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

			const raw = await ask(
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
			// Por correo, que sí identifica a alguien, y con techo por IP para que
			// nadie encadene direcciones desde la misma conexión.
			if (overLimit('toolDelivery', email) || overLimit('toolDeliveryPerIp', ip)) {
				return json({ error: 'rate_limit' }, { status: 429 });
			}

			const free = Array.isArray(body.free) ? sanitizeCopies({ copies: body.free }) : [];

			// El alta va primero: si el modelo falla después, el lead ya está dentro.
			try {
				await subscribe(email);
			} catch (error) {
				console.error('[tool/7-frameworks] subscribe failed:', error);
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
				console.error('[tool/7-frameworks] delivery email failed:', error);
				return json({ error: 'send_failed' }, { status: 502 });
			}

			return json({ ok: true });
		}

		return json({ error: 'bad_request' }, { status: 400 });
	} catch (error) {
		console.error('[tool/7-frameworks] failed:', error);
		return json({ error: 'server_error' }, { status: 500 });
	}
};
