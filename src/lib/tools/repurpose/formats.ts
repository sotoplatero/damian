/**
 * The nine notes, and the reason they are these nine.
 *
 * THE OLD REPERTOIRE WAS NINE WAYS OF SAYING THE THESIS. Idea central,
 * contradicción, consecuencia, lección práctica — all of them "the article's
 * point, tilted". Run against a real article that carried 65 businesses for
 * $0.45, a restaurant with 917 reviews and no website, and 36% of Miami plumbers
 * offline, it produced three notes with no number, no name and no scene in them.
 * It extracted gold and then wrote about the gold in the abstract.
 *
 * So the unit changed. A note is now ONE ATOM of the article, not one view of
 * the whole — the atomic-essay rule from Ship 30 for 30: break the topic into
 * components and write one, rather than writing the summary N times.
 *
 * TWO FAMILIES, and the email gate falls on the seam between them.
 *
 *   'articulo'  — what the piece already says, re-cut. Each note is welded to a
 *                 concrete proof, scene or quote. This is the half that is free:
 *                 it is the visitor's own material.
 *   'mas-alla'  — what the piece opens and never closes. Each note is welded to
 *                 a named tension and reasons past the text. This is the emailed
 *                 half, because it is the half that isn't already theirs.
 *
 * `anchor` names which slot of the analysis a note draws from. It is what makes
 * "nine different atoms" enforceable instead of merely requested: every note
 * hands back the exact material it used, and no two may hand back the same one.
 *
 * ON THE MISSING TENTH: there is no `puerta-articulo` any more. Its whole job
 * was to send the reader away, and it is the format that most reliably produced
 * a link welded onto a sentence with no transition. Zero-click content (Amanda
 * Natividad and Rand Fishkin) is the argument against it: a distributed piece
 * has to stand alone and the click has to be additive, not required — platforms
 * suppress link posts, and Meta reported that 97.3% of Facebook posts that get
 * views carry no external link. `cifra` and `escena` make somebody want the
 * article better than a door ever did.
 *
 * THE EXAMPLES ARE OURS AND THEY ARE ALL ONE OFF-TOPIC SUBJECT (a first 10K),
 * the same rule as `10-post-types`: they read as "one topic, nine ways", they
 * are far from any real user's subject so the model copies the shape and not the
 * matter, and they are shown on the public page. Each one demonstrates its own
 * anchor — the `cifra` example carries numbers, the `caso` example carries a
 * name. An example that doesn't do its own job teaches the model nothing.
 */

export const NOTE_MAX_CHARS = 700;

/** Which slot of the analysis a note's `ancla` has to come from. */
export type AnchorSource = 'prueba' | 'escena' | 'frase' | 'tension';

export type NoteFormat = {
	id: string;
	name: string;
	/** Free half or emailed half. The gate falls on this boundary. */
	family: 'articulo' | 'mas-alla';
	bestFor: string;
	hint: string;
	example: string;
	anchor: AnchorSource;
	/**
	 * A mechanical requirement the note must meet, checked server-side.
	 *
	 * ONLY WHERE IT IS CRISP, and only where the `hint` already demands it in
	 * those words — «el número va dentro de la nota, escrito», «el nombre aparece
	 * escrito». A model can see what "contains a figure" means and comply while
	 * still writing its own sentence.
	 *
	 * A general "the note must carry its material" rule was tried and removed. It
	 * fought `addsBeyondAnchor`: carry the material literally enough to pass, and
	 * you have added nothing of your own; rewrite it in your words, and the
	 * carrying is gone. The model cannot see the rule, so it oscillated between
	 * the two failures. Scenes and lessons are left to their `hint`, which is
	 * where an unmeasurable requirement belongs.
	 */
	requires?: 'figure' | 'name';
	/** Only the quote note: its anchor is verified against the scraped text. */
	needsQuote?: boolean;
};

