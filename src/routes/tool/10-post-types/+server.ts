import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { askJson } from '$lib/server/openai';
import { subscribe, sendToolPostsEmail } from '$lib/server/resend';
import { isDisposable } from '$lib/server/email-validation';
import { overLimit } from '$lib/server/rate-limit';
import { extractPrompt, writePrompt, topicMessage, type Topic } from '$lib/tools/10-post-types/prompt';
import { sanitizePosts, toMarkdown, type GeneratedPost } from '$lib/tools/10-post-types/format';
import { gatedPostTypes } from '$lib/tools/10-post-types/types';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * La entrada es una idea escrita, no una URL.
 *
 * El mínimo existe para no gastar una llamada en «marketing» a secas: con menos
 * de esto no hay tema, hay una palabra. El máximo acota lo que se manda al modelo
 * y de paso lo que puede pegar cualquiera en un campo abierto.
 */
const IDEA_MIN = 20;
const IDEA_MAX = 2000;

/**
 * El mismo modelo que 7-frameworks: el más rápido de los que Damian comparó y el
 * que más varía el ritmo de las frases, que es lo que hace que no suene a IA.
 * No cambiar sin decírselo.
 */
const MODEL = 'gpt-5.4-mini';

/**
 * Una llamada a OpenAI que devuelve JSON ya parseado.
 *
 * Aquí un fallo sí es fatal —sin posts no hay nada que enseñar—, así que se
 * convierte el `null` del cliente en una excepción. El cliente y las rarezas de
 * la Responses API están en `$lib/server/openai.ts`, que es de donde tiran los
 * tres tools: aquí no va un `fetch` suelto.
 */
async function ask(system: string, user: string, maxTokens: number): Promise<Record<string, unknown>> {
	const data = await askJson({
		model: MODEL,
		instructions: system,
		input: user,
		maxOutputTokens: maxTokens,
		tag: 'tool/10-post-types'
	});
	if (!data) throw new Error('openai_failed');
	return data;
}

function readTopic(input: unknown): Topic | null {
	if (!input || typeof input !== 'object') return null;
	const { tema, publico, angulo, prueba } = input as Record<string, unknown>;
	const text = (value: unknown, max: number) =>
		typeof value === 'string' ? value.trim().slice(0, max) : '';

	const topic: Topic = {
		tema: text(tema, 300),
		publico: text(publico, 300),
		angulo: text(angulo, 400),
		prueba: text(prueba, 600)
	};
	if (!topic.tema || !topic.publico || !topic.angulo) return null;
	return topic;
}

async function write(topic: Topic, ids: string[], maxTokens: number): Promise<GeneratedPost[]> {
	const raw = await ask(writePrompt(ids), topicMessage(topic), maxTokens);
	return sanitizePosts(raw);
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
	if (step === 'extract' && overLimit('toolPreview', ip)) {
		return json({ error: 'rate_limit' }, { status: 429 });
	}

	try {
		// --- Paso 1: ordenar la idea y escribir el post gratis, de una pasada ---
		if (step === 'extract') {
			const idea = typeof body.idea === 'string' ? body.idea.trim() : '';
			if (idea.length < IDEA_MIN) return json({ error: 'idea_short' }, { status: 400 });

			const raw = await ask(extractPrompt(), `La idea, con sus palabras:\n\n${idea.slice(0, IDEA_MAX)}`, 2000);

			const topic = readTopic(raw.topic);
			const posts = sanitizePosts(raw);
			if (!topic || !posts.length)
				return json({ error: 'unreadable', reason: 'empty' }, { status: 422 });

			return json({
				topic,
				posts,
				confidence: raw.confidence === 'baja' ? 'baja' : 'alta'
			});
		}

		// --- Paso 2: el email. Los nueve restantes se mandan al correo y no se
		//     enseñan nunca en pantalla: el correo es el único sitio donde están. ---
		if (step === 'unlock') {
			const topic = readTopic(body.topic);
			if (!topic) return json({ error: 'incomplete_topic' }, { status: 400 });

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

			const free = Array.isArray(body.free) ? sanitizePosts({ posts: body.free }) : [];

			// El alta va primero: si el modelo falla después, el lead ya está dentro.
			try {
				await subscribe(email);
			} catch (error) {
				console.error('[tool/10-post-types] subscribe failed:', error);
				return json({ error: 'server_error' }, { status: 500 });
			}

			const posts = await write(
				topic,
				gatedPostTypes.map((type) => type.id),
				6000
			);
			if (!posts.length) return json({ error: 'server_error' }, { status: 502 });

			try {
				await sendToolPostsEmail(email, toMarkdown([...free, ...posts]));
			} catch (error) {
				console.error('[tool/10-post-types] delivery email failed:', error);
				return json({ error: 'send_failed' }, { status: 502 });
			}

			return json({ ok: true });
		}

		return json({ error: 'bad_request' }, { status: 400 });
	} catch (error) {
		console.error('[tool/10-post-types] failed:', error);
		return json({ error: 'server_error' }, { status: 500 });
	}
};
