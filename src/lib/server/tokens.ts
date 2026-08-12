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
	return sameString(token, expected);
}

function sameString(given: string, expected: string): boolean {
	const a = Buffer.from(given);
	const b = Buffer.from(expected);
	return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * A short-lived pass: proof that this exact claim was granted here, and when.
 *
 * `/tool/archive` needs it because the download is not one request any more — the
 * browser asks for one batch of post bodies at a time and keeps asking. The first
 * call is the one that checks the address, subscribes it and spends the limit; if
 * the later ones only carried a publication slug, anyone could skip straight to
 * them and use the tool as a free scraper with no address at all.
 *
 * It is a signature and not a stored session on purpose: there is no store in this
 * project, and a pass that lives in its own bytes works across instances.
 *
 * The timestamp travels in the clear and is signed with the rest, so it can't be
 * pushed forward to keep a pass alive — the age is checked by whoever verifies it.
 */
export function signPass(claim: string, at: number): string {
	const secret = env.UNSUBSCRIBE_SECRET;
	if (!secret) throw new Error('UNSUBSCRIBE_SECRET no configurada');
	const mac = createHmac('sha256', secret).update(`${at}|${claim}`).digest('base64url');
	return `${at}.${mac}`;
}

export function verifyPass(claim: string, pass: string, maxAgeMs: number): boolean {
	const dot = pass.indexOf('.');
	if (dot <= 0) return false;
	const at = Number(pass.slice(0, dot));
	if (!Number.isFinite(at)) return false;
	// A pass from the future is either a clock problem or a forgery attempt.
	const age = Date.now() - at;
	if (age < -60_000 || age > maxAgeMs) return false;
	try {
		return sameString(pass, signPass(claim, at));
	} catch {
		return false;
	}
}
