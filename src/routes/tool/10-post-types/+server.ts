import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import type { RequestHandler } from './$types';
import { scrape, UnreadableError } from '$lib/server/scrape';
import { subscribe, sendToolPostsEmail } from '$lib/server/resend';
import { isDisposable } from '$lib/server/email-validation';
import { overLimit } from '$lib/server/rate-limit';
import { extractPrompt, writePrompt, topicMessage, type Topic } from '$lib/tools/10-post-types/prompt';
import { sanitizePosts, toMarkdown, type GeneratedPost } from '$lib/tools/10-post-types/format';
import { gatedPostTypes } from '$lib/tools/10-post-types/types';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * El mismo modelo que 7-frameworks: el más rápido de los que Damian comparó y el
 * que más varía el ritmo de las frases, que es lo que hace que no suene a IA.
 * No cambiar sin decírselo.
 */
const MODEL = 'gpt-5.4-mini';

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
		console.error('[tool/10-post-types] OpenAI error:', response.status, detail);
		throw new Error('openai_failed');
	}

	const data = await response.json();
	return JSON.parse(data.choices?.[0]?.message?.content ?? '{}');
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
	const raw = await askJson(writePrompt(ids), topicMessage(topic), maxTokens);
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
		// --- Paso 1: leer la página y escribir el post gratis, de una pasada ---
		if (step === 'extract') {
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
				extractPrompt(),
				`URL: ${page.finalUrl}
Título: ${page.title}
Meta descripción: ${page.description}

Texto de la página:
${page.text}`,
				2000
			);

			const topic = readTopic(raw.topic);
			const posts = sanitizePosts(raw);
			if (!topic || !posts.length)
				return json({ error: 'unreadable', reason: 'empty' }, { status: 422 });

			return json({
				topic,
				posts,
				confidence: raw.confidence === 'baja' ? 'baja' : 'alta',
				site: new URL(page.finalUrl).hostname.replace(/^www\./, '')
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
