import { assertPublicUrl, BROWSER_UA, UnreadableError } from './scrape';

// Se reexporta para que quien use este módulo no tenga que importar de scrape.
export { UnreadableError };

/**
 * Recoge todo lo que un newsletter de Substack enseña desde fuera.
 *
 * Dos peticiones y sale ya estructurado, sin adivinar HTML:
 *
 *  1. La portada. De ahí salen los meta tags, el h1, los textos de los botones
 *     y `window._preloads`, que trae el objeto completo de la publicación
 *     (nombre, subtítulo, logo, portada, color de marca, estado de pagos...).
 *  2. `/api/v1/archive`, no documentada pero es la que usa su propia web. Da,
 *     por cada post: título, subtítulo, fecha, slug, gratis o de pago, número
 *     de palabras, reacciones, comentarios, portada y —lo que más importa— los
 *     campos `search_engine_title` y `search_engine_description`.
 *
 * Los GET públicos de Substack pasan sin problema desde el servidor: lo que
 * está detrás de Cloudflare es el POST de altas, no esto (comprobado).
 *
 * ─────────────────────────────────────────────────────────────────────────
 * LO QUE HAY EN EL PAYLOAD Y NO SE LEE
 *
 * `_preloads.pub` trae **142 claves** y el archivo **64 campos por post**
 * (medido en kloshletter.substack.com, julio de 2026). Aquí se lee solo lo que
 * alimenta una regla de auditoría. Antes de añadir un campo, comprueba que
 * exista y que tenga valor en una publicación real: varios están declarados y
 * llegan a `null` (`free_subscription_benefits`, `plans` sin pagos activados).
 *
 * Dos que engañan:
 *   - `body_html` **existe como clave en `/api/v1/archive` y llega vacía.** El
 *     cuerpo solo se consigue por post; ver `collectPostBodies`.
 *   - `freeSubscriberCount` viene en el payload, pero que se *muestre* en la
 *     portada depende de un ajuste que no aparece como clave. Para juzgar la
 *     prueba social usa `rankingDetail`, `hasRecommendations`,
 *     `showRecsOnHomepage` y `welcomeBlurbs`, que sí son estado de presentación.
 * ─────────────────────────────────────────────────────────────────────────
 */

const TIMEOUT_MS = 10_000;
const MAX_BYTES = 3 * 1024 * 1024;
/** Suficiente para ver la cadencia y los patrones sin descargar el archivo entero. */
const POSTS = 20;
/**
 * Cuántos cuerpos de post se descargan como máximo. Cada uno es una petición de
 * ~185KB, así que esto solo se hace en el paso de pago: el paso gratis se queda
 * en las dos peticiones de siempre.
 */
const POST_BODIES = 5;

export type NewsletterPost = {
	title: string;
	subtitle: string;
	slug: string;
	date: string;
	/** 'everyone' es gratis; cualquier otra cosa es de pago o solo para suscriptores. */
	audience: string;
	words: number;
	reactions: number;
	comments: number;
	restacks: number;
	hasCover: boolean;
	seoTitle: string | null;
	seoDescription: string | null;
	section: string | null;
	/** El resumen que Substack usa de descripción del post. Casi siempre poblado. */
	description: string;
	/** Título para redes. Es otro campo distinto del de buscadores. */
	socialTitle: string | null;
};

/**
 * El cuerpo de un post, para mirar dentro.
 *
 * Van los dos formatos porque hacen falta los dos: el HTML para detectar lo que
 * son clases del editor de Substack (botones, widgets) y el texto para que el
 * modelo LEA el número. Antes solo se guardaba el HTML y al modelo se le mandaba
 * un resumen de nuestras propias expresiones regulares — por eso no encontraba
 * nada que no estuviera ya previsto en una regla.
 */
export type PostBody = {
	slug: string;
	title: string;
	date: string;
	html: string;
	text: string;
};

/**
 * HTML a texto legible.
 *
 * **Los límites de bloque se convierten en salto de línea ANTES de quitar las
 * etiquetas.** No es un detalle: quitando etiquetas a saco, el final de un
 * párrafo se pega con el principio del siguiente y aparecen erratas que no
 * existen. Escribiendo la auditoría de referencia esto produjo seis erratas de
 * puntuación falsas en un número que solo tenía una. Si el modelo recibe el texto
 * mal cosido, informará de esas seis con total seguridad.
 */
export function toPlainText(html: string): string {
	const spaced = html
		.replace(/<br[^>]*>/gi, '\n')
		.replace(/<\/(p|div|h[1-6]|li|blockquote|tr|td|figcaption)>/gi, '\n');
	return decode(spaced.replace(/<[^>]+>/g, ''))
		.replace(/[ \t]+/g, ' ')
		.replace(/ ?\n ?/g, '\n')
		.replace(/\n{3,}/g, '\n\n')
		.trim();
}

