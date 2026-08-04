import { assertPublicUrl, BROWSER_UA, UnreadableError } from './scrape';

// Re-exported so consumers of this module don't need to import from scrape.
export { UnreadableError };

/**
 * The shared plumbing for talking to Substack: request, read with a cap,
 * unescape entities, and pull out `window._preloads`.
 *
 * This used to live inside `newsletter.ts` and moved here when Wrapped needed
 * the same thing. Don't copy it to a third place: the double `JSON.parse` of
 * `_preloads` and the SSRF guard are code that was expensive to figure out,
 * and two copies drift out of sync.
 */

const TIMEOUT_MS = 10_000;
const MAX_BYTES = 3 * 1024 * 1024;

/** Normalizes whatever the visitor types to the publication's homepage. */
export function toOrigin(raw: string): URL {
	const trimmed = raw.trim();
	if (!trimmed) throw new UnreadableError('invalid_url');
	try {
		const url = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
		// Doesn't matter if they paste a specific post: we keep just the origin.
		return new URL(url.origin);
	} catch {
		throw new UnreadableError('invalid_url');
	}
}

export async function get(url: URL, accept: string): Promise<Response> {
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

export async function readBody(response: Response): Promise<string> {
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

export function decode(input: string): string {
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

/**
 * Pulls the publication object out of `window._preloads`. Substack embeds it
 * as an escaped JSON string inside `JSON.parse("...")`, so there are two
 * rounds of parsing.
 */
export function preloads(html: string): Record<string, unknown> {
	const escaped = html.match(/window\._preloads\s*=\s*JSON\.parse\("((?:\\.|[^"\\])*)"\)/);
	if (escaped) {
		try {
			return JSON.parse(JSON.parse(`"${escaped[1]}"`));
		} catch {
			/* fall through to the next attempt */
		}
	}
	const plain = html.match(/window\._preloads\s*=\s*(\{[\s\S]*?\})\s*;?\s*<\/script>/);
	if (plain) {
		try {
			return JSON.parse(plain[1]);
		} catch {
			/* nothing more to try */
		}
	}
	return {};
}
