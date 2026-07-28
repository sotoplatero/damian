import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';

/**
 * Descarga una página pública y devuelve su texto limpio.
 *
 * Este módulo recibe URLs escritas por cualquiera que entre en el tool, así que
 * antes de descargar nada comprueba que la URL no apunte a la red interna
 * (SSRF). Sin esas comprobaciones, un visitante podría pedirnos
 * `http://169.254.169.254/` y leer los metadatos internos del servidor.
 */

const TIMEOUT_MS = 8_000;
const MAX_BYTES = 2 * 1024 * 1024;
const MAX_REDIRECTS = 3;
/** Suficiente para entender una oferta sin inflar la factura del modelo. */
const MAX_CHARS = 6_000;
/** Por debajo de esto la página no dice nada útil (SPA vacía, muro de Cloudflare...). */
const MIN_USEFUL_CHARS = 180;

const UA =
	'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

export type ScrapeResult = { title: string; description: string; text: string };

export type UnreadableReason = 'blocked' | 'not_found' | 'timeout' | 'empty' | 'invalid_url';

/** Falla esperada: la página no se deja leer. Quien llama se lo dice al visitante. */
export class UnreadableError extends Error {
	reason: UnreadableReason;

	constructor(reason: UnreadableReason) {
		super(reason);
		this.name = 'UnreadableError';
		this.reason = reason;
	}
}

function ipv4ToInt(ip: string): number {
	return ip.split('.').reduce((acc, octet) => acc * 256 + Number(octet), 0);
}

/** Rangos que nunca deben alcanzarse desde aquí: loopback, red local, metadatos de nube. */
function isPrivateIPv4(ip: string): boolean {
	const value = ipv4ToInt(ip);
	const ranges: [string, number][] = [
		['0.0.0.0', 8], // "este" host
		['10.0.0.0', 8], // privada
		['100.64.0.0', 10], // CGNAT
		['127.0.0.0', 8], // loopback
		['169.254.0.0', 16], // link-local — aquí viven los metadatos de AWS/GCP
		['172.16.0.0', 12], // privada
		['192.0.0.0', 24], // reservada IETF
		['192.168.0.0', 16], // privada
		['198.18.0.0', 15], // benchmarking
		['224.0.0.0', 4], // multicast
		['240.0.0.0', 4] // reservada
	];
	return ranges.some(([base, bits]) => {
		const mask = bits === 0 ? 0 : (-1 << (32 - bits)) >>> 0;
		return (value & mask) >>> 0 === (ipv4ToInt(base) & mask) >>> 0;
	});
}

function isPrivateIPv6(ip: string): boolean {
	const address = ip.toLowerCase().split('%')[0];
	if (address === '::' || address === '::1') return true;
	// IPv4 embebida en IPv6 (::ffff:127.0.0.1) — se valida como IPv4.
	const mapped = address.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
	if (mapped) return isPrivateIPv4(mapped[1]);
	const head = parseInt(address.split(':')[0] || '0', 16);
	if ((head & 0xfe00) === 0xfc00) return true; // fc00::/7 — unique local
	if ((head & 0xffc0) === 0xfe80) return true; // fe80::/10 — link-local
	return false;
}

function isPrivateAddress(ip: string): boolean {
	const version = isIP(ip);
	if (version === 4) return isPrivateIPv4(ip);
	if (version === 6) return isPrivateIPv6(ip);
	return true; // no es una IP reconocible: no arriesgamos
}

/**
 * Valida el destino de una URL antes de pedirla. Lanza si no es segura.
 * Se llama otra vez en cada redirección: si no, un servidor podría aceptar la
 * primera petición y luego reenviarnos a `127.0.0.1`.
 */
async function assertPublicUrl(url: URL): Promise<void> {
	if (url.protocol !== 'http:' && url.protocol !== 'https:') {
		throw new UnreadableError('invalid_url');
	}

	const host = url.hostname.replace(/^\[|\]$/g, '');
	if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local')) {
		throw new UnreadableError('invalid_url');
	}

	// Si el host ya es una IP, se comprueba directamente y no hay DNS que resolver.
	if (isIP(host)) {
		if (isPrivateAddress(host)) throw new UnreadableError('invalid_url');
		return;
	}

	let addresses: { address: string }[];
	try {
		addresses = await lookup(host, { all: true });
	} catch {
		throw new UnreadableError('not_found');
	}

	if (addresses.length === 0) throw new UnreadableError('not_found');
	// Todas las IPs del host tienen que ser públicas: con una privada basta para
	// que un dominio controlado por el atacante apunte a la red interna.
	if (addresses.some((entry) => isPrivateAddress(entry.address))) {
		throw new UnreadableError('invalid_url');
	}
}

/** Lee el cuerpo cortando en MAX_BYTES, para que una descarga enorme no nos tumbe. */
async function readCapped(response: Response): Promise<Uint8Array> {
	const reader = response.body?.getReader();
	if (!reader) return new Uint8Array();

	const chunks: Uint8Array[] = [];
	let total = 0;
	while (total < MAX_BYTES) {
		const { done, value } = await reader.read();
		if (done) break;
		chunks.push(value);
		total += value.length;
	}
	await reader.cancel().catch(() => {});

	const out = new Uint8Array(Math.min(total, MAX_BYTES));
	let offset = 0;
	for (const chunk of chunks) {
		if (offset >= out.length) break;
		const slice = chunk.subarray(0, out.length - offset);
		out.set(slice, offset);
		offset += slice.length;
	}
	return out;
}