export type NewsletterSnapshot = {
	/** Origen final, ya normalizado (sirve para dominios propios). */
	url: string;
	/** Nombre tal cual lo devuelve Substack, sin recortar: los espacios sobrantes son un hallazgo. */
	name: string;
	/** El subtítulo de la portada. Substack lo llama hero_text. */
	tagline: string;
	authorName: string;
	authorBio: string;
	language: string;
	hasLogo: boolean;
	hasCoverPhoto: boolean;
	/** Color de acento. #FF6719 es el naranja de fábrica de Substack. */
	brandColor: string | null;
	customDomain: string | null;
	paymentsEnabled: boolean;
	/** Lo que dice el <title> y los meta, que es lo que se ve en Google y al compartir. */
	pageTitle: string;
	metaDescription: string;
	ogImage: string | null;
	h1: string[];
	/** Texto de los botones de la portada: de aquí sale el CTA. */
	buttons: string[];
	posts: NewsletterPost[];

	// --- Prueba social: por qué alguien debería creerte ---
	/** Suscriptores gratuitos, ya en número. Substack los da formateados ("7,000"). */
	subscriberCount: number | null;
	/** La forma vaga que Substack enseña en público ("thousands of subscribers"). */
	subscriberCountLabel: string;
	/** La línea de insignia: "Launched 9 months ago", "Top 10 in Politics"... */
	rankingDetail: string;
	/** Mayor que 0 si el autor tiene insignia de bestseller. */
	bestsellerTier: number;
	hasRecommendations: boolean;
	showRecsOnHomepage: boolean;
	/** Cuántos testimonios hay en la página de bienvenida. Cero es lo normal. */
	welcomeBlurbs: number;

	// --- Cómo se presenta la portada ---
	/**
	 * Si es false, la portada no enseña el módulo con el nombre y la promesa.
	 *
	 * **NO escribas una regla con esto.** Se midió: `false` en 4 de 4
	 * publicaciones (Kloshletter, Nada importa, Liderar, Fleet Street), dos de
	 * ellas con insignia de bestseller. Es el estado de serie de los diseños
	 * `newspaper` y `magaziney`, no una dejadez. Se recoge como contexto.
	 */
	showIntroModule: boolean;
	hideIntroTitle: boolean;
	hideIntroSubtitle: boolean;
	/** "newspaper", "personal"... cambia lo que ve quien llega por primera vez. */
	homepageType: string;

	// --- Buscadores: el interruptor que lo apaga todo ---
	/** Si es true, le has dicho a Google que no te indexe. */
	noIndex: boolean;
	noFollow: boolean;

	// --- Antigüedad, bandeja y muro ---
	/**
	 * Fecha del primer post.
	 *
	 * Cuidado: en publicaciones que importaron su archivo de otra plataforma
	 * viene de antes de que Substack existiera (liderar.substack.com dice 2011).
	 * Para calcular antigüedad hay que acotarla con `created_at`, que sí es la
	 * fecha de creación de la publicación.
	 */
	firstPostDate: string;
	/** Cuándo se creó la publicación en Substack. Es la fecha fiable de las dos. */
	createdAt: string;
	/** El nombre que se ve como remitente en la bandeja. No tiene que ser el de la publicación. */
	emailFromName: string;
	/** Cuánto puede leer un no suscriptor de un post de pago. null es lo de serie. */
	postPreviewLimit: number | null;
	inviteOnly: boolean;
	/** Cuántos planes de pago hay configurados. */
	planCount: number;
};

function text(value: unknown): string {
	return typeof value === 'string' ? value : '';
}

function bool(value: unknown): boolean {
	return value === true;
}

