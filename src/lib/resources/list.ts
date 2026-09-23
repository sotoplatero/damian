/**
 * The resources: every downloadable this site hands over.
 *
 * A resource is not a tool. A tool is used here — you paste something, it gives
 * you something back, and the tab is where it happens. A resource is a file you
 * take away and open somewhere else. That is why they get their own section on
 * the home page and their own list instead of being appended to
 * `src/lib/tools/list.ts`: mixed in, a download reads as a fifth tool that
 * doesn't work.
 *
 * THIS FILE IS THE WHOLE LEAD MAGNET. An object in here is a live page at
 * `/recursos/<slug>`, a card on the home page, a share image, an entry in ⌘K and
 * a delivery email — there is no route to write. Until August 2026 each one was
 * its own folder: `+page.svelte` (95 lines) plus `api/+server.ts` (58), and the
 * two that existed were byte-identical apart from which sender got called. The
 * second one's own header comment said so out loud: «the only thing that differs
 * between two of them is which sender gets called». Two copies is a coincidence;
 * three would have been a system nobody designed.
 *
 * WHAT IS NOT HERE, deliberately:
 *
 *   - The file's weight in kilobytes. Cervantes' ZIP is overwritten in place
 *     whenever a new build ships (see `sendResourceEmail`), so a size typed here
 *     goes stale silently and nobody finds out. `contents` says what is inside,
 *     which is what somebody actually wants to know before spending an address.
 *   - A `capturesEmail` flag. Every resource asks for one — that is what a
 *     resource IS here. The page says so before the field, not after, and the
 *     sentence saying it is `SUBSCRIBE_NOTE` below, shared, so it cannot drift
 *     into being softer on one page than another.
 *   - The email template and the filename. Those are server-only
 *     (`src/lib/server/resend.ts` keys them by slug); this module is imported by
 *     the home page and the ⌘K palette, so it has to stay safe in a browser.
 */

/** A link inside a sentence: text, then the link, then the rest of the sentence. */
export type InlineLink = {
	before: string;
	linkLabel: string;
	href: string;
	after: string;
};

export type Resource = {
	/** The URL segment, and the key the server looks the file up by. */
	slug: string;
	/** What the link reads as, on the home page and in the share card. */
	name: string;
	/** One short sentence for the card. It clamps to three lines on a phone. */
	blurb: string;
	/** What the file is: `ZIP`. Printed on the cover and in «Qué hay dentro del …». */
	format: string;
	/**
	 * The home page draws a download as an object — a cover — because it is a
	 * thing you take away, not a page you use. `title` is the big word on it and
	 * `opens` says where the file opens, the one fact about a download somebody
	 * needs before they want it.
	 */
	cover: { title: string; opens: string };

	/** The page's `<title>` and meta description. */
	title: string;
	description: string;

	/**
	 * The headline. `mark` must be a fragment OF `headline`: the page splits on it
	 * and paints that part under the orange rule. A `mark` that isn't found just
	 * renders the headline plain, which is a design that degrades rather than a
	 * page that breaks — and `resources.test.ts` checks every entry so it never
	 * degrades in production without somebody being told.
	 */
	headline: string;
	mark: string;

	/** The paragraph under the headline: a bold opening sentence, then the rest. */
	lead: { opening: string; rest: string };

	/**
	 * What is actually inside the file.
	 *
	 * Both pages used to end after the lead, so the entire case for handing over
	 * an address was one sentence and a button, and the thing being offered was
	 * never described. A lead magnet page that doesn't show the magnet is asking
	 * for trust it hasn't earned.
	 */
	contents: string[];

	/** What it takes to open it, if anything. Sentence with one link in it. */
	requirement?: InlineLink;
};

/**
 * The price of every download, said in the same words everywhere.
 *
 * It is shared and not per-resource on purpose: this is the sentence that tells
 * somebody their address goes on a list, and the day it reads more gently on one
 * page than another is the day it stops being true on that page.
 */
export const SUBSCRIBE_NOTE =
	'Es para quien lee Objeto Brillante: al descargarlo te suscribes. Si te canso, te borras en un clic desde cualquier correo.';

/**
 * What the address is being handed over FOR, said on the page where it is handed
 * over.
 *
 * A resource page is often the first page of this site somebody ever sees — the
 * link arrives from a post, a reply, somebody else's newsletter — and until now
 * the only mention of Objeto Brillante on it was `SUBSCRIBE_NOTE` naming it as
 * the thing you get subscribed to, with nothing anywhere saying what it is. The
 * home page's letter does that job in eleven paragraphs; here it takes one line,
 * and it has to be there, because this is the page doing the asking.
 */
