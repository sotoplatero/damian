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
 */

const TIMEOUT_MS = 10_000;
const MAX_BYTES = 3 * 1024 * 1024;
/** Suficiente para ver la cadencia y los patrones sin descargar el archivo entero. */
const POSTS = 20;

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
};

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
};

function text(value: unknown): string {
	return typeof value === 'string' ? value : '';
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
			section: text(p.section_name) || null
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
	const pub = (preloads(html).pub ?? {}) as Record<string, unknown>;

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
		posts
	};
}