function num(value: unknown): number | null {
	return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

/** Substack da los suscriptores ya formateados ("7,000"), así que hay que deshacerlo. */
function count(value: unknown): number | null {
	if (typeof value === 'number') return Number.isFinite(value) ? value : null;
	if (typeof value !== 'string') return null;
	const digits = value.replace(/[^\d]/g, '');
	return digits ? Number(digits) : null;
}

/** Normaliza lo que escriba el visitante a la portada de la publicación. */
function toOrigin(raw: string): URL {
	const trimmed = raw.trim();
	if (!trimmed) throw new UnreadableError('invalid_url');
	try {
		const url = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
		// Da igual que peguen un post concreto: nos quedamos con el origen.
		return new URL(url.origin);
	} catch {
		throw new UnreadableError('invalid_url');
	}
}

/**
 * El origen normalizado de lo que escriba el visitante, sin descargar nada.
 *
 * Existe para poder construir la clave del caché en el paso de desbloqueo, donde
 * solo hay la URL cruda y todavía no hay snapshot. Tiene que normalizar IGUAL
 * que `collectNewsletter`, así que las dos pasan por `toOrigin`.
 */
export function normalizeOrigin(raw: string): string | null {
	try {
		return toOrigin(raw).toString().replace(/\/$/, '');
	} catch {
		return null;
	}
}

async function get(url: URL, accept: string): Promise<Response> {
	await assertPublicUrl(url);
	try {
		return await fetch(url, {
			signal: AbortSignal.timeout(TIMEOUT_MS),
			headers: {
				'user-agent': BROWSER_UA,
				accept,
				'accept-language': 'es-ES,es;q=0.9,en;q=0.8'
			}
		});
	} catch (error) {
		throw new UnreadableError(
			error instanceof Error && error.name === 'TimeoutError' ? 'timeout' : 'blocked'
		);
	}
}

async function body(response: Response): Promise<string> {
	const reader = response.body?.getReader();
	if (!reader) return '';
	const chunks: Uint8Array[] = [];
	let total = 0;
	while (total < MAX_BYTES) {
		const { done, value } = await reader.read();
		if (done) break;
		chunks.push(value);
		total += value.length;
	}
	await reader.cancel().catch(() => {});
	return new TextDecoder('utf-8').decode(
		chunks.reduce((acc, chunk) => {
			const out = new Uint8Array(acc.length + chunk.length);
			out.set(acc);
			out.set(chunk, acc.length);
			return out;
		}, new Uint8Array())
	);
}

function decode(input: string): string {
	return input
		.replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
		.replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number(dec)))
		.replace(/&quot;/g, '"')
		.replace(/&apos;/g, "'")
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&nbsp;/g, ' ')
		.replace(/&amp;/g, '&');
}

function meta(html: string, key: string): string {
	for (const tag of html.match(/<meta[^>]+>/gi) ?? []) {
		const name = tag.match(/(?:name|property)="([^"]+)"/i)?.[1];
		if (name?.toLowerCase() !== key) continue;
		const content = tag.match(/content="([^"]*)"/i)?.[1];
		if (content) return decode(content);
	}
	return '';
}

/**
 * Saca el objeto de la publicación de `window._preloads`. Substack lo mete como
 * una cadena JSON escapada dentro de `JSON.parse("...")`, así que hay dos vueltas.
 */
function preloads(html: string): Record<string, unknown> {
	const escaped = html.match(/window\._preloads\s*=\s*JSON\.parse\("((?:\\.|[^"\\])*)"\)/);
	if (escaped) {
		try {
			return JSON.parse(JSON.parse(`"${escaped[1]}"`));
		} catch {
			/* cae al siguiente intento */
		}
	}
	const plain = html.match(/window\._preloads\s*=\s*(\{[\s\S]*?\})\s*;?\s*<\/script>/);
	if (plain) {
		try {
			return JSON.parse(plain[1]);
		} catch {
			/* nada que hacer */
		}
	}
	return {};
}

function tags(html: string, tag: string): string[] {
	const found: string[] = [];
	for (const match of html.matchAll(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'gi'))) {
		const clean = decode(match[1].replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
		if (clean && clean.length < 120 && !found.includes(clean)) found.push(clean);
	}
	return found;
}

function readPosts(raw: unknown): NewsletterPost[] {
	if (!Array.isArray(raw)) return [];
	return raw
		.filter((p): p is Record<string, unknown> => !!p && typeof p === 'object')
		.map((p) => ({
			title: text(p.title),
			subtitle: text(p.subtitle),
			slug: text(p.slug),
			date: text(p.post_date),
			audience: text(p.audience) || 'everyone',
			words: typeof p.wordcount === 'number' ? p.wordcount : 0,
			reactions: typeof p.reaction_count === 'number' ? p.reaction_count : 0,
			comments: typeof p.comment_count === 'number' ? p.comment_count : 0,
			restacks: Array.isArray(p.restacks) ? p.restacks.length : 0,
			hasCover: !!text(p.cover_image),
			seoTitle: text(p.search_engine_title) || null,
			seoDescription: text(p.search_engine_description) || null,
			section: text(p.section_name) || null,
			description: text(p.description),
			socialTitle: text(p.social_title) || null
		}))
		.filter((p) => p.title);
}

/**
 * Lee un newsletter de Substack. Lanza `UnreadableError` si la URL no es una
 * publicación de Substack o no se deja leer.
 */
