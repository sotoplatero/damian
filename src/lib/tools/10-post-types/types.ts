/**
 * Los 10 tipos de post que genera el tool.
 *
 * `id` es la clave que devuelve el modelo en su JSON. Si tocas un `id` aquí,
 * tócalo también en `prompt.ts` — el modelo se guía por esta misma lista.
 *
 * El orden importa: el primero (`practico`) es el que se regala sin pedir email.
 *
 * Los tipos, el para-qué y el cómo salen del artículo de Neal O'Grady
 * "The 10 Types of Posts". Están traducidos y condensados, no calcados: el
 * `hint` es lo que se le pasa al modelo para que escriba ese post, así que dice
 * cómo se hace el tipo, no qué es. Si tocas un `hint`, comprueba antes que sigue
 * diciendo lo que dice la fuente.
 *
 * A diferencia de los 7 frameworks, un tipo de post no tiene pasos: cada uno
 * produce UN post entero de una tacada. Por eso aquí no hay `steps`.
 */
export type PostType = {
	id: string;
	/** Nombre tal y como se ve en pantalla. */
	name: string;
	/** Para qué sirve mejor. Una línea. Se muestra bajo el nombre. */
	bestFor: string;
	/** Cómo se escribe ese post. Se lo pasamos al modelo; no se enseña en pantalla. */
	hint: string;
};

export const postTypes: PostType[] = [
	{
		id: 'practico',
		name: 'Práctico',
		bestFor: 'Demuestra que sabes. Un paso a paso de cómo se hace.',
		hint: 'Un paso a paso de cómo hacer algo concreto de tu tema. Que quien lo lea pueda ponerse a hacerlo sin quedarse atascado. Arranca con "Cómo" o "Así hago". Los pasos en orden, cada uno una acción clara.'
	},
	{
		id: 'observacion',
		name: 'Observación',
		bestFor: 'Algo que has visto en tu sector y que nadie más cuenta.',
		hint: 'Una cosa que has notado en tu sector y que otros no están diciendo. Enseña cómo ves tú el mundo. Es una idea, no un tutorial: corta, un solo pensamiento, sin pasos.'
	},
	{
		id: 'contraste',
		name: 'Esto vs. aquello',
		bestFor: 'Comparas dos formas de hacerlo y una gana.',
		hint: 'Compara dos cosas: dos formas de hacerlo, el antes y el después, lo que la gente cree contra lo que pasa de verdad. Tú controlas cómo se ve la mala opción y cómo se ve la buena. La buena es hacia donde llevas al lector.'
	},
	{
		id: 'motivacion',
		name: 'Motivación',
		bestFor: 'No les falta saber más. Les falta que alguien les empuje.',
		hint: 'La gente no necesita más información, necesita que la empujen a moverse. Apunta a lo que quiere de verdad y no siempre dice: estatus, dinero, tiempo libre. Dile que es posible. "Yo lo hice, tú también." Que se sienta capaz al terminar de leer.'
	},
	{
		id: 'analisis',
		name: 'Análisis',
		bestFor: 'Desmontas un tema o un caso por dentro.',
		hint: 'Desmonta por dentro un tema, una empresa, una persona o un formato de tu sector. Aquí no dices cómo lo harías tú: analizas cómo lo hizo otro, cómo ha cambiado con los años o qué efecto tiene. Va en profundidad.'
	},
	{
		id: 'lista',
		name: 'Lista',
		bestFor: 'Una lista útil de tu sector. Se guarda y se comparte.',
		hint: 'Una lista de cosas de tu sector: libros, herramientas, gente a seguir, errores que se repiten. Cada punto en su línea, con un porqué corto de para qué le sirve a quien lee. Sin relleno entre puntos.'
	},
	{
		id: 'contracorriente',
		name: 'A contracorriente',
		bestFor: 'Una opinión con pinchos. Divide y atrae a tu tribu.',
		hint: 'Una opinión fuerte y con pinchos: algo se está haciendo mal, o debería hacerse de otra forma. Di lo que los tuyos piensan y no se atreven a decir. Sin miedo a molestar a los del otro bando: esa es la gracia.'
	},
	{
		id: 'caso',
		name: 'Caso de éxito',
		bestFor: 'El que menos gusta y el que más vende.',
		hint: 'Una prueba de que lo tuyo funciona: un cliente contento, un resultado, un testimonio. Cuenta su problema y cómo lo resolviste. Si en los datos no hay una prueba real, deja un hueco entre corchetes para que la ponga la persona; no te la inventes.'
	},
	{
		id: 'historia',
		name: 'Historia personal',
		bestFor: 'Una historia tuya. Conecta y vende sin vender.',
		hint: 'Una historia tuya, mejor si es normal y cualquiera se ve en ella. Usa el molde de Pixar: érase una vez, cada día, hasta que un día, por eso, por eso, hasta que al final. Muestra lo que pasó, no lo expliques.'
	},
	{
		id: 'meme',
		name: 'Meme',
		bestFor: 'Hace reír a los tuyos y refuerza tu punto de vista.',
		hint: 'Un texto con gracia para los tuyos, no para cualquiera con dedos. Adapta un formato de meme a tu tema, o suelta una frase con remate que haga reír y pensar a la vez. Que refuerce tu punto de vista. Como es solo texto: si hace falta, describe la imagen entre paréntesis y debajo va el texto del meme. Una o dos líneas, no más.'
	}
];

/** El que se regala sin pedir email. */
export const freePostType = postTypes[0];

/** Los que quedan detrás del muro. */
export const gatedPostTypes = postTypes.slice(1);

export function findPostType(id: string): PostType | undefined {
	return postTypes.find((type) => type.id === id);
}
