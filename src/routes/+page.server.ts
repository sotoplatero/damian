import type { PageServerLoad } from './$types';
import { PUBLICATION_URL } from '$lib/publication';
import { toIssues, type Issue } from '$lib/issues';

/**
 * The latest three issues, for the home page's reference to the newsletter.
 *
 * THE HOME PAGE MUST RENDER WITHOUT THEM. Substack is somebody else's server, so
 * the wait is capped short and any failure returns an empty list, which the page
 * reads as «don't draw the list». A slow Substack never makes a slow home page.
 *
 * Plain `fetch` and not `$lib/server/substack.ts`'s `get`: that one exists to
 * guard URLs a visitor typed, with a ten-second timeout sized for walking an
 * archive. This URL is our own constant.
 *
 * Cached twice: in memory for the warm instance, and at the CDN through
 * `s-maxage`, so almost no visit wakes this code at all. A new issue shows up
 * within the quarter hour.
 */
const TIMEOUT_MS = 2500;
const MEMORY_MS = 15 * 60 * 1000;

let cached: { at: number; issues: Issue[] } | null = null;

async function latestIssues(): Promise<Issue[]> {
	if (cached && Date.now() - cached.at < MEMORY_MS) return cached.issues;
	try {
		const response = await fetch(`${PUBLICATION_URL}/api/v1/archive?sort=new&limit=6`, {
			signal: AbortSignal.timeout(TIMEOUT_MS),
			headers: { accept: 'application/json' }
		});
		if (!response.ok) return cached?.issues ?? [];
		const issues = toIssues(await response.json());
		cached = { at: Date.now(), issues };
		return issues;
	} catch {
		return cached?.issues ?? [];
	}
}

export const load: PageServerLoad = async ({ setHeaders }) => {
	setHeaders({ 'cache-control': 'public, max-age=0, s-maxage=900, stale-while-revalidate=86400' });
	return { issues: await latestIssues() };
};