export async function collectNewsletter(rawUrl: string): Promise<NewsletterSnapshot> {
	const origin = toOrigin(rawUrl);

	const [homeResponse, archiveResponse] = await Promise.all([
		get(origin, 'text/html'),
		get(new URL(`/api/v1/archive?sort=new&limit=${POSTS}`, origin), 'application/json')
	]);

	if (homeResponse.status === 404) throw new UnreadableError('not_found');
	if (!homeResponse.ok) throw new UnreadableError('blocked');

	const html = await body(homeResponse);
	// `subscriberCountDetails` y `welcomePageData` cuelgan de la raíz, no de `pub`.
	const root = preloads(html);
	const pub = (root.pub ?? {}) as Record<string, unknown>;
	const welcome = (root.welcomePageData ?? {}) as Record<string, unknown>;

	// Sin objeto de publicación y sin archivo, esto no es un Substack.
	let posts: NewsletterPost[] = [];
	if (archiveResponse.ok) {
		try {
			posts = readPosts(JSON.parse(await body(archiveResponse)));
		} catch {
			posts = [];
		}
	}
	if (!pub.name && posts.length === 0) throw new UnreadableError('empty');

	return {
		url: origin.toString().replace(/\/$/, ''),
		name: text(pub.name),
		tagline: text(pub.hero_text),
		authorName: text(pub.author_name),
		authorBio: text(pub.author_bio),
		language: text(pub.language),
		hasLogo: !!text(pub.logo_url),
		hasCoverPhoto: !!text(pub.cover_photo_url),
		brandColor: text(pub.theme_var_background_pop) || null,
		customDomain: text(pub.custom_domain) || null,
		paymentsEnabled: text(pub.payments_state) === 'enabled',
		pageTitle: decode(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? '').trim(),
		metaDescription: meta(html, 'description'),
		ogImage: meta(html, 'og:image') || null,
		h1: tags(html, 'h1'),
		buttons: tags(html, 'button'),
		posts,

		subscriberCount: count(pub.freeSubscriberCount),
		subscriberCountLabel: text(root.subscriberCountDetails),
		rankingDetail: text(pub.rankingDetail),
		bestsellerTier: num(pub.author_bestseller_tier) ?? 0,
		hasRecommendations: bool(pub.has_recommendations),
		showRecsOnHomepage: bool(pub.show_recs_on_homepage),
		welcomeBlurbs: Array.isArray(welcome.blurbs) ? welcome.blurbs.length : 0,

		// `showIntroModule` es el único de los tres que Substack manda siempre como
		// booleano; los `hide_intro_*` llegan a null cuando no se han tocado.
		showIntroModule: bool(pub.showIntroModule),
		hideIntroTitle: bool(pub.hide_intro_title),
		hideIntroSubtitle: bool(pub.hide_intro_subtitle),
		homepageType: text(pub.homepage_type),

		noIndex: bool(pub.no_index),
		noFollow: bool(pub.no_follow),

		firstPostDate: text(pub.first_post_date),
		createdAt: text(pub.created_at),
		emailFromName: text(pub.email_from_name),
		postPreviewLimit: num(pub.post_preview_limit),
		inviteOnly: bool(pub.invite_only),
		planCount: Array.isArray(pub.plans) ? pub.plans.length : 0
	};
}

/**
 * Los cuerpos de hasta `POST_BODIES` posts, para mirar dentro: si hay CTA, cómo
 * cierran, cuántos enlaces salen.
 *
 * El cuerpo NO se puede sacar del archivo (`body_html` llega vacía) ni de
 * `/api/v1/posts/by-slug/{slug}`, que responde 302 a la página. Hay que bajar
 * `/p/{slug}` y sacarlo de `_preloads.post`.
 *
 * Va por `get()`, así que hereda el guard SSRF y el tope de bytes. Un post que
 * falle se cae de la lista sin tumbar la evaluación: con tres cuerpos ya se ve
 * si hay patrón, y quedarse sin ninguno solo significa que esas reglas no salen.
 */
export async function collectPostBodies(origin: string, slugs: string[]): Promise<PostBody[]> {
	let base: URL;
	try {
		base = new URL(origin);
	} catch {
		return [];
	}

	const bodies = await Promise.all(
		slugs.slice(0, POST_BODIES).map(async (slug): Promise<PostBody | null> => {
			try {
				const response = await get(new URL(`/p/${encodeURIComponent(slug)}`, base), 'text/html');
				if (!response.ok) return null;
				const post = (preloads(await body(response)).post ?? {}) as Record<string, unknown>;
				const postHtml = text(post.body_html);
				if (!postHtml) return null;
				return {
					slug,
					title: text(post.title),
					date: text(post.post_date),
					html: postHtml,
					text: toPlainText(postHtml)
				};
			} catch {
				return null;
			}
		})
	);

	return bodies.filter((b): b is PostBody => b !== null);
}
