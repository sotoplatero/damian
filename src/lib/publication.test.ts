import { describe, expect, it } from 'vitest';
import { PUBLICATION_URL, PUBLICATION_EMBED_URL, subscribeUrl } from './publication';

/*
 * The hero's form builds a URL and sends the browser to it, so a wrong URL is a
 * lost subscriber and nothing in the app throws. Encoding is the part worth
 * pinning: a `+` in an address is legal (gmail tags), and unencoded it arrives at
 * Substack as a space.
 */

describe('subscribeUrl', () => {
	it('carries the address to Substack prefilled', () => {
		expect(subscribeUrl('ana@ejemplo.com')).toBe(
			'https://sotoplatero.substack.com/subscribe?email=ana%40ejemplo.com'
		);
	});

	it('encodes a plus, which is legal in an address and would arrive as a space', () => {
		expect(subscribeUrl('ana+objeto@ejemplo.com')).toContain('ana%2Bobjeto%40ejemplo.com');
	});

	it('trims what was typed, because a trailing space is a pasted address', () => {
		expect(subscribeUrl('  ana@ejemplo.com ')).toBe(
			'https://sotoplatero.substack.com/subscribe?email=ana%40ejemplo.com'
		);
	});

	/*
	 * Unreachable through the form — the field is `required` — but the fallback is
	 * Substack's own subscribe page rather than `?email=`, so the worst case is a
	 * working page and not a broken query string.
	 */
	it('falls back to the bare subscribe page when there is nothing to carry', () => {
		expect(subscribeUrl('')).toBe('https://sotoplatero.substack.com/subscribe');
		expect(subscribeUrl('   ')).toBe('https://sotoplatero.substack.com/subscribe');
	});
});

describe('the publication addresses', () => {
	it('has no trailing slash, so every path built from it has exactly one', () => {
		expect(PUBLICATION_URL).not.toMatch(/\/$/);
		expect(PUBLICATION_EMBED_URL).toBe(`${PUBLICATION_URL}/embed`);
	});

	it('is https, because the iframe and the handoff both carry an address', () => {
		expect(PUBLICATION_URL.startsWith('https://')).toBe(true);
	});
});
