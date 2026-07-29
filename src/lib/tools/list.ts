/**
 * Las herramientas que se enseñan en la home, debajo del formulario.
 *
 * Esta lista va a crecer. Para añadir una, basta con meter un objeto aquí:
 * la home la pinta sola, en el orden en que estén. Lo primero de la lista es
 * lo primero que se ve, así que arriba va lo que más te interese mover.
 *
 * Hay tools vivos por URL que NO están aquí a propósito (uuid-generator,
 * character-counter, places-evaluator, lyra). Para sacarlos a la home,
 * añádelos.
 */
export type Tool = {
	/** Lo que se lee en el enlace. Que diga qué hace, no cómo se llama por dentro. */
	name: string;
	href: string;
	/** Una frase corta: se corta a dos líneas en pantalla. Qué se lleva quien entre. */
	blurb: string;
	/** Marca las que piden email, para que sepas de un vistazo cuáles captan. */
	capturesEmail?: boolean;
};

export const tools: Tool[] = [
	{
		name: 'Tu oferta, escrita de 7 formas',
		href: '/tool/7-frameworks',
		blurb: 'Pegas tu web y te devuelvo tu oferta escrita de siete formas distintas.',
		capturesEmail: true
	}
];
