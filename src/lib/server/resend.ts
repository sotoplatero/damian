import { Resend } from 'resend';
import { env } from '$env/dynamic/private';
import { env as publicEnv } from '$env/dynamic/public';
import { renderStandalone } from './emails';
import { signEmail } from './tokens';
import toolCopyTemplate from '../emails/tool-7-frameworks.md?raw';
import toolNewsletterTemplate from '../emails/tool-newsletter.md?raw';
import toolPostsTemplate from '../emails/tool-10-post-types.md?raw';
import toolRepurposeTemplate from '../emails/tool-repurpose.md?raw';
import toolSubstackAboutTemplate from '../emails/tool-substack-about.md?raw';
import courseTemplate from '../emails/course.md?raw';

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

/**
 * Deliver the copy tool's output. `copiesMarkdown` is the seven generated
 * frameworks already formatted as markdown; it replaces `{{COPIES}}` in
 * `src/lib/emails/tool-7-frameworks.md`.
 */
type TextAttachment = { filename: string; content: string };

async function sendToolEmail(template: string, marker: string, to: string, markdown: string, attachment?: TextAttachment): Promise<void> {
	const from = env.RESEND_FROM;
	if (!from) throw new Error('RESEND_FROM no configurada');
	const url = unsubscribeUrl(to);
	const rendered = renderStandalone(template, url, { [marker]: markdown });

	const { error } = await client().emails.send({
		from,
		to,
		subject: rendered.subject,
		html: rendered.html,
		...(attachment ? { attachments: [{ filename: attachment.filename, content: Buffer.from(attachment.content, 'utf8') }] } : {}),
		headers: {
			'List-Unsubscribe': `<${url}>`,
			'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click'
		}
	});
	if (error) throw new Error(error.message);
}

export async function sendToolCopyEmail(to: string, copiesMarkdown: string): Promise<void> {
	await sendToolEmail(toolCopyTemplate, 'COPIES', to, copiesMarkdown);
}

/**
 * Deliver the 10-post-types tool's output. `postsMarkdown` is the ten generated
 * posts already formatted as markdown; it replaces `{{POSTS}}` in
 * `src/lib/emails/tool-10-post-types.md`.
 */
export async function sendToolPostsEmail(to: string, postsMarkdown: string): Promise<void> {
	await sendToolEmail(toolPostsTemplate, 'POSTS', to, postsMarkdown);
}

/**
 * Envía el informe completo de /tool/newsletter. En pantalla solo quedan las
 * cifras y el nicho; todo lo demás vive en este correo.
 */
export async function sendNewsletterReportEmail(to: string, reportMarkdown: string): Promise<void> {
	await sendToolEmail(toolNewsletterTemplate, 'REPORT', to, reportMarkdown);
}

export async function sendToolPiecesEmail(to: string, piecesMarkdown: string, manualPrompt: string): Promise<void> {
	await sendToolEmail(toolRepurposeTemplate, 'PIECES', to, piecesMarkdown, {
		filename: 'prompt-distribuye-tu-articulo.txt',
		content: manualPrompt
	});
}

export async function sendSubstackAboutEmail(to: string, reportMarkdown: string): Promise<void> {
	await sendToolEmail(toolSubstackAboutTemplate, 'REPORT', to, reportMarkdown);
}

/**
 * Deliver what someone did in a `/course/[slug]` run.
 *
 * Shares the shell with the tools but SUBSCRIBES NOBODY: the endpoint never
 * calls `subscribe()`. Courses are private demos to show the creator whose
 * content they're built on, and adding that creator to Damian's mailing list for
 * trying their own demo is the opposite of the point. If one ever ships as lead
 * capture, the signup goes there in plain sight, not hidden in here.
 */
export async function sendCourseEmail(to: string, reportMarkdown: string): Promise<void> {
	await sendToolEmail(courseTemplate, 'REPORT', to, reportMarkdown);
}
