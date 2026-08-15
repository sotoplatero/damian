/**
 * The shareable link of a generated tool.
 *
 * THERE IS NO DATABASE, AND THE LINK IS THE STORAGE. The whole spec travels
 * inside the URL, base64url, with an HMAC after it. That is what makes a link
 * survive a redeploy, a cold start and a second serverless instance, none of
 * which the in-memory cache this repo uses for everything else survives.
 *
 * THE SIGNATURE IS NOT DECORATION. Without it, anybody could write their own
 * spec into a URL and run it: our OpenAI key, their prompt, no limit. Signing
 * means the runtime only ever executes specs that came out of the plan step on
 * this site. A tampered link is rejected before the model is ever called.
 *
 * The secret: `ACTIONABLE_SECRET` if it exists, and `UNSUBSCRIBE_SECRET`
 * otherwise, which is the one already configured in production. Without either
 * the tool refuses to build a link — an unsigned link is worse than no link,
 * and a link signed with a hardcoded fallback is an unsigned link with a
 * costume on.
 */
import { createHmac, timingSafeEqual } from 'node:crypto';
import { deflateRawSync, inflateRawSync } from 'node:zlib';
import { env } from '$env/dynamic/private';
import { readSpec, type Spec } from '$lib/tools/actionable/spec';

/**
 * MEASURED: A REAL SPEC DOES NOT FIT RAW. The first plan built from a live
 * article — three fields, ten rules — came to about 2.700 characters of
 * base64 and the endpoint answered `server_error` for a reason nobody could see
 * from outside. Deflated it is around a third of that.
 *
 * The cap is what a link can be without becoming a liability: browsers and CDNs
 * are comfortable well past this, but a URL nobody can paste into a message
 * without it wrapping four times is not a shareable link, and a spec that still
 * doesn't fit compressed has something wrong in it.
 */
const MAX_TOKEN = 2400;

function secret(): string {
	return env.ACTIONABLE_SECRET || env.UNSUBSCRIBE_SECRET || '';
}

function toBase64Url(input: Buffer | string): string {
	return Buffer.from(input).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(input: string): Buffer {
	return Buffer.from(input.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
}

function sign(payload: string, key: string): string {
	return toBase64Url(createHmac('sha256', key).update(payload).digest());
}

/** `null` when there is no secret configured, or when the spec is too big to carry. */
export function encodeTool(spec: Spec): string | null {
	const key = secret();
	if (!key) {
		console.error('[tool/actionable] no hay secreto para firmar el enlace: ACTIONABLE_SECRET o UNSUBSCRIBE_SECRET');
		return null;
	}
	const payload = toBase64Url(deflateRawSync(Buffer.from(JSON.stringify(spec), 'utf8')));
	const token = `${payload}.${sign(payload, key)}`;
	if (token.length > MAX_TOKEN) {
		console.error(`[tool/actionable] la herramienta no cabe en un enlace: ${token.length} caracteres`);
		return null;
	}
	return token;
}

/**
 * Reads a token back into a spec, or `null`.
 *
 * `null` covers a bad signature, a mangled payload and a spec that no longer
 * passes validation — deliberately the same answer for all three. Telling
 * somebody which part of their forged link was wrong is help they haven't
 * earned.
 */
export function decodeTool(token: unknown): Spec | null {
	if (typeof token !== 'string' || token.length > MAX_TOKEN) return null;
	const key = secret();
	if (!key) return null;

	const [payload, signature] = token.split('.');
	if (!payload || !signature) return null;

	const expected = Buffer.from(sign(payload, key));
	const given = Buffer.from(signature);
	// Compare in constant time, and only when the lengths already match:
	// `timingSafeEqual` throws on a length mismatch instead of returning false.
	if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;

	// Only reached once the signature checked out, so this is our own compressed
	// payload — a decompression bomb would have to be one we built ourselves.
	try {
		return readSpec(JSON.parse(inflateRawSync(fromBase64Url(payload)).toString('utf8')));
	} catch {
		return null;
	}
}