/** Sigue las redirecciones a mano, revalidando cada salto. */
async function fetchPage(target: URL): Promise<{ html: string; finalUrl: URL }> {
	let url = target;

	for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
		await assertPublicUrl(url);

		let response: Response;
		try {
			response = await fetch(url, {
				redirect: 'manual',
				signal: AbortSignal.timeout(TIMEOUT_MS),
				headers: {
					'user-agent': UA,
					accept: 'text/html,application/xhtml+xml',
					'accept-language': 'es-ES,es;q=0.9,en;q=0.8'
				}
			});
		} catch (error) {
			throw new UnreadableError(
				error instanceof Error && error.name === 'TimeoutError' ? 'timeout' : 'blocked'
			);
		}

		if (response.status >= 300 && response.status < 400) {
			const location = response.headers.get('location');
			if (!location) throw new UnreadableError('blocked');
			url = new URL(location, url);
			continue;
		}

		if (response.status === 404 || response.status === 410) throw new UnreadableError('not_found');
		if (!response.ok) throw new UnreadableError('blocked');

		const contentType = response.headers.get('content-type') ?? '';
		if (contentType && !/text\/html|application\/xhtml|text\/plain/i.test(contentType)) {
			throw new UnreadableError('empty');
		}

		const bytes = await readCapped(response);
		const charset = contentType.match(/charset=([\w-]+)/i)?.[1] ?? 'utf-8';
		let html: string;
		try {
			html = new TextDecoder(charset).decode(bytes);
		} catch {
			html = new TextDecoder('utf-8').decode(bytes);
		}
		return { html, finalUrl: url };
	}

	throw new UnreadableError('blocked');
}

const ENTITIES: Record<string, string> = {
	amp: '&',
	lt: '<',
	gt: '>',
	quot: '"',
	apos: "'",
	nbsp: ' ',
	iexcl: '¡',
	iquest: '¿',
	laquo: '«',
	raquo: '»',
	hellip: '…',
	mdash: '—',
	ndash: '–',
	eacute: 'é',
	aacute: 'á',
	iacute: 'í',
	oacute: 'ó',
	uacute: 'ú',
	ntilde: 'ñ',
	Ntilde: 'Ñ',
	uuml: 'ü'
};

function decodeEntities(input: string): string {
	return input
		.replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
		.replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number(dec)))
		.replace(/&([a-z]+);/gi, (match, name) => ENTITIES[name] ?? match);
}

function attribute(tag: string, name: string): string {
	const match = tag.match(new RegExp(`${name}\\s*=\\s*("([^"]*)"|'([^']*)')`, 'i'));
	return decodeEntities(match?.[2] ?? match?.[3] ?? '').trim();
}

/** Saca el texto que le importa a un lector, tirando todo lo que es maquinaria. */
export function extractText(html: string): ScrapeResult {
	const title = decodeEntities(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? '').trim();

	let description = '';
	for (const tag of html.match(/<meta[^>]+>/gi) ?? []) {
		const name = (attribute(tag, 'name') || attribute(tag, 'property')).toLowerCase();
		if (name === 'description' || name === 'og:description') {
			description = attribute(tag, 'content');
			if (name === 'description') break;
		}
	}

	const text = html
		.replace(/<!--[\s\S]*?-->/g, ' ')
		.replace(/<(script|style|noscript|svg|iframe|template|head)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ')
		// los bloques se separan en líneas para no pegar frases que no van juntas
		.replace(/<(?:br|\/p|\/div|\/li|\/h[1-6]|\/section|\/tr)[^>]*>/gi, '\n')
		.replace(/<[^>]+>/g, ' ');

	const clean = decodeEntities(text)
		.split('\n')
		.map((line) => line.replace(/\s+/g, ' ').trim())
		.filter(Boolean)
		.join('\n')
		.replace(/\n{3,}/g, '\n\n')
		.slice(0, MAX_CHARS);

	return { title, description, text: clean };
}

/**
 * Punto de entrada: normaliza la URL, descarga y limpia.
 * Lanza `UnreadableError` cuando la página no sirve; quien llama cae al modo manual.
 */
export async function scrape(rawUrl: string): Promise<ScrapeResult & { finalUrl: string }> {
	const trimmed = rawUrl.trim();
	if (!trimmed) throw new UnreadableError('invalid_url');

	let url: URL;
	try {
		// Sin esquema asumimos https: la gente escribe "tuweb.com" a secas.
		url = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
	} catch {
		throw new UnreadableError('invalid_url');
	}

	const { html, finalUrl } = await fetchPage(url);
	const result = extractText(html);

	// Una SPA sin renderizar devuelve un <div id="app"></div> y poco más.
	if (result.text.length + result.description.length < MIN_USEFUL_CHARS) {
		throw new UnreadableError('empty');
	}

	return { ...result, finalUrl: finalUrl.toString() };
}
