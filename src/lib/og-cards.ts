import { tools } from '$lib/tools/list';
import homeRaw from '$lib/content/home.md?raw';

/**
 * What the card seen when sharing each page says.
 *
 * It lives here rather than inside the route that draws the image so the texts
 * keep coming from where they always come from: the tools in
 * `src/lib/tools/list.ts` and the home page's `home.md` frontmatter. That way a
 * new tool gets a card on its own and the home copy is edited in the same place
 * as the rest.
 */

export type Card = {
	title: string;
	subtitle: string;
	/** The bottom line, next to the domain. Tells the home page apart from a tool. */
	tag: string;
};

/** Reads a value from home.md's frontmatter, the same way the page does. */
function fromHome(key: string): string {
	const frontmatter = homeRaw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
	if (!frontmatter) return '';
	for (const line of frontmatter[1].split('\n')) {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith('#')) continue;
		const separator = trimmed.indexOf(':');
		if (separator === -1) continue;
		if (trimmed.slice(0, separator).trim() === key) return trimmed.slice(separator + 1).trim();
	}
	return '';
}

/**
 * A path reduced to its card slug.
 *
 * Both the `/tool/` prefix and a bare leading slash are stripped, because not
 * every tool lives under `/tool/`: `/author` is its own route segment, since what
 * follows it is a publication and not a tool name. Without stripping the bare
 * slash, `/author` asked for `/og//author.png` and got nothing.
 */
function toSlug(path: string): string {
	return path.replace(/^\/tool\//, '').replace(/^\//, '');
}

/** `home` for the front page; for a tool, its slug. Null when there isn't one. */
export function cardFor(slug: string): Card | null {
	if (slug === 'home') {
		return {
			title: fromHome('ogTitle'),
			subtitle: fromHome('ogDescription'),
			tag: fromHome('ogTag')
		};
	}

	const tool = tools.find((t) => toSlug(t.href) === slug);
	if (!tool) return null;
	return { title: tool.name, subtitle: tool.blurb, tag: 'herramienta gratis' };
}

/** The slug of the card a given route gets. */
export function slugForPath(pathname: string): string {
	const clean = pathname.replace(/\/$/, '');
	if (!clean || clean === '') return 'home';
	return toSlug(clean);
}
