/**
 * The gap on the board: the rules for what somebody may write into it.
 *
 * Pure, and shared by the page and the endpoint so the field and the server
 * cannot disagree about what counts as an answer — the same arrangement
 * `/tool/10-post-types` uses for `IDEA_MIN`/`IDEA_MAX`, and for the same reason:
 * a limit enforced only on the server is a form that fails after you press the
 * button, and one enforced only in the page is not enforced.
 */

/**
 * Twelve characters is about «facturas a mano» — short, but a real answer. Under
 * it you get «ninguna», «no sé» and test strings, which cost nothing to store and
 * everything to read past.
 */
export const GAP_MIN = 12;

/**
 * Three hundred is a couple of sentences. This is a note, not a brief: what is
 * useful is the job somebody is doing by hand every week, and anybody with more
 * to say about it has a reason to reply to the newsletter instead, which is the
 * conversation the whole site is trying to start.
 */
export const GAP_MAX = 300;

/**
 * Collapse whitespace and trim.
 *
 * Newlines go too, and that is not cosmetic: this is written to the log as one
 * JSON line, and the value of that format is that one event is one line. A
 * pasted paragraph with hard returns in it would still be one JSON string, but
 * `\n` inside it makes the log unreadable the moment anybody greps it.
 */
export function cleanGapRequest(raw: string): string {
	return raw.replace(/\s+/g, ' ').trim();
}

/** Whether what is in the field right now is submittable. */
export function isGapRequestValid(raw: string): boolean {
	const cleaned = cleanGapRequest(raw);
	return cleaned.length >= GAP_MIN && cleaned.length <= GAP_MAX;
}
