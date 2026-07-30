import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import type { RequestHandler } from './$types';
import { collectNewsletter, UnreadableError } from '$lib/server/newsletter';
import { subscribe, sendNewsletterReportEmail } from '$lib/server/resend';
import { isDisposable } from '$lib/server/email-validation';
import { overLimit } from '$lib/server/rate-limit';
import { measure, check } from '$lib/tools/newsletter/checks';
import { nichePrompt, fullPrompt, auditMessage } from '$lib/tools/newsletter/prompt';
import { toMarkdown, type FullVerdict, type Niche } from '$lib/tools/newsletter/report';

/**
 * Evalúa lo que un newsletter de Substack enseña desde fuera.
 *
 * Dos mitades bien separadas, a propósito:
 *   - checks.ts mide y detecta todo lo contable. Es determinista y no alucina.
 *   - el modelo juzga lo que no se puede contar y recibe los números ya medidos.
 *
 * Y dos pasos, este por motivo de negocio:
 *   - `analyze`: cifras y nicho. Es lo que se enseña gratis, y basta para que
 *     alguien vea que el juicio vale algo.
 *   - `unlock`: a cambio del email, el informe completo por correo. Lo demás no
 *     se manda nunca al navegador.
 */

/** El mismo que /tool/7-frameworks. Ver el comentario de allí antes de cambiarlo. */
const MODEL = 'gpt-5.4-mini';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function judge(
	system: string,
	user: string,
	maxTokens: number
): Promise<Record<string, unknown> | null> {
	const key = env.OPENAI_API_KEY;
	if (!key) return null;

	try {
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
				max_completion_tokens: maxTokens
			})
		});
		if (!response.ok) {
			console.error('[tool/newsletter] OpenAI:', response.status, await response.text());
			return null;
		}
		const data = await response.json();
		return JSON.parse(data.choices?.[0]?.message?.content ?? '{}');
	} catch (error) {
		console.error('[tool/newsletter] fallo al juzgar:', error);
		return null;
	}
}

/** Lee la publicación y mide. Lo hacen los dos pasos, así que va aparte. */
async function read(url: string) {
	const snapshot = await collectNewsletter(url);
	const measurements = measure(snapshot, Date.now());
	return { snapshot, measurements, findings: check(snapshot, measurements) };
}

export const POST: RequestHandler = async ({ request, getClientAddress }) => {
	let body: Record<string, unknown>;
	try {
		body = await request.json();
	} catch {
		return json({ error: 'bad_request' }, { status: 400 });
	}

	const ip = getClientAddress();
	// El paso gratis se limita por IP; el caro, por correo (ver rate-limit.ts).
	if (body.step === 'analyze' && overLimit('toolPreview', ip)) {
		return json({ error: 'rate_limit' }, { status: 429 });
	}

	const url = typeof body.url === 'string' ? body.url.trim() : '';
	if (!url) return json({ error: 'bad_request' }, { status: 400 });

	try {
		// --- Paso 1: cifras y nicho. Lo único que se enseña sin pedir nada. ---
		if (body.step === 'analyze') {
			const { snapshot, measurements, findings } = await read(url);

			const niche = (await judge(
				nichePrompt(),
				auditMessage(snapshot, measurements, findings),
				700
			)) as Niche | null;

			return json({
				site: new URL(snapshot.url).hostname.replace(/^www\./, ''),
				name: snapshot.name.trim(),
				measurements,
				niche,
				// Cuántos hallazgos hay, sin decir cuáles: da idea de lo que falta por ver.
				pending: {
					defects: findings.filter((f) => f.severity !== 'oportunidad').length,
					opportunities: findings.filter((f) => f.severity === 'oportunidad').length
				}
			});
		}

		// --- Paso 2: el email. El informe completo va por correo y nunca al navegador. ---
		if (body.step === 'unlock') {
			const email = String(body.email ?? '')
				.trim()
				.toLowerCase();
			if (!EMAIL_RE.test(email)) return json({ error: 'invalid_email' }, { status: 400 });
			if (isDisposable(email)) return json({ error: 'disposable' }, { status: 400 });
			if (overLimit('toolDelivery', email) || overLimit('toolDeliveryPerIp', ip)) {
				return json({ error: 'rate_limit' }, { status: 429 });
			}

			// El alta primero: si algo falla después, el lead ya está dentro.
			try {
				await subscribe(email);
			} catch (error) {
				console.error('[tool/newsletter] subscribe failed:', error);
				return json({ error: 'server_error' }, { status: 500 });
			}

			// Se relee en vez de fiarse de lo que mande el navegador: son dos GET
			// rápidos y así el informe no se puede manipular desde el cliente.
			const { snapshot, measurements, findings } = await read(url);
			const site = new URL(snapshot.url).hostname.replace(/^www\./, '');

			const niche = (await judge(
				nichePrompt(),
				auditMessage(snapshot, measurements, findings),
				700
			)) as Niche | null;
			const verdict = (await judge(
				fullPrompt(),
				auditMessage(snapshot, measurements, findings, niche),
				2500
			)) as FullVerdict | null;

			const report = toMarkdown(site, measurements, findings, niche, verdict);

			try {
				await sendNewsletterReportEmail(email, report);
			} catch (error) {
				console.error('[tool/newsletter] envío fallido:', error);
				return json({ error: 'send_failed' }, { status: 502 });
			}

			return json({ ok: true });
		}

		return json({ error: 'bad_request' }, { status: 400 });
	} catch (error) {
		if (error instanceof UnreadableError) {
			return json({ error: 'unreadable', reason: error.reason }, { status: 422 });
		}
		console.error('[tool/newsletter] failed:', error);
		return json({ error: 'server_error' }, { status: 500 });
	}
};
