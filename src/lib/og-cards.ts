import { tools } from '$lib/tools/list';

/**
 * What the card seen when sharing each page says.
 *
 * It lives here rather than inside the route that draws the image so the texts
 * keep coming from where they come from: the tools speak through
 * `src/lib/tools/list.ts`, and the home card's own lines are right below. A new
 * tool gets a card on its own.
 */

export type Card = {
	title: string;
	subtitle: string;
	/** The bottom line, next to the domain. Tells the home page apart from a tool. */
	tag: string;
};

/** The home card. The title goes big; the tag sits next to the domain. */
const HOME_CARD: Card = {
	title: 'Objeto Brillante',
	subtitle:
		'Un email a la semana con algo que he hecho con IA en un negocio real y que funciona. Sin cursos ni tutoriales.',
	tag: 'un email a la semana'
};

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
	if (slug === 'home') return HOME_CARD;

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
