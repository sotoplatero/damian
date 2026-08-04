/**
 * The tools shown on the home page, below the form.
 *
 * This list is going to grow. To add one, dropping an object in here is enough:
 * the home page paints it on its own, in whatever order they sit. The first item
 * is the first thing seen, so put whatever you most want to move at the top.
 *
 * TAKING ONE OFF THE HOME PAGE DOES NOT TURN IT OFF. Everything under
 * `src/routes/tool/*` stays reachable by URL; this list only decides what gets
 * shown. It exists so you can work on one without visitors seeing it.
 *
 * Deliberately off the list, and why:
 *
 *   - `places-evaluator` — uses Paraglide and DaisyUI, so it doesn't fit with the
 *     rest yet. Getting it onto the home page means migrating it to the site theme.
 *   - `newsletter` — it works, but the report still doesn't deliver what it
 *     should. The judgement half is being rewritten and the reference it is
 *     measured against is a hand-written audit that is NOT in this repo (it names
 *     a real publication and this repo is public; ask Damian for it). It comes
 *     back to the home page when the report passes that document's test: that
 *     whoever reads it changes something.
 */
export type Tool = {
	/** What the link reads as. It should say what it does, not what it's called inside. */
	name: string;
	href: string;
	/** One short sentence: it clamps to two lines on screen. What the visitor walks away with. */
	blurb: string;
	/**
	 * Marks the ones that ask for an email, so you can see at a glance which ones
	 * capture. `/author` is the first one without it, on purpose: the card is a
	 * gift meant to open a conversation with another author, and a form in front of
	 * it would turn it into lead capture.
	 */
	capturesEmail?: boolean;
};

export const tools: Tool[] = [
	{
		name: 'El Wrapped de tu Substack',
		href: '/author',
		blurb: 'Pega la dirección de un newsletter. Sale la tarjeta de toda su historia.'
	},
	{
		name: 'Reescribe el “Acerca de” de tu Substack',
		href: '/tool/substack-about',
		blurb: 'Pega tu publicación. Te digo qué no se entiende y te propongo una versión mejor.',
		capturesEmail: true
	},
	{
		name: 'Reescribe tu oferta con 7 fórmulas de venta',
		href: '/tool/7-frameworks',
		blurb: 'Pega tu web. Te doy siete versiones listas para usar.',
		capturesEmail: true
	},
	{
		name: 'Saca 10 posts distintos de una sola idea',
		href: '/tool/10-post-types',
		blurb: 'Escribe el tema. Te doy diez posts listos para publicar.',
		capturesEmail: true
	},
	{
		name: 'Reparte un artículo entre Substack, X y LinkedIn',
		href: '/tool/repurpose',
		blurb: 'Pega el enlace de tu artículo. Te lo reparto en nueve publicaciones.',
		capturesEmail: true
	}
];
