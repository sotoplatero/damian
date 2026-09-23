/**
 * The newsletter's latest issues, as the home page references them.
 *
 * A REFERENCE, NOT A MIRROR. PRODUCT.md's criterion: the newsletter tells the
 * story, the site does the work. So the home page links to the latest issues by
 * title and date and never reproduces a line of them — no subtitle, no excerpt.
 *
 * Pure on purpose: the fetch lives in `src/routes/+page.server.ts`, and this only
 * shapes what Substack's `/api/v1/archive` returns. Anything that does not look
 * like a post is dropped rather than rendered half-filled.
 */
export type Issue = {
	title: string;
	url: string;
	/** ISO date, `YYYY-MM-DD`. */
	date: string;
};

const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

export function toIssues(payload: unknown, limit = 3): Issue[] {
	if (!Array.isArray(payload)) return [];
	const issues: Issue[] = [];
	for (const entry of payload) {
		if (issues.length >= limit) break;
		if (!entry || typeof entry !== 'object') continue;
		const post = entry as Record<string, unknown>;
		// Podcasts and restacks are other shapes of entry; only written posts count.
		if (post.type !== undefined && post.type !== 'newsletter') continue;
		const title = typeof post.title === 'string' ? post.title.trim() : '';
		const url = typeof post.canonical_url === 'string' ? post.canonical_url : '';
		const date = typeof post.post_date === 'string' ? post.post_date.slice(0, 10) : '';
		if (!title || !url.startsWith('https://') || !/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
		issues.push({ title, url, date });
	}
	return issues;
}

/** `2026-09-18` → `18 sep`. Short, because it sits beside a title in one line. */
export function shortDate(iso: string): string {
	const [, month, day] = iso.split('-').map(Number);
	return `${day} ${MONTHS[month - 1] ?? ''}`.trim();
}
