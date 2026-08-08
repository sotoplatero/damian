import { tools } from '$lib/tools/list';
import { resources } from '$lib/resources/list';

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
 * The `/tool/` and `/recursos/` prefixes and a bare leading slash are all
 * stripped, because not every page lives under `/tool/`: `/postcard` is its own
 * route segment, since what follows it is a publication and not a tool name.
 * Without stripping the bare slash, `/postcard` asked for `/og//postcard.png`
 * and got nothing. Stripping the section leaves a flat slug, which is what
 * `/og/[slug].png` can serve — a nested one would never match that route.
 */
function toSlug(path: string): string {
	return path.replace(/^\/(tool|recursos)\//, '').replace(/^\//, '');
}

/**
 * `home` for the front page; for a tool or a resource, its slug. Null when there
 * isn't one.
 *
 * The tag is what tells the two apart at a glance in a shared link: a tool is
 * used on the site, a resource is downloaded.
 */
export function cardFor(slug: string): Card | null {
	if (slug === 'home') return HOME_CARD;

	const tool = tools.find((t) => toSlug(t.href) === slug);
	if (tool) return { title: tool.name, subtitle: tool.blurb, tag: 'herramienta gratis' };

	const resource = resources.find((r) => toSlug(r.href) === slug);
	if (resource) return { title: resource.name, subtitle: resource.blurb, tag: 'descarga gratis' };

	return null;
}

/** The slug of the card a given route gets. */
export function slugForPath(pathname: string): string {
	const clean = pathname.replace(/\/$/, '');
	if (!clean || clean === '') return 'home';
	return toSlug(clean);
}
