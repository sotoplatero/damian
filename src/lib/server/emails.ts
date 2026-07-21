import { marked } from 'marked';

/**
 * The daily sequence. Each `NN.md` file in `src/lib/emails/` is one email,
 * ordered by filename. Index 0 is the welcome email (the list) sent on signup;
 * indexes 1..N are sent one per day. To extend the sequence, drop a new
 * numbered file (e.g. `04.md`) — no code changes needed.
 */
export type SequenceEmail = { index: number; subject: string; markdown: string };

const modules = import.meta.glob('../emails/*.md', {
	query: '?raw',
	import: 'default',
	eager: true
}) as Record<string, string>;

function parse(raw: string): { subject: string; body: string } {
	let body = raw;
	let subject = '';
	const frontmatter = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
	if (frontmatter) {
		body = raw.slice(frontmatter[0].length);
		for (const line of frontmatter[1].split('\n')) {
			const trimmed = line.trim();
			if (!trimmed || trimmed.startsWith('#')) continue;
			const separator = trimmed.indexOf(':');
			if (separator === -1) continue;
			if (trimmed.slice(0, separator).trim() === 'subject') {
				subject = trimmed.slice(separator + 1).trim();
			}
		}
	}
	return { subject, body };
}

export const emails: SequenceEmail[] = Object.entries(modules)
	.sort(([a], [b]) => a.localeCompare(b))
	.map(([, raw], index) => {
		const { subject, body } = parse(raw);
		return { index, subject, markdown: body };
	});

export const sequenceLength = emails.length;

function shell(inner: string, unsubscribeUrl: string): string {
	return `<!doctype html>
<html lang="es">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;background:#ffffff;">
<div style="max-width:34rem;margin:0 auto;padding:32px 20px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#171717;">
${inner}
<hr style="border:none;border-top:1px solid #e5e5e5;margin:32px 0 16px;">
<p style="font-size:12px;color:#737373;margin:0;">
Recibes esto porque dejaste tu email en mi web.
<a href="${unsubscribeUrl}" style="color:#737373;">Darte de baja</a> en un clic.
</p>
</div>
</body>
</html>`;
}

/** Render the email at `index` to a subject + full HTML, or null if it doesn't exist. */
export function renderEmail(
	index: number,
	unsubscribeUrl: string
): { subject: string; html: string } | null {
	const email = emails[index];
	if (!email) return null;
	const inner = marked.parse(email.markdown) as string;
	return { subject: email.subject, html: shell(inner, unsubscribeUrl) };
}
