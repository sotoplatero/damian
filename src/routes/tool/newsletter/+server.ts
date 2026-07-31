import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { askJson } from '$lib/server/openai';
import { cacheAudit, readAudit } from '$lib/server/audit-cache';
import {
	collectNewsletter,
	collectPostBodies,
	normalizeOrigin,
	UnreadableError
} from '$lib/server/newsletter';
import { subscribe, sendNewsletterReportEmail } from '$lib/server/resend';
import { isDisposable } from '$lib/server/email-validation';
import { overLimit } from '$lib/server/rate-limit';
import { measure, slugsToSample, type Measurements } from '$lib/tools/newsletter/checks';
import {
	bySeverity,
	openFindings,
	runMeasured,
	tally,
	type AuditItem,
	type Tally
} from '$lib/tools/newsletter/rules';
import {
	auditMessage,
	auditPrompt,
	auditSchema,
	type Audited
} from '$lib/tools/newsletter/prompt';
import { toMarkdown } from '$lib/tools/newsletter/report';

/**
 * Audita una newsletter de Substack por lo que enseña desde fuera.
 *
 * Dos mitades, a propósito:
 *   - `rules.ts` mide lo contable. Determinista, no alucina.
 *   - el modelo LEE los números enteros y dice lo que ve, con cita literal que se
 *     verifica contra el original antes de aceptarla.
 *
 * Y dos pasos, por negocio:
 *   - `analyze`: la auditoría completa. Se enseña la primera cosa y se tapan las
 *     demás. Corre aquí porque de aquí sale todo lo que se muestra.
 *   - `unlock`: a cambio del correo, el informe entero por email. **No hay
 *     segunda llamada al modelo**: solo se renderiza lo que ya está en el caché.
 *
 * `auditFor()` es la misma función en los dos pasos, así que no hay dos tuberías
 * que puedan divergir. Si el caché falla en `unlock`, se rehace lo mismo — puede
 * salir una lista algo distinta, porque el canal abierto no es determinista, pero
 * nunca una peor ni una que contradiga a la otra.
 */

/** El mismo que /tool/7-frameworks. Ver el comentario de allí antes de cambiarlo. */
const MODEL = 'gpt-5.4-mini';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Cuántos números se leen. Ver `POST_BODIES` en server/newsletter.ts. */
const SAMPLE = 5;

/**
 * Tope de salida. Es generoso porque el canal abierto no tiene número fijo de
 * hallazgos y cada uno lleva cita y propuesta escrita: quedarse corto aquí
 * significa JSON cortado, y eso se ve en los logs como `incomplete`.
 */
const MAX_OUTPUT = 6000;

type Audit = {
	site: string;
	snapshot: Awaited<ReturnType<typeof collectNewsletter>>;
	m: Measurements;
	items: AuditItem[];
	tally: Tally;
	diagnosis: { veredicto: string; loQueSeEntiende: string; paraQuien: string } | null;
};

/**
 * La auditoría completa: descarga, mide, corre las reglas y le da al modelo los
 * números enteros para que los lea.
 *
 * Los cuerpos se bajan también en el paso gratis, aunque sean cinco peticiones
 * más: son la materia prima de casi todos los hallazgos, así que sin ellos no hay
 * nada que enseñar antes del muro.
 */
async function auditFor(url: string): Promise<Audit> {
	const snapshot = await collectNewsletter(url);
	const bodies = await collectPostBodies(snapshot.url, slugsToSample(snapshot, SAMPLE));

	const m = measure(snapshot, Date.now());
	const measured = runMeasured({ snapshot, m, bodies });

	const { input, haystack } = auditMessage(snapshot, m, measured, bodies);

	const audited = await askJson<Audited>({
		model: MODEL,
		instructions: auditPrompt(),
		input,
		schema: auditSchema(),
		maxOutputTokens: MAX_OUTPUT,
		tag: 'tool/newsletter'
	});

	// El candado: lo que no se puede citar contra el original no entra.
	const { items: open, dropped } = openFindings(audited?.hallazgos, haystack);
	if (dropped.length) {
		// Se registra porque es la señal de que el prompt se está yendo: si un día
		// se cae la mitad, hay que verlo aquí y no en un informe corto.
		console.warn(`[tool/newsletter] ${dropped.length} hallazgos descartados:`, dropped);
	}

	const items = [...measured, ...open].sort(bySeverity);

	return {
		site: new URL(snapshot.url).hostname.replace(/^www\./, ''),
		snapshot,
		m,
		items,
		tally: tally(items),
		diagnosis: audited
			? {
					veredicto: audited.veredicto,
					loQueSeEntiende: audited.loQueSeEntiende,
					paraQuien: audited.paraQuien
				}
			: null
	};
}

/**
 * La clave del caché: el origen normalizado. `null` si la URL no se puede
 * normalizar, y entonces no se cachea ni se busca — que es lo correcto, porque
 * tampoco se va a poder descargar.
 */
function cacheKey(raw: string): string | null {
	return normalizeOrigin(raw)?.toLowerCase() ?? null;
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
		// --- Paso 1: la auditoría. Se enseña la primera y se tapan las demás. ---
		if (body.step === 'analyze') {
			const audit = await auditFor(url);
			const key = cacheKey(url);
			if (key) cacheAudit(key, audit);

			// La primera va COMPLETA, con su arreglo. Es la prueba de que la auditoría
			// propone y no solo regaña: sin verlo, el visitante tiene que creerse de
			// palabra que lo que hay detrás del muro vale algo.
			const [first, ...rest] = audit.items;

			return json({
				site: audit.site,
				name: audit.snapshot.name.trim(),
				// Con esto se reconstruye en pantalla la tarjeta que ve quien comparte
				// su enlace. Es el bloque que produce el "esto es verdad".
				card: {
					tagline: audit.snapshot.tagline.trim(),
					image: audit.snapshot.ogImage,
					hasLogo: audit.snapshot.hasLogo
				},
				measurements: audit.m,
				tally: audit.tally,
				diagnosis: audit.diagnosis,
				first: first ?? null,
				// De los que quedan solo viajan gravedad y dimensión: suficiente para
				// decir cuántos son y de qué tipo, y no se filtra ni un hallazgo.
				locked: rest.map((i) => ({ severity: i.severity, dimension: i.dimension }))
			});
		}

		// --- Paso 2: el informe por correo. Sin llamar al modelo otra vez. ---
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

			// Lo cacheado si está, y si no se rehace. Nunca se hace caso de lo que
			// mande el navegador, que solo aporta la URL.
			const key = cacheKey(url);
			const audit = (key ? readAudit<Audit>(key) : null) ?? (await auditFor(url));

			const report = toMarkdown({
				site: audit.site,
				snapshot: audit.snapshot,
				m: audit.m,
				items: audit.items,
				tally: audit.tally,
				diagnosis: audit.diagnosis
			});

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
