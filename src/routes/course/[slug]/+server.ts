import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { findCourse } from '$lib/courses/registry';
import { sanitizeAnswers } from '$lib/courses/sanitize';
import { buildReport } from '$lib/courses/report';
import { sendCourseEmail } from '$lib/server/resend';
import { isDisposable } from '$lib/server/email-validation';
import { overLimit } from '$lib/server/rate-limit';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Email someone what they just did in a course.
 *
 * One step, and no model call: a course is a deterministic simulator, so
 * `openai.ts` doesn't come into it. Everything in the email was already computed
 * by the browser, and this endpoint recomputes it from scratch from the
 * sanitized answers — which is the reason `engine.ts` is pure.
 *
 * IT DOES NOT SUBSCRIBE ANYONE. The `/tool/*` endpoints call `subscribe()`
 * because they are lead capture; this isn't. See the comment on `sendCourseEmail`.
 */
export const POST: RequestHandler = async ({ request, params, getClientAddress }) => {
	const course = findCourse(params.slug);
	if (!course) return json({ error: 'not_found' }, { status: 404 });

	let body: Record<string, unknown>;
	try {
		body = await request.json();
	} catch {
		return json({ error: 'bad_request' }, { status: 400 });
	}

	const email = String(body.email ?? '')
		.trim()
		.toLowerCase();
	if (!EMAIL_RE.test(email)) return json({ error: 'invalid_email' }, { status: 400 });
	if (isDisposable(email)) return json({ error: 'disposable' }, { status: 400 });

	// Same buckets as the tools: this also sends mail with our domain in the From,
	// which is what's being limited. Keyed by email, which does identify someone,
	// with an IP ceiling so nobody chains addresses from one connection.
	const ip = getClientAddress();
	if (overLimit('toolDelivery', email) || overLimit('toolDeliveryPerIp', ip)) {
		return json({ error: 'rate_limit' }, { status: 429 });
	}

	const answers = sanitizeAnswers(course, body.answers);
	if (!Object.keys(answers).length) {
		return json({ error: 'empty' }, { status: 400 });
	}

	try {
		await sendCourseEmail(email, buildReport(course, answers));
	} catch (error) {
		console.error(`[course/${course.slug}] delivery email failed:`, error);
		return json({ error: 'send_failed' }, { status: 502 });
	}

	return json({ ok: true });
};
