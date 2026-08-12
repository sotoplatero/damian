import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { isValidSlug } from '$lib/authors/slug';
import { overLimit } from '$lib/server/rate-limit';
import { sendArchiveEmail } from '$lib/server/resend';
import { verifyPass } from '$lib/server/tokens';

/**
 * The zip, mailed back to whoever just built it.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * WHY THE BROWSER SENDS THE FILE UP INSTEAD OF THE SERVER BUILDING IT
 *
 * `/tool/archive` assembles the export in the tab, batch by batch, because a
 * whole archive is hundreds of requests to Substack and no serverless function
 * can sit through that. So the finished file exists in exactly one place — the
 * visitor's browser — and this endpoint's job is to take it back and attach it to
 * a mail. It is the only copy that survives closing the tab, which is the whole
 * reason the mail is worth sending.
 *
 * **The body is the raw zip, not JSON and not base64.** Vercel caps a request
 * body at 4.5 MB, and base64 would spend a third of that on encoding. The claim
 * travels in headers instead: same signed pass the batches use, so the mail can't
 * be sent to an address that never asked for anything.
 * ─────────────────────────────────────────────────────────────────────────
 */
export const config = { maxDuration: 30 };

/** Same hour as the batches: see `PASS_MAX_AGE_MS` in the sibling endpoint. */
const PASS_MAX_AGE_MS = 60 * 60 * 1000;

/**
 * Refused above this. Vercel's own body limit is 4.5 MB and it answers 413 before
 * this code runs; stopping short of it means the visitor gets a JSON error the
 * page can read instead of a platform error page it can't. A 1300-post archive
 * measures about 800 KB, so this is a long way past anything real.
 */
const MAX_ZIP_BYTES = 4 * 1024 * 1024;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** A filename is going into a mail header, so it gets the same treatment as a slug. */
function safeFilename(raw: string): string {
	const name = raw.replace(/[^a-zA-Z0-9._-]/g, '');
	return /^[a-zA-Z0-9]/.test(name) && name.endsWith('.zip') ? name.slice(0, 120) : 'archivo.zip';
}

/**
 * The one line the mail says about what is attached, built HERE from numbers.
 *
 * The page could have sent the sentence, and the first version had it doing that.
 * **A header is latin-1**, so «índice» alone breaks the request — the same trap as
 * the notes that travel as codes in the sibling endpoint. So the counts come as
 * digits, the publication's name comes percent-encoded, and the Spanish is written
 * on this side where it can carry accents safely.
 */
function summaryFrom(headers: Headers): string {
	const count = (key: string) => {
		const value = Number(headers.get(key));
		return Number.isFinite(value) && value >= 0 ? Math.floor(value) : 0;
	};
	let name = '';
	try {
		name = decodeURIComponent(headers.get('x-archive-name') ?? '').slice(0, 120);
	} catch {
		// A malformed encoding is not worth failing a delivery over.
	}

	const posts = count('x-archive-posts');
	const bodies = count('x-archive-bodies');
	const whose = name ? ` de ${name}` : '';
	return `**${posts} entradas** en el índice${whose}, y **${bodies} ${
		bodies === 1 ? 'post entero' : 'posts enteros'
	}** en markdown dentro de la carpeta \`posts/\`.`;
}

export const POST: RequestHandler = async ({ request, getClientAddress }) => {
	const email = (request.headers.get('x-archive-email') ?? '').trim().toLowerCase();
	const slug = (request.headers.get('x-archive-slug') ?? '').trim().toLowerCase();
	const pass = request.headers.get('x-archive-pass') ?? '';

	if (!EMAIL_RE.test(email) || !isValidSlug(slug)) {
		return json({ error: 'bad_request' }, { status: 400 });
	}
	if (!verifyPass(`${slug}|${email}`, pass, PASS_MAX_AGE_MS)) {
		return json({ error: 'pass_expired' }, { status: 401 });
	}

	// The download itself is already limited to one per address (`archiveExport`).
	// This is the guard on the mail: three a day per address, ten per IP, the same
	// numbers every other delivery on this site uses.
	if (overLimit('toolDelivery', email) || overLimit('toolDeliveryPerIp', getClientAddress())) {
		return json({ error: 'rate_limit' }, { status: 429 });
	}

	const zip = new Uint8Array(await request.arrayBuffer());
	if (!zip.length) return json({ error: 'bad_request' }, { status: 400 });
	if (zip.length > MAX_ZIP_BYTES) return json({ error: 'too_big' }, { status: 413 });
	// A zip starts with "PK\3\4". Cheap, and it stops this from mailing whatever
	// else somebody feels like posting at it.
	if (zip[0] !== 0x50 || zip[1] !== 0x4b) return json({ error: 'bad_request' }, { status: 400 });

	try {
		await sendArchiveEmail(email, summaryFrom(request.headers), {
			filename: safeFilename(request.headers.get('x-archive-filename') ?? ''),
			content: zip
		});
	} catch (cause) {
		console.error('[tool/archive] email failed:', cause);
		return json({ error: 'send_failed' }, { status: 502 });
	}

	return json({ ok: true });
};
