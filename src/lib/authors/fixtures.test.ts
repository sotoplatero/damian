import { describe, it, expect } from 'vitest';
import { deepFixture, youngFixture, tinyFixture, DEEP_CREATED_AT } from './fixtures';

describe('fixtures', () => {
	it('el archivo profundo lleva las trampas medidas', () => {
		const posts = deepFixture();
		expect(posts.some((p) => p.date.startsWith('2000-01-01'))).toBe(true);
		expect(posts.some((p) => p.date < DEEP_CREATED_AT)).toBe(true);
		expect(posts.some((p) => p.type === 'restack')).toBe(true);
		expect(posts.some((p) => p.type === 'podcast')).toBe(true);
		expect(posts.some((p) => p.audience === 'only_paid')).toBe(true);
	});

	it('los fixtures pequeños tienen el tamaño que dicen', () => {
		expect(youngFixture()).toHaveLength(6);
		expect(tinyFixture()).toHaveLength(3);
	});
});
