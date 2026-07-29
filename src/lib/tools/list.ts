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
	/** Una o dos frases. Qué se lleva quien entre. */
	blurb: string;
	/** Marca las que piden email, para que sepas de un vistazo cuáles captan. */
	capturesEmail?: boolean;
};

export const tools: Tool[] = [
	{
		name: 'Tu oferta, escrita de 7 formas',
		href: '/tool/copy',
		blurb:
			'Pegas la web de tu negocio. Te la leo y te devuelvo tu oferta montada sobre los siete frameworks de copywriting que más se usan para vender. El primero, gratis y sin pedirte nada.',
		capturesEmail: true
	}
];
