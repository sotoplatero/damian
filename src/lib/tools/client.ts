/**
 * The client half every tool page shares: one POST helper and one map from the
 * server's error codes to the page's copy strings.
 *
 * Every tool endpoint speaks the same protocol — JSON in, JSON out, and on
 * failure `{ error, reason? }` with an HTTP error status. The copy files all
 * name their strings the same way (`errorInvalidEmail`, `errorRateLimit`...),
 * so one code→key map serves all the tools: a tool whose copy lacks a key
 * falls back to its own `errorGeneric`.
 */
import { tick } from 'svelte';

export type Copy = Record<string, string>;

const CODE_KEYS: Record<string, string> = {
	unreadable: 'errorUnreadable',
	invalid_url: 'errorInvalidUrl',
	idea_short: 'errorIdeaShort',
	invalid_email: 'errorInvalidEmail',
	disposable: 'errorDisposable',
	send_failed: 'errorSendFailed',
	rate_limit: 'errorRateLimit'
};

/** Refinements of `unreadable`: why the page couldn't be read. */
const REASON_KEYS: Record<string, string> = {
	blocked: 'errorBlocked',
	not_found: 'errorNotFound',
	timeout: 'errorTimeout',
	empty: 'errorEmpty',
	invalid_url: 'errorInvalidUrl'
};

export function errorMessage(t: Copy, code: unknown, reason?: unknown): string {
	if (code === 'unreadable') {
		const key = REASON_KEYS[String(reason)];
		if (key && t[key]) return t[key];
	}
	const key = CODE_KEYS[String(code)];
	return (key && t[key]) || t.errorGeneric;
}

/** POST to a tool endpoint. Throws an Error already carrying the copy's message. */
export async function postTool<T = Record<string, unknown>>(
	endpoint: string,
	payload: Record<string, unknown>,
	t: Copy
): Promise<T> {
	const response = await fetch(endpoint, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(payload)
	});
	const data = await response.json().catch(() => ({}));
	if (!response.ok) throw new Error(errorMessage(t, data?.error, data?.reason));
	return data as T;
}

/**
 * Scroll the freshly painted result into view. Waits a tick so the `#resultado`
 * section exists before looking for it.
 */
export async function revealResult(): Promise<void> {
	await tick();
	document.getElementById('resultado')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
