import { describe, it, expect } from 'vitest';
import { preloads } from './substack';

/**
 * Every Substack reader in this site starts here: an empty object means "not a
 * Substack", so a shape this misses fails every publication at once.
 */
describe('preloads', () => {
	const data = { pub: { name: 'Kloshletter' }, post: { body_html: '<p>a</p></script>' } };

	// Measured: Substack writes every `<` inside the tag as `\u003c`, which is what
	// keeps a body's own `</script>` from closing it.
	it('reads the JSON script tag Substack ships since October 2026', () => {
		const html =
			`<script type="application/json" id="preloads-json">${JSON.stringify(data).replaceAll('<', '\\u003c')}</script>` +
			`<script>window._preloads = JSON.parse(document.querySelector('script#preloads-json[type="application/json"]').textContent)</script>`;
		expect(preloads(html)).toEqual(data);
	});

	it('reads the escaped string inside JSON.parse', () => {
		const html = `<script>window._preloads = JSON.parse(${JSON.stringify(JSON.stringify(data))})</script>`;
		expect(preloads(html)).toEqual(data);
	});

	it('reads a bare object literal', () => {
		const html = `<script>window._preloads = ${JSON.stringify({ pub: { name: 'K' } })};</script>`;
		expect(preloads(html)).toEqual({ pub: { name: 'K' } });
	});

	it('returns an empty object for a page that is not a Substack', () => {
		expect(preloads('<html><body>hola</body></html>')).toEqual({});
	});
});
