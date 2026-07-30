import { Resend } from 'resend';
import { env } from '$env/dynamic/private';
import { env as publicEnv } from '$env/dynamic/public';
import { renderEmail, renderStandalone } from './emails';
import { signEmail } from './tokens';
import toolCopyTemplate from '../emails/tool-7-frameworks.md?raw';
import toolNewsletterTemplate from '../emails/tool-newsletter.md?raw';

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

/**
 * Deliver the copy tool's output. `copiesMarkdown` is the seven generated
 * frameworks already formatted as markdown; it replaces `{{COPIES}}` in
 * `src/lib/emails/tool-7-frameworks.md`.
 */
export async function sendToolCopyEmail(to: string, copiesMarkdown: string): Promise<void> {
	const from = env.RESEND_FROM;
	if (!from) throw new Error('RESEND_FROM no configurada');
	const url = unsubscribeUrl(to);
	const rendered = renderStandalone(toolCopyTemplate, url, { COPIES: copiesMarkdown });

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
}

/**
 * Envía el informe completo de /tool/newsletter. En pantalla solo quedan las
 * cifras y el nicho; todo lo demás vive en este correo.
 */
export async function sendNewsletterReportEmail(to: string, reportMarkdown: string): Promise<void> {
	const from = env.RESEND_FROM;
	if (!from) throw new Error('RESEND_FROM no configurada');
	const url = unsubscribeUrl(to);
	const rendered = renderStandalone(toolNewsletterTemplate, url, { REPORT: reportMarkdown });

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
}
