import { describe, it, expect } from 'vitest';
import { slugFromUrl, originsForSlug, isValidSlug } from './slug';

describe('slugFromUrl', () => {
	it('a substack subdomain stays as its name', () => {
		expect(slugFromUrl('https://kloshletter.substack.com')).toBe('kloshletter');
		expect(slugFromUrl('kloshletter.substack.com')).toBe('kloshletter');
	});

	it('does not matter if a specific post URL is pasted', () => {
		expect(slugFromUrl('https://kloshletter.substack.com/p/algo?utm=x')).toBe('kloshletter');
	});

	it('a custom domain keeps the domain and drops the www', () => {
		expect(slugFromUrl('https://www.honest-broker.com')).toBe('honest-broker.com');
		expect(slugFromUrl('https://honest-broker.com/archive')).toBe('honest-broker.com');
	});

	it('rejects what is not a URL', () => {
		expect(slugFromUrl('')).toBe(null);
		expect(slugFromUrl('no es una url')).toBe(null);
		expect(slugFromUrl('ftp://algo.com')).toBe(null);
	});
});

describe('originsForSlug', () => {
	it('a slug without a dot is a substack subdomain', () => {
		expect(originsForSlug('kloshletter')).toEqual(['https://kloshletter.substack.com']);
	});

	it('a slug with a dot is tried bare and with www', () => {
		// Measured: honest-broker.com bare returns 404 and only answers on www.
		expect(originsForSlug('honest-broker.com')).toEqual([
			'https://honest-broker.com',
			'https://www.honest-broker.com'
		]);
	});
});

describe('isValidSlug', () => {
	it('accepts what slugFromUrl produces and rejects the rest', () => {
		expect(isValidSlug('kloshletter')).toBe(true);
		expect(isValidSlug('honest-broker.com')).toBe(true);
		expect(isValidSlug('../etc/passwd')).toBe(false);
		expect(isValidSlug('algo con espacios')).toBe(false);
		expect(isValidSlug('a'.repeat(200))).toBe(false);
	});
});
