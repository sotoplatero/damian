import { createHmac, timingSafeEqual } from 'node:crypto';
import { env } from '$env/dynamic/private';

/** Sign an email into an opaque token so unsubscribe links can't be forged for others. */
export function signEmail(email: string): string {
	const secret = env.UNSUBSCRIBE_SECRET;
	if (!secret) throw new Error('UNSUBSCRIBE_SECRET no configurada');
	return createHmac('sha256', secret).update(email.toLowerCase()).digest('base64url');
}

/** Constant-time check that `token` matches `email`. */
export function verifyEmail(email: string, token: string): boolean {
	if (!email || !token) return false;
	let expected: string;
	try {
		expected = signEmail(email);
	} catch {
		return false;
	}
	const a = Buffer.from(token);
	const b = Buffer.from(expected);
	return a.length === b.length && timingSafeEqual(a, b);
}
