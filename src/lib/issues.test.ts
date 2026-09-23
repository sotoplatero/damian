import { describe, expect, it } from 'vitest';
import { shortDate, toIssues } from './issues';

const post = (over: Record<string, unknown> = {}) => ({
	type: 'newsletter',
	title: 'Sistema Operativo',
	canonical_url: 'https://sotoplatero.substack.com/p/sistema-operativo',
	post_date: '2026-09-18T12:00:00.000Z',
	...over
});

describe('toIssues', () => {
	it('keeps title, url and the date only', () => {
		expect(toIssues([post()])).toEqual([
			{
				title: 'Sistema Operativo',
				url: 'https://sotoplatero.substack.com/p/sistema-operativo',
				date: '2026-09-18'
			}
		]);
	});

	it('stops at the limit', () => {
		expect(toIssues([post(), post(), post(), post()], 3)).toHaveLength(3);
	});

	it('drops podcasts and entries missing a field', () => {
		const issues = toIssues([
			post({ type: 'podcast' }),
			post({ title: '  ' }),
			post({ canonical_url: 'javascript:alert(1)' }),
			post({ post_date: 'ayer' }),
			post({ title: 'La buena' })
		]);
		expect(issues.map((issue) => issue.title)).toEqual(['La buena']);
	});

	it('returns nothing for a payload that is not a list', () => {
		expect(toIssues({ error: 'nope' })).toEqual([]);
		expect(toIssues(null)).toEqual([]);
	});
});

describe('shortDate', () => {
	it('writes the day and the Spanish month', () => {
		expect(shortDate('2026-09-05')).toBe('5 sep');
		expect(shortDate('2026-01-31')).toBe('31 ene');
	});
});
