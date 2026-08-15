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
import toolArchiveTemplate from '../emails/tool-archive.md?raw';
import courseTemplate from '../emails/course.md?raw';
import resourceCervantesTemplate from '../emails/resource-cervantes.md?raw';
import resourceAuthorAnalysisTemplate from '../emails/resource-analisis-de-autor.md?raw';

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
/**
 * A file to attach. `content` is text or raw bytes: `/tool/repurpose` sends a
 * prompt as a string, `/tool/archive` sends a zip the browser built and posted
 * back, and both end up as a Buffer here.
 */
type Attachment = { filename: string; content: string | Uint8Array };

async function sendToolEmail(template: string, marker: string, to: string, markdown: string, attachment?: Attachment): Promise<void> {
	const from = env.RESEND_FROM;
	if (!from) throw new Error('RESEND_FROM no configurada');
	const url = unsubscribeUrl(to);
	const rendered = renderStandalone(template, url, { [marker]: markdown });

	const bytes = (content: string | Uint8Array) =>
		typeof content === 'string' ? Buffer.from(content, 'utf8') : Buffer.from(content);

	const { error } = await client().emails.send({
		from,
		to,
		subject: rendered.subject,
		html: rendered.html,
		...(attachment ? { attachments: [{ filename: attachment.filename, content: bytes(attachment.content) }] } : {}),
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
 * Deliver the archive export: the zip goes ATTACHED, not linked.
 *
 * It is the only tool whose file this site never holds. The browser assembles it
 * batch by batch and posts it back to be sent, so there is nothing to link TO —
 * and that is also why the mail matters more here than anywhere else: it is the
 * only copy that survives closing the tab.
 */
export async function sendArchiveEmail(
	to: string,
	summaryMarkdown: string,
	attachment: { filename: string; content: Uint8Array }
): Promise<void> {
	await sendToolEmail(toolArchiveTemplate, 'RESUMEN', to, summaryMarkdown, attachment);
}

/**
 * Deliver a `/recursos/*` download: the link to the ZIP, nothing generated.
 *
 * It takes the tools' shell even though there is no model output to carry —
 * `{{DOWNLOAD}}` is a URL, not a report. That keeps the unsubscribe header, the
 * one-click list header and the same styling as every other mail; a second
 * sender written just for this would drift away from all three.
 *
 * `origin` comes from the request and `PUBLIC_SITE_URL` only overrides it. The
 * unsubscribe link can afford to trust that variable, because a broken one is
 * visible the moment anyone reports it; a broken download link is the whole
 * point of the mail, and the variable is NOT set in the local `.env` — the first
 * test send went out pointing at `/cervantes.zip` with no host in front of it.
 */
async function sendResourceEmail(template: string, to: string, origin: string, file: string): Promise<void> {
	const base = (publicEnv.PUBLIC_SITE_URL || origin).replace(/\/$/, '');
	await sendToolEmail(template, 'DOWNLOAD', to, `${base}/${file}`);
}

/**
 * Cervantes. The URL carries no version on purpose: Cervantes has no version
 * marker by design — a newer one is a new folder the author moves into — so a
 * link mailed months ago has to keep giving the latest. Publishing a new build
 * is overwriting `static/cervantes.zip`.
 */
export async function sendCervantesEmail(to: string, origin: string): Promise<void> {
	await sendResourceEmail(resourceCervantesTemplate, to, origin, 'cervantes.zip');
}

/**
 * The author-archive analysis pack. Here the two names in the filename ARE the
 * content — the pack ships one worked analysis per author — so unlike Cervantes
 * this file is not overwritten in place: another pair of authors is another ZIP
 * and another resource.
 */
export async function sendAuthorAnalysisEmail(to: string, origin: string): Promise<void> {
	await sendResourceEmail(
		resourceAuthorAnalysisTemplate,
		to,
		origin,
		'paquete-analisis-dan-koe-hussain-ibarra.zip'
	);
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