export const formats: NoteFormat[] = [
	{
		id: 'cifra',
		name: 'La cifra',
		family: 'articulo',
		bestFor: 'Poner a circular un número del artículo y lo que significa',
		hint: 'Toma UN dato del artículo y escribe lo que ese dato deja ver. El número va dentro de la nota, escrito, no resumido en «muy barato» ni en «la mayoría». Si el dato necesita un segundo número al lado para entenderse, ponlo.',
		example:
			'Terminé el 10K en 58 minutos. Los cuatro primeros kilómetros los hice en 21 y los seis siguientes en 37. Todo lo que aprendí ese día cabe en esa diferencia.',
		anchor: 'prueba',
		requires: 'figure'
	},
	{
		id: 'escena',
		name: 'La escena',
		family: 'articulo',
		bestFor: 'Distribuir un momento concreto tal y como ocurrió',
		hint: 'Cuenta una escena que ya esté en el artículo, con su sitio, su momento y lo que se hizo. Conserva los hechos. No la cierres con una moraleja: la escena vale por lo que se ve en ella.',
		example:
			'En el kilómetro seis miré el reloj y supe que había salido al ritmo de otro. Los cuatro que quedaban los hice andando, adelantado por gente que había salido detrás de mí.',
		anchor: 'escena'
	},
	{
		id: 'caso',
		name: 'El caso con nombre',
		family: 'articulo',
		bestFor: 'Enseñar la idea encarnada en un ejemplo concreto',
		hint: 'Elige un ejemplo del artículo que tenga nombre propio —una persona, un negocio, un sitio, una herramienta— y cuéntalo con sus datos. El nombre aparece escrito. Un caso sin nombre es una generalidad.',
		example:
			'Rosa entrena en el parque de al lado, tiene 61 años y corrió su primer 10K el mismo día que yo. Salió tres minutos más lenta en el kilómetro uno y entró cuatro minutos antes.',
		anchor: 'prueba',
		requires: 'name'
	},
	{
		id: 'leccion',
		name: 'La lección con su prueba',
		family: 'articulo',
		bestFor: 'Dar algo aplicable sin que suene a consejo de manual',
		hint: 'Una acción concreta, y pegada a ella el dato o la escena del artículo que la justifica. Sin la prueba es un consejo genérico, que es justo lo que sobra por ahí. No inventes un método ni añadas pasos por completar una lista.',
		example:
			'Haz la primera salida tan corta que te dé vergüenza contarla. Yo empecé con 12 minutos. A la cuarta semana seguía saliendo, que era lo único que había que conseguir.',
		anchor: 'prueba'
	},
	{
		id: 'cita',
		name: 'La frase del artículo',
		family: 'articulo',
		bestFor: 'Abrir una rendija al texto con sus propias palabras',
		// «Añade SOLO lo que la haga circular» decía antes, y se leía como «añade lo
		// mínimo»: el modelo devolvía la frase pelada y el servidor la rechazaba por
		// no aportar nada propio. El hint tiene que pedir el comentario, no tolerarlo.
		hint: 'Pon la frase literal verificada y, debajo, una línea tuya que la sitúe: de dónde sale, qué pasó antes, por qué la escribiste. La frase sola no es una nota. Si no hay frase verificada, parafrasea sin comillas y coméntala igual.',
		example:
			'«El día de la carrera se cobra lo que hiciste en enero.»\n\nLo escribí después de gastar cuatro meses de trabajo en los tres primeros minutos.',
		anchor: 'frase',
		needsQuote: true
	},
	{
		id: 'consecuencia',
		name: 'La consecuencia',
		family: 'mas-alla',
		bestFor: 'Llevar una idea del artículo hasta donde el artículo no la llevó',
		hint: 'Si lo que dice el artículo es verdad, ¿qué más es verdad? Desarrolla una implicación de segundo orden que el texto sostenga pero no escriba. Tiene que poder defenderse con el artículo delante.',
		example:
			'Si cada entrenamiento acaba al límite, faltar un día se parece a un fracaso. Y un plan que convierte cada tropiezo en fracaso no se abandona por cansancio. Se abandona por vergüenza.',
		anchor: 'tension'
	},
	{
		id: 'objecion',
		name: 'La objeción que no responde',
		family: 'mas-alla',
		bestFor: 'Adelantarse a quien va a discutirlo',
		hint: 'Nombra la objeción más fuerte que el artículo deja sin contestar, en su versión buena, no en una versión de paja. Después contéstala o déjala abierta con honradez. Las dos salidas valen; fingir que no existe, no.',
		example:
			'Lo lógico sería decirme que hay gente que mejora entrenando siempre al límite. La hay. Suelen llevar años corriendo y tienen de dónde recuperar. Yo llevaba cuatro meses.',
		anchor: 'tension'
	},
	{
		id: 'limite',
		name: 'Dónde deja de valer',
		family: 'mas-alla',
		bestFor: 'Decir para quién NO es esto',
		hint: 'Marca la frontera de la tesis: a quién no le sirve, en qué caso deja de aplicar, qué haría falta saber para el otro lado. Decir que algo no vale para todo el mundo es lo que hace creíble que valga para alguien.',
		example:
			'Esto no le sirve a quien ya corre 10K y quiere bajar de 45 minutos. Ahí el problema deja de ser salir y pasa a ser cuánto aguantas. De eso yo no sé nada todavía.',
		anchor: 'tension'
	},
	{
		id: 'pregunta',
		name: 'La pregunta abierta',
		family: 'mas-alla',
		bestFor: 'Convertir una tensión real en conversación',
		hint: 'Toma una tensión que el artículo deja abierta y hazla pregunta. Tiene que admitir respuestas distintas y verdaderas; si solo admite la del artículo, es un cierre disfrazado. No la uses como coletilla final de otra idea.',
		example: '¿Qué te hace abandonar antes un plan: que sea difícil o que deje de ser nuevo?',
		anchor: 'tension'
	}
];

/**
 * The free half is the whole `articulo` family, and that is the point of the
 * split: what a visitor sees for nothing is their own article re-cut, and what
 * arrives by email is the half the article does not contain.
 */
export const freeFormats = formats.filter(({ family }) => family === 'articulo');
export const gatedFormats = formats.filter(({ family }) => family === 'mas-alla');

export const FREE_IDS = freeFormats.map(({ id }) => id);
export const GATED_IDS = gatedFormats.map(({ id }) => id);

export function findFormat(id: string): NoteFormat | undefined {
	return formats.find((format) => format.id === id);
}

/**
 * What each family is called, and the warning the second one carries.
 *
 * It lives here because the page and the emailed report both print it, and the
 * two saying it differently is how a warning quietly stops being a warning.
 *
 * The `mas-alla` note is not decoration. Those four are the model reasoning past
 * the article, and somebody is about to publish them under their own name. They
 * have a right to know which four those are.
 */
export const FAMILY_LABEL: Record<NoteFormat['family'], string> = {
	articulo: 'Lo que tu artículo ya dice',
	'mas-alla': 'Lo que tu artículo abre y no cierra'
};

export const FAMILY_NOTE: Record<NoteFormat['family'], string> = {
	articulo: 'Cada una lleva encima un dato, un nombre o una escena de tu texto.',
	'mas-alla':
		'Estas cuatro no están en tu artículo: son una lectura suya, sostenida en lo que escribiste pero no escrita por ti. Léelas antes de publicarlas con tu nombre.'
};
