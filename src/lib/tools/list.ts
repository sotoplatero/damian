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
 *   - `10-post-types` — taken off in October 2026. It asks a model for what the
 *     visitor could ask one directly, behind an email gate, which argues against
 *     the site's thesis instead of for it. It stays live because the skill calls it.
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
	 * capture.
	 */
	capturesEmail?: boolean;
	/**
	 * Listed before it is finished, on purpose: what is left to learn about it
	 * (whether people accept the plan or fight it) only traffic can answer. The
	 * home page says «beta» next to it so a rough edge reads as honest, not broken.
	 */
	beta?: boolean;
	/**
	 * What the visitor puts in, as the home page says it: «Metes <takes>». A tool
	 * here is dynamic — something goes in and a result comes out — and this line is
	 * how the home page says so without a form of its own. The field lives on the
	 * tool's page.
	 */
	takes: string;
};

export const tools: Tool[] = [
	// Order (November 2026): the two that work on the visitor's OWN material first
	// — somebody arriving from their own Note proves the thesis on their own
	// article — then the judgement tool, then the one about somebody else's archive.
	{
		name: 'Distribuye tu artículo',
		href: '/tool/repurpose',
		takes: 'un artículo tuyo',
		blurb: 'Nueve notas de un artículo tuyo: cinco con sus datos y cuatro que van más lejos que él.',
		capturesEmail: true
	},
	{
		name: 'Reescribe el “Acerca de” de tu Substack',
		href: '/tool/substack-about',
		takes: 'tu Substack',
		blurb: 'Pega tu publicación. Te digo qué no se entiende y te propongo una versión mejor.',
		capturesEmail: true
	},
	{
		name: 'Convierte un artículo en herramienta',
		href: '/tool/actionable',
		takes: 'un artículo que explique cómo se hace algo',
		blurb:
			'Te digo si da para herramienta y, si da, la construyo. Si no da, te explico por qué.',
		beta: true
	},
	{
		name: 'Descarga el archivo de una newsletter',
		href: '/tool/archive',
		takes: 'la newsletter que quieres estudiar',
		blurb:
			'Pega la dirección de la que te interesa: te digo qué le funcionó de verdad y te llevas su archivo entero en markdown.',
		capturesEmail: true
	}
];