export const NEWSLETTER_NOTE =
	'Objeto Brillante es un email a la semana: una herramienta que me he hecho para un negocio real y cómo la hice.';

export const resources: Resource[] = [
	{
		slug: 'cervantes',
		name: 'Cervantes, tu redactor de newsletter',
		blurb: 'Una carpeta que aprende cómo escribes y te ayuda a sacar tu newsletter cada semana.',
		format: 'ZIP',
		cover: { title: 'Cervantes', opens: 'Claude Code' },
		title: 'Cervantes, tu redactor de newsletter — Damian Soto',
		description:
			'Una carpeta que aprende cómo escribes leyendo lo que ya publicaste, y redacta contigo cada número de tu newsletter.',
		headline: 'Un redactor que ya ha leído todo lo que publicaste',
		mark: 'todo lo que publicaste',
		lead: {
			opening: 'Cervantes es una carpeta.',
			rest: 'La abres, lee tu newsletter entera para aprender cómo escribes, y a partir de ahí saca los números contigo: el gancho, la estructura, la portada y el envío.'
		},
		contents: [
			'Una carpeta llamada cervantes, que se abre con Claude Code.',
			'Un arranque que lee tu newsletter publicada y saca de ahí tu forma de escribir.',
			'El motor que redacta cada número contigo: gancho, estructura, portada y envío.'
		],
		requirement: {
			before: 'Cervantes se abre con ',
			linkLabel: 'Claude Code',
			href: 'https://claude.com/claude-code',
			after: '. No hace falta saber programar, pero sí tenerlo instalado.'
		}
	},
	{
		slug: 'analisis-de-autor',
		name: 'Cómo analizar el archivo de un autor',
		blurb: 'El método y los prompts, con dos casos hechos: Dan Koe y Hussain Ibarra, enteros.',
		format: 'ZIP',
		cover: { title: 'Análisis de autor', opens: 'Cualquier IA' },
		title: 'Cómo analizar el archivo de un autor — Damian Soto',
		description:
			'El método, los prompts y dos análisis completos para reconstruir lo que un autor hizo de verdad, artículo por artículo.',
		headline: 'Olvida lo que dice que hay que hacer: ¿qué hizo realmente?',
		mark: '¿qué hizo realmente?',
		lead: {
			opening: 'Un paquete para desmontar a un autor con su propio archivo.',
			rest: 'Dentro va el método en trece pasos, los prompts ya escritos, y dos casos hechos enteros: todo lo que publicaron Dan Koe y Hussain Ibarra, y el análisis que salió de cada uno.'
		},
		contents: [
			'El método entero, en trece pasos.',
			'Los prompts ya escritos, para pegarlos tal cual.',
			'El caso Dan Koe: todo lo que publicó y el análisis que salió de ahí.',
			'El caso Hussain Ibarra, igual.'
		],
		requirement: {
			before:
				'Son cuatro ficheros de texto: se abren en cualquier sitio y los prompts valen para cualquier IA que trague un documento largo. El archivo del autor que elijas tú lo bajas con ',
			linkLabel: 'esta otra herramienta',
			href: '/tool/archive',
			after: ', que es el paso 2 del método.'
		}
	}
];

/** Where a resource lives. One source, so the home, ⌘K and the share cards agree. */
export function resourceHref(resource: Pick<Resource, 'slug'>): string {
	return `/recursos/${resource.slug}`;
}

/** The resource a URL segment names, or undefined — which is a 404 upstream. */
export function findResource(slug: string): Resource | undefined {
	return resources.find((resource) => resource.slug === slug);
}

/**
 * A headline split around its marked fragment.
 *
 * Returns the three pieces in order. When `mark` is not a fragment of `headline`
 * the middle piece comes back empty and the whole headline sits in the first —
 * the page then paints it with no rule under it, which is the right failure: a
 * headline with a missing highlight still reads.
 */
export function splitHeadline(headline: string, mark: string): [string, string, string] {
	const at = mark ? headline.indexOf(mark) : -1;
	if (at === -1) return [headline, '', ''];
	return [headline.slice(0, at), mark, headline.slice(at + mark.length)];
}
