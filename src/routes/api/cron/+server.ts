import { json, type RequestHandler } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { listActiveContacts, sendSequenceEmail } from '$lib/server/resend';
import { sequenceLength } from '$lib/server/emails';

/** Whole calendar days (UTC) between a contact's signup and now. */
function daysSince(createdAt: string, now: Date): number {
	const from = new Date(createdAt);
	const a = Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate());
	const b = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
	return Math.floor((b - a) / 86_400_000);
}

/**
 * Daily sequence sender. MUST run exactly once per day (see vercel.json).
 * For each subscriber, the day count since signup selects which email to send:
 * day 1 -> emails[1], day 2 -> emails[2]... Day 0 (the list) went out on signup.
 */
async function run(request: Request): Promise<Response> {
	const secret = env.CRON_SECRET;
	if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
		return json({ error: 'unauthorized' }, { status: 401 });
	}

	const now = new Date();
	const contacts = await listActiveContacts();
	let sent = 0;
	let failed = 0;

	for (const contact of contacts) {
		const day = daysSince(contact.created_at, now);
		if (day < 1 || day >= sequenceLength) continue;
		try {
			await sendSequenceEmail(contact.email, day);
			sent++;
		} catch (error) {
			console.error('[cron] send failed for', contact.email, error);
			failed++;
		}
	}

	return json({ ok: true, contacts: contacts.length, sent, failed });
}

// Vercel Cron calls GET with `Authorization: Bearer $CRON_SECRET`.
export const GET: RequestHandler = ({ request }) => run(request);
// POST for manual triggers / other schedulers.
export const POST: RequestHandler = ({ request }) => run(request);
