import { describe, expect, it } from 'vitest';
import { resources, resourceHref, findResource, splitHeadline } from './list';
import { cardFor } from '$lib/og-cards';

/*
 * The resource list is now the whole lead magnet — page, card, share image and
 * delivery all read from it — so what used to be a mistake in one route file is
 * now a mistake on four surfaces. These are the invariants that a new entry can
 * break without TypeScript noticing, because every one of them is about the
 * CONTENT of a string and not its type.
 */

describe('splitHeadline', () => {
	it('splits a headline into the part before the mark, the mark, and the rest', () => {
		expect(splitHeadline('Nadie construye la herramienta que te falta', 'que te falta')).toEqual([
			'Nadie construye la herramienta ',
			'que te falta',
			''
		]);
	});

	it('keeps the mark in the middle when the headline continues after it', () => {
		expect(splitHeadline('Olvida lo que dice: ¿qué hizo? Eso importa', '¿qué hizo?')).toEqual([
			'Olvida lo que dice: ',
			'¿qué hizo?',
			' Eso importa'
		]);
	});

	/*
	 * The degradation that matters: a headline whose mark cannot be found still
	 * has to READ. It comes back whole in the first slot, so the page paints it
	 * with no orange rule under it rather than painting nothing.
	 */
	it('returns the headline whole when the mark is not in it', () => {
		expect(splitHeadline('Un titular cualquiera', 'no está aquí')).toEqual([
			'Un titular cualquiera',
			'',
			''
		]);
	});

	it('returns the headline whole when there is no mark at all', () => {
		expect(splitHeadline('Un titular cualquiera', '')).toEqual(['Un titular cualquiera', '', '']);
	});

	it('marks the first occurrence when the fragment repeats', () => {
		expect(splitHeadline('otra vez y otra vez', 'otra vez')).toEqual(['', 'otra vez', ' y otra vez']);
	});
});

describe('the resources themselves', () => {
	it('has at least one', () => {
		expect(resources.length).toBeGreaterThan(0);
	});

	it('gives every resource a unique slug', () => {
		const slugs = resources.map((resource) => resource.slug);
		expect(new Set(slugs).size).toBe(slugs.length);
	});

	it('uses url-safe slugs, because the slug IS the address', () => {
		for (const resource of resources) {
			expect(resource.slug, resource.name).toMatch(/^[a-z0-9-]+$/);
		}
	});

	/*
	 * This is the one that earns its keep. `mark` is a fragment of `headline`, and
	 * nothing but reading the page tells you when it stops being one — an edit to
	 * the headline that forgets the mark loses the highlight silently, on a live
	 * page, in the one element the design gives its only colour to.
	 */
	it('marks a fragment that is really in the headline', () => {
		for (const resource of resources) {
			expect(resource.headline, resource.slug).toContain(resource.mark);
		}
	});

	it('says what is inside the file, which is the reason the page exists', () => {
		for (const resource of resources) {
			expect(resource.contents.length, resource.slug).toBeGreaterThan(0);
			for (const item of resource.contents) {
				expect(item.trim(), resource.slug).not.toBe('');
			}
		}
	});

	it('names a format, because the card and the heading both print it', () => {
		for (const resource of resources) {
			expect(resource.format.trim(), resource.slug).not.toBe('');
		}
	});

	/*
	 * The requirement sentence is assembled around a link, so an empty `before`
	 * would start the sentence on the link itself and an empty `linkLabel` would
	 * render a link with nothing to click.
	 */
	it('builds a whole sentence around the requirement link when there is one', () => {
		for (const resource of resources) {
			if (!resource.requirement) continue;
			const { before, linkLabel, href } = resource.requirement;
			expect(before.trim(), resource.slug).not.toBe('');
			expect(linkLabel.trim(), resource.slug).not.toBe('');
			expect(href, resource.slug).toMatch(/^(https?:\/\/|\/)/);
		}
	});

	it('gives every resource its own meta title and description', () => {
		for (const resource of resources) {
			expect(resource.title.trim(), resource.slug).not.toBe('');
			expect(resource.description.trim(), resource.slug).not.toBe('');
		}
	});
});

describe('addressing a resource', () => {
	it('builds the href from the slug', () => {
		expect(resourceHref({ slug: 'cervantes' })).toBe('/recursos/cervantes');
	});

	it('finds a resource by the slug in the url', () => {
		expect(findResource(resources[0].slug)?.name).toBe(resources[0].name);
	});

	it('finds nothing for a slug that is not one, which is the 404', () => {
		expect(findResource('no-existe')).toBeUndefined();
	});

	/*
	 * The share card is looked up by the same slug the route is. It used to be
	 * looked up by stripping `/recursos/` off an `href` field that no longer
	 * exists, so this is the test that would have caught that refactor leaving
	 * every download without a card.
	 */
	it('still has a share card, looked up by that same slug', () => {
		for (const resource of resources) {
			expect(cardFor(resource.slug), resource.slug).toMatchObject({
				title: resource.name,
				tag: 'descarga gratis'
			});
		}
	});
});
