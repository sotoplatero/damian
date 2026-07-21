import { Resend } from 'resend';
import { env } from '$env/dynamic/private';
import { env as publicEnv } from '$env/dynamic/public';
import { renderEmail } from './emails';
import { signEmail } from './tokens';

/** A subscriber as stored in the Resend audience. */
export type Contact = {
	id: string;
	email: string;
	created_at: string;
	unsubscribed: boolean;
};

function client(): Resend {
	const key = env.RESEND_API_KEY;
	if (!key) throw new Error('RESEND_API_KEY no configurada');
	return new Resend(key);
}

function audienceId(): string {
	const id = env.RESEND_AUDIENCE_ID;
	if (!id) throw new Error('RESEND_AUDIENCE_ID no configurada');
	return id;
}

function unsubscribeUrl(email: string): string {
	const base = (publicEnv.PUBLIC_SITE_URL ?? '').replace(/\/$/, '');
	return `${base}/unsubscribe?e=${encodeURIComponent(email)}&t=${signEmail(email)}`;
}

/** Add an email to the audience. Returns 'exists' if it was already there. */
export async function subscribe(email: string): Promise<'created' | 'exists'> {
	const { error } = await client().contacts.create({
		audienceId: audienceId(),
		email,
		unsubscribed: false
	});
	if (error) {
		if (/already exists/i.test(error.message ?? '')) return 'exists';
		throw new Error(error.message);
	}
	return 'created';
}

/** Mark an email as unsubscribed (kept in the audience, skipped by the sequence). */
export async function unsubscribe(email: string): Promise<void> {
	const { error } = await client().contacts.update({
		audienceId: audienceId(),
		email,
		unsubscribed: true
	});
	if (error) throw new Error(error.message);
}

/** All contacts that are still subscribed. */
export async function listActiveContacts(): Promise<Contact[]> {
	const { data, error } = await client().contacts.list({ audienceId: audienceId() });
	if (error) throw new Error(error.message);
	const contacts = (data?.data ?? []) as Contact[];
	return contacts.filter((c) => !c.unsubscribed);
}

/** Send the sequence email at `index` to one recipient. Returns false if that email doesn't exist. */
export async function sendSequenceEmail(to: string, index: number): Promise<boolean> {
	const from = env.RESEND_FROM;
	if (!from) throw new Error('RESEND_FROM no configurada');
	const url = unsubscribeUrl(to);
	const rendered = renderEmail(index, url);
	if (!rendered) return false;

	const { error } = await client().emails.send({
		from,
		to,
		subject: rendered.subject,
		html: rendered.html,
		headers: {
			'List-Unsubscribe': `<${url}>`,
			'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click'
		}
	});
	if (error) throw new Error(error.message);
	return true;
}
